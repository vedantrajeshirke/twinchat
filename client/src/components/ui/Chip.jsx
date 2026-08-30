import { cn } from '../../utils/cn.js';

/** Interest pill. `selected` drives the multi-select state in signup/filters. */
export function Chip({ children, selected = false, onClick, className = '', ...props }) {
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] transition-colors',
        selected
          ? 'bg-primary text-on-primary border border-primary'
          : 'bg-surface-2 text-body border border-line',
        onClick && !selected && 'hover:border-primary hover:text-primary',
        onClick && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

/** "4 in common", the shared-interest indicator used throughout (§10). */
export function SharedBadge({ count, className = '' }) {
  if (!count) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
        'bg-accent/12 text-accent',
        className
      )}
    >
      {count} in common
    </span>
  );
}
