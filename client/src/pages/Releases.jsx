import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilePlus2, FileStack } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Select } from '../components/ui/Inputs';
import { ConfirmDialog } from '../components/ui/Modal';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import ReleasesTable from '../components/releases/ReleasesTable';
import { useFetch } from '../hooks/useFetch';
import { releaseService } from '../services/releaseService';
import { errorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { RELEASE_STATUS } from '../utils/constants';

export default function Releases() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const q = params.get('q') || '';
  const status = params.get('status') || '';
  const risk = params.get('risk') || '';

  const { data, loading, error, reload } = useFetch(
    () => releaseService.list({ q: q || undefined, status: status || undefined, risk: risk || undefined, page, limit: 15 }),
    [q, status, risk, page]
  );

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next);
    setPage(1);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await releaseService.remove(target._id);
      toast.success(`Deleted "${target.name}"`);
      setTarget(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader title="Releases" subtitle="Every release and its current readiness." actions={<Link to="/releases/new"><Button icon={FilePlus2}>New release</Button></Link>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-3 sm:p-4">
          <Select aria-label="Filter by status" value={status} onChange={(e) => setFilter('status', e.target.value)} className="w-auto">
            <option value="">All statuses</option>
            {Object.entries(RELEASE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </Select>
          <Select aria-label="Filter by risk" value={risk} onChange={(e) => setFilter('risk', e.target.value)} className="w-auto">
            <option value="">Any risk</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
          {q && <Button variant="ghost" size="sm" onClick={() => setFilter('q', '')}>Clear search “{q}”</Button>}
        </div>
        {loading ? <SkeletonRows rows={5} /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? (
          <EmptyState icon={FileStack} title={q || status || risk ? 'No releases match these filters' : 'No releases yet'} description="Create a release package to get started." action={<Link to="/releases/new"><Button size="sm">Create release</Button></Link>} />
        ) : (
          <>
            <ReleasesTable releases={data.items} onDelete={setTarget} />
            {data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
                <span>Page {data.page} of {data.pages}</span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      <ConfirmDialog open={Boolean(target)} onClose={() => setTarget(null)} onConfirm={remove} loading={deleting} tone="danger" confirmLabel="Delete release" title="Delete this release?">
        <p>“{target?.name}” and all of its versions, QA evidence and statements will be permanently removed.</p>
        <p>Releases with finalized versions cannot be deleted.</p>
      </ConfirmDialog>
    </>
  );
}
