import { useMemo, useState } from 'react';
import { Drawer } from '../ui/Modal';
import Badge, { QABadge } from '../ui/Badge';
import { CITATION_META } from '../../utils/citations';

/** Click a citation → read the original source it points to. */
export function useSourceDrawer(index) {
  const [citation, setCitation] = useState(null);
  const source = useMemo(() => (citation && index ? index.resolve(citation) : null), [citation, index]);

  const drawer = (
    <Drawer open={Boolean(citation)} onClose={() => setCitation(null)} title="Source">
      {citation && (
        <div className="space-y-4">
          <Badge tone={CITATION_META[citation.type].tone}>{CITATION_META[citation.type].label}</Badge>
          {!source ? (
            <p className="text-sm text-muted">This source no longer exists in this version{citation.label ? ` (“${citation.label}”)` : ''}. The statement may be out of date.</p>
          ) : (
            <>
              <div>
                <p className="font-mono text-xs text-muted">{source.id}</p>
                <h3 className="mt-1 text-base font-semibold">{source.title}</h3>
              </div>
              {source.status && <div className="flex items-center gap-2 text-sm"><span className="text-muted">Result</span><QABadge status={source.status} /></div>}
              {source.severity && <p className="text-sm"><span className="text-muted">Severity: </span>{source.severity}</p>}
              {source.section && <p className="text-sm"><span className="text-muted">Section: </span>{source.section}</p>}
              {source.body && <p className="whitespace-pre-wrap rounded-md bg-subtle p-3 text-sm">{source.body}</p>}
              {source.users?.length > 0 && <p className="text-sm"><span className="text-muted">Affected users: </span>{source.users.join(', ')}</p>}
              {source.reference && <p className="text-sm"><span className="text-muted">Reference: </span><span className="font-mono">{source.reference}</span></p>}
              {source.source && <p className="text-sm"><span className="text-muted">Source: </span>{source.source}</p>}
            </>
          )}
        </div>
      )}
    </Drawer>
  );
  return { open: setCitation, drawer };
}
