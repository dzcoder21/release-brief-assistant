import mongoose from 'mongoose';
import { Release, ReleaseVersion, Statement } from '../../models/index.js';
import { STATEMENT_STATUSES } from '../../utils/constants.js';

export const emptyCounts = () => ({ total: 0, ...Object.fromEntries(STATEMENT_STATUSES.map((s) => [s, 0])) });

/** Returns Map<versionId string, counts> for one or many versions. */
export async function statementCounts(versionIds) {
  const ids = (Array.isArray(versionIds) ? versionIds : [versionIds]).map((id) => new mongoose.Types.ObjectId(String(id)));
  const rows = await Statement.aggregate([
    { $match: { releaseVersionId: { $in: ids } } },
    { $group: { _id: { v: '$releaseVersionId', s: '$status' }, n: { $sum: 1 } } },
  ]);
  const map = new Map(ids.map((id) => [String(id), emptyCounts()]));
  for (const row of rows) {
    const counts = map.get(String(row._id.v));
    counts[row._id.s] = row.n;
    counts.total += row.n;
  }
  return map;
}

export async function countsFor(versionId) {
  return (await statementCounts(versionId)).get(String(versionId));
}

/** Keeps the release document in step with its most recently created version. */
export async function syncRelease(releaseId) {
  const latest = await ReleaseVersion.findOne({ releaseId }).sort({ createdAt: -1 }).select('version status riskLevel');
  if (!latest) return;
  await Release.findByIdAndUpdate(releaseId, {
    currentVersion: latest.version,
    currentVersionId: latest._id,
    status: latest.status,
    riskLevel: latest.riskLevel || null,
  });
}

/**
 * Derives the review status from statement states. Never touches draft, analyzing or finalized versions.
 */
export async function refreshVersionStatus(versionId) {
  const version = await ReleaseVersion.findById(versionId);
  if (!version || ['DRAFT', 'ANALYZING', 'FINALIZED'].includes(version.status)) return version;

  const counts = await countsFor(version._id);
  let status;
  if (counts.PENDING + counts.STALE > 0) {
    const touched = await Statement.exists({ releaseVersionId: version._id, reviewedAt: { $ne: null } });
    status = touched ? 'IN_REVIEW' : 'NEEDS_REVIEW';
  } else {
    status = 'REVIEWED';
  }
  if (status !== version.status) {
    version.status = status;
    await version.save();
    await syncRelease(version.releaseId);
  }
  return version;
}
