import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import Card, { CardHeader } from '../ui/Card';

const ICON = {
  done: <CheckCircle2 className="h-4 w-4 text-success" />,
  running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
  failed: <XCircle className="h-4 w-4 text-danger" />,
  pending: <Circle className="h-4 w-4 text-muted/50" />,
};

/** Shows real step state reported by the backend. Nothing here is simulated. */
export default function AnalysisProgress({ progress = [] }) {
  return (
    <Card>
      <CardHeader title="Analyzing release…" description="Steps update as the server completes them. The model call is a single request, so it can take a minute." />
      <ul className="space-y-3 p-5">
        {progress.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            {ICON[s.status]}
            <span className={s.status === 'pending' ? 'text-muted' : ''}>{s.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
