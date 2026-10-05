import mongoose from 'mongoose';
import { RELEASE_STATUSES, ANALYSIS_STATUSES, LEVELS, SECTION_KEYS } from '../utils/constants.js';

const { Schema } = mongoose;

const itemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 200, default: '' },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    affectedUsers: { type: [String], default: [] },
    reference: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false }
);

const progressSchema = new Schema(
  {
    key: String,
    label: String,
    status: { type: String, enum: ['pending', 'running', 'done', 'failed'], default: 'pending' },
  },
  { _id: false }
);

const sectionFields = Object.fromEntries(SECTION_KEYS.map((key) => [key, { type: [itemSchema], default: [] }]));

const releaseVersionSchema = new Schema(
  {
    releaseId: { type: Schema.Types.ObjectId, ref: 'Release', required: true, index: true },
    version: { type: String, required: true, trim: true, maxlength: 40 },
    releaseDate: { type: Date, default: null },

    ...sectionFields,
    // Sections the author explicitly declared as "None" (valid, unlike an empty section).
    noneSections: { type: [{ type: String, enum: SECTION_KEYS }], default: [] },

    status: { type: String, enum: RELEASE_STATUSES, default: 'DRAFT', index: true },
    riskLevel: { type: String, enum: [...LEVELS, null], default: null },
    basedOnVersionId: { type: Schema.Types.ObjectId, ref: 'ReleaseVersion', default: null },

    deterministicValidation: { type: Schema.Types.Mixed, default: null },
    aiAnalysis: { type: Schema.Types.Mixed, default: null },
    analysisStatus: { type: String, enum: ANALYSIS_STATUSES, default: 'NOT_RUN' },
    analysisError: { type: Schema.Types.Mixed, default: null },
    analysisProgress: { type: [progressSchema], default: [] },
    analysisStartedAt: { type: Date, default: null },
    analysisCompletedAt: { type: Date, default: null },
    statusBeforeAnalysis: { type: String, default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

releaseVersionSchema.index({ releaseId: 1, version: 1 }, { unique: true });

export default mongoose.model('ReleaseVersion', releaseVersionSchema);
