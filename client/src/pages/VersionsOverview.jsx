import { GitBranch } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import { SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import VersionsTable from '../components/releases/VersionsTable';
import { useFetch } from '../hooks/useFetch';
import { versionService } from '../services/releaseService';

export default function VersionsOverview() {
  const { data, loading, error, reload } = useFetch(versionService.listAll, []);
  return (
    <>
      <PageHeader title="Versions" subtitle="Every version across your releases, newest first." />
      <Card>
        {loading ? <SkeletonRows /> : error ? <ErrorState message={error} onRetry={reload} /> : data.items.length === 0 ? (
          <EmptyState icon={GitBranch} title="No versions yet" description="Versions appear once you create a release." />
        ) : (
          <VersionsTable versions={data.items} showRelease />
        )}
      </Card>
    </>
  );
}
