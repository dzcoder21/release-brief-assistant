import { QAEvidence, Statement, User } from '../../models/index.js';
import { ApiError } from '../../utils/ApiError.js';
import { audit } from '../../utils/audit.js';
import { STATEMENT_SECTIONS } from '../../utils/constants.js';
import { validateRelease } from '../validation/releaseValidationService.js';
import { countsFor, syncRelease } from './versionStatusService.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Explains why a version can or cannot be finalized: ERROR blocks, WARNING and INFO do not. */
export async function getFinalizationCheck(version) {
  const evidence = await QAEvidence.find({ releaseVersionId: version._id }).lean();
  const validation = validateRelease(version, evidence);
  const counts = await countsFor(version._id);
  const blockers = [];
  const warnings = [];

  if (version.status === 'FINALIZED') blockers.push({ severity: 'ERROR', code: 'ALREADY_FINALIZED', message: 'This version is already finalized.' });
  for (const e of validation.errors) blockers.push({ severity: 'ERROR', code: e.code, message: e.message, section: e.section });
  if (!version.aiAnalysis) blockers.push({ severity: 'ERROR', code: 'ANALYSIS_REQUIRED', message: 'AI analysis has not completed, so there are no statements to review.' });
  if (counts.PENDING) blockers.push({ severity: 'ERROR', code: 'PENDING_STATEMENTS', message: `${plural(counts.PENDING, 'statement')} still need review.` });
  if (counts.STALE) blockers.push({ severity: 'ERROR', code: 'STALE_STATEMENTS', message: `${plural(counts.STALE, 'statement')} may be stale and need a decision.` });
  if (version.aiAnalysis && counts.APPROVED + counts.EDITED === 0) blockers.push({ severity: 'ERROR', code: 'NOTHING_APPROVED', message: 'Approve or edit at least one statement so the brief has reviewed content.' });

  for (const w of validation.warnings) warnings.push({ severity: 'WARNING', code: w.code, message: w.message });
  const analysis = version.aiAnalysis;
  if (analysis?.unsupportedClaims?.length) warnings.push({ severity: 'WARNING', code: 'UNSUPPORTED_CLAIMS', message: `${plural(analysis.unsupportedClaims.length, 'claim')} lack supporting QA evidence.` });
  const highMissing = (analysis?.missingInformation || []).filter((m) => m.severity === 'HIGH').length;
  if (highMissing) warnings.push({ severity: 'WARNING', code: 'HIGH_MISSING_INFO', message: `${plural(highMissing, 'high-severity information gap')} reported by the AI.` });

  return { canFinalize: blockers.length === 0, blockers, warnings, info: validation.info.map((i) => ({ severity: 'INFO', code: i.code, message: i.message })), counts };
}

export async function finalizeVersion({ version, release, user, confirm }) {
  if (!confirm) throw new ApiError(400, 'Finalization must be explicitly confirmed by a person.', 'CONFIRMATION_REQUIRED');
  const check = await getFinalizationCheck(version);
  if (!check.canFinalize) throw new ApiError(409, 'This version cannot be finalized yet.', 'FINALIZATION_BLOCKED', check.blockers);
  version.status = 'FINALIZED';
  version.finalizedBy = user._id;
  version.finalizedAt = new Date();
  await version.save();
  await syncRelease(version.releaseId);
  await audit({ user, action: 'Release finalized', entity: 'ReleaseVersion', entityId: version._id, releaseId: release._id, metadata: { version: version.version, warnings: check.warnings.length } });
  return version;
}

/** Final brief: only human-reviewed statements (approved or edited) are included. */
export async function buildBrief({ version, release }) {
  const evidence = await QAEvidence.find({ releaseVersionId: version._id }).sort({ evidenceId: 1 }).lean();
  const statements = await Statement.find({ releaseVersionId: version._id, status: { $in: ['APPROVED', 'EDITED'] } }).sort({ order: 1 }).lean();
  const finalizer = version.finalizedBy ? await User.findById(version.finalizedBy).select('name') : null;

  const shaped = statements.map((s) => {
    const edited = Boolean(s.editedContent);
    return {
      id: s._id,
      type: s.type,
      section: s.section,
      content: edited ? s.editedContent : s.content,
      originalContent: edited ? s.content : null,
      citations: s.citations.filter((c) => !c.missing),
      reviewerNote: s.reviewerNote,
      badges: {
        reviewed: true,
        aiGenerated: !edited,
        humanEdited: edited,
        evidenceBacked: s.citations.some((c) => !c.missing),
      },
    };
  });

  const sections = Object.entries(STATEMENT_SECTIONS)
    .map(([key, label]) => ({ key, label, statements: shaped.filter((s) => s.section === key) }))
    .filter((s) => s.key !== 'OTHER' || s.statements.length);

  const sourceItems = [];
  const seen = new Set();
  for (const s of shaped) {
    for (const c of s.citations) {
      const k = `${c.type}:${c.itemId}`;
      if (!seen.has(k)) {
        seen.add(k);
        sourceItems.push(c);
      }
    }
  }

  return {
    overview: {
      releaseName: release.name,
      version: version.version,
      releaseDate: version.releaseDate,
      status: version.status,
      finalized: version.status === 'FINALIZED',
      finalizedAt: version.finalizedAt,
      finalizedBy: finalizer?.name || null,
      riskLevel: version.riskLevel,
      counts: { features: version.completedFeatures.length, bugFixes: version.bugFixes.length, statements: shaped.length },
    },
    sections,
    qaEvidence: evidence,
    sourceItems,
    affectedUserGroups: version.affectedUserGroups,
  };
}
