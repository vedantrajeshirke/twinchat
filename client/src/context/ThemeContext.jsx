import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.jsx';
import { DEFAULT_THEME, isKnownTheme } from '../utils/themes.js';

const ThemeContext = createContext(null);

const LS_THEME = 'twinchat.theme';
const LS_MODE = 'twinchat.mode';

const readLocal = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export function ThemeProvider({ children }) {
  const { user, isAuthed, patchUser } = useAuth();

  // Start from the last local choice so there is no flash before /auth/me
  // resolves; the server value takes over once the user loads.
  const [theme, setThemeState] = useState(() => readLocal(LS_THEME, DEFAULT_THEME));
  const [mode, setModeState] = useState(() => readLocal(LS_MODE, 'light'));

  // The stored preference follows the user across devices (§7.3).
  useEffect(() => {
    if (!user) return;
    if (user.theme && isKnownTheme(user.theme)) setThemeState(user.theme);
    if (user.mode) setModeState(user.mode);
  }, [user]);

  // Paint: the CSS variables are keyed off these two attributes.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.mode = mode;
    try {
      localStorage.setItem(LS_THEME, theme);
      localStorage.setItem(LS_MODE, mode);
    } catch {
      // Private browsing; the in-memory value still applies.
    }
  }, [theme, mode]);

  const persist = useCallback(
    async (partial) => {
      if (!isAuthed) return;
      try {
        await api.patch('/users/me', partial);
        patchUser(partial);
      } catch {
        // A failed sync is not worth interrupting the user; the local value holds.
      }
    },
    [isAuthed, patchUser]
  );

  const setTheme = useCallback(
    (next) => {
      setThemeState(next);
      persist({ theme: next });
    },
    [persist]
  );

  const setMode = useCallback(
    (next) => {
      setModeState(next);
      persist({ mode: next });
    },
    [persist]
  );

  const toggleMode = useCallback(
    () => setMode(mode === 'light' ? 'dark' : 'light'),
    [mode, setMode]
  );

  const value = useMemo(
    () => ({ theme, mode, setTheme, setMode, toggleMode }),
    [theme, mode, setTheme, setMode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
