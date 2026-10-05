import { Release, ReleaseVersion, QAEvidence } from '../../models/index.js';
import { SECTIONS, SECTION_KEYS, EVIDENCE_PREFIX } from '../../utils/constants.js';
import { ApiError } from '../../utils/ApiError.js';
import { audit } from '../../utils/audit.js';
import { validateRelease } from '../validation/releaseValidationService.js';
import { carryForward, refreshCarried } from '../staleDetection/staleDetectionService.js';
import { syncRelease } from './versionStatusService.js';

const ID_PATTERN = /^(.+)-(\d+)$/;

/**
 * Item ids are stable across the versions of one release (feature-03 stays feature-03),
 * which is what makes comparison and stale detection possible.
 */
async function createIdMinter(releaseId, payloadIds) {
  const versions = await ReleaseVersion.find({ releaseId }).select(['_id', ...SECTION_KEYS].join(' ')).lean();
  const evidence = await QAEvidence.find({ releaseVersionId: { $in: versions.map((v) => v._id) } }).select('evidenceId').lean();
  const max = {};
  const note = (id) => {
    const m = ID_PATTERN.exec(id || '');
    if (m) max[m[1]] = Math.max(max[m[1]] || 0, Number(m[2]));
  };
  versions.forEach((v) => SECTION_KEYS.forEach((k) => (v[k] || []).forEach((i) => note(i.itemId))));
  evidence.forEach((e) => note(e.evidenceId));
  payloadIds.forEach(note);
  const taken = new Set(payloadIds);
  return (prefix) => {
    let candidate;
    do {
      max[prefix] = (max[prefix] || 0) + 1;
      candidate = `${prefix}-${String(max[prefix]).padStart(2, '0')}`;
    } while (taken.has(candidate));
    taken.add(candidate);
    return candidate;
  };
}

async function normalizePackage(releaseId, payload) {
  // First pass: keep valid, unique client-supplied ids.
  const kept = new Set();
  const keep = (id, prefix) => {
    if (id && id.startsWith(`${prefix}-`) && !kept.has(id)) {
      kept.add(id);
      return id;
    }
    return null;
  };
  const sections = {};
  const pending = [];
  for (const key of SECTION_KEYS) {
    sections[key] = (payload[key] || []).map((item) => {
      const entry = { itemId: keep(item.itemId, SECTIONS[key].prefix), title: item.title, description: item.description, affectedUsers: item.affectedUsers, reference: item.reference };
      pending.push([entry, SECTIONS[key].prefix]);
      return entry;
    });
  }
  const evidence = (payload.qaEvidence || []).map((e) => {
    const entry = { evidenceId: keep(e.evidenceId, EVIDENCE_PREFIX), title: e.title, description: e.description, status: e.status, source: e.source };
    pending.push([entry, EVIDENCE_PREFIX]);
    return entry;
  });

  const mint = await createIdMinter(releaseId, [...kept]);
  for (const [entry, prefix] of pending) {
    if (prefix === EVIDENCE_PREFIX) entry.evidenceId ||= mint(prefix);
    else entry.itemId ||= mint(prefix);
  }
  return { sections, evidence };
}

const packageFields = (payload, sections) => ({
  version: payload.version,
  releaseDate: payload.releaseDate || null,
  ...sections,
  noneSections: payload.noneSections || [],
});

async function replaceEvidence(versionId, evidence) {
  await QAEvidence.deleteMany({ releaseVersionId: versionId });
  return evidence.length ? QAEvidence.insertMany(evidence.map((e) => ({ ...e, releaseVersionId: versionId }))) : [];
}

export async function createVersion({ release, user, payload }) {
  if (await ReleaseVersion.exists({ releaseId: release._id, version: payload.version })) {
    throw new ApiError(409, `Version ${payload.version} already exists for this release. Versions are never overwritten.`, 'VERSION_EXISTS');
  }
  const prev = await ReleaseVersion.findOne({ releaseId: release._id }).sort({ createdAt: -1 });
  const { sections, evidence } = await normalizePackage(release._id, payload);

  const version = await ReleaseVersion.create({
    releaseId: release._id,
    ...packageFields(payload, sections),
    status: 'DRAFT',
    createdBy: user._id,
    basedOnVersionId: prev?._id || null,
  });
  const savedEvidence = await replaceEvidence(version._id, evidence);
  version.deterministicValidation = validateRelease(version, savedEvidence);
  version.markModified('deterministicValidation');
  await version.save();

  // Earlier human-reviewed statements are re-checked against the new package, never silently reused.
  await carryForward({ version, prevVersion: prev });

  await syncRelease(release._id);
  await audit({ user, action: 'Version created', entity: 'ReleaseVersion', entityId: version._id, releaseId: release._id, metadata: { version: version.version, basedOn: prev?.version || null } });
  return { version, qaEvidence: savedEvidence };
}

export async function createReleaseWithFirstVersion({ user, payload }) {
  const release = await Release.create({ name: payload.name, description: payload.description || '', owner: user._id, status: 'DRAFT' });
  try {
    const result = await createVersion({ release, user, payload });
    await audit({ user, action: 'Release created', entity: 'Release', entityId: release._id, releaseId: release._id, metadata: { name: release.name } });
    return { release: await Release.findById(release._id), ...result };
  } catch (err) {
    await Release.deleteOne({ _id: release._id });
    throw err;
  }
}

export async function updateDraftVersion({ version, user, payload }) {
  if (version.status !== 'DRAFT') {
    throw new ApiError(409, 'This version has been analyzed and is locked. Create a new version to change the release package.', 'VERSION_LOCKED');
  }
  if (payload.version !== version.version && (await ReleaseVersion.exists({ releaseId: version.releaseId, version: payload.version, _id: { $ne: version._id } }))) {
    throw new ApiError(409, `Version ${payload.version} already exists for this release.`, 'VERSION_EXISTS');
  }
  const { sections, evidence } = await normalizePackage(version.releaseId, payload);
  version.set(packageFields(payload, sections));
  const savedEvidence = await replaceEvidence(version._id, evidence);
  version.deterministicValidation = validateRelease(version, savedEvidence);
  version.markModified('deterministicValidation');
  await version.save();
  await refreshCarried(version);
  await syncRelease(version.releaseId);
  await audit({ user, action: 'Release updated', entity: 'ReleaseVersion', entityId: version._id, releaseId: version.releaseId, metadata: { version: version.version } });
  return { version, qaEvidence: savedEvidence };
}
