"use client";

import { useEffect, useState } from "react";
import { Movement } from "@/lib/types";
import { Card, Spinner } from "@/components/ui";
import { when } from "@/lib/format";

export default function LogPage() {
  const [movements, setMovements] = useState<Movement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/movements", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else setMovements(j.movements || []);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error)
    return (
      <Card className="border-rose-600/50 bg-rose-500/10 text-rose-200">
        {error}
      </Card>
    );
  if (!movements) return <Spinner label="Loading custody log…" />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Custody log</h1>
        <p className="text-sm text-slate-400">
          Every hand-off, newest first. This is the audit trail.
        </p>
      </div>

      <div className="space-y-2">
        {movements.map((m) => (
          <Card key={m.id} className="py-3">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-slate-600/40 bg-slate-700/30 px-2 py-0.5 text-xs text-slate-200">
                {m.type || "Move"}
              </span>
              <span className="text-xs text-slate-500">{when(m.at)}</span>
            </div>
            <div className="mt-1.5 text-sm text-slate-100">
              {m.gameNumber || "Game"}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {m.fromSafeName || "—"} → {m.toSafeName || "—"}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              by {m.movedByName || "—"}
              {m.receivedByName ? ` · received by ${m.receivedByName}` : ""}
            </div>
            {m.notes && (
              <div className="mt-1 text-xs italic text-slate-400">
                “{m.notes}”
              </div>
            )}
          </Card>
        ))}
        {movements.length === 0 && (
          <Card className="text-sm text-slate-400">No movements logged yet.</Card>
        )}
      </div>
    </div>
  );
}
