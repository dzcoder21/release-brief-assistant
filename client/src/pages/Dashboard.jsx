import { Link } from 'react-router-dom';
import { FilePlus2, FileStack, FileEdit, ClipboardCheck, CheckCircle2, ShieldAlert } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Skeleton, SkeletonRows } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import ReleasesTable from '../components/releases/ReleasesTable';
import ActivityList from '../components/releases/ActivityList';
import { useFetch } from '../hooks/useFetch';
import { dashboardService } from '../services/releaseService';
import { useAuth } from '../context/AuthContext';

const KPIS = [
  { key: 'total', label: 'Total releases', icon: FileStack, tone: 'text-primary bg-primary/10' },
  { key: 'draft', label: 'Draft', icon: FileEdit, tone: 'text-muted bg-subtle' },
  { key: 'needsReview', label: 'Needs review', icon: ClipboardCheck, tone: 'text-warning bg-warning/10' },
  { key: 'finalized', label: 'Finalized', icon: CheckCircle2, tone: 'text-success bg-success/10' },
  { key: 'highRisk', label: 'High risk', icon: ShieldAlert, tone: 'text-danger bg-danger/10' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useFetch(dashboardService.summary, []);

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle="Readiness, review progress and risk across your releases."
        actions={<Link to="/releases/new"><Button icon={FilePlus2}>New release</Button></Link>}
      />
      {error ? (
        <Card><ErrorState message={error} onRetry={reload} /></Card>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {KPIS.map(({ key, label, icon: Icon, tone }) => (
              <Card key={key} className="p-4">
                <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-md ${tone}`}><Icon className="h-4 w-4" /></div>
                {loading ? <Skeleton className="h-7 w-10" /> : <p className="text-2xl font-semibold tabular-nums">{data.kpis[key]}</p>}
                <p className="mt-0.5 text-xs text-muted">{label}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader title="Recent releases" actions={<Link to="/releases" className="text-xs font-medium text-primary hover:underline">View all</Link>} />
              {loading ? <SkeletonRows /> : data.recentReleases.length === 0 ? (
                <EmptyState icon={FileStack} title="No releases yet" description="Create a release package to run your first readiness analysis." action={<Link to="/releases/new"><Button size="sm">Create release</Button></Link>} />
              ) : (
                <ReleasesTable releases={data.recentReleases} />
              )}
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Recent activity" />
              {loading ? <SkeletonRows rows={5} /> : <ActivityList items={data.recentActivity} />}
            </Card>
          </div>
        </>
      )}
    </>
  );
}
