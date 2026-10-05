import { useState } from 'react';
import { Check, ChevronDown, ChevronUp, MessageSquare, Pencil, RotateCcw, X } from 'lucide-react';
import Badge, { StatementStatusBadge } from '../ui/Badge';
import Button from '../ui/Button';
import { Textarea } from '../ui/Inputs';
import { CitationList } from './CitationChip';
import { STATEMENT_STATUS, STATEMENT_SECTIONS, TYPE_LABEL } from '../../utils/constants';
import { cn } from '../../utils/format';

function StaleReasons({ reasons }) {
  return (
    <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3" role="note">
      <p className="text-xs font-semibold text-warning">May be stale — please review</p>
      <ul className="mt-1.5 space-y-2">
        {reasons.map((r, i) => (
          <li key={i} className="text-sm">
            {r.message}
            {r.changes?.length > 0 && (
              <ul className="mt-1 space-y-1 text-xs text-muted">
                {r.changes.filter((c) => c.field !== 'affectedUsers' || true).map((c) => (
                  <li key={c.field}>
                    <span className="font-medium">{c.field}:</span> <span className="line-through">{[].concat(c.from).join(', ') || '(empty)'}</span> → {[].concat(c.to).join(', ') || '(empty)'}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StatementCard({ statement: s, readOnly, busy, onAction, onEdit, onOpenSource }) {
  const [note, setNote] = useState(s.reviewerNote || '');
  const [showNote, setShowNote] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const meta = STATEMENT_STATUS[s.status];
  const text = s.editedContent || s.content;
  const canApprove = ['PENDING', 'STALE', 'REJECTED'].includes(s.status);
  const canReject = s.status !== 'REJECTED';
  const canReset = s.status !== 'PENDING' && !(s.status === 'STALE');
  const act = (kind) => onAction(s, kind, note.trim() !== (s.reviewerNote || '') ? note.trim() : undefined);

  return (
    <article className={cn('relative overflow-hidden rounded-lg border bg-card pl-1.5', s.status === 'STALE' ? 'border-warning/50' : 'border-border')} aria-label={`Statement, ${meta.label}`}>
      <span className={cn('absolute inset-y-0 left-0 w-1.5', meta.rail)} />
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatementStatusBadge status={s.status} />
          <Badge>{TYPE_LABEL[s.type]}</Badge>
          <Badge>{STATEMENT_SECTIONS[s.section]}</Badge>
          {s.origin === 'CARRIED' && <Badge tone="info">Carried from v{s.carriedFromVersion}</Badge>}
          {s.editedContent && <Badge tone="primary">Human-edited</Badge>}
          {s.uncited && <Badge tone="warning">No citation</Badge>}
        </div>

        <p className="text-[15px] leading-relaxed">{text}</p>

        {s.editedContent && (
          <button className="mt-1.5 flex items-center gap-1 text-xs text-muted hover:text-fg" onClick={() => setShowOriginal(!showOriginal)}>
            {showOriginal ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}Original text
          </button>
        )}
        {showOriginal && <p className="mt-1 rounded-md bg-subtle p-2 text-sm text-muted">{s.content}</p>}

        {s.status === 'STALE' && s.staleReasons?.length > 0 && <StaleReasons reasons={s.staleReasons} />}

        {s.citations.length > 0 && <div className="mt-3"><CitationList citations={s.citations} onOpen={onOpenSource} /></div>}
        {s.reviewerNote && !showNote && <p className="mt-3 flex gap-1.5 text-xs text-muted"><MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />{s.reviewerNote}</p>}

        {showNote && !readOnly && (
          <div className="mt-3">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reviewer note (saved with your next action)" aria-label="Reviewer note" />
          </div>
        )}

        {!readOnly && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon={Pencil} disabled={busy} onClick={() => onEdit(s, note)}>Edit</Button>
            {canApprove && <Button size="sm" variant="success" icon={Check} loading={busy === 'approve'} disabled={Boolean(busy)} onClick={() => act('approve')}>{s.status === 'STALE' ? 'Still valid' : 'Approve'}</Button>}
            {canReject && <Button size="sm" variant="secondary" icon={X} loading={busy === 'reject'} disabled={Boolean(busy)} onClick={() => act('reject')}>Reject</Button>}
            {canReset && <Button size="sm" variant="ghost" icon={RotateCcw} disabled={Boolean(busy)} onClick={() => onAction(s, 'reset')}>Undo</Button>}
            <Button size="sm" variant="ghost" icon={MessageSquare} onClick={() => setShowNote(!showNote)}>{showNote ? 'Hide note' : 'Note'}</Button>
          </div>
        )}
      </div>
    </article>
  );
}
