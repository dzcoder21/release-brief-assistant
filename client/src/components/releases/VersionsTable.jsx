import { Link } from 'react-router-dom';
import { StatusBadge, LevelBadge } from '../ui/Badge';
import { formatDate } from '../../utils/format';

const counts = (c) => (c?.total ? `${c.APPROVED + c.EDITED}/${c.total} reviewed${c.STALE ? ` · ${c.STALE} stale` : ''}` : '—');

export default function VersionsTable({ versions, showRelease, selectable, selected = [], onToggle }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {selectable && <th className="w-10 px-4 py-2.5" />}
            {showRelease && <th className="px-3 py-2.5 font-medium">Release</th>}
            <th className="px-3 py-2.5 font-medium">Version</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Risk</th>
            <th className="px-3 py-2.5 font-medium">Review</th>
            <th className="px-3 py-2.5 font-medium">Created</th>
            <th className="px-3 py-2.5 font-medium">By</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {versions.map((v) => (
            <tr key={v._id} className="hover:bg-subtle/60">
              {selectable && (
                <td className="px-4 py-3">
                  <input type="checkbox" aria-label={`Select v${v.version}`} className="h-4 w-4 accent-[rgb(var(--primary))]" checked={selected.includes(v._id)} onChange={() => onToggle(v._id)} />
                </td>
              )}
              {showRelease && <td className="px-3 py-3 font-medium"><Link to={`/releases/${v.releaseId}`} className="hover:text-primary">{v.releaseName}</Link></td>}
              <td className="px-3 py-3 font-mono text-xs">v{v.version}</td>
              <td className="px-3 py-3"><StatusBadge status={v.status} /></td>
              <td className="px-3 py-3"><LevelBadge level={v.riskLevel} /></td>
              <td className="px-3 py-3 text-xs text-muted">{counts(v.statementCounts)}</td>
              <td className="px-3 py-3 text-muted">{formatDate(v.createdAt)}</td>
              <td className="px-3 py-3 text-muted">{v.createdBy?.name || '—'}</td>
              <td className="px-4 py-3 text-right"><Link to={`/releases/${v.releaseId}?version=${v._id}`} className="text-xs font-medium text-primary hover:underline">Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
