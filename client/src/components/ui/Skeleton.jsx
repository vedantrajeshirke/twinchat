import { cn } from '../../utils/cn.js';

/** Grey placeholder shape, preferred over spinners for lists (§8). */
export function Skeleton({ className = '', rounded = 'rounded-md' }) {
  return <div className={cn('tc-skeleton', rounded, className)} aria-hidden="true" />;
}

export function ConversationSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-1 p-2" aria-label="Loading conversations" role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-2.5">
          <Skeleton className="h-11 w-11" rounded="rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="tc-card flex items-center gap-4 p-4">
          <Skeleton className="h-12 w-12" rounded="rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-24" rounded="rounded-lg" />
        </div>
      ))}
    </div>
  );
}
