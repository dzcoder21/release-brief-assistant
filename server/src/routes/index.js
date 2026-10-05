import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, analysisLimiter } from '../middleware/rateLimit.js';
import { ApiError } from '../utils/ApiError.js';
import { isValidId } from '../utils/access.js';
import * as schemas from '../validators/schemas.js';
import * as auth from '../controllers/authController.js';
import * as releases from '../controllers/releaseController.js';
import * as versions from '../controllers/versionController.js';
import * as analysis from '../controllers/analysisController.js';
import * as statements from '../controllers/statementController.js';
import * as dashboard from '../controllers/dashboardController.js';

const router = Router();

router.param('id', (_req, _res, next, id) => (isValidId(id) ? next() : next(new ApiError(400, 'Invalid id', 'INVALID_ID'))));

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Auth
router.post('/auth/register', authLimiter, validate(schemas.registerSchema), auth.register);
router.post('/auth/login', authLimiter, validate(schemas.loginSchema), auth.login);

// Everything below requires a valid JWT
router.use(authenticate);
router.get('/auth/me', auth.me);
router.put('/auth/me', validate(schemas.profileSchema), auth.updateMe);
router.post('/auth/logout', auth.logout);

// Releases
router.get('/releases', releases.listReleases);
router.post('/releases', validate(schemas.createReleaseSchema), releases.createRelease);
router.get('/releases/:id', releases.getRelease);
router.put('/releases/:id', validate(schemas.updateReleaseSchema), releases.updateRelease);
router.delete('/releases/:id', releases.deleteRelease);

// Versions
router.get('/releases/:id/versions', versions.listVersionsForRelease);
router.post('/releases/:id/versions', validate(schemas.packageSchema), versions.createReleaseVersion);
router.get('/versions', versions.listAllVersions);
router.get('/versions/compare', versions.compare); // must stay above /versions/:id
router.get('/versions/:id', versions.getVersion);
router.put('/versions/:id', validate(schemas.packageSchema), versions.updateVersion);

// Validation, analysis, finalization
router.post('/versions/:id/validate', versions.validateVersion);
router.post('/versions/:id/analyze', analysisLimiter, validate(schemas.analyzeSchema), analysis.analyze);
router.get('/versions/:id/analysis', analysis.getAnalysis);
router.get('/versions/:id/finalization', versions.finalizationCheck);
router.post('/versions/:id/finalize', validate(schemas.finalizeSchema), versions.finalize);
router.get('/versions/:id/brief', versions.brief);

// Statements
router.get('/versions/:id/statements', statements.listStatements);
router.put('/statements/:id', validate(schemas.statementUpdateSchema), statements.updateStatement);
router.post('/statements/:id/approve', validate(schemas.reviewSchema), statements.approveStatement);
router.post('/statements/:id/reject', validate(schemas.reviewSchema), statements.rejectStatement);
router.post('/statements/:id/reset', statements.resetStatement);

// Dashboard, activity, settings
router.get('/dashboard', dashboard.summary);
router.get('/dashboard/analytics', dashboard.analytics);
router.get('/dashboard/attention', dashboard.attention);
router.get('/activity', dashboard.activity);
router.get('/settings/ai', analysis.aiSettings);

export default router;
