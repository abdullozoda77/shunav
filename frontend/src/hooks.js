import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";

// Load data from the API: const { data, loading, reload } = useApi("/books")
// Pass null as the path to skip loading (e.g. when the user is not logged in).
export function useApi(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState(null);

  const reload = useCallback(() => {
    if (!path) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get(path)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(reload, [reload]);

  return { data, setData, loading, error, reload };
}
