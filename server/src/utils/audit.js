import { AuditLog } from '../models/index.js';

/** Records an audit entry. Audit failures must never break the main operation. */
export async function audit({ user, action, entity, entityId, releaseId, metadata = {} }) {
  try {
    await AuditLog.create({
      user: user?._id || user || null,
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      releaseId: releaseId || undefined,
      metadata,
    });
  } catch (err) {
    console.error('[audit] failed to write audit entry:', err.message);
  }
}
