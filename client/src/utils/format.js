export const formatDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—');
export const formatDateTime = (value) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export function timeAgo(value) {
  if (!value) return '';
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [name, size] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}

export const toInputDate = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
export const cn = (...parts) => parts.filter(Boolean).join(' ');
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function nextPatch(version) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(version || '');
  return m ? `${m[1]}.${m[2]}.${Number(m[3]) + 1}` : '';
}
