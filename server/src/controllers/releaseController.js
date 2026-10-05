import { Release, ReleaseVersion, Statement, QAEvidence, AuditLog } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../utils/audit.js';
import { loadRelease, ownerScope } from '../utils/access.js';
import { listReleasesQuery } from '../validators/schemas.js';
import { createReleaseWithFirstVersion } from '../services/versioning/versioningService.js';
import { statementCounts } from '../services/versioning/versionStatusService.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const versionSummary = (v, counts) => ({
  _id: v._id,
  releaseId: v.releaseId?._id || v.releaseId,
  releaseName: v.releaseId?.name,
  version: v.version,
  releaseDate: v.releaseDate,
  status: v.status,
  riskLevel: v.riskLevel,
  analysisStatus: v.analysisStatus,
  createdAt: v.createdAt,
  finalizedAt: v.finalizedAt,
  createdBy: v.createdBy?.name ? { _id: v.createdBy._id, name: v.createdBy.name } : v.createdBy,
  statementCounts: counts,
});

export const listReleases = asyncHandler(async (req, res) => {
  const q = listReleasesQuery.parse(req.query);
  const filter = ownerScope(req.user);
  if (q.status) filter.status = q.status;
  if (q.risk) filter.riskLevel = q.risk;
  if (q.q) filter.name = { $regex: escapeRegex(q.q), $options: 'i' };
  const [items, total] = await Promise.all([
    Release.find(filter).sort({ updatedAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Release.countDocuments(filter),
  ]);
  res.json({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
});

export const createRelease = asyncHandler(async (req, res) => {
  const { release, version } = await createReleaseWithFirstVersion({ user: req.user, payload: req.body });
  res.status(201).json({ release, version });
});

export const getRelease = asyncHandler(async (req, res) => {
  const release = await loadRelease(req.user, req.params.id);
  const versions = await ReleaseVersion.find({ releaseId: release._id }).sort({ createdAt: -1 }).populate('createdBy', 'name').lean();
  const counts = await statementCounts(versions.map((v) => v._id));
  res.json({ release, versions: versions.map((v) => versionSummary(v, counts.get(String(v._id)))) });
});

export const updateRelease = asyncHandler(async (req, res) => {
  const release = await loadRelease(req.user, req.params.id);
  if (req.body.name !== undefined) release.name = req.body.name;
  if (req.body.description !== undefined) release.description = req.body.description;
  await release.save();
  await audit({ user: req.user, action: 'Release updated', entity: 'Release', entityId: release._id, releaseId: release._id, metadata: { fields: Object.keys(req.body) } });
  res.json({ release });
});

export const deleteRelease = asyncHandler(async (req, res) => {
  const release = await loadRelease(req.user, req.params.id);
  if (await ReleaseVersion.exists({ releaseId: release._id, status: 'FINALIZED' })) {
    throw new ApiError(409, 'Releases with finalized versions are kept for traceability and cannot be deleted.', 'HAS_FINALIZED_VERSIONS');
  }
  const versionIds = (await ReleaseVersion.find({ releaseId: release._id }).select('_id').lean()).map((v) => v._id);
  await Promise.all([
    Statement.deleteMany({ releaseVersionId: { $in: versionIds } }),
    QAEvidence.deleteMany({ releaseVersionId: { $in: versionIds } }),
    ReleaseVersion.deleteMany({ releaseId: release._id }),
  ]);
  await Release.deleteOne({ _id: release._id });
  await AuditLog.updateMany({ releaseId: release._id }, { $unset: { releaseId: '' } });
  await audit({ user: req.user, action: 'Release deleted', entity: 'Release', entityId: release._id, metadata: { name: release.name } });
  res.json({ message: 'Release deleted' });
});
