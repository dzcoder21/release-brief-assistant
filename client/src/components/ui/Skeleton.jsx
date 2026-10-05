import { cn } from '../../utils/format';

export const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-md bg-subtle', className)} />;

export const SkeletonRows = ({ rows = 4 }) => (
  <div className="space-y-3 p-4" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
  </div>
);

export const SkeletonCards = ({ count = 3, className = 'h-28' }) => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    {Array.from({ length: count }, (_, i) => <Skeleton key={i} className={cn('w-full', className)} />)}
  </div>
);
