import { Link } from 'react-router-dom';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import { StatusBadge, LevelBadge } from '../ui/Badge';
import Button from '../ui/Button';
import { timeAgo } from '../../utils/format';

/** Table on desktop, stacked cards on mobile. */
export default function ReleasesTable({ releases, onDelete }) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-5 py-2.5 font-medium">Release</th>
              <th className="px-3 py-2.5 font-medium">Version</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium">Risk</th>
              <th className="px-3 py-2.5 font-medium">Updated</th>
              <th className="px-5 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {releases.map((r) => (
              <tr key={r._id} className="hover:bg-subtle/60">
                <td className="px-5 py-3 font-medium"><Link to={`/releases/${r._id}`} className="hover:text-primary">{r.name}</Link></td>
                <td className="px-3 py-3 font-mono text-xs text-muted">v{r.currentVersion}</td>
                <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-3"><LevelBadge level={r.riskLevel} /></td>
                <td className="px-3 py-3 text-muted">{timeAgo(r.updatedAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1">
                    <Link to={`/releases/${r._id}`}><Button variant="ghost" size="sm" icon={ArrowUpRight}>Open</Button></Link>
                    {onDelete && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onDelete(r)} aria-label={`Delete ${r.name}`} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-border md:hidden">
        {releases.map((r) => (
          <li key={r._id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <Link to={`/releases/${r._id}`} className="font-medium">{r.name}</Link>
              <span className="font-mono text-xs text-muted">v{r.currentVersion}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={r.status} />
              <LevelBadge level={r.riskLevel} prefix="Risk:" />
              <span className="text-xs text-muted">{timeAgo(r.updatedAt)}</span>
            </div>
            <div className="flex gap-2">
              <Link to={`/releases/${r._id}`}><Button variant="secondary" size="sm">Open</Button></Link>
              {onDelete && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => onDelete(r)}>Delete</Button>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
