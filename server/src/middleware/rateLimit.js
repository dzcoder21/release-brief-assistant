import rateLimit from 'express-rate-limit';

const build = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: { message, code: 'RATE_LIMITED' } });

export const apiLimiter = build(15 * 60 * 1000, 600, 'Too many requests. Please slow down.');
export const authLimiter = build(15 * 60 * 1000, 30, 'Too many sign-in attempts. Try again in a few minutes.');
export const analysisLimiter = build(60 * 60 * 1000, 30, 'Analysis limit reached. Try again later.');
