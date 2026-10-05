import { forwardRef } from 'react';
import { cn } from '../../utils/format';

export function Field({ label, error, hint, children, className, htmlFor }) {
  return (
    <div className={className}>
      {label && <label htmlFor={htmlFor} className="label">{label}</label>}
      {children}
      {hint && !error && <p className="hint">{hint}</p>}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('input', className)} {...props} />;
});
export const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('input resize-y', className)} {...props} />;
});
export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return <select ref={ref} className={cn('input', className)} {...props}>{children}</select>;
});
