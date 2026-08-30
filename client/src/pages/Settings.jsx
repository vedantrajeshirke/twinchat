import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogOut, Moon, Palette, Shield, Sun, KeyRound } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { THEMES } from '../utils/themes.js';
import { PageHeader, PageBody } from '../components/PageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { cn } from '../utils/cn.js';

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="tc-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={17} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-heading">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, mode, setTheme, setMode } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Settings"
        subtitle="Your preferences follow you to any device you log in from."
        width="max-w-2xl"
      />

      <PageBody width="max-w-2xl" className="space-y-4">
        <Section
          icon={Palette}
          title="Colour theme"
          description="Applies instantly and is saved to your account."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-left transition-colors',
                  theme === t.id ? 'border-primary bg-primary/6' : 'border-line hover:border-primary/40'
                )}
              >
                <span className="flex shrink-0 gap-1">
                  {t.swatch[mode].map((c) => (
                    <span
                      key={c}
                      className="block h-7 w-4 rounded-full border border-black/5"
                      style={{ background: c }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-heading">{t.name}</span>
                  <span className="block truncate text-[12px] text-muted">{t.description}</span>
                </span>
                {theme === t.id && <Check size={16} className="shrink-0 text-primary" />}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-line p-3">
            <div>
              <p className="text-[13px] font-medium text-heading">Appearance</p>
              <p className="text-[12px] text-muted">Light or dark.</p>
            </div>
            <div className="flex gap-1 rounded-full border border-line bg-surface p-1">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  aria-pressed={mode === id}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                    mode === id ? 'bg-primary text-on-primary' : 'text-muted hover:text-body'
                  )}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <ChangePassword />

        <Section icon={Shield} title="Account & privacy" description="What other people can see.">
          <dl className="space-y-2.5 text-[13px]">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted">Email</dt>
              <dd className="text-right text-body">
                {user?.email}
                <span className="block text-[11px] text-muted">Never shown on your public profile</span>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted">Username</dt>
              <dd className="text-body">@{user?.username}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted">Direct messages</dt>
              <dd className="max-w-xs text-right text-body">
                Only people you've accepted as connections can message you
              </dd>
            </div>
          </dl>
        </Section>

        <Section icon={LogOut} title="Log out" description="End this session on this device.">
          <Button
            variant="danger"
            onClick={() => {
              logout();
              navigate('/', { replace: true });
            }}
          >
            <LogOut size={15} /> Log out
          </Button>
        </Section>
      </PageBody>
    </div>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (form.newPassword !== form.confirm) {
      return setStatus({ type: 'error', message: 'The new passwords do not match.' });
    }

    setSaving(true);
    try {
      await api.patch('/auth/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setStatus({ type: 'ok', message: 'Password updated.' });
    } catch (err) {
      setStatus({ type: 'error', message: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section icon={KeyRound} title="Change password" description="At least 8 characters, with a number.">
      <form onSubmit={submit} className="space-y-3">
        <Input
          label="Current password"
          type="password"
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
          />
          <Input
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          />
        </div>

        {status.message && (
          <p className={cn('text-[13px]', status.type === 'ok' ? 'text-accent' : 'text-danger')}>
            {status.message}
          </p>
        )}

        <Button
          type="submit"
          loading={saving}
          disabled={!form.currentPassword || !form.newPassword}
        >
          Update password
        </Button>
      </form>
    </Section>
  );
}
