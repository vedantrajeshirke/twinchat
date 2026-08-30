import { cn } from '../../utils/cn.js';

/**
 * Every empty state = icon + one-line explanation + an action (PROJECT_PLAN §8).
 * Dead ends become next steps.
 */
export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      {Icon && (
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={26} strokeWidth={1.75} />
        </span>
      )}
      <h3 className="text-[15px] font-semibold text-heading">{title}</h3>
      {description && <p className="mt-1.5 max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
