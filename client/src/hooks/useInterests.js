import { useEffect, useState } from 'react';
import { api, errorMessage } from '../services/api.js';

/** Loads the interest list from the DB (it is editable server-side, §3.2). */
export function useInterests() {
  const [state, setState] = useState({ interests: [], categories: [], loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await api.get('/interests');
        if (!cancelled) {
          setState({
            interests: data.interests,
            categories: data.categories,
            loading: false,
            error: '',
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: errorMessage(err) }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
