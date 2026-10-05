import { Minus, Plus, Pencil as Tilde } from 'lucide-react';
import { cn } from '../../utils/format';
import { QABadge, LevelBadge } from '../ui/Badge';

const FIELD = { title: 'Title', description: 'Description', affectedUsers: 'Affected users', reference: 'Reference', status: 'Result', source: 'Source' };
const show = (v) => (Array.isArray(v) ? v.join(', ') : v) || '(empty)';

const TONES = {
  add: { icon: Plus, row: 'border-success/30 bg-success/5', mark: 'text-success' },
  remove: { icon: Minus, row: 'border-danger/30 bg-danger/5', mark: 'text-danger' },
  change: { icon: Tilde, row: 'border-warning/30 bg-warning/5', mark: 'text-warning' },
};

function Row({ kind, title, id, children }) {
  const { icon: Icon, row, mark } = TONES[kind];
  return (
    <li className={cn('rounded-md border p-3', row)}>
      <div className="flex items-start gap-2">
        <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', mark)} aria-label={kind} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title || 'Untitled'} {id && <span className="font-mono text-xs font-normal text-muted">{id}</span>}</p>
          {children}
        </div>
      </div>
    </li>
  );
}

export function ChangeList({ changes }) {
  return (
    <ul className="mt-1.5 space-y-1 text-xs">
      {changes.map((c) => (
        <li key={c.field}>
          <span className="font-medium text-muted">{FIELD[c.field]}: </span>
          {c.field === 'status' ? <><QABadge status={c.from} /> → <QABadge status={c.to} /></> : <><span className="text-danger line-through">{show(c.from)}</span> → <span className="text-success">{show(c.to)}</span></>}
        </li>
      ))}
    </ul>
  );
}

/** Added / removed / changed rows for one group (a package section or QA evidence). */
export function DiffGroup({ added, removed, changed, idKey = 'itemId' }) {
  if (!added.length && !removed.length && !changed.length) return <p className="text-sm text-muted">No changes.</p>;
  return (
    <ul className="space-y-2">
      {added.map((i) => <Row key={`a${i[idKey]}`} kind="add" title={i.title} id={i[idKey]}>{i.status && <div className="mt-1"><QABadge status={i.status} /></div>}</Row>)}
      {removed.map((i) => <Row key={`r${i[idKey]}`} kind="remove" title={i.title} id={i[idKey]} />)}
      {changed.map((i) => <Row key={`c${i[idKey]}`} kind="change" title={i.title} id={i[idKey]}><ChangeList changes={i.changes} /></Row>)}
    </ul>
  );
}

export function ImpactChanges({ impact }) {
  const empty = !impact.affectedUsersChanged.length && !impact.impactLevelChanged.length;
  return (
    <div className="space-y-3">
      {impact.affectedUsersChanged.map((c) => (
        <div key={c.itemId} className="rounded-md border border-border p-3 text-sm">
          <p className="font-medium">{c.title} <span className="font-mono text-xs font-normal text-muted">{c.itemId}</span></p>
          <p className="mt-1 text-xs text-muted">Affected users changed.
            {c.added.length > 0 && <span className="text-success"> Added: {c.added.join(', ')}.</span>}
            {c.removed.length > 0 && <span className="text-danger"> Removed: {c.removed.join(', ')}.</span>}
          </p>
        </div>
      ))}
      {impact.impactLevelChanged.map((c) => (
        <div key={c.itemId} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm">
          <span className="font-medium">{c.title}</span> impact level: <LevelBadge level={c.from} /> → <LevelBadge level={c.to} />
        </div>
      ))}
      {!impact.bothAnalyzed && <p className="text-xs text-muted">Impact levels can be compared once both versions have an AI analysis.</p>}
      {empty && impact.bothAnalyzed && <p className="text-sm text-muted">No user impact changes.</p>}
    </div>
  );
}
