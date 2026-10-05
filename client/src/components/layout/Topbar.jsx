import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/releaseService';

function useOutsideClick(ref, onOutside) {
  useEffect(() => {
    const handler = (e) => ref.current && !ref.current.contains(e.target) && onOutside();
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);
  useOutsideClick(ref, () => setOpen(false));

  useEffect(() => {
    if (open) dashboardService.attention().then((d) => setItems(d.items)).catch(() => setItems([]));
  }, [open]);
  useEffect(() => { dashboardService.attention().then((d) => setItems(d.items)).catch(() => {}); }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-md p-2 text-muted hover:bg-subtle hover:text-fg" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        {items.length > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-warning" />}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-lg border border-border bg-card shadow-lg">
          <p className="border-b border-border px-4 py-2.5 text-sm font-semibold">Needs your review</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">Nothing is waiting for review.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {items.map((i) => (
                <li key={i.versionId}>
                  <Link to={`/versions/${i.versionId}/review`} onClick={() => setOpen(false)} className="block px-4 py-2.5 hover:bg-subtle">
                    <p className="text-sm font-medium">{i.releaseName} <span className="font-mono text-xs text-muted">v{i.version}</span></p>
                    <p className="text-xs text-muted">{i.pending} pending{i.stale ? `, ${i.stale} stale` : ''}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  useOutsideClick(ref, () => setMenu(false));

  const search = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/releases?q=${encodeURIComponent(query.trim())}` : '/releases');
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur print:hidden">
      <button onClick={onMenu} className="rounded-md p-2 text-muted hover:bg-subtle lg:hidden" aria-label="Open menu"><Menu className="h-4 w-4" /></button>
      <form onSubmit={search} className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search releases" aria-label="Search releases" className="input h-9 pl-9" />
      </form>
      <div className="ml-auto flex items-center gap-1">
        <Notifications />
        <div className="relative" ref={ref}>
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-md p-1.5 hover:bg-subtle" aria-label="Account menu">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">{user?.name?.[0]?.toUpperCase()}</span>
            <span className="hidden text-sm font-medium sm:block">{user?.name}</span>
          </button>
          {menu && (
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-border bg-card p-1 shadow-lg">
              <Link to="/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-subtle"><UserIcon className="h-4 w-4" />Account</Link>
              <button onClick={logout} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-subtle"><LogOut className="h-4 w-4" />Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
