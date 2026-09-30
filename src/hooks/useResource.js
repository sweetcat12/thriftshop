import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
export function useResource(path) {
  const [state, set] = useState({ data: null, loading: true, error: null });
  const [version, update] = useState(0);
  const reload = useCallback(() => update((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    set({ data: null, loading: true, error: null });
    if (!path) {
      set({ data: null, loading: false, error: null });
      return;
    }
    api(path)
      .then((data) => active && set({ data, loading: false, error: null }))
      .catch(
        (error) =>
          active && set({ data: null, loading: false, error: error.message }),
      );
    return () => {
      active = false;
    };
  }, [path, version]);
  return { ...state, reload };
}
