import { Link } from 'react-router-dom';
import { Wordmark } from './Logo.jsx';

/** Shared shell for the login and signup screens. */
export function AuthLayout({ title, subtitle, children, footer, wide = false }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="px-6 py-5 sm:px-10">
        <Link to="/" aria-label="TwinChat home">
          <Wordmark size={24} />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">
        <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}>
          <div className="tc-card p-7 sm:p-8">
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <p className="mt-5 text-center text-sm text-muted">{footer}</p>}
        </div>
      </main>
    </div>
  );
}

/** Non-field error banner (bad credentials, network trouble). */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="mb-5 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13px] text-danger"
    >
      {children}
    </div>
  );
}
