import { SECTIONS, SECTION_KEYS } from './constants';

export const CITATION_META = {
  release_item: { label: 'Release item', tone: 'primary' },
  qa_evidence: { label: 'QA evidence', tone: 'success' },
  validation_result: { label: 'Validation warning', tone: 'warning' },
  ai_finding: { label: 'AI finding', tone: 'accent' },
};

/** Builds a lookup so a citation can be opened to show the original source. */
export function buildSourceIndex({ version, qaEvidence = [], validation, analysis }) {
  const items = new Map();
  for (const key of SECTION_KEYS) for (const item of version?.[key] || []) items.set(item.itemId, { ...item, section: key });
  const evidence = new Map(qaEvidence.map((e) => [e.evidenceId, e]));
  const checks = new Map([...(validation?.errors || []), ...(validation?.warnings || []), ...(validation?.info || [])].map((i) => [i.id, i]));
  const findings = new Map();
  for (const key of ['risks', 'missingInformation', 'unsupportedClaims', 'impactClassification']) for (const f of analysis?.[key] || []) findings.set(f.id, { ...f, kind: key });

  return {
    resolve(citation) {
      if (citation.type === 'release_item') {
        const i = items.get(citation.itemId);
        return i && { kind: 'release_item', id: i.itemId, title: i.title, body: i.description, section: SECTIONS[i.section].label, users: i.affectedUsers, reference: i.reference };
      }
      if (citation.type === 'qa_evidence') {
        const e = evidence.get(citation.itemId);
        return e && { kind: 'qa_evidence', id: e.evidenceId, title: e.title, body: e.description, status: e.status, source: e.source };
      }
      if (citation.type === 'validation_result') {
        const c = checks.get(citation.itemId);
        return c && { kind: 'validation_result', id: c.id, title: c.message, severity: c.severity, section: c.section && SECTIONS[c.section]?.label };
      }
      if (citation.type === 'ai_finding') {
        const f = findings.get(citation.itemId);
        return f && { kind: 'ai_finding', id: f.id, title: f.title || f.claim || f.change, body: f.description || f.reason, severity: f.severity };
      }
      return null;
    },
  };
}
