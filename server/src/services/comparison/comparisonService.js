import { SECTIONS, SECTION_KEYS } from '../../utils/constants.js';
import { diffItem, diffEvidence } from '../../utils/diff.js';

const brief = (item) => ({ itemId: item.itemId, title: item.title, description: item.description, affectedUsers: item.affectedUsers || [] });

function compareSection(key, left, right) {
  const before = new Map((left[key] || []).map((i) => [i.itemId, i]));
  const after = new Map((right[key] || []).map((i) => [i.itemId, i]));
  const added = [];
  const removed = [];
  const changed = [];
  let unchanged = 0;

  for (const [id, item] of after) {
    if (!before.has(id)) added.push(brief(item));
    else {
      const changes = diffItem(before.get(id), item);
      if (changes.length) changed.push({ itemId: id, title: item.title, changes });
      else unchanged += 1;
    }
  }
  for (const [id, item] of before) if (!after.has(id)) removed.push(brief(item));

  return { key, label: SECTIONS[key].label, added, removed, changed, unchanged };
}

function compareEvidence(left, right) {
  const before = new Map(left.map((e) => [e.evidenceId, e]));
  const after = new Map(right.map((e) => [e.evidenceId, e]));
  const card = (e) => ({ evidenceId: e.evidenceId, title: e.title, status: e.status, description: e.description });
  const added = [...after.values()].filter((e) => !before.has(e.evidenceId)).map(card);
  const removed = [...before.values()].filter((e) => !after.has(e.evidenceId)).map(card);
  const changed = [];
  for (const [id, e] of after) {
    if (!before.has(id)) continue;
    const changes = diffEvidence(before.get(id), e);
    if (changes.length) changed.push({ evidenceId: id, title: e.title, changes });
  }
  return { added, removed, changed };
}

function compareImpact(leftVersion, rightVersion, sections) {
  const itemTitle = new Map();
  for (const key of SECTION_KEYS) for (const i of [...(leftVersion[key] || []), ...(rightVersion[key] || [])]) itemTitle.set(i.itemId, i.title);

  const affectedUsersChanged = [];
  for (const section of sections) {
    for (const entry of section.changed) {
      const change = entry.changes.find((c) => c.field === 'affectedUsers');
      if (!change) continue;
      affectedUsersChanged.push({
        itemId: entry.itemId,
        title: entry.title,
        added: change.to.filter((u) => !change.from.includes(u)),
        removed: change.from.filter((u) => !change.to.includes(u)),
      });
    }
  }

  const levels = (version) => new Map((version.aiAnalysis?.impactClassification || []).map((c) => [c.releaseItemId, c.impactLevel]));
  const leftLevels = levels(leftVersion);
  const rightLevels = levels(rightVersion);
  const bothAnalyzed = Boolean(leftVersion.aiAnalysis && rightVersion.aiAnalysis);
  const impactLevelChanged = [];
  if (bothAnalyzed) {
    for (const [id, to] of rightLevels) {
      const from = leftLevels.get(id);
      if (from && from !== to) impactLevelChanged.push({ itemId: id, title: itemTitle.get(id) || id, from, to });
    }
  }

  return {
    affectedUsersChanged,
    impactLevelChanged,
    bothAnalyzed,
    assessment: { from: leftVersion.aiAnalysis?.overallAssessment?.level || null, to: rightVersion.aiAnalysis?.overallAssessment?.level || null },
    risk: { from: leftVersion.riskLevel || null, to: rightVersion.riskLevel || null },
  };
}

/** Pure comparison of two version snapshots (plain objects). */
export function compareVersions({ left, right, leftEvidence = [], rightEvidence = [] }) {
  const sections = SECTION_KEYS.map((key) => compareSection(key, left, right));
  const qa = compareEvidence(leftEvidence, rightEvidence);
  const impact = compareImpact(left, right, sections);

  const totals = sections.reduce(
    (t, s) => ({ added: t.added + s.added.length, removed: t.removed + s.removed.length, changed: t.changed + s.changed.length }),
    { added: 0, removed: 0, changed: 0 }
  );
  return {
    left: { id: left._id, version: left.version, status: left.status },
    right: { id: right._id, version: right.version, status: right.status },
    sections,
    qa,
    impact,
    summary: {
      ...totals,
      qaChanges: qa.added.length + qa.removed.length + qa.changed.length,
      impactChanges: impact.affectedUsersChanged.length + impact.impactLevelChanged.length,
    },
  };
}
