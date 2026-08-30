import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LogoMark } from './Logo.jsx';
import { Spinner } from './ui/Spinner.jsx';

/** Full-page hold while the stored session is being verified. */
export function AuthBoot({ message = 'Loading TwinChat…' }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas">
      <LogoMark size={40} />
      <p className="flex items-center gap-2 text-sm text-muted">
        <Spinner size={14} />
        {message}
      </p>
    </div>
  );
}

export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <AuthBoot />;
  // Render's free tier sleeps; a slow first request must not look like a logout (§8).
  if (status === 'offline') return <AuthBoot message="Waking the server up…" />;
  if (status !== 'authed') return <Navigate to="/login" replace state={{ from: location }} />;

  return children;
}

/** Landing/login/signup bounce straight to the app when already signed in. */
export function RedirectIfAuthed({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <AuthBoot />;
  if (status === 'authed') return <Navigate to="/home" replace />;
  return children;
}
