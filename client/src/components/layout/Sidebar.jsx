import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileStack, FilePlus2, GitBranch, BarChart3, Settings, Moon, Sun, X, ShieldCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { cn } from '../../utils/format';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/releases', label: 'Releases', icon: FileStack, end: true },
  { to: '/releases/new', label: 'New Release', icon: FilePlus2 },
  { to: '/versions', label: 'Versions', icon: GitBranch },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { isDark, toggle } = useTheme();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-card transition-transform lg:static lg:translate-x-0 print:hidden', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2 font-semibold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white dark:text-bg"><ShieldCheck className="h-4 w-4" /></span>
            <span className="text-sm">Release Brief</span>
          </div>
          <button className="text-muted lg:hidden" onClick={onClose} aria-label="Close menu"><X className="h-4 w-4" /></button>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => cn('flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-subtle hover:text-fg')}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <button onClick={toggle} className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-subtle hover:text-fg">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </aside>
    </>
  );
}
