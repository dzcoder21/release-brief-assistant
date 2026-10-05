import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="flex h-screen overflow-hidden bg-bg print:block print:h-auto print:overflow-visible">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main key={pathname} className="flex-1 overflow-y-auto print:overflow-visible">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
