import { Paperclip, FlaskConical, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '../../utils/format';
import { CITATION_META } from '../../utils/citations';

const ICONS = { release_item: Paperclip, qa_evidence: FlaskConical, validation_result: AlertTriangle, ai_finding: Sparkles };
const TONES = {
  primary: 'border-primary/25 bg-primary/10 text-primary',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  accent: 'border-accent/25 bg-accent/10 text-accent',
};

export default function CitationChip({ citation, onOpen }) {
  const meta = CITATION_META[citation.type];
  const Icon = ICONS[citation.type];
  const text = citation.label ? `${citation.label}` : citation.itemId;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(citation)}
      title={`${meta.label}: ${citation.itemId}${citation.missing ? ' (no longer exists in this version)' : ''}`}
      className={cn('inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-opacity hover:opacity-80', TONES[meta.tone], citation.missing && 'line-through opacity-60')}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{text}</span>
      <span className="hidden font-mono opacity-70 sm:inline">{citation.itemId}</span>
    </button>
  );
}

export const CitationList = ({ citations = [], onOpen }) =>
  citations.length ? <div className="flex flex-wrap gap-1.5">{citations.map((c) => <CitationChip key={`${c.type}:${c.itemId}`} citation={c} onOpen={onOpen} />)}</div> : null;
