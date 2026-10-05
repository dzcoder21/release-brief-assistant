import { Statement } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../utils/audit.js';
import { loadStatement, loadVersion } from '../utils/access.js';
import { statementListQuery } from '../validators/schemas.js';
import { countsFor, refreshVersionStatus } from '../services/versioning/versionStatusService.js';

export const listStatements = asyncHandler(async (req, res) => {
  const { version } = await loadVersion(req.user, req.params.id);
  const q = statementListQuery.parse(req.query);
  const filter = { releaseVersionId: version._id };
  if (q.status) filter.status = q.status;
  if (q.type) filter.type = q.type;
  const [statements, counts] = await Promise.all([Statement.find(filter).sort({ order: 1 }).lean(), countsFor(version._id)]);
  res.json({ statements, counts, versionStatus: version.status });
});

async function review(req, res, action, mutate) {
  const { statement, version, release } = await loadStatement(req.user, req.params.id);
  if (version.status === 'FINALIZED') throw new ApiError(409, 'This version is finalized. Statements can no longer be changed.', 'VERSION_FINALIZED');
  if (version.status === 'ANALYZING') throw new ApiError(409, 'Analysis is running. Wait for it to finish before reviewing.', 'ANALYSIS_RUNNING');

  mutate(statement, req.body);
  await statement.save();
  const updated = await refreshVersionStatus(version._id);
  await audit({ user: req.user, action, entity: 'Statement', entityId: statement._id, releaseId: release._id, metadata: { version: version.version, status: statement.status } });
  res.json({ statement, counts: await countsFor(version._id), versionStatus: updated.status });
}

const stamp = (statement, user) => {
  statement.reviewedBy = user._id;
  statement.reviewedAt = new Date();
};

export const updateStatement = asyncHandler((req, res) =>
  review(req, res, 'Statement edited', (s, body) => {
    if (body.reviewerNote !== undefined) s.reviewerNote = body.reviewerNote;
    const current = s.editedContent || s.content;
    if (body.editedContent !== undefined && body.editedContent !== current) {
      s.editedContent = body.editedContent === s.content ? '' : body.editedContent;
      s.status = s.editedContent ? 'EDITED' : 'APPROVED';
      stamp(s, req.user);
    }
  })
);

export const approveStatement = asyncHandler((req, res) =>
  review(req, res, 'Statement approved', (s, body) => {
    if (body.reviewerNote !== undefined) s.reviewerNote = body.reviewerNote;
    s.status = 'APPROVED';
    stamp(s, req.user);
  })
);

export const rejectStatement = asyncHandler((req, res) =>
  review(req, res, 'Statement rejected', (s, body) => {
    if (body.reviewerNote !== undefined) s.reviewerNote = body.reviewerNote;
    s.status = 'REJECTED';
    stamp(s, req.user);
  })
);

// Undo a review decision: back to PENDING, or back to STALE for carried statements that are still stale.
export const resetStatement = asyncHandler((req, res) =>
  review(req, res, 'Statement reset', (s) => {
    s.editedContent = '';
    s.status = s.origin === 'CARRIED' ? (s.staleReasons?.length ? 'STALE' : s.carriedStatus || 'APPROVED') : 'PENDING';
    s.reviewedBy = null;
    s.reviewedAt = null;
  })
);
