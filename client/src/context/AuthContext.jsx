import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { api, setToken, getToken, setUnauthorizedHandler } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authed | guest | offline

  // Restore the session from the stored JWT on first paint.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!getToken()) {
        setStatus('guest');
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (cancelled) return;
        setUser(data.user);
        setStatus('authed');
      } catch (err) {
        if (cancelled) return;
        // A 401 already cleared the token; anything else means the API is
        // unreachable (Render cold start), so don't log the user out for that.
        setStatus(err.response?.status === 401 ? 'guest' : 'offline');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  const authenticate = useCallback((token, nextUser) => {
    setToken(token);
    setUser(nextUser);
    setStatus('authed');
  }, []);

  const login = useCallback(
    async (identifier, password) => {
      const { data } = await api.post('/auth/login', { identifier, password });
      authenticate(data.token, data.user);
      return data.user;
    },
    [authenticate]
  );

  const signup = useCallback(
    async (payload) => {
      const { data } = await api.post('/auth/signup', payload);
      authenticate(data.token, data.user);
      return data.user;
    },
    [authenticate]
  );

  /** Merge a partial update into the cached user (avatar, bio, theme...). */
  const patchUser = useCallback((partial) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const value = useMemo(
    () => ({ user, status, isAuthed: status === 'authed', login, signup, logout, patchUser }),
    [user, status, login, signup, logout, patchUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
