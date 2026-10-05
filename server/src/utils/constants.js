export const ROLES = ['USER', 'ADMIN'];
export const RELEASE_STATUSES = ['DRAFT', 'ANALYZING', 'NEEDS_REVIEW', 'IN_REVIEW', 'REVIEWED', 'FINALIZED'];
export const STATEMENT_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'EDITED', 'STALE'];
export const STATEMENT_TYPES = ['TECHNICAL', 'STAKEHOLDER', 'RISK'];
export const LEVELS = ['HIGH', 'MEDIUM', 'LOW'];
export const QA_STATUSES = ['PASSED', 'FAILED', 'PARTIAL', 'NOT_RUN'];
export const CITATION_TYPES = ['release_item', 'qa_evidence', 'validation_result', 'ai_finding'];
export const ANALYSIS_STATUSES = ['NOT_RUN', 'RUNNING', 'COMPLETED', 'FAILED'];
export const ASSESSMENT_LEVELS = ['READY', 'NEEDS_REVIEW', 'HIGH_RISK'];

// Release package sections. `prefix` is used to mint stable, human-readable item ids (feature-03).
export const SECTIONS = {
  completedFeatures: { label: 'Completed Features', singular: 'feature', prefix: 'feature' },
  bugFixes: { label: 'Bug Fixes', singular: 'bug fix', prefix: 'bugfix' },
  changedBehaviour: { label: 'Changed Behaviour', singular: 'behaviour change', prefix: 'behaviour' },
  qaSummary: { label: 'QA Summary', singular: 'QA summary item', prefix: 'qasum' },
  knownLimitations: { label: 'Known Limitations', singular: 'known limitation', prefix: 'limitation' },
  migrationNotes: { label: 'Migration / Configuration Notes', singular: 'migration note', prefix: 'migration' },
  affectedUserGroups: { label: 'Affected User Groups', singular: 'affected user group', prefix: 'usergroup' },
};
export const SECTION_KEYS = Object.keys(SECTIONS);
export const EVIDENCE_PREFIX = 'evidence';

// Sections of a generated statement, in the order they appear in the final brief.
export const STATEMENT_SECTIONS = {
  EXECUTIVE_SUMMARY: 'Executive Summary',
  WHATS_NEW: "What's New",
  BUG_FIXES: 'Bug Fixes',
  CHANGED_BEHAVIOUR: 'Changed Behaviour',
  AFFECTED_USERS: 'Affected Users',
  QA_VALIDATION: 'QA Validation',
  RISKS: 'Known Risks',
  LIMITATIONS: 'Known Limitations',
  MIGRATION: 'Migration / Configuration',
  REQUIRED_ACTIONS: 'Required Actions',
  OTHER: 'Additional Notes',
};
export const STATEMENT_SECTION_KEYS = Object.keys(STATEMENT_SECTIONS);

export const ANALYSIS_STALE_MS = 5 * 60 * 1000;
export const REQUIRED_SECTIONS = SECTION_KEYS;
