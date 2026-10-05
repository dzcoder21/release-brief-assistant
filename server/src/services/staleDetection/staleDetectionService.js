import { Statement, ReleaseVersion, QAEvidence } from '../../models/index.js';
import { SECTIONS, SECTION_KEYS } from '../../utils/constants.js';
import { diffItem, diffEvidence } from '../../utils/diff.js';

const FIELD_LABEL = { title: 'title', description: 'description', affectedUsers: 'affected users', reference: 'reference', status: 'result', source: 'source' };

const CODE_BY_SECTION = {
  completedFeatures: 'ITEM_MODIFIED',
  bugFixes: 'ITEM_MODIFIED',
  changedBehaviour: 'BEHAVIOUR_CHANGED',
  qaSummary: 'ITEM_MODIFIED',
  knownLimitations: 'LIMITATION_CHANGED',
  migrationNotes: 'MIGRATION_CHANGED',
  affectedUserGroups: 'AFFECTED_USERS_CHANGED',
};

const STOP = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'will', 'release', 'version', 'remains', 'remain', 'unchanged', 'changed', 'changes', 'change', 'behaviour', 'behavior', 'same', 'before', 'there', 'were', 'does', 'their', 'which', 'required', 'needed']);
const stem = (t) => (t.length > 4 && t.endsWith('s') ? t.slice(0, -1) : t);
const tokens = (s) => new Set((String(s || '').toLowerCase().match(/[a-z0-9]{4,}/g) || []).map(stem).filter((t) => !STOP.has(t)));

const RULES = {
  noMigration: /\bno (data |database |schema )?migrations?\b|\bmigrations? (is |are )?(not|n't) (required|needed|necessary)|\bwithout (any )?(data |database )?migrations?\b|\bno (configuration|config)( changes?| updates?)? (is |are )?(required|needed)/,
  unchanged: /\b(unchanged|not changed|no (behaviou?ral |functional )?changes?|remains? (the same|unchanged)|same as before)\b/,
  noLimitations: /\bno (known )?(limitations?|issues|caveats)\b/,
  allPassed: /\b(all|every) (qa |the |automated )?tests? (have )?passed\b|\bfully (tested|validated|stable|verified)\b|\bno (test )?failures?\b|\bpasses? all\b/,
  noUserImpact: /\bno (user|customer|client)[- ]?(facing )?impact\b|\b(does not|doesn't|will not|won't) (affect|impact) (any |existing )?(users|customers|clients)\b/,
};

function indexItems(version) {
  const map = new Map();
  for (const section of SECTION_KEYS) for (const item of version[section] || []) map.set(item.itemId, { section, item });
  return map;
}

function sectionDelta(prev, next, section) {
  const before = new Map((prev[section] || []).map((i) => [i.itemId, i]));
  const after = next[section] || [];
  const added = after.filter((i) => !before.has(i.itemId));
  const modified = after.filter((i) => before.has(i.itemId) && diffItem(before.get(i.itemId), i).length);
  return { added, modified, changed: [...added, ...modified] };
}

const quote = (items) => items.map((i) => `"${i.title}"`).join(', ');

/**
 * Decides whether an earlier, human-reviewed statement may no longer be true for a new version.
 * Pure function. `prev` and `next` are `{ version, evidence }`.
 * Returns a list of reasons; an empty list means no evidence of staleness was found.
 */
export function detectStale({ statement, prev, next }) {
  const text = String(statement.editedContent || statement.content || '').toLowerCase();
  const nv = next.version.version;
  const reasons = [];
  const add = (code, message, extra = {}) => {
    if (!reasons.some((r) => r.message === message)) reasons.push({ code, message, ...extra });
  };

  const prevItems = indexItems(prev.version);
  const nextItems = indexItems(next.version);
  const prevEvidence = new Map(prev.evidence.map((e) => [e.evidenceId, e]));
  const nextEvidence = new Map(next.evidence.map((e) => [e.evidenceId, e]));

  // 1. Changed or deleted sources that the statement cites
  for (const citation of statement.citations || []) {
    if (citation.type === 'release_item') {
      const before = prevItems.get(citation.itemId);
      if (!before) continue;
      const after = nextItems.get(citation.itemId);
      const noun = SECTIONS[before.section].singular;
      if (!after) {
        add('SOURCE_DELETED', `The cited ${noun} "${before.item.title}" was removed in v${nv}.`, { citation });
        continue;
      }
      const changes = diffItem(before.item, after.item);
      if (changes.length) {
        const fields = changes.map((c) => FIELD_LABEL[c.field]).join(', ');
        add(CODE_BY_SECTION[after.section], `The cited ${noun} "${after.item.title}" was modified in v${nv} (${fields}).`, { citation, changes });
      }
    } else if (citation.type === 'qa_evidence') {
      const before = prevEvidence.get(citation.itemId);
      if (!before) continue;
      const after = nextEvidence.get(citation.itemId);
      if (!after) {
        add('QA_REMOVED', `The cited QA evidence "${before.title}" was removed in v${nv}.`, { citation });
        continue;
      }
      const changes = diffEvidence(before, after);
      if (changes.length) {
        const resultChanged = changes.some((c) => c.field === 'status');
        add(resultChanged ? 'QA_RESULT_CHANGED' : 'QA_CHANGED', `The cited QA evidence "${after.title}" ${resultChanged ? `changed result (${before.status} → ${after.status})` : 'was modified'} in v${nv}.`, { citation, changes });
      }
    }
  }

  // 2. Claims about the absence of change, which new information can silently contradict
  if (RULES.noMigration.test(text)) {
    const { changed } = sectionDelta(prev.version, next.version, 'migrationNotes');
    if (changed.length) add('MIGRATION_CHANGED', `The statement says no migration or configuration change is needed, but v${nv} adds or changes migration notes: ${quote(changed)}.`);
  }

  if (RULES.unchanged.test(text)) {
    const topic = tokens(text);
    const { changed } = sectionDelta(prev.version, next.version, 'changedBehaviour');
    const relevant = changed.filter((item) => {
      if (topic.size === 0) return true;
      const itemTokens = tokens(`${item.title} ${item.description}`);
      return [...topic].some((t) => itemTokens.has(t));
    });
    if (relevant.length) add('BEHAVIOUR_CHANGED', `The statement says behaviour is unchanged, but v${nv} lists changed behaviour: ${quote(relevant)}.`);
  }

  if (RULES.noLimitations.test(text)) {
    const { changed } = sectionDelta(prev.version, next.version, 'knownLimitations');
    if (changed.length) add('LIMITATION_CHANGED', `The statement says there are no known limitations, but v${nv} adds or changes limitations: ${quote(changed)}.`);
  }

  if (RULES.allPassed.test(text)) {
    const problems = next.evidence.filter((e) => {
      if (e.status === 'PASSED') return false;
      const before = prevEvidence.get(e.evidenceId);
      return !before || before.status !== e.status;
    });
    if (problems.length) add('QA_RESULT_CHANGED', `The statement claims full test success, but v${nv} has QA evidence that is not passing: ${problems.map((e) => `"${e.title}" (${e.status})`).join(', ')}.`);
  }

  if (RULES.noUserImpact.test(text)) {
    const groups = sectionDelta(prev.version, next.version, 'affectedUserGroups').changed;
    const behaviour = sectionDelta(prev.version, next.version, 'changedBehaviour').added;
    const changed = [...groups, ...behaviour];
    if (changed.length) add('AFFECTED_USERS_CHANGED', `The statement says users are not affected, but v${nv} adds or changes affected users or behaviour: ${quote(changed)}.`);
  }

  return reasons;
}

async function loadSnapshot(version) {
  const evidence = await QAEvidence.find({ releaseVersionId: version._id }).lean();
  return { version: version.toObject ? version.toObject() : version, evidence };
}

/**
 * Copies the human-reviewed statements of the previous version into a new version and flags the
 * ones that the new package may have invalidated. The previous version is never modified.
 */
export async function carryForward({ version, prevVersion }) {
  if (!prevVersion) return [];
  const prevStatements = await Statement.find({ releaseVersionId: prevVersion._id, status: { $in: ['APPROVED', 'EDITED'] } }).sort({ order: 1 }).lean();
  if (!prevStatements.length) return [];

  const prev = await loadSnapshot(prevVersion);
  const next = await loadSnapshot(version);
  const nextEvidenceIds = new Set(next.evidence.map((e) => e.evidenceId));
  const nextItemIds = new Set(SECTION_KEYS.flatMap((k) => (next.version[k] || []).map((i) => i.itemId)));

  const docs = prevStatements.map((s, index) => {
    const citations = (s.citations || []).map((c) => ({
      ...c,
      missing: (c.type === 'release_item' && !nextItemIds.has(c.itemId)) || (c.type === 'qa_evidence' && !nextEvidenceIds.has(c.itemId)),
    }));
    const reasons = detectStale({ statement: { ...s, citations }, prev, next });
    return {
      releaseVersionId: version._id,
      type: s.type,
      section: s.section,
      content: s.content,
      editedContent: s.editedContent || '',
      citations: citations.filter((c) => c.type === 'release_item' || c.type === 'qa_evidence'),
      status: reasons.length ? 'STALE' : s.status,
      reviewerNote: '',
      origin: 'CARRIED',
      carriedFromStatementId: s._id,
      carriedFromVersion: prevVersion.version,
      carriedStatus: s.status,
      staleReasons: reasons,
      order: 1000 + index,
    };
  });
  return Statement.insertMany(docs);
}

/**
 * Re-evaluates carried statements that nobody has acted on yet, e.g. after the draft package changed.
 */
export async function refreshCarried(version) {
  if (!version.basedOnVersionId) return;
  const carried = await Statement.find({ releaseVersionId: version._id, origin: 'CARRIED', reviewedAt: null });
  if (!carried.length) return;
  const prevVersion = await ReleaseVersion.findById(version.basedOnVersionId);
  if (!prevVersion) return;
  const prev = await loadSnapshot(prevVersion);
  const next = await loadSnapshot(version);
  const nextEvidenceIds = new Set(next.evidence.map((e) => e.evidenceId));
  const nextItemIds = new Set(SECTION_KEYS.flatMap((k) => (next.version[k] || []).map((i) => i.itemId)));

  for (const statement of carried) {
    statement.citations.forEach((c) => {
      c.missing = (c.type === 'release_item' && !nextItemIds.has(c.itemId)) || (c.type === 'qa_evidence' && !nextEvidenceIds.has(c.itemId));
    });
    const reasons = detectStale({ statement: statement.toObject(), prev, next });
    statement.staleReasons = reasons;
    statement.status = reasons.length ? 'STALE' : statement.carriedStatus || 'APPROVED';
    await statement.save();
  }
}
