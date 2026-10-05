import PageHeader from '../components/layout/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import { SkeletonCards } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import { useFetch } from '../hooks/useFetch';
import { dashboardService } from '../services/releaseService';
import { RELEASE_STATUS, STATEMENT_STATUS } from '../utils/constants';

function Bars({ rows, empty = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.some((r) => r.value)) return <p className="px-5 py-6 text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3 p-5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-sm"><span>{r.label}</span><span className="tabular-nums text-muted">{r.value}</span></div>
          <div className="h-2 rounded-full bg-subtle"><div className={`h-2 rounded-full ${r.color || 'bg-primary'}`} style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export default function Analytics() {
  const { data, loading, error, reload } = useFetch(dashboardService.analytics, []);
  if (loading) return <SkeletonCards count={3} className="h-40" />;
  if (error) return <Card><ErrorState message={error} onRetry={reload} /></Card>;

  const risk = data.releasesByRisk;
  return (
    <>
      <PageHeader title="Analytics" subtitle="Where your releases stand and what the analysis keeps finding." />
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader title="Releases by status" />
          <Bars rows={Object.entries(RELEASE_STATUS).map(([k, v]) => ({ label: v.label, value: data.releasesByStatus[k] || 0 }))} />
        </Card>
        <Card>
          <CardHeader title="Releases by risk" />
          <Bars rows={[
            { label: 'High', value: risk.HIGH || 0, color: 'bg-danger' },
            { label: 'Medium', value: risk.MEDIUM || 0, color: 'bg-warning' },
            { label: 'Low', value: risk.LOW || 0, color: 'bg-success' },
            { label: 'Not analyzed', value: risk.NONE || 0, color: 'bg-muted' },
          ]} />
        </Card>
        <Card>
          <CardHeader title="Statement review" description="Across all versions" />
          <Bars rows={Object.entries(STATEMENT_STATUS).map(([k, v]) => ({ label: v.label, value: data.statementsByStatus[k] || 0 }))} empty="No statements generated yet." />
        </Card>
        <Card>
          <CardHeader title="AI findings" description="Across all analyzed versions" />
          <Bars rows={[
            { label: 'Unsupported claims', value: data.findings.unsupportedClaims, color: 'bg-warning' },
            { label: 'Missing information', value: data.findings.missingInformation, color: 'bg-info' },
            { label: 'Risks', value: data.findings.risks, color: 'bg-danger' },
          ]} empty="No analyses have run yet." />
        </Card>
        <Card className="md:col-span-2">
          <CardHeader title="Releases created per month" />
          <Bars rows={data.releasesByMonth.map((m) => ({ label: m.month, value: m.count }))} />
        </Card>
      </div>
    </>
  );
}
