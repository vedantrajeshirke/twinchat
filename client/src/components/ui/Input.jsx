import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn.js';

export const Input = forwardRef(function Input(
  { label, error, hint, className = '', rounded = 'lg', ...props },
  ref
) {
  const id = useId();
  const inputId = props.id || id;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-heading">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-err` : undefined}
        className={cn(
          'w-full bg-surface-2 px-3.5 py-2.5 text-sm text-body transition-colors',
          'border placeholder:text-muted',
          rounded === 'pill' ? 'rounded-full' : 'rounded-lg',
          error ? 'border-danger' : 'border-line focus:border-primary',
          className
        )}
        {...props}
      />
      {error ? (
        <p id={`${inputId}-err`} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', ...props },
  ref
) {
  const id = useId();
  const inputId = props.id || id;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-heading">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          'w-full resize-y rounded-lg border bg-surface-2 px-3.5 py-2.5 text-sm text-body',
          'placeholder:text-muted transition-colors',
          error ? 'border-danger' : 'border-line focus:border-primary',
          className
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});
