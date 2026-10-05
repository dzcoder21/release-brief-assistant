import { cn } from '../../utils/format';

export default function Card({ className, children, ...props }) {
  return <div className={cn('rounded-lg border border-border bg-card', className)} {...props}>{children}</div>;
}

export function CardHeader({ title, description, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5', className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export const CardBody = ({ className, children }) => <div className={cn('p-4 sm:p-5', className)}>{children}</div>;
