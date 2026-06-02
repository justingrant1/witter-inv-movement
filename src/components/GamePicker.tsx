"use client";

import { useMemo, useState } from "react";
import { Game } from "@/lib/types";
import { statusColor } from "@/lib/format";

// Searchable game selector — by game #, title, or seal ID.
export function GamePicker({
  games,
  value,
  onChange,
}: {
  games: Game[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const selected = games.find((g) => g.id === value);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return games.slice(0, 12);
    return games
      .filter(
        (g) =>
          g.number?.toLowerCase().includes(term) ||
          g.title?.toLowerCase().includes(term) ||
          g.sealId?.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [q, games]);

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-600/50 bg-emerald-500/10 px-3 py-3">
        <div>
          <div className="font-semibold text-slate-100">
            {selected.number || "Game"} · {selected.title || "Untitled"}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            <span className={statusColor(selected.status)}>
              {selected.status || "—"}
            </span>
            <span className="text-slate-500">
              {selected.currentSafeName || "no safe"}
            </span>
          </div>
        </div>
        <button
          onClick={() => onChange("")}
          className="text-xs text-slate-400 hover:text-slate-200"
        >
          change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        autoFocus
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
        placeholder="Search game # / title / seal ID…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {results.map((g) => (
          <button
            key={g.id}
            onClick={() => onChange(g.id)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2.5 text-left hover:border-emerald-500"
          >
            <span className="text-sm text-slate-100">
              {g.number || "—"} · {g.title || "Untitled"}
            </span>
            <span className={`text-xs ${statusColor(g.status)}`}>
              {g.status || "—"}
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <div className="px-1 py-3 text-sm text-slate-500">No matches.</div>
        )}
      </div>
    </div>
  );
}
