import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const signToken = (user) => jwt.sign({ sub: String(user._id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required', 'UNAUTHENTICATED');
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new ApiError(401, 'Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new ApiError(401, 'Account no longer exists', 'UNAUTHENTICATED');
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, _res, next) =>
  roles.includes(req.user.role) ? next() : next(new ApiError(403, 'You do not have permission to do that', 'FORBIDDEN'));
