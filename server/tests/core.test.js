import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret';
const { validateRelease } = await import('../src/services/validation/releaseValidationService.js');
const { detectStale } = await import('../src/services/staleDetection/staleDetectionService.js');
const { compareVersions } = await import('../src/services/comparison/comparisonService.js');
const { normalizeAnalysis, parseModelJson } = await import('../src/services/ai/aiAnalysisService.js');

const item = (itemId, title, description = '', affectedUsers = []) => ({ itemId, title, description, affectedUsers, reference: '' });
const empty = { completedFeatures: [], bugFixes: [], changedBehaviour: [], qaSummary: [], knownLimitations: [], migrationNotes: [], affectedUserGroups: [], noneSections: [] };

const v1 = { ...empty, _id: 'a', version: '1.0.0', status: 'FINALIZED', releaseDate: new Date(), changedBehaviour: [item('behaviour-01', 'Payment retry behaviour', 'Payment retry behaviour unchanged.')], noneSections: ['migrationNotes'] };
const v2 = {
  ...empty, _id: 'b', version: '1.1.0', status: 'DRAFT',
  changedBehaviour: [item('behaviour-01', 'Payment retry behaviour', 'Payment retry behaviour changed.')],
  migrationNotes: [item('migration-01', 'Migrate existing customers', 'Required.')],
};
const ev1 = [{ evidenceId: 'evidence-01', title: 'Checkout test', status: 'PASSED', description: '', source: '' }];
const ev2 = [{ ...ev1[0] }, { evidenceId: 'evidence-02', title: 'Payment retry test', status: 'NOT_RUN', description: '', source: '' }];

test('validation: empty section is an error, explicit None is valid', () => {
  const r = validateRelease({ ...empty, version: '1.0.0', noneSections: ['knownLimitations'] }, []);
  assert.equal(r.isComplete, false);
  assert.ok(r.missingSections.includes('migrationNotes'));
  assert.ok(!r.missingSections.includes('knownLimitations'));
  assert.ok(r.errors.every((e) => e.severity === 'ERROR'));
});

test('stale: cited item modified and "unchanged" claim contradicted', () => {
  const statement = { content: 'Payment behaviour remains unchanged.', citations: [{ type: 'release_item', itemId: 'behaviour-01' }] };
  const reasons = detectStale({ statement, prev: { version: v1, evidence: ev1 }, next: { version: v2, evidence: ev2 } });
  assert.ok(reasons.length >= 1);
  assert.ok(reasons.some((r) => r.code === 'BEHAVIOUR_CHANGED'));
});

test('stale: "no migration" claim contradicted by new migration notes', () => {
  const statement = { content: 'No migration is required.', citations: [] };
  const reasons = detectStale({ statement, prev: { version: v1, evidence: ev1 }, next: { version: v2, evidence: ev2 } });
  assert.ok(reasons.some((r) => r.code === 'MIGRATION_CHANGED'));
});

test('stale: unrelated statement is not flagged', () => {
  const statement = { content: 'Checkout test passed.', citations: [{ type: 'qa_evidence', itemId: 'evidence-01' }] };
  assert.equal(detectStale({ statement, prev: { version: v1, evidence: ev1 }, next: { version: v2, evidence: ev2 } }).length, 0);
});

test('stale: deleted source is flagged', () => {
  const statement = { content: 'Feature shipped.', citations: [{ type: 'release_item', itemId: 'behaviour-01' }] };
  const reasons = detectStale({ statement, prev: { version: v1, evidence: ev1 }, next: { version: { ...v2, changedBehaviour: [] }, evidence: ev2 } });
  assert.equal(reasons[0].code, 'SOURCE_DELETED');
});

test('comparison: added, changed and QA changes', () => {
  const c = compareVersions({ left: v1, right: v2, leftEvidence: ev1, rightEvidence: ev2 });
  assert.equal(c.sections.find((s) => s.key === 'migrationNotes').added.length, 1);
  assert.equal(c.sections.find((s) => s.key === 'changedBehaviour').changed.length, 1);
  assert.equal(c.qa.added.length, 1);
});

test('ai normalize: invented citations and items are dropped, nothing is approved', () => {
  const version = { ...v2 };
  const validation = validateRelease(version, ev2);
  const raw = {
    overallAssessment: { level: 'READY', reason: 'ok' },
    impactClassification: [{ releaseItemId: 'behaviour-01', impactLevel: 'high', reason: 'x', affectedUsers: ['A'], citations: [] }, { releaseItemId: 'feature-99', impactLevel: 'LOW', reason: 'x' }],
    unsupportedClaims: [{ claim: 'Fully stable', reason: 'r', supportingEvidence: [{ type: 'qa_evidence', itemId: 'evidence-01' }, { type: 'qa_evidence', itemId: 'evidence-77' }, 'Made up evidence'], missingEvidence: ['retry'] }],
    risks: [{ title: 'R', description: 'D', severity: 'high', citations: [{ type: 'release_item', itemId: 'nope-1' }] }],
    technicalSummary: [{ statement: 'Retry changed.', section: 'whats_new', citations: [{ type: 'release_item', itemId: 'behaviour-01' }, { type: 'qa_evidence', itemId: 'bad' }] }],
    stakeholderSummary: ['Plain string statement'],
  };
  const { analysis, statements } = normalizeAnalysis(raw, { version, qaEvidence: ev2, validation });
  assert.equal(analysis.impactClassification.length, 1);
  assert.equal(analysis.impactClassification[0].impactLevel, 'HIGH');
  assert.equal(analysis.unsupportedClaims[0].supportingEvidence.length, 1);
  assert.equal(analysis.overallAssessment.level, 'NEEDS_REVIEW');
  assert.ok(analysis.meta.droppedCitations >= 3);
  assert.ok(statements.every((s) => s.status === undefined));
  assert.equal(statements.find((s) => s.content === 'Plain string statement').uncited, true);
});

test('ai parse: tolerates fences and rejects non-JSON', () => {
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.throws(() => parseModelJson('no json here'));
});
