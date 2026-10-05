import { z } from 'zod';
import { QAEvidence, ReleaseVersion, Statement } from '../../models/index.js';
import { config } from '../../config/env.js';
import { SECTION_KEYS, STATEMENT_SECTION_KEYS } from '../../utils/constants.js';
import { audit } from '../../utils/audit.js';
import { validateRelease } from '../validation/releaseValidationService.js';
import { refreshVersionStatus, syncRelease } from '../versioning/versionStatusService.js';
import { callModel } from './aiProvider.js';
import { AiError } from './AiError.js';
import { SYSTEM_PROMPT, buildUserPrompt, buildRepairPrompt } from './prompts.js';

export const ANALYSIS_STEPS = [
  { key: 'validate', label: 'Validating release package' },
  { key: 'evidence', label: 'Preparing QA evidence' },
  { key: 'model', label: 'Waiting for the AI model (impact, claims, summaries)' },
  { key: 'verify', label: 'Verifying the AI response and citations' },
  { key: 'save', label: 'Saving findings and statements' },
];

/* ---------- input ---------- */

export function buildAiInput({ release, version, qaEvidence, validation }) {
  const sections = {};
  for (const key of SECTION_KEYS) {
    sections[key] = (version[key] || []).map((i) => ({ id: i.itemId, title: i.title, description: i.description, affectedUsers: i.affectedUsers, reference: i.reference }));
  }
  const issues = (list) => list.map((i) => ({ id: i.id, severity: i.severity, message: i.message }));
  return {
    release: { name: release?.name, version: version.version, releaseDate: version.releaseDate },
    declaredNoneSections: version.noneSections || [],
    sections,
    qaEvidence: qaEvidence.map((e) => ({ id: e.evidenceId, title: e.title, description: e.description, status: e.status, source: e.source })),
    deterministicValidation: { errors: issues(validation.errors), warnings: issues(validation.warnings), info: issues(validation.info) },
  };
}

/** Everything the AI is allowed to cite, with a label for display. */
export function buildKnownSources({ version, qaEvidence, validation }) {
  const known = { release_item: new Map(), qa_evidence: new Map(), validation_result: new Map() };
  for (const key of SECTION_KEYS) for (const i of version[key] || []) known.release_item.set(i.itemId, { section: key, label: i.title });
  for (const e of qaEvidence) known.qa_evidence.set(e.evidenceId, { section: 'qaEvidence', label: e.title });
  for (const i of [...validation.errors, ...validation.warnings, ...validation.info]) known.validation_result.set(i.id, { section: i.section, label: i.message });
  return known;
}

/* ---------- parsing & validation of the model output ---------- */

const upper = (v) => (typeof v === 'string' ? v.trim().toUpperCase().replace(/[\s-]+/g, '_') : v);
const level = (fallback) => z.preprocess(upper, z.enum(['HIGH', 'MEDIUM', 'LOW'])).catch(fallback);
const text = z.preprocess((v) => (v == null ? '' : String(v)), z.string());
const textList = z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : x?.description || x?.title || '')) : [String(v)]), z.array(z.string()));
const list = z.array(z.any()).default([]);

const TopLevel = z.object({
  overallAssessment: z
    .preprocess((v) => (typeof v === 'string' ? { level: 'NEEDS_REVIEW', reason: v } : v), z.object({ level: z.preprocess(upper, z.enum(['READY', 'NEEDS_REVIEW', 'HIGH_RISK'])).catch('NEEDS_REVIEW'), reason: text.default('') }))
    .default({ level: 'NEEDS_REVIEW', reason: '' }),
  impactClassification: list,
  missingInformation: list,
  unsupportedClaims: list,
  risks: list,
  technicalSummary: list,
  stakeholderSummary: list,
});

const Impact = z.preprocess(
  (v) => (v && typeof v === 'object' ? { ...v, releaseItemId: v.releaseItemId ?? v.itemId ?? v.id } : v),
  z.object({ releaseItemId: z.string().min(1), impactLevel: level('MEDIUM'), reason: text, affectedUsers: textList.default([]), citations: list })
);
const Missing = z.preprocess(
  (v) => (v && typeof v === 'object' ? { ...v, recommendation: v.recommendation ?? v.recommendedAction } : v),
  z.object({ title: text, field: text, description: text, severity: level('MEDIUM'), reason: text, recommendation: text }).refine((m) => m.title || m.field || m.description, 'empty finding')
);
const Claim = z.object({ claim: z.string().min(1), reason: text, supportingEvidence: list, missingEvidence: textList.default([]), citations: list });
const Risk = z.object({ title: z.string().min(1), description: text, severity: level('MEDIUM'), citations: list });
const Summary = z.preprocess(
  (v) => (typeof v === 'string' ? { statement: v } : v),
  z.object({ statement: z.string().trim().min(1).max(1500), section: z.preprocess(upper, z.enum(STATEMENT_SECTION_KEYS)).catch('OTHER'), citations: list })
);

export function parseModelJson(raw) {
  const cleaned = String(raw).replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new AiError('AI_BAD_RESPONSE', 'The AI response was not valid JSON.', true);
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new AiError('AI_BAD_RESPONSE', 'The AI response was not valid JSON.', true);
  }
}

function parseItems(items, schema, report) {
  const out = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
    else report.droppedItems += 1;
  }
  return out;
}

function cleanCitations(raw, known, report) {
  const out = [];
  const seen = new Set();
  for (const c of Array.isArray(raw) ? raw : []) {
    const type = String(c?.type ?? '').trim();
    const itemId = String(c?.itemId ?? c?.id ?? '').trim();
    const meta = known[type]?.get(itemId);
    if (!meta) {
      report.droppedCitations += 1; // never keep evidence that does not exist in the supplied data
      continue;
    }
    const key = `${type}:${itemId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type, itemId, section: meta.section, label: meta.label });
  }
  return out;
}

const pad = (prefix, n) => `${prefix}-${String(n).padStart(2, '0')}`;
const RISK_ORDER = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export function deriveRisk(analysis, validation) {
  if (!analysis) return null;
  let score = { READY: 1, NEEDS_REVIEW: 2, HIGH_RISK: 3 }[analysis.overallAssessment.level] || 2;
  for (const r of analysis.risks) score = Math.max(score, RISK_ORDER[r.severity] || 1);
  if (validation?.errors?.length) score = Math.max(score, 2);
  return ['LOW', 'LOW', 'MEDIUM', 'HIGH'][score];
}

/**
 * Turns raw model output into the stored analysis plus statement drafts.
 * Pure: validates the schema, drops invented ids/citations and never produces an approved statement.
 */
export function normalizeAnalysis(raw, { version, qaEvidence, validation }) {
  const top = TopLevel.safeParse(raw);
  if (!top.success) throw new AiError('AI_BAD_RESPONSE', 'The AI response did not match the expected structure.', true);
  const data = top.data;
  const known = buildKnownSources({ version, qaEvidence, validation });
  const report = { droppedCitations: 0, droppedItems: 0 };
  const titleOf = (id) => known.release_item.get(id)?.label || id;
  const evidenceByTitle = new Map(qaEvidence.map((e) => [e.title.trim().toLowerCase(), e]));

  const impactClassification = parseItems(data.impactClassification, Impact, report)
    .filter((i) => {
      const ok = known.release_item.has(i.releaseItemId);
      if (!ok) report.droppedItems += 1;
      return ok;
    })
    .map((i, n) => {
      const citations = cleanCitations(i.citations, known, report);
      const own = known.release_item.get(i.releaseItemId);
      if (!citations.some((c) => c.itemId === i.releaseItemId)) citations.unshift({ type: 'release_item', itemId: i.releaseItemId, section: own.section, label: own.label });
      return { id: pad('impact', n + 1), releaseItemId: i.releaseItemId, change: titleOf(i.releaseItemId), impactLevel: i.impactLevel, reason: i.reason, affectedUsers: i.affectedUsers, citations };
    });

  const missingInformation = parseItems(data.missingInformation, Missing, report).map((m, n) => ({
    id: pad('missing', n + 1),
    title: m.title || m.field || m.description,
    field: m.field,
    description: m.description,
    severity: m.severity,
    reason: m.reason,
    recommendation: m.recommendation,
  }));

  const unsupportedClaims = parseItems(data.unsupportedClaims, Claim, report).map((c, n) => {
    const supportingEvidence = [];
    for (const entry of c.supportingEvidence) {
      if (typeof entry === 'string') {
        const match = evidenceByTitle.get(entry.trim().toLowerCase());
        if (match) supportingEvidence.push(...cleanCitations([{ type: 'qa_evidence', itemId: match.evidenceId }], known, report));
        else report.droppedCitations += 1;
      } else supportingEvidence.push(...cleanCitations([entry], known, report));
    }
    return {
      id: pad('claim', n + 1),
      claim: c.claim,
      verdict: 'Insufficient evidence',
      reason: c.reason,
      supportingEvidence,
      missingEvidence: c.missingEvidence.filter(Boolean),
      citations: cleanCitations(c.citations, known, report),
    };
  });

  const risks = parseItems(data.risks, Risk, report).map((r, n) => ({
    id: pad('risk', n + 1),
    title: r.title,
    description: r.description,
    severity: r.severity,
    citations: cleanCitations(r.citations, known, report),
  }));

  const summaries = (items) =>
    parseItems(items, Summary, report).map((s) => ({ statement: s.statement, section: s.section, citations: cleanCitations(s.citations, known, report) }));
  const technicalSummary = summaries(data.technicalSummary);
  const stakeholderSummary = summaries(data.stakeholderSummary);

  if (!technicalSummary.length && !stakeholderSummary.length) {
    throw new AiError('AI_BAD_RESPONSE', 'The AI response did not contain any summary statements.', true);
  }

  // Deterministic rules can only make the assessment more cautious, never less.
  const assessment = { ...data.overallAssessment };
  const blockers = [];
  if (validation.errors.length) blockers.push('deterministic validation has errors');
  if (unsupportedClaims.length) blockers.push('claims lack supporting QA evidence');
  if (missingInformation.some((m) => m.severity === 'HIGH')) blockers.push('high-severity information is missing');
  if (assessment.level === 'READY' && blockers.length) {
    assessment.originalLevel = 'READY';
    assessment.level = 'NEEDS_REVIEW';
    assessment.adjustedByRules = `Downgraded from READY because ${blockers.join(', ')}.`;
  }

  const toStatement = (type) => (s) => ({ type, section: s.section, content: s.statement, citations: s.citations, uncited: s.citations.length === 0 });
  const statements = [
    ...technicalSummary.map(toStatement('TECHNICAL')),
    ...stakeholderSummary.map(toStatement('STAKEHOLDER')),
    ...risks.map((r) => {
      const citations = [...r.citations, { type: 'ai_finding', itemId: r.id, section: 'risks', label: r.title }];
      return { type: 'RISK', section: 'RISKS', content: r.description ? `${r.title}: ${r.description}` : r.title, citations, uncited: r.citations.length === 0 };
    }),
  ];

  const analysis = {
    overallAssessment: assessment,
    impactClassification,
    missingInformation,
    unsupportedClaims,
    risks,
    technicalSummary,
    stakeholderSummary,
    meta: { provider: config.ai.provider, model: config.ai.model, generatedAt: new Date().toISOString(), ...report },
  };
  return { analysis, statements };
}

/* ---------- persistence ---------- */

async function setStep(versionId, key, status) {
  await ReleaseVersion.updateOne({ _id: versionId, 'analysisProgress.key': key }, { $set: { 'analysisProgress.$.status': status } });
}

/** Marks analysis as started and returns immediately so the UI can poll real progress. */
export async function markAnalysisStarted(version, user) {
  if (version.status !== 'ANALYZING') version.statusBeforeAnalysis = version.status;
  version.status = 'ANALYZING';
  version.analysisStatus = 'RUNNING';
  version.analysisError = null;
  version.analysisStartedAt = new Date();
  version.analysisProgress = ANALYSIS_STEPS.map((s) => ({ ...s, status: 'pending' }));
  await version.save();
  await syncRelease(version.releaseId);
  await audit({ user, action: 'AI analysis started', entity: 'ReleaseVersion', entityId: version._id, releaseId: version.releaseId, metadata: { version: version.version } });
}

/** Stores a normalized analysis and its statements. Used by runAnalysis and by the seed script. */
export async function persistAnalysis({ version, qaEvidence, validation, raw }) {
  const { analysis, statements } = normalizeAnalysis(raw, { version, qaEvidence, validation });
  // Only AI-generated statements are replaced; carried-forward ones keep their review state.
  await Statement.deleteMany({ releaseVersionId: version._id, origin: 'AI' });
  if (statements.length) {
    await Statement.insertMany(statements.map((s, order) => ({ ...s, releaseVersionId: version._id, origin: 'AI', status: 'PENDING', order })));
  }
  version.aiAnalysis = analysis;
  version.deterministicValidation = validation;
  version.analysisStatus = 'COMPLETED';
  version.analysisError = null;
  version.analysisCompletedAt = new Date();
  version.riskLevel = deriveRisk(analysis, validation);
  version.status = 'NEEDS_REVIEW';
  version.markModified('aiAnalysis');
  version.markModified('deterministicValidation');
  await version.save();
  await refreshVersionStatus(version._id);
  await syncRelease(version.releaseId);
  return analysis;
}

async function requestAnalysis(input) {
  let problem = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = { system: SYSTEM_PROMPT, user: problem ? buildRepairPrompt(input, problem) : buildUserPrompt(input) };
    const rawText = await callModel(prompt);
    try {
      const json = parseModelJson(rawText);
      TopLevel.parse(json);
      return json;
    } catch (err) {
      problem = err.message || 'invalid structure';
      if (attempt === 1) throw err instanceof AiError ? err : new AiError('AI_BAD_RESPONSE', 'The AI response did not match the expected structure.', true);
    }
  }
  return null;
}

export async function runAnalysis(versionId, user) {
  const initial = await ReleaseVersion.findById(versionId);
  if (!initial) return;
  const statusBefore = initial.statusBeforeAnalysis || 'DRAFT';
  let currentStep = 'validate';
  try {
    await setStep(versionId, 'validate', 'running');
    const version = await ReleaseVersion.findById(versionId).populate('releaseId', 'name');
    const release = version.releaseId;
    const qaEvidence = await QAEvidence.find({ releaseVersionId: versionId }).lean();
    const validation = validateRelease(version, qaEvidence);
    await setStep(versionId, 'validate', 'done');

    currentStep = 'evidence';
    await setStep(versionId, 'evidence', 'running');
    const input = buildAiInput({ release, version, qaEvidence, validation });
    await setStep(versionId, 'evidence', 'done');

    currentStep = 'model';
    await setStep(versionId, 'model', 'running');
    const raw = await requestAnalysis(input);
    await setStep(versionId, 'model', 'done');

    currentStep = 'verify';
    await setStep(versionId, 'verify', 'running');
    const preview = normalizeAnalysis(raw, { version, qaEvidence, validation });
    await setStep(versionId, 'verify', 'done');

    currentStep = 'save';
    await setStep(versionId, 'save', 'running');
    const fresh = await ReleaseVersion.findById(versionId);
    await persistAnalysis({ version: fresh, qaEvidence, validation, raw });
    await setStep(versionId, 'save', 'done');

    await audit({ user, action: 'AI analysis completed', entity: 'ReleaseVersion', entityId: versionId, releaseId: initial.releaseId, metadata: { version: initial.version, statements: preview.statements.length } });
  } catch (err) {
    const aiError = err instanceof AiError ? err : new AiError('AI_INTERNAL', 'AI analysis is temporarily unavailable.', true);
    if (!(err instanceof AiError)) console.error('[analysis] internal error:', err);
    await setStep(versionId, currentStep, 'failed');
    await ReleaseVersion.updateOne(
      { _id: versionId },
      { $set: { analysisStatus: 'FAILED', status: statusBefore, analysisError: { code: aiError.code, message: aiError.message, retryable: aiError.retryable, at: new Date() } } }
    );
    await syncRelease(initial.releaseId);
    await audit({ user, action: 'AI analysis failed', entity: 'ReleaseVersion', entityId: versionId, releaseId: initial.releaseId, metadata: { code: aiError.code } });
  }
}

/** On boot: analyses interrupted by a restart would otherwise stay "running" forever. */
export async function recoverInterruptedAnalyses() {
  const stuck = await ReleaseVersion.find({ analysisStatus: 'RUNNING' });
  for (const v of stuck) {
    v.analysisStatus = 'FAILED';
    v.status = v.statusBeforeAnalysis || 'DRAFT';
    v.analysisError = { code: 'AI_INTERRUPTED', message: 'Analysis was interrupted by a server restart. Retry the analysis.', retryable: true, at: new Date() };
    await v.save();
    await syncRelease(v.releaseId);
  }
  if (stuck.length) console.log(`[analysis] recovered ${stuck.length} interrupted analysis run(s)`);
}

