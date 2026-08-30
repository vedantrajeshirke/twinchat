import { Link } from 'react-router-dom';
import { MessagesSquare, Search, Users } from 'lucide-react';
import { Wordmark } from '../components/Logo.jsx';
import { Button } from '../components/ui/Button.jsx';

const HIGHLIGHTS = [
  { icon: Search, title: 'Find your people', body: 'Search by name or filter by the interests you actually care about.' },
  { icon: MessagesSquare, title: 'Chat in real time', body: 'Instant one-to-one messages, with typing indicators and presence.' },
  { icon: Users, title: 'Join the conversation', body: 'Interest-based groups where every member can jump in.' },
];

export default function Landing() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas">
      {/* Understated wash rather than a loud hero (§5.1, §7.1). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[420px] opacity-[0.5]"
        style={{
          background:
            'radial-gradient(60% 60% at 50% 0%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 70%)',
        }}
      />

      <header className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <Wordmark size={26} />
        <Link to="/login" className="text-sm font-medium text-body hover:text-primary">
          Log in
        </Link>
      </header>

      <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
        <Wordmark size={52} className="mb-7" />

        <h1 className="max-w-2xl text-3xl leading-tight font-semibold sm:text-[42px]">
          Find your people.
          <br />
          Chat about what you love.
        </h1>

        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
          TwinChat connects you with people and groups who share your interests, then gets out of
          the way so you can talk.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link to="/signup">
            <Button size="lg" className="w-full min-w-36">
              Sign Up
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg" className="min-w-36 w-full">
              Log In
            </Button>
          </Link>
        </div>

        <ul className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="tc-card p-5">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={18} strokeWidth={1.9} />
              </span>
              <h3 className="text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </main>

      <footer className="relative px-6 py-6 text-center text-xs text-muted">
        Built for people with something in common.
      </footer>
    </div>
  );
}
