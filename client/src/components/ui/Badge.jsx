import { cn } from '../../utils/format';
import { RELEASE_STATUS, STATEMENT_STATUS, LEVEL_TONE, QA_STATUS, ASSESSMENT } from '../../utils/constants';

const TONES = {
  neutral: 'bg-subtle text-muted border-border',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/25',
  danger: 'bg-danger/10 text-danger border-danger/20',
  info: 'bg-info/10 text-info border-info/20',
  primary: 'bg-primary/10 text-primary border-primary/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
};

export default function Badge({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }) => {
  const s = RELEASE_STATUS[status] || RELEASE_STATUS.DRAFT;
  return <Badge tone={s.tone}>{s.label}</Badge>;
};
export const StatementStatusBadge = ({ status }) => <Badge tone={STATEMENT_STATUS[status].tone}>{STATEMENT_STATUS[status].label}</Badge>;
export const LevelBadge = ({ level, prefix }) =>
  level ? <Badge tone={LEVEL_TONE[level]}>{prefix ? `${prefix} ` : ''}{level.charAt(0) + level.slice(1).toLowerCase()}</Badge> : <span className="text-xs text-muted">—</span>;
export const QABadge = ({ status }) => <Badge tone={QA_STATUS[status]?.tone}>{QA_STATUS[status]?.label || status}</Badge>;
export const AssessmentBadge = ({ level }) => <Badge tone={ASSESSMENT[level]?.tone}>{ASSESSMENT[level]?.label || level}</Badge>;
