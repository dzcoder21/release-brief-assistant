import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Badge from '../ui/Badge';

const GROUPS = [
  { key: 'errors', label: 'Errors', icon: AlertCircle, tone: 'danger', text: 'text-danger' },
  { key: 'warnings', label: 'Warnings', icon: AlertTriangle, tone: 'warning', text: 'text-warning' },
  { key: 'info', label: 'Info', icon: Info, tone: 'info', text: 'text-info' },
];

/** Deterministic rule results. Deliberately separate from AI findings. */
export default function ValidationPanel({ validation, onOpen }) {
  if (!validation) return null;
  return (
    <Card>
      <CardHeader
        title="Deterministic validation"
        description="Rule-based checks. No AI involved."
        actions={validation.isComplete ? <Badge tone="success" icon={CheckCircle2}>Package complete</Badge> : <Badge tone="danger" icon={AlertCircle}>{validation.errors.length} {validation.errors.length === 1 ? 'error' : 'errors'}</Badge>}
      />
      <div className="divide-y divide-border">
        {GROUPS.map(({ key, label, icon: Icon, text }) =>
          validation[key]?.length ? (
            <div key={key} className="px-4 py-3 sm:px-5">
              <p className={`mb-2 flex items-center gap-1.5 text-xs font-semibold ${text}`}><Icon className="h-3.5 w-3.5" />{label} ({validation[key].length})</p>
              <ul className="space-y-1.5">
                {validation[key].map((i) => (
                  <li key={i.id} className="text-sm">
                    {onOpen ? (
                      <button type="button" className="text-left hover:underline" onClick={() => onOpen({ type: 'validation_result', itemId: i.id, label: i.code })}>{i.message}</button>
                    ) : i.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null
        )}
        {!validation.errors.length && !validation.warnings.length && !validation.info.length && <p className="px-5 py-4 text-sm text-muted">No findings.</p>}
      </div>
    </Card>
  );
}
