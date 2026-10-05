export const SECTIONS = {
  completedFeatures: { label: 'Completed Features', singular: 'feature', addLabel: 'Add feature', titleLabel: 'Feature title', titlePlaceholder: 'e.g. Payment retry with backoff', users: true, reference: true },
  bugFixes: { label: 'Bug Fixes', singular: 'bug fix', addLabel: 'Add bug fix', titleLabel: 'Bug fix title', titlePlaceholder: 'e.g. Invoice rounding fix', users: true, reference: true },
  changedBehaviour: { label: 'Changed Behaviour', singular: 'behaviour change', addLabel: 'Add behaviour change', titleLabel: 'What changed', titlePlaceholder: 'e.g. Payment retry behaviour', users: true, reference: true },
  qaSummary: { label: 'QA Summary', singular: 'QA summary item', addLabel: 'Add QA summary', titleLabel: 'Summary title', titlePlaceholder: 'e.g. Checkout regression suite', users: false, reference: true },
  knownLimitations: { label: 'Known Limitations', singular: 'known limitation', addLabel: 'Add limitation', titleLabel: 'Limitation', titlePlaceholder: 'e.g. Backoff is not configurable', users: true, reference: false },
  migrationNotes: { label: 'Migration / Configuration Notes', singular: 'migration note', addLabel: 'Add migration note', titleLabel: 'Step or setting', titlePlaceholder: 'e.g. Run customer migration script', users: true, reference: true },
  affectedUserGroups: { label: 'Affected User Groups', singular: 'affected user group', addLabel: 'Add user group', titleLabel: 'User group', titlePlaceholder: 'e.g. Existing customers', users: false, reference: false },
};
export const SECTION_KEYS = Object.keys(SECTIONS);

export const RELEASE_STATUS = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  ANALYZING: { label: 'Analyzing', tone: 'info' },
  NEEDS_REVIEW: { label: 'Needs review', tone: 'warning' },
  IN_REVIEW: { label: 'In review', tone: 'accent' },
  REVIEWED: { label: 'Reviewed', tone: 'primary' },
  FINALIZED: { label: 'Finalized', tone: 'success' },
};

export const STATEMENT_STATUS = {
  PENDING: { label: 'Pending', tone: 'neutral', rail: 'bg-muted/40' },
  APPROVED: { label: 'Approved', tone: 'success', rail: 'bg-success' },
  EDITED: { label: 'Edited', tone: 'primary', rail: 'bg-primary' },
  REJECTED: { label: 'Rejected', tone: 'danger', rail: 'bg-danger' },
  STALE: { label: 'Stale', tone: 'warning', rail: 'bg-warning' },
};

export const LEVEL_TONE = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' };
export const ASSESSMENT = {
  READY: { label: 'Ready for review', tone: 'success' },
  NEEDS_REVIEW: { label: 'Needs review', tone: 'warning' },
  HIGH_RISK: { label: 'High risk', tone: 'danger' },
};
export const QA_STATUS = {
  PASSED: { label: 'Passed', tone: 'success' },
  FAILED: { label: 'Failed', tone: 'danger' },
  PARTIAL: { label: 'Partial', tone: 'warning' },
  NOT_RUN: { label: 'Not run', tone: 'neutral' },
};
export const QA_STATUS_KEYS = Object.keys(QA_STATUS);

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

export const TYPE_LABEL = { TECHNICAL: 'Technical', STAKEHOLDER: 'Stakeholder', RISK: 'Risk' };

export const AI_ERROR_HELP = {
  AI_NOT_CONFIGURED: 'AI is not configured on the server. Add AI_API_KEY and AI_MODEL to server/.env and restart.',
  AI_AUTH: 'The AI provider rejected the server credentials. Check AI_API_KEY.',
  AI_BAD_REQUEST: 'The AI provider rejected the request. Check AI_MODEL and AI_BASE_URL.',
  AI_RATE_LIMITED: 'The AI provider rate limit was reached. Wait a moment and retry.',
};
