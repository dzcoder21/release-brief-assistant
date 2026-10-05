import mongoose from 'mongoose';
import { STATEMENT_STATUSES, STATEMENT_TYPES, STATEMENT_SECTION_KEYS, CITATION_TYPES } from '../utils/constants.js';

const { Schema } = mongoose;

const citationSchema = new Schema(
  {
    type: { type: String, enum: CITATION_TYPES, required: true },
    itemId: { type: String, required: true },
    section: String,
    label: String,
    // true when a carried-forward statement cites a source that no longer exists in the new version
    missing: { type: Boolean, default: false },
  },
  { _id: false }
);

const statementSchema = new Schema(
  {
    releaseVersionId: { type: Schema.Types.ObjectId, ref: 'ReleaseVersion', required: true, index: true },
    type: { type: String, enum: STATEMENT_TYPES, required: true },
    section: { type: String, enum: STATEMENT_SECTION_KEYS, default: 'OTHER' },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    citations: { type: [citationSchema], default: [] },
    status: { type: String, enum: STATEMENT_STATUSES, default: 'PENDING', index: true },
    reviewerNote: { type: String, trim: true, maxlength: 2000, default: '' },
    editedContent: { type: String, trim: true, maxlength: 4000, default: '' },
    uncited: { type: Boolean, default: false },
    order: { type: Number, default: 0 },

    // AI = generated for this version; CARRIED = copied from the previous version for stale checking
    origin: { type: String, enum: ['AI', 'CARRIED'], default: 'AI' },
    carriedFromStatementId: { type: Schema.Types.ObjectId, ref: 'Statement', default: null },
    carriedFromVersion: { type: String, default: '' },
    carriedStatus: { type: String, enum: [...STATEMENT_STATUSES, ''], default: '' },
    staleReasons: { type: [Schema.Types.Mixed], default: [] },

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Statement', statementSchema);
