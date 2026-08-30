import { cn } from '../utils/cn.js';

/** Consistent header for the full-width screens (search, requests, profile...). */
export function PageHeader({ title, subtitle, action, className = '' }) {
  return (
    <header className={cn('flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4', className)}>
      <div className="min-w-0">
        <h1 className="text-[17px]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/** Scrollable body for those same screens. */
export function PageBody({ children, className = '', width = 'max-w-3xl' }) {
  return (
    <div className="tc-scroll h-full overflow-y-auto">
      <div className={cn('mx-auto w-full px-5 py-6', width, className)}>{children}</div>
    </div>
  );
}
