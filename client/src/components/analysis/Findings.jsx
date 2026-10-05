import { AlertTriangle, CheckCircle2, FileQuestion, ShieldAlert } from 'lucide-react';
import Card from '../ui/Card';
import Badge, { AssessmentBadge, LevelBadge } from '../ui/Badge';
import { CitationList } from '../review/CitationChip';
import { EmptyState } from '../ui/States';
import { STATEMENT_SECTIONS } from '../../utils/constants';

const RISK_ICON_TONE = { HIGH: 'text-danger', MEDIUM: 'text-warning', LOW: 'text-success' };

export function OverallAssessment({ assessment, riskLevel }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Overall assessment</h3>
        <AssessmentBadge level={assessment.level} />
        <LevelBadge level={riskLevel} prefix="Risk:" />
      </div>
      <p className="mt-2 text-sm">{assessment.reason || 'No reason supplied.'}</p>
      {assessment.adjustedByRules && <p className="mt-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">{assessment.adjustedByRules}</p>}
      <p className="mt-3 text-xs text-muted">This is an AI assessment, not an approval. Only a person can approve statements and finalize the brief.</p>
    </Card>
  );
}

const Empty = ({ title, description }) => <Card><EmptyState icon={CheckCircle2} title={title} description={description} /></Card>;

export function ImpactList({ items, onOpen }) {
  if (!items.length) return <Empty title="No impact classifications" description="The AI did not classify any release items." />;
  return (
    <div className="space-y-3">
      {items.map((i) => (
        <Card key={i.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{i.change}</p>
            <LevelBadge level={i.impactLevel} prefix="Impact:" />
          </div>
          <p className="mt-1 text-sm text-muted">{i.reason}</p>
          {i.affectedUsers.length > 0 && <p className="mt-2 text-xs text-muted">Affected: {i.affectedUsers.join(', ')}</p>}
          <div className="mt-3"><CitationList citations={i.citations} onOpen={onOpen} /></div>
        </Card>
      ))}
    </div>
  );
}

export function MissingList({ items }) {
  if (!items.length) return <Empty title="Nothing missing" description="The AI found no gaps in the supplied information." />;
  return (
    <div className="space-y-3">
      {items.map((m) => (
        <Card key={m.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium"><FileQuestion className="h-4 w-4 text-warning" />{m.title}</p>
            <LevelBadge level={m.severity} prefix="Severity:" />
          </div>
          {m.description && <p className="mt-1 text-sm">{m.description}</p>}
          {m.reason && <p className="mt-1 text-sm text-muted">Why it matters: {m.reason}</p>}
          {m.recommendation && <p className="mt-2 rounded-md bg-subtle px-3 py-2 text-sm"><span className="font-medium">Recommended: </span>{m.recommendation}</p>}
        </Card>
      ))}
    </div>
  );
}

export function ClaimsList({ items, onOpen }) {
  if (!items.length) return <Empty title="No unsupported claims" description="Every claim the AI checked is covered by the supplied QA evidence, or none were found." />;
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <Card key={c.id} className="border-warning/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning" icon={AlertTriangle}>Unsupported claim</Badge>
            <Badge>{c.verdict}</Badge>
          </div>
          <p className="mt-2 text-sm font-medium">“{c.claim}”</p>
          <p className="mt-1 text-sm text-muted">{c.reason}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-success">Evidence that exists</p>
              {c.supportingEvidence.length ? <CitationList citations={c.supportingEvidence} onOpen={onOpen} /> : <p className="text-sm text-muted">None supplied.</p>}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-danger">Missing evidence</p>
              {c.missingEvidence.length ? <ul className="list-disc space-y-1 pl-4 text-sm">{c.missingEvidence.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="text-sm text-muted">Not specified.</p>}
            </div>
          </div>
          {c.citations.length > 0 && <div className="mt-3"><p className="mb-1.5 text-xs text-muted">Where the claim appears</p><CitationList citations={c.citations} onOpen={onOpen} /></div>}
        </Card>
      ))}
    </div>
  );
}

export function RisksList({ items, onOpen }) {
  if (!items.length) return <Empty title="No risks reported" description="The AI did not report risks. Review the package yourself before relying on this." />;
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium"><ShieldAlert className={`h-4 w-4 ${RISK_ICON_TONE[r.severity]}`} />{r.title}</p>
            <LevelBadge level={r.severity} prefix="Severity:" />
          </div>
          <p className="mt-1 text-sm text-muted">{r.description}</p>
          <div className="mt-3"><CitationList citations={r.citations} onOpen={onOpen} /></div>
        </Card>
      ))}
    </div>
  );
}

export function SummaryList({ items, onOpen }) {
  if (!items.length) return <Empty title="No statements" description="Nothing was generated for this audience." />;
  return (
    <div className="space-y-3">
      {items.map((s, i) => (
        <Card key={i} className="p-4">
          <p className="text-sm">{s.statement}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>{STATEMENT_SECTIONS[s.section]}</Badge>
            <CitationList citations={s.citations} onOpen={onOpen} />
            {s.citations.length === 0 && <Badge tone="warning">No citation</Badge>}
          </div>
        </Card>
      ))}
    </div>
  );
}
