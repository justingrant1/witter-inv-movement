"use client";

import { useBootstrap } from "@/lib/useBootstrap";
import { Card, Spinner } from "@/components/ui";
import { money } from "@/lib/format";

export default function SafesPage() {
  const { data, loading, error } = useBootstrap();

  if (loading) return <Spinner label="Loading safes…" />;
  if (error)
    return (
      <Card className="border-rose-600/50 bg-rose-500/10 text-rose-200">
        {error}
      </Card>
    );

  const safes = [...(data!.safes || [])].sort((a, b) =>
    (a.location || "").localeCompare(b.location || "")
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Safes</h1>
        <p className="text-sm text-slate-400">
          Live value vs. cap for every safe. Over-cap safes flag red.
        </p>
      </div>

      <div className="space-y-2">
        {safes.map((s) => {
          const pct =
            s.valueCap && s.valueCap > 0
              ? Math.min(100, Math.round((s.currentValue / s.valueCap) * 100))
              : null;
          return (
            <Card
              key={s.id}
              className={s.overCap ? "border-rose-600/60 bg-rose-500/5" : ""}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-100">{s.name}</div>
                  <div className="text-xs text-slate-400">
                    {s.location || "—"}
                    {s.type ? ` · ${s.type}` : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-100">
                    {money(s.currentValue)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {s.currentCount} item{s.currentCount === 1 ? "" : "s"}
                    {s.valueCap ? ` · cap ${money(s.valueCap)}` : ""}
                  </div>
                </div>
              </div>

              {pct != null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full ${
                      s.overCap
                        ? "bg-rose-500"
                        : pct > 80
                        ? "bg-amber-400"
                        : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}

              {s.overCap && (
                <div className="mt-2 text-xs font-semibold text-rose-300">
                  ⚠ Over cap
                </div>
              )}

              {s.access.length > 0 && (
                <div className="mt-2 text-[11px] text-slate-500">
                  Access: {s.access.join(", ")}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
