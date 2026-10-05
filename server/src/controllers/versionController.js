import { Release, ReleaseVersion, QAEvidence } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadRelease, loadVersion, ownerScope } from '../utils/access.js';
import { compareQuery } from '../validators/schemas.js';
import { createVersion, updateDraftVersion } from '../services/versioning/versioningService.js';
import { countsFor, statementCounts } from '../services/versioning/versionStatusService.js';
import { getFinalizationCheck, finalizeVersion, buildBrief } from '../services/versioning/finalizationService.js';
import { validateRelease } from '../services/validation/releaseValidationService.js';
import { compareVersions } from '../services/comparison/comparisonService.js';
import { versionSummary } from './releaseController.js';

async function serialize(version, release) {
  const [qaEvidence, counts] = await Promise.all([QAEvidence.find({ releaseVersionId: version._id }).sort({ evidenceId: 1 }).lean(), countsFor(version._id)]);
  return {
    version,
    release: { _id: release._id, name: release.name, status: release.status },
    qaEvidence,
    statementCounts: counts,
    editable: version.status === 'DRAFT',
  };
}

export const listVersionsForRelease = asyncHandler(async (req, res) => {
  const release = await loadRelease(req.user, req.params.id);
  const versions = await ReleaseVersion.find({ releaseId: release._id }).sort({ createdAt: -1 }).populate('createdBy', 'name').lean();
  const counts = await statementCounts(versions.map((v) => v._id));
  res.json({ versions: versions.map((v) => versionSummary(v, counts.get(String(v._id)))) });
});

export const listAllVersions = asyncHandler(async (req, res) => {
  const releases = await Release.find(ownerScope(req.user)).select('name').lean();
  const names = new Map(releases.map((r) => [String(r._id), r.name]));
  const versions = await ReleaseVersion.find({ releaseId: { $in: releases.map((r) => r._id) } }).sort({ createdAt: -1 }).limit(200).populate('createdBy', 'name').lean();
  const counts = await statementCounts(versions.map((v) => v._id));
  res.json({ items: versions.map((v) => ({ ...versionSummary(v, counts.get(String(v._id))), releaseName: names.get(String(v.releaseId)) })) });
});

export const createReleaseVersion = asyncHandler(async (req, res) => {
  const release = await loadRelease(req.user, req.params.id);
  const { version } = await createVersion({ release, user: req.user, payload: req.body });
  res.status(201).json(await serialize(version, release));
});

export const getVersion = asyncHandler(async (req, res) => {
  const { version, release } = await loadVersion(req.user, req.params.id);
  res.json(await serialize(version, release));
});

export const updateVersion = asyncHandler(async (req, res) => {
  const { version, release } = await loadVersion(req.user, req.params.id);
  await updateDraftVersion({ version, user: req.user, payload: req.body });
  res.json(await serialize(version, release));
});

export const validateVersion = asyncHandler(async (req, res) => {
  const { version } = await loadVersion(req.user, req.params.id);
  const evidence = await QAEvidence.find({ releaseVersionId: version._id }).lean();
  const validation = validateRelease(version, evidence);
  if (version.status !== 'FINALIZED') {
    version.deterministicValidation = validation;
    version.markModified('deterministicValidation');
    await version.save();
  }
  res.json({ validation });
});

export const compare = asyncHandler(async (req, res) => {
  const { left, right } = compareQuery.parse(req.query);
  const [a, b] = await Promise.all([loadVersion(req.user, left), loadVersion(req.user, right)]);
  if (String(a.release._id) !== String(b.release._id)) throw new ApiError(400, 'Only versions of the same release can be compared.', 'DIFFERENT_RELEASES');
  const [leftEvidence, rightEvidence] = await Promise.all([
    QAEvidence.find({ releaseVersionId: a.version._id }).lean(),
    QAEvidence.find({ releaseVersionId: b.version._id }).lean(),
  ]);
  const comparison = compareVersions({ left: a.version.toObject(), right: b.version.toObject(), leftEvidence, rightEvidence });
  comparison.rightStatementCounts = await countsFor(b.version._id);
  res.json({ comparison });
});

export const finalizationCheck = asyncHandler(async (req, res) => {
  const { version } = await loadVersion(req.user, req.params.id);
  res.json(await getFinalizationCheck(version));
});

export const finalize = asyncHandler(async (req, res) => {
  const { version, release } = await loadVersion(req.user, req.params.id);
  await finalizeVersion({ version, release, user: req.user, confirm: req.body.confirm });
  res.json(await serialize(version, release));
});

export const brief = asyncHandler(async (req, res) => {
  const { version, release } = await loadVersion(req.user, req.params.id);
  res.json({ brief: await buildBrief({ version, release }) });
});
