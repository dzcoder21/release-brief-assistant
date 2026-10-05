import { Statement } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadVersion } from '../utils/access.js';
import { ANALYSIS_STALE_MS } from '../utils/constants.js';
import { markAnalysisStarted, runAnalysis } from '../services/ai/aiAnalysisService.js';
import { aiInfo } from '../services/ai/aiProvider.js';

const state = (v) => ({
  analysisStatus: v.analysisStatus,
  versionStatus: v.status,
  progress: v.analysisProgress,
  error: v.analysisError,
  startedAt: v.analysisStartedAt,
  completedAt: v.analysisCompletedAt,
  validation: v.deterministicValidation,
  analysis: v.aiAnalysis,
  riskLevel: v.riskLevel,
});

export const analyze = asyncHandler(async (req, res) => {
  const { version } = await loadVersion(req.user, req.params.id);
  if (version.status === 'FINALIZED') throw new ApiError(409, 'Finalized versions cannot be re-analyzed.', 'VERSION_FINALIZED');

  const stale = version.analysisStartedAt && Date.now() - version.analysisStartedAt.getTime() > ANALYSIS_STALE_MS;
  if (version.status === 'ANALYZING' && !stale) throw new ApiError(409, 'Analysis is already running for this version.', 'ANALYSIS_RUNNING');

  const reviewed = await Statement.countDocuments({ releaseVersionId: version._id, origin: 'AI', reviewedAt: { $ne: null } });
  if (reviewed > 0 && !req.body.force) {
    throw new ApiError(409, 'Some AI-generated statements were already reviewed. Re-running the analysis replaces them.', 'REVIEWED_STATEMENTS_EXIST');
  }

  await markAnalysisStarted(version, req.user);
  // The model call can take a while: respond now and let the client poll real progress.
  setImmediate(() => runAnalysis(version._id, req.user).catch((err) => console.error('[analysis] unexpected failure:', err.message)));
  res.status(202).json(state(version));
});

export const getAnalysis = asyncHandler(async (req, res) => {
  const { version } = await loadVersion(req.user, req.params.id);
  res.json(state(version));
});

export const aiSettings = (_req, res) => res.json(aiInfo());
