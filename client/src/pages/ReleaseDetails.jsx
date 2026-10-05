import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { GitBranch, Plus } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import { Select } from '../components/ui/Inputs';
import { StatusBadge, LevelBadge } from '../components/ui/Badge';
import { SkeletonCards } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import PackageView from '../components/releases/PackageView';
import VersionActions from '../components/releases/VersionActions';
import ValidationPanel from '../components/analysis/ValidationPanel';
import ActivityList from '../components/releases/ActivityList';
import { SkeletonRows } from '../components/ui/Skeleton';
import { useFetch } from '../hooks/useFetch';
import { releaseService, versionService, dashboardService } from '../services/releaseService';
import { formatDate } from '../utils/format';

function ActivityTab({ releaseId }) {
  const { data, loading } = useFetch(() => dashboardService.activity({ releaseId, limit: 30 }), [releaseId]);
  return <Card>{loading ? <SkeletonRows rows={4} /> : <ActivityList items={data.items} />}</Card>;
}

export default function ReleaseDetails() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('package');

  const releaseQ = useFetch(() => releaseService.get(id), [id]);
  const versions = releaseQ.data?.versions || [];
  const selectedId = params.get('version') || releaseQ.data?.release.currentVersionId || versions[0]?._id;
  const versionQ = useFetch(() => (selectedId ? versionService.get(selectedId) : Promise.resolve(null)), [selectedId]);

  if (releaseQ.loading) return <SkeletonCards count={3} className="h-32" />;
  if (releaseQ.error) return <Card><ErrorState message={releaseQ.error} onRetry={releaseQ.reload} /></Card>;

  const { release } = releaseQ.data;
  const detail = versionQ.data;

  return (
    <>
      <PageHeader
        title={release.name}
        subtitle={release.description}
        crumbs={[{ label: 'Releases', to: '/releases' }, { label: release.name }]}
        badges={<><StatusBadge status={release.status} /><LevelBadge level={release.riskLevel} prefix="Risk:" /></>}
        actions={
          <>
            <Link to={`/releases/${id}/versions`}><Button variant="secondary" icon={GitBranch}>Version history</Button></Link>
            <Link to={`/releases/${id}/versions/new`}><Button variant="secondary" icon={Plus}>New version</Button></Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select aria-label="Select version" value={selectedId || ''} onChange={(e) => setParams({ version: e.target.value })} className="w-auto">
          {versions.map((v) => <option key={v._id} value={v._id}>v{v.version}{v._id === release.currentVersionId ? ' (latest)' : ''}</option>)}
        </Select>
        {detail && <><StatusBadge status={detail.version.status} /><span className="text-xs text-muted">Released {formatDate(detail.version.releaseDate)}</span></>}
        <div className="ml-auto flex flex-wrap gap-2">{detail && <VersionActions version={detail.version} releaseId={id} />}</div>
      </div>

      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ key: 'package', label: 'Release package' }, { key: 'validation', label: 'Validation' }, { key: 'activity', label: 'Activity' }]} />

      {tab === 'activity' ? <ActivityTab releaseId={id} /> : versionQ.loading ? <SkeletonCards count={3} className="h-32" /> : versionQ.error ? (
        <Card><ErrorState message={versionQ.error} onRetry={versionQ.reload} /></Card>
      ) : !detail ? null : tab === 'validation' ? (
        <ValidationPanel validation={detail.version.deterministicValidation} />
      ) : (
        <PackageView version={detail.version} qaEvidence={detail.qaEvidence} />
      )}
    </>
  );
}
