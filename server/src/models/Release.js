import mongoose from 'mongoose';
import { RELEASE_STATUSES, LEVELS } from '../utils/constants.js';

const releaseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    // Mirrors the most recently created version so lists don't need a join.
    currentVersion: { type: String, default: '' },
    currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReleaseVersion', default: null },
    status: { type: String, enum: RELEASE_STATUSES, default: 'DRAFT', index: true },
    riskLevel: { type: String, enum: [...LEVELS, null], default: null },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('Release', releaseSchema);
