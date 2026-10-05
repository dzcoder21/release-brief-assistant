import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardCheck, RefreshCw, Sparkles } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tabs from '../components/ui/Tabs';
import { StatusBadge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/Modal';
import { SkeletonCards } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import AnalysisProgress from '../components/analysis/AnalysisProgress';
import ValidationPanel from '../components/analysis/ValidationPanel';
import { OverallAssessment, ImpactList, MissingList, ClaimsList, RisksList, SummaryList } from '../components/analysis/Findings';
import { useSourceDrawer } from '../components/review/SourceDrawer';
import { useFetch } from '../hooks/useFetch';
import { versionService } from '../services/releaseService';
import { errorCode, errorMessage } from '../services/api';
import { useToast } from '../context/ToastContext';
import { buildSourceIndex } from '../utils/citations';
import { AI_ERROR_HELP } from '../utils/constants';

export default function AIAnalysis() {
  const { id } = useParams();
  const toast = useToast();
  const [tab, setTab] = useState('overview');
  const [starting, setStarting] = useState(false);
  const [confirmForce, setConfirmForce] = useState(false);

  const detail = useFetch(() => versionService.get(id), [id]);
  const state = useFetch(() => versionService.analysis(id), [id]);
  const running = state.data?.analysisStatus === 'RUNNING';

  // Poll real server-side progress while the analysis runs.
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(async () => {
      const next = await state.reload({ silent: true });
      if (next && next.analysisStatus !== 'RUNNING') {
        detail.reload({ silent: true });
        if (next.analysisStatus === 'COMPLETED') toast.success('Analysis complete.');
      }
    }, 1500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const analysis = state.data?.analysis;
  const index = useMemo(
    () => (detail.data ? buildSourceIndex({ version: detail.data.version, qaEvidence: detail.data.qaEvidence, validation: state.data?.validation || detail.data.version.deterministicValidation, analysis }) : null),
    [detail.data, state.data, analysis]
  );
  const { open, drawer } = useSourceDrawer(index);

  const start = async (force = false) => {
    setStarting(true);
    try {
      await versionService.analyze(id, force);
      setConfirmForce(false);
      await state.reload({ silent: true });
    } catch (err) {
      if (errorCode(err) === 'REVIEWED_STATEMENTS_EXIST') setConfirmForce(true);
      else toast.error(errorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  if (detail.loading || state.loading) return <SkeletonCards count={3} className="h-32" />;
  if (detail.error || state.error) return <Card><ErrorState message={detail.error || state.error} onRetry={() => { detail.reload(); state.reload(); }} /></Card>;

  const { version, release } = detail.data;
  const s = state.data;
  const finalized = version.status === 'FINALIZED';
  const failed = s.analysisStatus === 'FAILED';
  const tabs = analysis
    ? [
        { key: 'overview', label: 'Overview' },
        { key: 'impact', label: 'Impact', count: analysis.impactClassification.length },
        { key: 'missing', label: 'Missing info', count: analysis.missingInformation.length },
        { key: 'claims', label: 'Unsupported claims', count: analysis.unsupportedClaims.length },
        { key: 'risks', label: 'Risks', count: analysis.risks.length },
        { key: 'technical', label: 'Technical summary', count: analysis.technicalSummary.length },
        { key: 'stakeholder', label: 'Stakeholder summary', count: analysis.stakeholderSummary.length },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="AI analysis"
        subtitle={`${release.name} · v${version.version}`}
        crumbs={[{ label: 'Releases', to: '/releases' }, { label: release.name, to: `/releases/${release._id}` }, { label: `v${version.version}` }]}
        badges={<StatusBadge status={version.status} />}
        actions={
          <>
            {analysis && <Link to={`/versions/${id}/review`}><Button icon={ClipboardCheck}>Open review workspace</Button></Link>}
            {!running && !finalized && (
              <Button variant={analysis ? 'secondary' : 'primary'} icon={analysis ? RefreshCw : Sparkles} loading={starting} onClick={() => start(false)}>
                {failed ? 'Retry analysis' : analysis ? 'Re-run analysis' : 'Run analysis'}
              </Button>
            )}
          </>
        }
      />

      <p className="mb-4 rounded-md border border-border bg-card px-4 py-2.5 text-xs text-muted">
        The AI analyzes and drafts. It cannot approve, deploy, roll back or publish anything. Findings below are suggestions that cite your own data.
      </p>

      {running && <div className="mb-4"><AnalysisProgress progress={s.progress} /></div>}

      {failed && (
        <Card className="mb-4 border-danger/40 p-5" role="alert">
          <h3 className="text-sm font-semibold text-danger">AI analysis is temporarily unavailable.</h3>
          <p className="mt-1 text-sm text-muted">Your release package was saved and deterministic validation still works. {AI_ERROR_HELP[s.error?.code] || s.error?.message}</p>
          {s.error?.retryable !== false && <Button className="mt-3" icon={RefreshCw} loading={starting} onClick={() => start(false)}>Retry analysis</Button>}
        </Card>
      )}

      <div className="space-y-5">
        <ValidationPanel validation={s.validation || version.deterministicValidation} onOpen={open} />

        {!analysis && !running && !failed && (
          <Card className="p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-6 w-6 text-primary" />
            <h3 className="text-sm font-semibold">No AI analysis yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Run the analysis to classify impact, find missing information, check claims against QA evidence and draft summaries.</p>
          </Card>
        )}

        {analysis && (
          <section aria-label="AI findings" className="space-y-4">
            <h2 className="text-sm font-semibold">AI findings <span className="font-normal text-muted">· {analysis.meta?.model || 'model'}{analysis.meta?.droppedCitations ? ` · ${analysis.meta.droppedCitations} unverifiable citation(s) discarded` : ''}</span></h2>
            <Tabs tabs={tabs} value={tab} onChange={setTab} />
            {tab === 'overview' && <OverallAssessment assessment={analysis.overallAssessment} riskLevel={s.riskLevel} />}
            {tab === 'impact' && <ImpactList items={analysis.impactClassification} onOpen={open} />}
            {tab === 'missing' && <MissingList items={analysis.missingInformation} />}
            {tab === 'claims' && <ClaimsList items={analysis.unsupportedClaims} onOpen={open} />}
            {tab === 'risks' && <RisksList items={analysis.risks} onOpen={open} />}
            {tab === 'technical' && <SummaryList items={analysis.technicalSummary} onOpen={open} />}
            {tab === 'stakeholder' && <SummaryList items={analysis.stakeholderSummary} onOpen={open} />}
          </section>
        )}
      </div>

      <ConfirmDialog open={confirmForce} onClose={() => setConfirmForce(false)} onConfirm={() => start(true)} loading={starting} tone="danger" confirmLabel="Replace and re-run" title="Replace reviewed statements?">
        <p>Some AI-generated statements already have review decisions. Re-running the analysis replaces them with new drafts that need review again.</p>
        <p>Statements carried forward from an earlier version are not affected.</p>
      </ConfirmDialog>
      {drawer}
    </>
  );
}
