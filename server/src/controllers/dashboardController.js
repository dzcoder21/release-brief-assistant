import { Release, ReleaseVersion, Statement, AuditLog } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ownerScope } from '../utils/access.js';
import { statementCounts } from '../services/versioning/versionStatusService.js';

export const summary = asyncHandler(async (req, res) => {
  const scope = ownerScope(req.user);
  const [total, draft, needsReview, finalized, highRisk, recentReleases, recentActivity] = await Promise.all([
    Release.countDocuments(scope),
    Release.countDocuments({ ...scope, status: 'DRAFT' }),
    Release.countDocuments({ ...scope, status: { $in: ['NEEDS_REVIEW', 'IN_REVIEW'] } }),
    Release.countDocuments({ ...scope, status: 'FINALIZED' }),
    Release.countDocuments({ ...scope, riskLevel: 'HIGH' }),
    Release.find(scope).sort({ updatedAt: -1 }).limit(6).lean(),
    AuditLog.find(req.user.role === 'ADMIN' ? {} : { user: req.user._id }).sort({ createdAt: -1 }).limit(10).populate('user', 'name').lean(),
  ]);
  res.json({ kpis: { total, draft, needsReview, finalized, highRisk }, recentReleases, recentActivity });
});

export const activity = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'ADMIN' ? {} : { user: req.user._id };
  if (req.query.releaseId) filter.releaseId = req.query.releaseId;
  const limit = Math.min(Number(req.query.limit) || 25, 100);
  res.json({ items: await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).populate('user', 'name').lean() });
});

export const attention = asyncHandler(async (req, res) => {
  const releases = await Release.find(ownerScope(req.user)).select('name').lean();
  const names = new Map(releases.map((r) => [String(r._id), r.name]));
  const versions = await ReleaseVersion.find({ releaseId: { $in: releases.map((r) => r._id) }, status: { $in: ['NEEDS_REVIEW', 'IN_REVIEW'] } })
    .sort({ updatedAt: -1 }).limit(8).select('version status releaseId').lean();
  const counts = await statementCounts(versions.map((v) => v._id));
  res.json({
    items: versions.map((v) => {
      const c = counts.get(String(v._id));
      return { versionId: v._id, releaseId: v.releaseId, releaseName: names.get(String(v.releaseId)), version: v.version, status: v.status, pending: c.PENDING, stale: c.STALE };
    }),
  });
});

export const analytics = asyncHandler(async (req, res) => {
  const scope = ownerScope(req.user);
  const releases = await Release.find(scope).select('_id').lean();
  const releaseIds = releases.map((r) => r._id);
  const versions = await ReleaseVersion.find({ releaseId: { $in: releaseIds } }).select('_id aiAnalysis.unsupportedClaims aiAnalysis.missingInformation aiAnalysis.risks').lean();
  const versionIds = versions.map((v) => v._id);

  const group = (field) => Release.aggregate([{ $match: scope }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  const [byStatus, byRisk, byMonth, statementRows] = await Promise.all([
    group('status'),
    group('riskLevel'),
    Release.aggregate([{ $match: scope }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Statement.aggregate([{ $match: { releaseVersionId: { $in: versionIds } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r._id ?? 'NONE', r.n]));
  const sum = (pick) => versions.reduce((t, v) => t + (pick(v)?.length || 0), 0);

  res.json({
    releasesByStatus: toMap(byStatus),
    releasesByRisk: toMap(byRisk),
    releasesByMonth: byMonth.map((r) => ({ month: r._id, count: r.n })),
    statementsByStatus: toMap(statementRows),
    findings: {
      unsupportedClaims: sum((v) => v.aiAnalysis?.unsupportedClaims),
      missingInformation: sum((v) => v.aiAnalysis?.missingInformation),
      risks: sum((v) => v.aiAnalysis?.risks),
    },
  });
});
