import { useEffect, useState } from "react";

import { fetchContacts } from "../lib/api.js";
import type { ApiContact } from "../types.js";

export function useContacts() {
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      setContacts(await fetchContacts());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    contacts,
    isLoading,
    error,
    refresh,
  };
}
