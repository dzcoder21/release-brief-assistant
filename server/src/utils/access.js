import mongoose from 'mongoose';
import { Release, ReleaseVersion, Statement } from '../models/index.js';
import { ApiError } from './ApiError.js';

export const isValidId = (id) => mongoose.isValidObjectId(id);

function assertId(id, label) {
  if (!isValidId(id)) throw new ApiError(400, `Invalid ${label} id`, 'INVALID_ID');
}

const canAccess = (user, release) => user.role === 'ADMIN' || release.owner.equals(user._id);

// Resources owned by someone else respond with 404 so their ids are never confirmed.
export async function loadRelease(user, id) {
  assertId(id, 'release');
  const release = await Release.findById(id);
  if (!release || !canAccess(user, release)) throw new ApiError(404, 'Release not found', 'NOT_FOUND');
  return release;
}

export async function loadVersion(user, id) {
  assertId(id, 'version');
  const version = await ReleaseVersion.findById(id);
  if (!version) throw new ApiError(404, 'Version not found', 'NOT_FOUND');
  const release = await loadRelease(user, version.releaseId);
  return { version, release };
}

export async function loadStatement(user, id) {
  assertId(id, 'statement');
  const statement = await Statement.findById(id);
  if (!statement) throw new ApiError(404, 'Statement not found', 'NOT_FOUND');
  const { version, release } = await loadVersion(user, statement.releaseVersionId);
  return { statement, version, release };
}

export const ownerScope = (user) => (user.role === 'ADMIN' ? {} : { owner: user._id });
