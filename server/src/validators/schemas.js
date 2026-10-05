import { z } from 'zod';
import { SECTION_KEYS, QA_STATUSES, RELEASE_STATUSES, LEVELS, STATEMENT_STATUSES, STATEMENT_TYPES } from '../utils/constants.js';

const text = (max) => z.string().max(max).default('').transform((s) => s.trim());
const emptyToUndefined = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema.optional());

const itemSchema = z.object({
  itemId: z.string().max(60).optional(),
  title: text(200),
  description: text(4000),
  affectedUsers: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  reference: text(200),
});

const evidenceSchema = z.object({
  evidenceId: z.string().max(60).optional(),
  title: text(200),
  description: text(4000),
  status: z.enum(QA_STATUSES).default('PASSED'),
  source: text(200),
});

export const packageSchema = z.object({
  version: z.string().trim().min(1, 'Version is required').max(40),
  releaseDate: z.preprocess((v) => (v === '' || v == null ? null : v), z.coerce.date().nullable()).optional(),
  ...Object.fromEntries(SECTION_KEYS.map((key) => [key, z.array(itemSchema).max(100).default([])])),
  noneSections: z.array(z.enum(SECTION_KEYS)).default([]),
  qaEvidence: z.array(evidenceSchema).max(200).default([]),
});

export const createReleaseSchema = packageSchema.extend({
  name: z.string().trim().min(2, 'Release name is required').max(120),
  description: text(1000),
});

export const updateReleaseSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(72),
});
export const loginSchema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(72) });
export const profileSchema = z.object({ name: z.string().trim().min(2).max(100) });

export const listReleasesQuery = z.object({
  status: emptyToUndefined(z.enum(RELEASE_STATUSES)),
  risk: emptyToUndefined(z.enum(LEVELS)),
  q: emptyToUndefined(z.string().max(100)),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const analyzeSchema = z.object({ force: z.boolean().optional().default(false) });
export const finalizeSchema = z.object({ confirm: z.literal(true, { errorMap: () => ({ message: 'Finalization must be explicitly confirmed' }) }) });
export const reviewSchema = z.object({ reviewerNote: z.string().trim().max(2000).optional() });
export const statementUpdateSchema = z.object({
  editedContent: z.string().trim().min(1, 'Statement cannot be empty').max(4000).optional(),
  reviewerNote: z.string().trim().max(2000).optional(),
});
export const statementListQuery = z.object({
  status: emptyToUndefined(z.enum(STATEMENT_STATUSES)),
  type: emptyToUndefined(z.enum(STATEMENT_TYPES)),
});
export const compareQuery = z.object({ left: z.string().min(1), right: z.string().min(1) });
