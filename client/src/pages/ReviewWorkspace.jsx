import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText, Sparkles } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import { StatusBadge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/Modal';
import { SkeletonCards } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import StatementCard from '../components/review/StatementCard';
import StatementEditModal from '../components/review/StatementEditModal';
import ReviewSummaryBar from '../components/review/ReviewSummaryBar';
import FinalizePanel from '../components/review/FinalizePanel';
import { useSourceDrawer } from '../components/review/SourceDrawer';
import { useFetch } from '../hooks/useFetch';
import { statementService, versionService } from '../services/releaseService';
import { errorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { buildSourceIndex } from '../utils/citations';
import { ClipboardList } from 'lucide-react';

export default function ReviewWorkspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState('ALL');
  const [busy, setBusy] = useState({});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const detail = useFetch(() => versionService.get(id), [id]);
  const list = useFetch(() => versionService.statements(id), [id]);
  const check = useFetch(() => versionService.finalizationCheck(id), [id]);
  const analysis = useFetch(() => versionService.analysis(id), [id]);

  const index = useMemo(
    () => (detail.data ? buildSourceIndex({ version: detail.data.version, qaEvidence: detail.data.qaEvidence, validation: detail.data.version.deterministicValidation, analysis: detail.data.version.aiAnalysis }) : null),
    [detail.data]
  );
  const { open, drawer } = useSourceDrawer(index);

  if (detail.loading || list.loading) return <SkeletonCards count={4} className="h-32" />;
  if (detail.error || list.error) return <Card><ErrorState message={detail.error || list.error} onRetry={() => { detail.reload(); list.reload(); }} /></Card>;

  const { version, release } = detail.data;
  const { statements, counts } = list.data;
  const finalized = version.status === 'FINALIZED';
  const visible = filter === 'ALL' ? statements : statements.filter((s) => s.status === filter);

  const applyResult = (result) => {
    list.setData((d) => ({ ...d, counts: result.counts, statements: d.statements.map((s) => (s._id === result.statement._id ? result.statement : s)) }));
    detail.setData((d) => ({ ...d, version: { ...d.version, status: result.versionStatus } }));
    check.reload({ silent: true });
  };

  const act = async (statement, kind, reviewerNote) => {
    setBusy((b) => ({ ...b, [statement._id]: kind }));
    try {
      const body = reviewerNote !== undefined ? { reviewerNote } : {};
      applyResult(await statementService[kind](statement._id, kind === 'reset' ? undefined : body));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy((b) => ({ ...b, [statement._id]: null }));
    }
  };

  const saveEdit = async (editedContent, reviewerNote) => {
    setSaving(true);
    try {
      applyResult(await statementService.update(editing.statement._id, { editedContent, reviewerNote }));
      toast.success('Statement saved.');
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    setFinalizing(true);
    try {
      await versionService.finalize(id);
      toast.success('Release brief finalized.');
      navigate(`/versions/${id}/brief`);
    } catch (err) {
      toast.error(errorMessage(err));
      check.reload({ silent: true });
      setConfirm(false);
    } finally {
      setFinalizing(false);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'All', count: counts.total },
    ...['PENDING', 'STALE', 'APPROVED', 'EDITED', 'REJECTED'].map((k) => ({ key: k, label: k.charAt(0) + k.slice(1).toLowerCase(), count: counts[k] })),
  ];

  return (
    <>
      <PageHeader
        title="Review workspace"
        subtitle={`${release.name} · v${version.version}`}
        crumbs={[{ label: 'Releases', to: '/releases' }, { label: release.name, to: `/releases/${release._id}` }, { label: `v${version.version}` }]}
        badges={<StatusBadge status={version.status} />}
        actions={
          <>
            <Link to={`/versions/${id}/analysis`}><Button variant="secondary" icon={Sparkles}>AI analysis</Button></Link>
            <Link to={`/versions/${id}/brief`}><Button variant="secondary" icon={FileText}>Brief preview</Button></Link>
          </>
        }
      />

      {counts.STALE > 0 && (
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm" role="alert">
          <strong>{counts.STALE} statement{counts.STALE > 1 ? 's' : ''} may be stale.</strong> Reviewed statements from an earlier version no longer match this release package. Nothing was changed automatically — decide whether each one is still valid.
        </div>
      )}
      {!version.aiAnalysis && counts.total === 0 && analysis.data?.analysisStatus !== 'RUNNING' && (
        <Card className="mb-4"><EmptyState icon={Sparkles} title="Nothing to review yet" description="Run the AI analysis to generate statements for review." action={<Link to={`/versions/${id}/analysis`}><Button size="sm">Go to AI analysis</Button></Link>} /></Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ReviewSummaryBar counts={counts} />
          <Tabs tabs={tabs} value={filter} onChange={setFilter} />
          {visible.length === 0 ? (
            <Card><EmptyState icon={ClipboardList} title="No statements here" description={filter === 'ALL' ? 'Statements appear after analysis.' : 'No statements have this status.'} /></Card>
          ) : (
            <div className="space-y-3">
              {visible.map((s) => (
                <StatementCard key={s._id} statement={s} readOnly={finalized} busy={busy[s._id]} onAction={act} onEdit={(st, note) => setEditing({ statement: st, note })} onOpenSource={open} />
              ))}
            </div>
          )}
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          {check.data && <FinalizePanel check={check.data} finalized={finalized} onFinalize={() => setConfirm(true)} />}
        </div>
      </div>

      <StatementEditModal statement={editing?.statement} initialNote={editing?.note} saving={saving} onClose={() => setEditing(null)} onSave={saveEdit} />
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} onConfirm={finalize} loading={finalizing} confirmLabel="Finalize brief" title="Finalize this release brief?">
        <p className="font-medium text-fg">Are you sure you want to finalize this release brief?</p>
        <p>AI-generated content will not be automatically approved. You are confirming that the reviewed content is ready.</p>
        <p>A finalized version is locked and cannot be changed.</p>
      </ConfirmDialog>
      {drawer}
    </>
  );
}
