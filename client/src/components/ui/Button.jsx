import { cn } from '../../utils/cn.js';
import { Spinner } from './Spinner.jsx';

const VARIANTS = {
  primary: 'bg-primary text-on-primary hover:bg-primary-dark disabled:hover:bg-primary shadow-sm',
  secondary: 'bg-surface-2 text-body border border-line hover:bg-surface disabled:hover:bg-surface-2',
  ghost: 'text-body hover:bg-surface disabled:hover:bg-transparent',
  danger: 'bg-danger-soft text-danger border border-danger/30 hover:bg-danger hover:text-white',
  accent: 'bg-accent text-white hover:opacity-90',
};

const SIZES = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-[15px] gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'disabled:opacity-55 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
