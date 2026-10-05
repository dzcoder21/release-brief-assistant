import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const ICON = { ERROR: <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />, WARNING: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />, INFO: <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" /> };

function Row({ item }) {
  return (
    <li className="flex gap-2 text-sm">
      {ICON[item.severity]}
      <span><span className="mr-1.5 text-xs font-semibold text-muted">{item.severity}</span>{item.message}</span>
    </li>
  );
}

export default function FinalizePanel({ check, finalized, onFinalize }) {
  if (finalized) {
    return (
      <Card className="p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="h-4 w-4" />This brief is finalized and locked.</p>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader
        title="Finalization checklist"
        description="Errors block finalization. Warnings and info are shown so you can decide."
        actions={check.canFinalize ? <Badge tone="success">Ready to finalize</Badge> : <Badge tone="danger">{check.blockers.length} blocking</Badge>}
      />
      <div className="space-y-4 p-4 sm:p-5">
        {check.blockers.length > 0 && <ul className="space-y-2">{check.blockers.map((b, i) => <Row key={i} item={b} />)}</ul>}
        {check.warnings.length > 0 && <ul className="space-y-2">{check.warnings.map((b, i) => <Row key={i} item={b} />)}</ul>}
        {check.info.length > 0 && <ul className="space-y-2">{check.info.map((b, i) => <Row key={i} item={b} />)}</ul>}
        {!check.blockers.length && !check.warnings.length && !check.info.length && <p className="text-sm text-muted">All checks passed.</p>}
        <Button disabled={!check.canFinalize} onClick={onFinalize}>Finalize release brief</Button>
        {!check.canFinalize && <p className="text-xs text-muted">Resolve the blocking items above to enable finalization.</p>}
      </div>
    </Card>
  );
}
