import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function PageHeader({ title, subtitle, actions, crumbs = [], badges }) {
  return (
    <div className="mb-5 print:mb-3">
      {crumbs.length > 0 && (
        <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-muted print:hidden" aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1">
              {c.to ? <Link to={c.to} className="hover:text-fg">{c.label}</Link> : <span>{c.label}</span>}
              {i < crumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
      </div>
    </div>
  );
}
