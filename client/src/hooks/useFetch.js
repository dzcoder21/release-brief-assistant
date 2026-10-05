import { useState, useEffect, useCallback, useRef } from 'react';
import { errorMessage } from '../services/api';

/** Loads data on mount/deps change. `reload({ silent: true })` refreshes without flashing a skeleton. */
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const request = useRef(0);

  const run = useCallback(async ({ silent = false } = {}) => {
    const id = ++request.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcher();
      if (id === request.current) setState({ data, error: null, loading: false });
      return data;
    } catch (err) {
      if (id === request.current) setState((s) => ({ data: silent ? s.data : null, error: errorMessage(err), loading: false }));
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  const setData = useCallback((value) => setState((s) => ({ ...s, data: typeof value === 'function' ? value(s.data) : value })), []);
  return { ...state, reload: run, setData };
}
