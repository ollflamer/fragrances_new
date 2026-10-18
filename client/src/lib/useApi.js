import { useEffect, useState, useCallback } from 'react';
import { api } from './api';
export function useApi(url) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    api(url, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: null });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ data: null, loading: false, error });
    });
    return () => controller.abort();
  }, [url, version]);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  return { ...state, reload };
}
