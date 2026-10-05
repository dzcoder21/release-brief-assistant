import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/format';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary/90 dark:text-bg',
  secondary: 'border border-border bg-card text-fg hover:bg-subtle',
  ghost: 'text-muted hover:bg-subtle hover:text-fg',
  danger: 'bg-danger text-white hover:bg-danger/90 dark:text-bg',
  success: 'bg-success text-white hover:bg-success/90 dark:text-bg',
};
const SIZES = { sm: 'h-8 px-2.5 text-xs gap-1.5', md: 'h-9 px-3.5 text-sm gap-2' };

export default function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className, disabled, ...props }) {
  return (
    <button
      className={cn('inline-flex shrink-0 items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
