import { cn } from '../../utils/cn.js';

/**
 * Interest pill. `tone` picks the colour scheme explicitly rather than letting
 * callers pass competing colour classes. Tailwind resolves conflicting
 * utilities by stylesheet order, not by prop order, so overriding via
 * className is unreliable.
 */
const TONES = {
  default: 'bg-surface-2 text-body border-line',
  selected: 'bg-primary text-on-primary border-primary',
  shared: 'bg-accent/12 text-accent border-accent/40',
  primary: 'bg-primary/10 text-primary border-primary/30',
};

export function Chip({ children, selected = false, tone, onClick, className = '', ...props }) {
  const Tag = onClick ? 'button' : 'span';
  const resolved = selected ? 'selected' : (tone ?? 'default');

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] transition-colors',
        TONES[resolved],
        onClick && 'cursor-pointer',
        onClick && resolved === 'default' && 'hover:border-primary hover:text-primary',
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
        'inline-flex items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[11px] font-medium text-accent',
        className
      )}
    >
      {count} in common
    </span>
  );
}
