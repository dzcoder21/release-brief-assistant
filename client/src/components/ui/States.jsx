import { AlertTriangle, Inbox } from 'lucide-react';
import Button from './Button';

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-subtle p-3"><Icon className="h-5 w-5 text-muted" /></div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="mb-3 rounded-full bg-danger/10 p-3"><AlertTriangle className="h-5 w-5 text-danger" /></div>
      <h3 className="text-sm font-semibold">Could not load this page</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={() => onRetry()}>Try again</Button>}
    </div>
  );
}
