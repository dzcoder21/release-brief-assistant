import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { User, Release, ReleaseVersion, Statement, QAEvidence, AuditLog } from '../models/index.js';
import { createReleaseWithFirstVersion, createVersion } from '../services/versioning/versioningService.js';
import { persistAnalysis } from '../services/ai/aiAnalysisService.js';
import { validateRelease } from '../services/validation/releaseValidationService.js';
import { finalizeVersion } from '../services/versioning/finalizationService.js';
import { refreshVersionStatus } from '../services/versioning/versionStatusService.js';

const DEMO = { name: 'Demo Developer', email: 'demo@example.com', password: 'Demo@12345' };
const cite = (type, itemId) => ({ type, itemId });
const item = (itemId, title, description, affectedUsers = [], reference = '') => ({ itemId, title, description, affectedUsers, reference });

// Canned model outputs. They go through the same normalization and citation checks as live AI output.
const paymentV100 = {
  overallAssessment: { level: 'READY', reason: 'Small, well-covered release. The checkout regression suite passed.' },
  impactClassification: [
    { releaseItemId: 'feature-01', impactLevel: 'MEDIUM', reason: 'Checkout screens changed for all shoppers.', affectedUsers: ['Checkout users'], citations: [cite('release_item', 'feature-01')] },
    { releaseItemId: 'bugfix-01', impactLevel: 'LOW', reason: 'Corrects display rounding only.', affectedUsers: ['Checkout users'], citations: [cite('release_item', 'bugfix-01')] },
  ],
  missingInformation: [],
  unsupportedClaims: [],
  risks: [],
  technicalSummary: [
    { statement: 'The checkout flow was redesigned and the checkout regression test passed.', section: 'WHATS_NEW', citations: [cite('release_item', 'feature-01'), cite('qa_evidence', 'evidence-01')] },
    { statement: 'Invoice total rounding was corrected for multi-item orders.', section: 'BUG_FIXES', citations: [cite('release_item', 'bugfix-01')] },
  ],
  stakeholderSummary: [
    { statement: 'Payment behaviour remains unchanged.', section: 'CHANGED_BEHAVIOUR', citations: [cite('release_item', 'behaviour-01')] },
  ],
};

const paymentV110 = {
  overallAssessment: { level: 'HIGH_RISK', reason: 'Retry behaviour changed and existing customers must migrate, but the retry test was not executed.' },
  impactClassification: [
    { releaseItemId: 'behaviour-01', impactLevel: 'HIGH', reason: 'Failed payments are now retried automatically, which changes what customers are charged and when.', affectedUsers: ['Existing customers'], citations: [cite('release_item', 'behaviour-01'), cite('release_item', 'migration-01')] },
    { releaseItemId: 'feature-02', impactLevel: 'MEDIUM', reason: 'New retry capability with backoff.', affectedUsers: ['Existing customers'], citations: [cite('release_item', 'feature-02')] },
    { releaseItemId: 'feature-01', impactLevel: 'LOW', reason: 'Unchanged since the previous version.', affectedUsers: ['Checkout users'], citations: [cite('release_item', 'feature-01')] },
  ],
  missingInformation: [
    { title: 'Rollback considerations are missing', field: 'migrationNotes', severity: 'HIGH', description: 'A customer migration is required but no rollback steps are described.', reason: 'If retries misbehave, the team has no documented way to reverse the migration.', recommendation: 'Document how to reverse the migration and who decides to do so.' },
    { title: 'QA does not cover the changed payment workflow', field: 'qaSummary', severity: 'HIGH', description: 'The retry test was not executed.', reason: 'The main behaviour change has no passing test.', recommendation: 'Run and record the payment retry validation.' },
  ],
  unsupportedClaims: [
    {
      claim: 'Payment processing is fully stable.',
      reason: 'Only the checkout test passed. The payment retry test was not executed, so stability of the changed retry behaviour is unproven.',
      supportingEvidence: [cite('qa_evidence', 'evidence-01')],
      missingEvidence: ['Payment retry validation (evidence-02 was not executed)'],
      citations: [cite('release_item', 'qasum-02')],
    },
  ],
  risks: [
    { title: 'Untested retry behaviour', description: 'Retry with exponential backoff shipped without an executed retry test; customers could be charged unexpectedly.', severity: 'HIGH', citations: [cite('release_item', 'feature-02'), cite('qa_evidence', 'evidence-02')] },
    { title: 'Customer migration required', description: 'Existing customers must be migrated before the new retry behaviour applies.', severity: 'MEDIUM', citations: [cite('release_item', 'migration-01')] },
  ],
  technicalSummary: [
    { statement: 'Failed payments are now retried up to three times with exponential backoff.', section: 'WHATS_NEW', citations: [cite('release_item', 'feature-02')] },
    { statement: 'Payment retry behaviour changed compared with v1.0.0.', section: 'CHANGED_BEHAVIOUR', citations: [cite('release_item', 'behaviour-01')] },
    { statement: 'The checkout test passed; the payment retry test was not executed.', section: 'QA_VALIDATION', citations: [cite('qa_evidence', 'evidence-01'), cite('qa_evidence', 'evidence-02')] },
    { statement: 'A migration script must be run for existing customers.', section: 'MIGRATION', citations: [cite('release_item', 'migration-01')] },
    { statement: 'Retry backoff settings cannot be configured per merchant.', section: 'LIMITATIONS', citations: [cite('release_item', 'limitation-01')] },
  ],
  stakeholderSummary: [
    { statement: 'Payments that fail are now tried again automatically, so fewer customers will need to retry by hand.', section: 'EXECUTIVE_SUMMARY', citations: [cite('release_item', 'feature-02')] },
    { statement: 'Existing customers must be migrated before the change takes effect.', section: 'REQUIRED_ACTIONS', citations: [cite('release_item', 'migration-01')] },
    { statement: 'The new retry behaviour has not yet been tested, so we cannot confirm payments are fully stable.', section: 'QA_VALIDATION', citations: [cite('qa_evidence', 'evidence-02')] },
  ],
};

const reportingV100 = {
  overallAssessment: { level: 'HIGH_RISK', reason: 'A failing export test and a breaking column change affect finance users.' },
  impactClassification: [
    { releaseItemId: 'behaviour-01', impactLevel: 'HIGH', reason: 'CSV column order changed, which breaks existing finance imports.', affectedUsers: ['Finance analysts'], citations: [cite('release_item', 'behaviour-01')] },
    { releaseItemId: 'feature-01', impactLevel: 'MEDIUM', reason: 'New scheduled export option.', affectedUsers: ['Finance analysts'], citations: [cite('release_item', 'feature-01')] },
  ],
  missingInformation: [{ title: 'Import mapping guidance missing', field: 'migrationNotes', severity: 'MEDIUM', description: 'No guidance for updating existing CSV import mappings.', reason: 'Column order changed.', recommendation: 'Add steps for remapping columns.' }],
  unsupportedClaims: [],
  risks: [{ title: 'Export test failing', description: 'The CSV export test failed and is not resolved in this package.', severity: 'HIGH', citations: [cite('qa_evidence', 'evidence-01')] }],
  technicalSummary: [
    { statement: 'Scheduled CSV exports were added.', section: 'WHATS_NEW', citations: [cite('release_item', 'feature-01')] },
    { statement: 'CSV column order changed; the CSV export test is failing.', section: 'CHANGED_BEHAVIOUR', citations: [cite('release_item', 'behaviour-01'), cite('qa_evidence', 'evidence-01')] },
  ],
  stakeholderSummary: [{ statement: 'Finance teams can now schedule exports, but existing imports may need updating.', section: 'EXECUTIVE_SUMMARY', citations: [cite('release_item', 'feature-01')] }],
};

const base = (extra) => ({ description: '', noneSections: [], qaEvidence: [], ...extra });

async function analyze(versionId, raw) {
  const version = await ReleaseVersion.findById(versionId);
  const qaEvidence = await QAEvidence.find({ releaseVersionId: versionId }).lean();
  await persistAnalysis({ version, qaEvidence, validation: validateRelease(version, qaEvidence), raw });
}

async function decide(versionId, user, status, filter = {}, extra = {}) {
  await Statement.updateMany({ releaseVersionId: versionId, ...filter }, { $set: { status, reviewedBy: user._id, reviewedAt: new Date(), ...extra } });
}

async function seed() {
  await connectDb();
  await Promise.all([User, Release, ReleaseVersion, Statement, QAEvidence, AuditLog].map((m) => m.deleteMany({})));
  const user = await User.create({ name: DEMO.name, email: DEMO.email, passwordHash: await bcrypt.hash(DEMO.password, 12), role: 'USER' });

  /* ---- Payment Platform: v1.0.0 finalized, v1.1.0 with a stale statement ---- */
  const { release: payment, version: v100 } = await createReleaseWithFirstVersion({
    user,
    payload: base({
      name: 'Payment Platform',
      description: 'Checkout and payment processing services.',
      version: '1.0.0',
      releaseDate: new Date('2026-08-12'),
      completedFeatures: [item('feature-01', 'Checkout flow redesign', 'Single-page checkout with saved addresses.', ['Checkout users'], 'PAY-101')],
      bugFixes: [item('bugfix-01', 'Invoice rounding fix', 'Totals for multi-item orders are rounded per line.', ['Checkout users'], 'PAY-087')],
      changedBehaviour: [item('behaviour-01', 'Payment retry behaviour', 'Payment retry behaviour is unchanged in this release.', ['Existing customers'])],
      qaSummary: [item('qasum-01', 'Checkout regression suite', 'The checkout regression suite passed.')],
      knownLimitations: [],
      migrationNotes: [],
      affectedUserGroups: [item('usergroup-01', 'Checkout users', 'Sees the redesigned checkout.')],
      noneSections: ['knownLimitations', 'migrationNotes'],
      qaEvidence: [{ evidenceId: 'evidence-01', title: 'Checkout test', description: 'End-to-end checkout flow.', status: 'PASSED', source: 'CI run #4812' }],
    }),
  });
  await analyze(v100._id, paymentV100);
  await decide(v100._id, user, 'APPROVED');
  await refreshVersionStatus(v100._id);
  await finalizeVersion({ version: await ReleaseVersion.findById(v100._id), release: payment, user, confirm: true });

  const { version: v110 } = await createVersion({
    release: payment,
    user,
    payload: base({
      version: '1.1.0',
      releaseDate: new Date('2026-09-20'),
      completedFeatures: [
        item('feature-01', 'Checkout flow redesign', 'Single-page checkout with saved addresses.', ['Checkout users'], 'PAY-101'),
        item('feature-02', 'Payment retry with exponential backoff', 'Failed payments are retried up to three times.', ['Existing customers'], 'PAY-140'),
      ],
      bugFixes: [item('bugfix-01', 'Invoice rounding fix', 'Totals for multi-item orders are rounded per line.', ['Checkout users'], 'PAY-087')],
      changedBehaviour: [item('behaviour-01', 'Payment retry behaviour', 'Payment retry behaviour has changed: failed payments are retried automatically.', ['Existing customers'])],
      qaSummary: [
        item('qasum-01', 'Checkout regression suite', 'The checkout regression suite passed.'),
        item('qasum-02', 'Stability statement', 'Payment processing is fully stable.'),
      ],
      knownLimitations: [item('limitation-01', 'Backoff not configurable', 'Retry backoff cannot be configured per merchant.', ['Merchants'])],
      migrationNotes: [item('migration-01', 'Migrate existing customers', 'Run the customer migration script before enabling retries.', ['Existing customers'])],
      affectedUserGroups: [
        item('usergroup-01', 'Checkout users', 'Sees the redesigned checkout.'),
        item('usergroup-02', 'Existing customers', 'Affected by retry behaviour and migration.'),
      ],
      qaEvidence: [
        { evidenceId: 'evidence-01', title: 'Checkout test', description: 'End-to-end checkout flow.', status: 'PASSED', source: 'CI run #5120' },
        { evidenceId: 'evidence-02', title: 'Payment retry test', description: 'Retry and backoff scenarios.', status: 'NOT_RUN', source: 'Not executed' },
      ],
    }),
  });
  await analyze(v110._id, paymentV110);
  // A reviewer has started: one statement approved, one edited. The stale carried statement is still undecided.
  const first = await Statement.findOne({ releaseVersionId: v110._id, origin: 'AI', type: 'TECHNICAL' }).sort({ order: 1 });
  first.status = 'APPROVED';
  first.reviewedBy = user._id;
  first.reviewedAt = new Date();
  await first.save();
  const second = await Statement.findOne({ releaseVersionId: v110._id, origin: 'AI', type: 'STAKEHOLDER' }).sort({ order: 1 });
  second.editedContent = 'Failed payments are now retried automatically, so fewer customers need to retry by hand.';
  second.status = 'EDITED';
  second.reviewedBy = user._id;
  second.reviewedAt = new Date();
  await second.save();
  await refreshVersionStatus(v110._id);

  /* ---- Mobile App: incomplete draft (deterministic validation fails) ---- */
  await createReleaseWithFirstVersion({
    user,
    payload: base({
      name: 'Mobile App',
      description: 'iOS and Android clients.',
      version: '2.3.0',
      releaseDate: null,
      completedFeatures: [item('', 'Biometric login', 'Face and fingerprint sign-in.', ['All mobile users'], 'MOB-310')],
      bugFixes: [item('', 'Crash on rotate', 'Fixes a crash when rotating the order screen.', ['Android users'])],
      qaSummary: [item('', 'Manual smoke test', 'Smoke test completed on three devices.')],
      knownLimitations: [],
      changedBehaviour: [],
      migrationNotes: [],
      affectedUserGroups: [],
      noneSections: ['knownLimitations'],
      qaEvidence: [{ title: 'Smoke test', description: 'Login and checkout on 3 devices.', status: 'PASSED', source: 'QA sheet' }],
    }),
  });

  /* ---- Reporting Service: analyzed, high risk ---- */
  const { version: rv } = await createReleaseWithFirstVersion({
    user,
    payload: base({
      name: 'Reporting Service',
      description: 'Scheduled and ad-hoc finance exports.',
      version: '1.0.0',
      releaseDate: new Date('2026-10-01'),
      completedFeatures: [item('feature-01', 'Scheduled CSV exports', 'Users can schedule recurring exports.', ['Finance analysts'], 'REP-12')],
      bugFixes: [item('bugfix-01', 'Timezone in report headers', 'Headers now use the account timezone.', ['Finance analysts'])],
      changedBehaviour: [item('behaviour-01', 'CSV column order', 'Exported CSV columns are now alphabetical.', ['Finance analysts'])],
      qaSummary: [item('qasum-01', 'Export QA', 'Export tests executed; one failing.')],
      knownLimitations: [item('limitation-01', 'Max 50k rows', 'Exports are capped at 50,000 rows.', ['Finance analysts'])],
      migrationNotes: [],
      affectedUserGroups: [item('usergroup-01', 'Finance analysts', 'Consume exports in downstream tools.')],
      noneSections: ['migrationNotes'],
      qaEvidence: [
        { evidenceId: 'evidence-01', title: 'CSV export test', description: 'Large export scenario.', status: 'FAILED', source: 'CI run #77' },
        { evidenceId: 'evidence-02', title: 'Scheduler test', description: 'Recurring job fires on time.', status: 'PASSED', source: 'CI run #77' },
      ],
    }),
  });
  await analyze(rv._id, reportingV100);

  console.log('\nSeed complete.');
  console.log(`  Demo login: ${DEMO.email} / ${DEMO.password}`);
  console.log('  Payment Platform v1.1.0 contains a STALE statement ("Payment behaviour remains unchanged.").');
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});

