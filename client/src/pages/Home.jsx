import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { Wordmark } from '../components/Logo.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Chip } from '../components/ui/Chip.jsx';

// Placeholder while the messaging screens are built.
export default function Home() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-4">
        <Wordmark size={24} />
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={toggleMode}>
            {mode === 'light' ? 'Dark' : 'Light'} mode
          </Button>
          <Button variant="ghost" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-6">
        <div className="tc-card flex items-center gap-4 p-6">
          <Avatar src={user?.profilePicture} name={`${user?.firstName} ${user?.lastName}`} size="lg" online />
          <div className="min-w-0">
            <h1 className="text-lg">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-sm text-muted">@{user?.username}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {user?.interests?.map((i) => (
            <Chip key={i}>{i}</Chip>
          ))}
        </div>
      </main>
    </div>
  );
}
