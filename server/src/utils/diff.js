const ITEM_FIELDS = ['title', 'description', 'affectedUsers', 'reference'];
const EVIDENCE_FIELDS = ['title', 'description', 'status', 'source'];

const clean = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).sort();
  return String(value ?? '').trim();
};

function diffFields(a, b, fields) {
  const changes = [];
  for (const field of fields) {
    const from = clean(a[field]);
    const to = clean(b[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes.push({ field, from, to });
  }
  return changes;
}

export const diffItem = (a, b) => diffFields(a, b, ITEM_FIELDS);
export const diffEvidence = (a, b) => diffFields(a, b, EVIDENCE_FIELDS);
