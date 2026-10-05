import { SECTIONS, REQUIRED_SECTIONS } from '../../utils/constants.js';

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

const issue = (severity, code, message, extra = {}) => ({
  id: [code, extra.section, extra.itemId].filter(Boolean).join(':'),
  severity,
  code,
  message,
  ...extra,
});

/**
 * Deterministic readiness checks. Pure function: no AI, no I/O.
 * An empty section is an ERROR unless the author explicitly declared it as "None".
 */
export function validateRelease(version, qaEvidence = []) {
  const errors = [];
  const warnings = [];
  const info = [];
  const missingSections = [];
  const none = new Set(version.noneSections || []);

  if (!SEMVER.test(version.version || '')) {
    errors.push(issue('ERROR', 'INVALID_VERSION', 'Version must follow semantic versioning, for example 1.2.0.'));
  }
  if (!version.releaseDate) {
    warnings.push(issue('WARNING', 'MISSING_RELEASE_DATE', 'No release date has been set.'));
  }

  for (const key of REQUIRED_SECTIONS) {
    const label = SECTIONS[key].label;
    const items = version[key] || [];

    if (items.length === 0) {
      if (none.has(key)) {
        info.push(issue('INFO', 'SECTION_NONE_DECLARED', `${label}: "None" was explicitly declared.`, { section: key }));
      } else {
        missingSections.push(key);
        errors.push(issue('ERROR', 'MISSING_SECTION', `${label} is empty. Add at least one item or mark the section as "None".`, { section: key }));
      }
      continue;
    }

    if (none.has(key)) {
      warnings.push(issue('WARNING', 'NONE_CONFLICT', `${label} is marked as "None" but also contains items.`, { section: key }));
    }

    for (const item of items) {
      if (!item.title?.trim()) {
        errors.push(issue('ERROR', 'ITEM_MISSING_TITLE', `An item in ${label} has no title.`, { section: key, itemId: item.itemId }));
        continue;
      }
      if (!item.description?.trim()) {
        warnings.push(issue('WARNING', 'ITEM_MISSING_DESCRIPTION', `"${item.title}" in ${label} has no description.`, { section: key, itemId: item.itemId }));
      }
      if ((key === 'completedFeatures' || key === 'changedBehaviour') && !(item.affectedUsers || []).length) {
        warnings.push(issue('WARNING', 'ITEM_NO_AFFECTED_USERS', `"${item.title}" does not say which users are affected.`, { section: key, itemId: item.itemId }));
      }
    }
  }

  if ((version.changedBehaviour || []).length && none.has('migrationNotes')) {
    info.push(issue('INFO', 'CONFIRM_NO_MIGRATION', 'Behaviour changed and no migration is declared. Confirm that existing users need no action.', { section: 'migrationNotes' }));
  }

  if (qaEvidence.length === 0) {
    warnings.push(issue('WARNING', 'NO_QA_EVIDENCE', 'No QA evidence has been supplied. Claims about testing cannot be supported.', { section: 'qaSummary' }));
  }
  for (const ev of qaEvidence) {
    if (!ev.title?.trim()) {
      errors.push(issue('ERROR', 'EVIDENCE_MISSING_TITLE', 'A QA evidence entry has no title.', { itemId: ev.evidenceId }));
    } else if (ev.status === 'FAILED') {
      warnings.push(issue('WARNING', 'QA_FAILED', `QA evidence "${ev.title}" is marked as failed.`, { itemId: ev.evidenceId }));
    } else if (ev.status === 'NOT_RUN') {
      warnings.push(issue('WARNING', 'QA_NOT_RUN', `QA evidence "${ev.title}" was not executed.`, { itemId: ev.evidenceId }));
    } else if (ev.status === 'PARTIAL') {
      warnings.push(issue('WARNING', 'QA_PARTIAL', `QA evidence "${ev.title}" only partially passed.`, { itemId: ev.evidenceId }));
    }
  }

  return { isComplete: errors.length === 0, missingSections, warnings, errors, info, checkedAt: new Date().toISOString() };
}
