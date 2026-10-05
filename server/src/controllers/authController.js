import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { audit } from '../utils/audit.js';

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: 'USER' });
  res.status(201).json({ token: signToken(user), user });
});

export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash');
  const valid = user && (await bcrypt.compare(req.body.password, user.passwordHash));
  if (!valid) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  res.json({ token: signToken(user), user });
});

export const me = (req, res) => res.json({ user: req.user });

export const updateMe = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  await req.user.save();
  res.json({ user: req.user });
});

// JWTs are stateless: the client discards the token. The audit entry records the sign-out.
export const logout = asyncHandler(async (req, res) => {
  await audit({ user: req.user, action: 'User logged out', entity: 'User', entityId: req.user._id });
  res.json({ message: 'Signed out' });
});
