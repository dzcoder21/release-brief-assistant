import Card, { CardHeader } from '../ui/Card';
import Badge, { QABadge } from '../ui/Badge';
import { SECTIONS, SECTION_KEYS } from '../../utils/constants';

/** Read-only rendering of a version's release package. */
export default function PackageView({ version, qaEvidence }) {
  return (
    <div className="space-y-4">
      {SECTION_KEYS.map((key) => {
        const items = version[key] || [];
        const none = (version.noneSections || []).includes(key);
        return (
          <Card key={key}>
            <CardHeader title={SECTIONS[key].label} actions={none && !items.length ? <Badge>None declared</Badge> : null} />
            {items.length === 0 ? (
              <p className="px-5 py-4 text-sm text-muted">{none ? 'Explicitly marked as “None”.' : 'Nothing added yet.'}</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((i) => (
                  <li key={i.itemId} className="px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-sm font-medium">{i.title || <span className="text-danger">Untitled</span>}</p>
                      <span className="font-mono text-xs text-muted">{i.itemId}</span>
                      {i.reference && <Badge>{i.reference}</Badge>}
                    </div>
                    {i.description && <p className="mt-1 text-sm text-muted">{i.description}</p>}
                    {i.affectedUsers?.length > 0 && <p className="mt-1 text-xs text-muted">Affects: {i.affectedUsers.join(', ')}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
      <Card>
        <CardHeader title="QA Evidence" />
        {qaEvidence.length === 0 ? <p className="px-5 py-4 text-sm text-muted">No QA evidence supplied.</p> : (
          <ul className="divide-y divide-border">
            {qaEvidence.map((e) => (
              <li key={e.evidenceId} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{e.title} <span className="font-mono text-xs font-normal text-muted">{e.evidenceId}</span></p>
                  {e.description && <p className="text-sm text-muted">{e.description}</p>}
                  {e.source && <p className="text-xs text-muted">Source: {e.source}</p>}
                </div>
                <QABadge status={e.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
