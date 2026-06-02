"use client";

import { useCallback, useEffect, useState } from "react";
import { Game, Person, Safe, ShowSummary } from "./types";

interface Bootstrap {
  people: Person[];
  safes: Safe[];
  games: Game[];
  shows: ShowSummary[];
}

// Loads the roster/safes/games/shows used by every form, with a manual refresh.
export function useBootstrap() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bootstrap", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
