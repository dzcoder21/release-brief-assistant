import mongoose from 'mongoose';
import { QA_STATUSES } from '../utils/constants.js';

const qaEvidenceSchema = new mongoose.Schema(
  {
    releaseVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReleaseVersion', required: true, index: true },
    // Stable across versions of the same release (evidence-01) so changes can be tracked.
    evidenceId: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    status: { type: String, enum: QA_STATUSES, default: 'PASSED' },
    source: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

qaEvidenceSchema.index({ releaseVersionId: 1, evidenceId: 1 }, { unique: true });

export default mongoose.model('QAEvidence', qaEvidenceSchema);
