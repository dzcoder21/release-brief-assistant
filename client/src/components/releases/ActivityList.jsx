import { Activity } from 'lucide-react';
import { timeAgo } from '../../utils/format';
import { EmptyState } from '../ui/States';

const detail = (a) => a.metadata?.name || (a.metadata?.version ? `v${a.metadata.version}` : '');

export default function ActivityList({ items }) {
  if (!items.length) return <EmptyState icon={Activity} title="No activity yet" description="Actions like creating a release or approving a statement appear here." />;
  return (
    <ul className="divide-y divide-border">
      {items.map((a) => (
        <li key={a._id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm">{a.action}{detail(a) && <span className="text-muted"> · {detail(a)}</span>}</p>
            <p className="text-xs text-muted">{a.user?.name || 'System'} · {timeAgo(a.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
