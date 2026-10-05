import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { AssessmentBadge } from '../components/ui/Badge';
import { Select } from '../components/ui/Inputs';
import { SkeletonCards } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { DiffGroup, ImpactChanges } from '../components/comparison/DiffBlocks';
import { useFetch } from '../hooks/useFetch';
import { releaseService, versionService } from '../services/releaseService';
import { GitCompare } from 'lucide-react';

const Stat = ({ label, value, tone }) => (
  <Card className="p-4"><p className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</p><p className="text-xs text-muted">{label}</p></Card>
);

export default function VersionComparison() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const rel = useFetch(() => releaseService.get(id), [id]);
  const versions = rel.data?.versions || [];
  const [left, setLeft] = useState(params.get('left') || '');
  const [right, setRight] = useState(params.get('right') || '');

  // Default: compare the two most recent versions
  useEffect(() => {
    if (versions.length >= 2 && (!left || !right)) {
      setRight((r) => r || versions[0]._id);
      setLeft((l) => l || versions.find((v) => v._id !== (params.get('right') || versions[0]._id))?._id || versions[1]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.length]);

  const ready = left && right && left !== right;
  const cmp = useFetch(() => (ready ? versionService.compare(left, right) : Promise.resolve(null)), [left, right]);

  const choose = (setter, key) => (e) => {
    setter(e.target.value);
    setParams({ left: key === 'left' ? e.target.value : left, right: key === 'right' ? e.target.value : right });
  };
  const c = cmp.data?.comparison;
  const options = versions.map((v) => <option key={v._id} value={v._id}>v{v.version}</option>);

  return (
    <>
      <PageHeader title="Version comparison" subtitle="What changed between two immutable snapshots." crumbs={[{ label: 'Releases', to: '/releases' }, { label: rel.data?.release.name || '…', to: `/releases/${id}` }, { label: 'Compare' }]} />
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div><label className="label" htmlFor="left">Compare</label><Select id="left" value={left} onChange={choose(setLeft, 'left')} className="w-40"><option value="">Select…</option>{options}</Select></div>
          <span className="pb-2 text-sm text-muted">vs</span>
          <div><label className="label" htmlFor="right">With</label><Select id="right" value={right} onChange={choose(setRight, 'right')} className="w-40"><option value="">Select…</option>{options}</Select></div>
          {left && right && left !== right && (
            <Button variant="ghost" onClick={() => { setLeft(right); setRight(left); setParams({ left: right, right: left }); }}>Swap</Button>
          )}
        </div>
      </Card>

      {rel.loading || cmp.loading ? <SkeletonCards count={3} className="h-32" /> : rel.error || cmp.error ? (
        <Card><ErrorState message={rel.error || cmp.error} onRetry={() => { rel.reload(); cmp.reload(); }} /></Card>
      ) : !c ? (
        <Card><EmptyState icon={GitCompare} title="Choose two versions" description={versions.length < 2 ? 'This release has only one version so far.' : 'Select two different versions to see what changed.'} /></Card>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Added" value={c.summary.added} tone="text-success" />
            <Stat label="Removed" value={c.summary.removed} tone="text-danger" />
            <Stat label="Changed" value={c.summary.changed} tone="text-warning" />
            <Stat label="QA changes" value={c.summary.qaChanges} tone="text-primary" />
          </div>

          {c.rightStatementCounts?.STALE > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
              v{c.right.version} has <strong>{c.rightStatementCounts.STALE} stale statement(s)</strong> that need a human decision.
            </div>
          )}

          {c.sections.map((s) => (
            <Card key={s.key}>
              <CardHeader title={s.label} actions={<Badge>{s.unchanged} unchanged</Badge>} />
              <div className="p-4 sm:p-5"><DiffGroup added={s.added} removed={s.removed} changed={s.changed} /></div>
            </Card>
          ))}

          <Card>
            <CardHeader title="QA changes" description="Evidence added, removed or with a changed result." />
            <div className="p-4 sm:p-5"><DiffGroup added={c.qa.added} removed={c.qa.removed} changed={c.qa.changed} idKey="evidenceId" /></div>
          </Card>

          <Card>
            <CardHeader title="User impact changes" />
            <div className="space-y-3 p-4 sm:p-5">
              {(c.impact.assessment.from || c.impact.assessment.to) && (
                <p className="flex flex-wrap items-center gap-2 text-sm">Overall assessment: {c.impact.assessment.from ? <AssessmentBadge level={c.impact.assessment.from} /> : '—'} → {c.impact.assessment.to ? <AssessmentBadge level={c.impact.assessment.to} /> : '—'}</p>
              )}
              <ImpactChanges impact={c.impact} />
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
