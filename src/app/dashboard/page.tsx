"use client";

import { useEffect, useState } from "react";
import { DashboardData } from "@/lib/types";
import { Card, Spinner } from "@/components/ui";
import { money, statusColor } from "@/lib/format";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else setData(j);
      })
      .catch((e) => setError(String(e)));
  }, []);

  if (error)
    return (
      <Card className="border-rose-600/50 bg-rose-500/10 text-rose-200">
        {error}
      </Card>
    );
  if (!data) return <Spinner label="Loading dashboard…" />;

  const alertCount =
    data.alerts.overCapSafes.length +
    data.alerts.countMismatches.length +
    data.alerts.highValueDiscrepancies.length +
    data.alerts.returnsOverdue.length +
    data.alerts.sealCompromised.length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Where every game is right now, and anything that needs eyes.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Games tracked" value={String(data.totals.games)} />
        <Stat label="Total value" value={money(data.totals.value)} />
        <Stat label="At Webster" value={money(data.websterTotalValue)} />
      </div>

      {/* Alerts */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Alerts {alertCount > 0 && <span className="text-rose-400">({alertCount})</span>}
        </h2>
        {alertCount === 0 ? (
          <Card className="text-sm text-emerald-300">✓ All clear.</Card>
        ) : (
          <div className="space-y-2">
            {data.alerts.sealCompromised.map((g) => (
              <Alert key={g.id} tone="rose">
                Seal compromised — {g.number} {g.title}
              </Alert>
            ))}
            {data.alerts.highValueDiscrepancies.map((g) => (
              <Alert key={g.id} tone="rose">
                High-value discrepancy — {g.number} {g.title} (
                {money(g.listedValue)})
              </Alert>
            ))}
            {data.alerts.countMismatches.map((g) => (
              <Alert key={g.id} tone="amber">
                Count mismatch — {g.number} {g.title}: expected{" "}
                {g.expectedCount}, got {g.actualCount}
              </Alert>
            ))}
            {data.alerts.overCapSafes.map((s) => (
              <Alert key={s.id} tone="amber">
                Safe over cap — {s.name}: {money(s.currentValue)} /{" "}
                {money(s.valueCap)}
              </Alert>
            ))}
            {data.alerts.returnsOverdue.map((g) => (
              <Alert key={g.id} tone="orange">
                Return overdue (&gt;48h) — {g.number} {g.title}
              </Alert>
            ))}
          </div>
        )}
      </div>

      {/* By status */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          By state
        </h2>
        <div className="space-y-1.5">
          {data.byStatus.map((row) => (
            <div
              key={row.status}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2"
            >
              <span
                className={`rounded-full border px-2 py-0.5 text-xs ${statusColor(
                  row.status
                )}`}
              >
                {row.status || "—"}
              </span>
              <span className="text-sm text-slate-300">
                {row.count} · {money(row.value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* By location */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          By location
        </h2>
        <div className="space-y-1.5">
          {data.byLocation.map((row) => (
            <div
              key={row.location}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-2"
            >
              <span className="text-sm text-slate-200">
                {row.location || "—"}
              </span>
              <span className="text-sm text-slate-400">
                {row.count} · {money(row.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-3 py-3 text-center">
      <div className="text-lg font-bold text-emerald-300">{value}</div>
      <div className="mt-0.5 text-[11px] leading-tight text-slate-400">
        {label}
      </div>
    </Card>
  );
}

function Alert({
  tone,
  children,
}: {
  tone: "rose" | "amber" | "orange";
  children: React.ReactNode;
}) {
  const cls = {
    rose: "border-rose-600/50 bg-rose-500/10 text-rose-200",
    amber: "border-amber-500/50 bg-amber-500/10 text-amber-200",
    orange: "border-orange-500/50 bg-orange-500/10 text-orange-200",
  }[tone];
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>
      {children}
    </div>
  );
}
