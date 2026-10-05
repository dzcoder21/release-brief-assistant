import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClipboardCheck, Printer } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { QABadge, StatusBadge } from '../components/ui/Badge';
import { SkeletonCards } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/States';
import { CitationList } from '../components/review/CitationChip';
import { useSourceDrawer } from '../components/review/SourceDrawer';
import { useFetch } from '../hooks/useFetch';
import { versionService } from '../services/releaseService';
import { buildSourceIndex } from '../utils/citations';
import { formatDate, formatDateTime } from '../utils/format';
import { cn } from '../utils/format';

const AUDIENCES = [['ALL', 'Everyone'], ['STAKEHOLDER', 'Stakeholder'], ['TECHNICAL', 'Technical']];

function StatementItem({ s, onOpen }) {
  return (
    <li className="py-3">
      <p className="leading-relaxed">{s.content}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone="success">Reviewed</Badge>
        {s.badges.humanEdited ? <Badge tone="primary">Human-edited</Badge> : <Badge tone="accent">AI-generated</Badge>}
        {s.badges.evidenceBacked ? <Badge tone="info">Evidence-backed</Badge> : <Badge tone="warning">No evidence cited</Badge>}
      </div>
      {s.citations.length > 0 && <div className="mt-2 print:hidden"><CitationList citations={s.citations} onOpen={onOpen} /></div>}
      {s.reviewerNote && <p className="mt-2 text-xs text-muted">Reviewer note: {s.reviewerNote}</p>}
    </li>
  );
}

const Section = ({ title, children }) => (
  <section className="border-t border-border py-5 first:border-0 print:break-inside-avoid">
    <h2 className="mb-1 text-lg font-semibold tracking-tight">{title}</h2>
    {children}
  </section>
);

export default function FinalBrief() {
  const { id } = useParams();
  const [audience, setAudience] = useState('ALL');
  const detail = useFetch(() => versionService.get(id), [id]);
  const brief = useFetch(() => versionService.brief(id), [id]);

  const index = useMemo(
    () => (detail.data ? buildSourceIndex({ version: detail.data.version, qaEvidence: detail.data.qaEvidence, validation: detail.data.version.deterministicValidation, analysis: detail.data.version.aiAnalysis }) : null),
    [detail.data]
  );
  const { open, drawer } = useSourceDrawer(index);

  if (brief.loading || detail.loading) return <SkeletonCards count={4} className="h-32" />;
  if (brief.error || detail.error) return <Card><ErrorState message={brief.error || detail.error} onRetry={() => { brief.reload(); detail.reload(); }} /></Card>;

  const b = brief.data.brief;
  const o = b.overview;
  const keep = (s) => audience === 'ALL' || s.type === audience || s.type === 'RISK';
  const sources = b.sourceItems.map((c) => ({ citation: c, source: index?.resolve(c) })).filter((x) => x.source);

  return (
    <>
      <PageHeader
        title="Release brief"
        crumbs={[{ label: 'Releases', to: '/releases' }, { label: o.releaseName, to: `/releases/${detail.data.release._id}` }, { label: `v${o.version}` }]}
        actions={
          <>
            <Link to={`/versions/${id}/review`}><Button variant="secondary" icon={ClipboardCheck}>Review workspace</Button></Link>
            <Button icon={Printer} onClick={() => window.print()}>Print / save PDF</Button>
          </>
        }
      />

      {!o.finalized && (
        <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm print:hidden" role="note">
          <strong>Draft preview.</strong> This brief has not been finalized. It only contains statements a person has approved or edited so far.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5 print:hidden" role="group" aria-label="Audience">
        {AUDIENCES.map(([key, label]) => (
          <button key={key} onClick={() => setAudience(key)} aria-pressed={audience === key} className={cn('rounded-full border px-3 py-1 text-xs font-medium', audience === key ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:text-fg')}>{label}</button>
        ))}
      </div>

      <Card className="mx-auto max-w-3xl p-6 sm:p-10 print:border-0 print:p-0">
        <Section title="Release overview">
          <h3 className="text-2xl font-semibold tracking-tight">{o.releaseName} <span className="font-mono text-lg font-normal text-muted">v{o.version}</span></h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={o.status} />
            {o.riskLevel && <Badge tone={{ HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' }[o.riskLevel]}>{o.riskLevel.toLowerCase()} risk</Badge>}
          </div>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-muted">Release date</dt><dd>{formatDate(o.releaseDate)}</dd></div>
            <div><dt className="text-muted">Reviewed statements</dt><dd>{o.counts.statements}</dd></div>
            <div><dt className="text-muted">Features / bug fixes</dt><dd>{o.counts.features} / {o.counts.bugFixes}</dd></div>
            <div><dt className="text-muted">Finalized</dt><dd>{o.finalized ? `${formatDateTime(o.finalizedAt)} by ${o.finalizedBy || 'a reviewer'}` : 'Not yet'}</dd></div>
          </dl>
        </Section>

        {b.sections.map((section) => {
          const statements = section.statements.filter(keep);
          return (
            <Section key={section.key} title={section.label}>
              {section.key === 'QA_VALIDATION' && b.qaEvidence.length > 0 && (
                <ul className="mb-2 divide-y divide-border rounded-md border border-border text-sm">
                  {b.qaEvidence.map((e) => (
                    <li key={e.evidenceId} className="flex items-center justify-between gap-3 px-3 py-2"><span>{e.title}</span><QABadge status={e.status} /></li>
                  ))}
                </ul>
              )}
              {section.key === 'AFFECTED_USERS' && b.affectedUserGroups.length > 0 && (
                <p className="mb-2 text-sm text-muted">Groups listed by the release author: {b.affectedUserGroups.map((g) => g.title).join(', ')}.</p>
              )}
              {statements.length === 0 ? <p className="text-sm text-muted">No reviewed statements for this section.</p> : (
                <ul className="divide-y divide-border">{statements.map((s) => <StatementItem key={s.id} s={s} onOpen={open} />)}</ul>
              )}
            </Section>
          );
        })}

        <Section title="Evidence & sources">
          {sources.length === 0 ? <p className="text-sm text-muted">No sources are cited by the reviewed statements.</p> : (
            <ul className="space-y-2 text-sm">
              {sources.map(({ citation, source }) => (
                <li key={`${citation.type}:${citation.itemId}`}>
                  <span className="font-mono text-xs text-muted">{source.id}</span> <span className="font-medium">{source.title}</span>
                  {source.status && <> · <QABadge status={source.status} /></>}
                  {source.body && <p className="text-muted">{source.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <p className="border-t border-border pt-4 text-xs text-muted">Generated from human-reviewed statements. AI content is labelled and never approved automatically.</p>
      </Card>
      {drawer}
    </>
  );
}
