import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

/** Debounced live availability check for the signup form (§5.2). */
export function useUsernameCheck(username) {
  const [state, setState] = useState({ status: 'idle', available: null });

  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,24}$/.test(value)) {
      setState({ status: 'idle', available: null });
      return;
    }

    setState({ status: 'checking', available: null });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/auth/check-username', {
          params: { username: value },
          signal: controller.signal,
        });
        setState({ status: 'done', available: data.available });
      } catch {
        setState({ status: 'idle', available: null });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  return state;
}
