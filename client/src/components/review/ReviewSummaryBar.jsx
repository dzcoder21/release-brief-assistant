import { cn } from '../../utils/format';

const ITEMS = [
  ['APPROVED', 'Approved', 'text-success'],
  ['EDITED', 'Edited', 'text-primary'],
  ['PENDING', 'Pending', 'text-muted'],
  ['REJECTED', 'Rejected', 'text-danger'],
  ['STALE', 'Stale', 'text-warning'],
];

export default function ReviewSummaryBar({ counts }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm"><span className="text-xl font-semibold tabular-nums">{counts.total}</span> <span className="text-muted">statements</span></p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {ITEMS.map(([key, label, tone]) => (
          <p key={key} className={cn('text-sm', counts[key] === 0 && 'opacity-50')}>
            <span className={cn('font-semibold tabular-nums', tone)}>{counts[key]}</span> {label}
          </p>
        ))}
      </div>
    </div>
  );
}
