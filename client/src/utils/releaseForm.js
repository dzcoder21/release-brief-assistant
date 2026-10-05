import { SECTION_KEYS } from './constants';
import { toInputDate } from './format';

export const emptyItem = () => ({ itemId: '', title: '', description: '', affectedUsersText: '', reference: '' });
export const emptyEvidence = () => ({ evidenceId: '', title: '', description: '', status: 'PASSED', source: '' });

export function toFormValues({ name = '', description = '', version, qaEvidence = [] } = {}) {
  const values = {
    name,
    description,
    version: version?.version || '',
    releaseDate: toInputDate(version?.releaseDate),
    none: {},
    qaEvidence: qaEvidence.map((e) => ({ evidenceId: e.evidenceId, title: e.title, description: e.description, status: e.status, source: e.source })),
  };
  for (const key of SECTION_KEYS) {
    values[key] = (version?.[key] || []).map((i) => ({
      itemId: i.itemId, title: i.title, description: i.description, affectedUsersText: (i.affectedUsers || []).join(', '), reference: i.reference || '',
    }));
    values.none[key] = (version?.noneSections || []).includes(key);
  }
  return values;
}

export function toPayload(values, { includeName }) {
  const payload = {
    version: values.version.trim(),
    releaseDate: values.releaseDate || null,
    noneSections: SECTION_KEYS.filter((k) => values.none[k]),
    qaEvidence: (values.qaEvidence || []).map((e) => ({ ...e, evidenceId: e.evidenceId || undefined })),
  };
  for (const key of SECTION_KEYS) {
    payload[key] = values.none[key]
      ? []
      : (values[key] || []).map(({ affectedUsersText, itemId, ...rest }) => ({
          ...rest,
          itemId: itemId || undefined,
          affectedUsers: (affectedUsersText || '').split(',').map((s) => s.trim()).filter(Boolean),
        }));
  }
  if (includeName) {
    payload.name = values.name.trim();
    payload.description = values.description?.trim() || '';
  }
  return payload;
}
