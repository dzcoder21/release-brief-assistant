import { ShieldCheck } from 'lucide-react';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white dark:text-bg"><ShieldCheck className="h-5 w-5" /></span>
          <span className="font-semibold">Release Brief Assistant</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mb-5 mt-1 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
        <p className="mt-4 text-center text-sm text-muted">{footer}</p>
      </div>
    </div>
  );
}
