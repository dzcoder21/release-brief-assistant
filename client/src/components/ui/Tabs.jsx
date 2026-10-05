import { cn } from '../../utils/format';

export default function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-border', className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={value === t.key}
          onClick={() => onChange(t.key)}
          className={cn('-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors', value === t.key ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg')}
        >
          {t.label}
          {t.count !== undefined && <span className="rounded-full bg-subtle px-1.5 text-xs text-muted">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
