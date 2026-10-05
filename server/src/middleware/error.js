import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));

// Centralised error handling. Responses never include stack traces or internal details.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return res.status(400).json({ message: details[0]?.message || 'Invalid input', code: 'VALIDATION_ERROR', details });
  }
  if (err instanceof ApiError) return res.status(err.status).json({ message: err.message, code: err.code, details: err.details });
  if (err instanceof mongoose.Error.ValidationError) return res.status(400).json({ message: 'Invalid data', code: 'VALIDATION_ERROR', details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })) });
  if (err instanceof mongoose.Error.CastError) return res.status(400).json({ message: 'Invalid identifier', code: 'INVALID_ID' });
  if (err?.code === 11000) return res.status(409).json({ message: 'That record already exists', code: 'DUPLICATE' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed JSON body', code: 'BAD_JSON' });
  if (err?.message === 'Not allowed by CORS') return res.status(403).json({ message: 'Origin not allowed', code: 'CORS' });

  console.error('[error]', config.isProd ? err.message : err);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.', code: 'INTERNAL_ERROR' });
}
