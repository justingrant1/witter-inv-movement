"use client";

import { useBootstrap } from "@/lib/useBootstrap";
import { Card, Spinner } from "@/components/ui";
import { money, statusColor, when } from "@/lib/format";

export default function ShowsPage() {
  const { data, loading, error } = useBootstrap();

  if (loading) return <Spinner label="Loading shows…" />;
  if (error)
    return (
      <Card className="border-rose-600/50 bg-rose-500/10 text-rose-200">
        {error}
      </Card>
    );

  const shows = [...(data!.shows || [])].sort((a, b) =>
    (b.start || "").localeCompare(a.start || "")
  );

  const gamesById = new Map(data!.games.map((g) => [g.id, g]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Shows</h1>
        <p className="text-sm text-slate-400">
          Each show&apos;s lineup and where those games are right now.
        </p>
      </div>

      <div className="space-y-3">
        {shows.map((sh) => {
          const lineup = sh.gameIds
            .map((id) => gamesById.get(id))
            .filter(Boolean);
          const total = lineup.reduce(
            (sum, g) => sum + (g!.listedValue || 0),
            0
          );
          return (
            <Card key={sh.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-100">
                    {sh.showId || "Show"}
                    {sh.platform ? ` · ${sh.platform}` : ""}
                  </div>
                  <div className="text-xs text-slate-400">
                    {when(sh.start)}
                    {sh.streamerName ? ` · ${sh.streamerName}` : ""}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div className="text-sm font-semibold text-slate-100">
                    {money(total)}
                  </div>
                  {lineup.length} game{lineup.length === 1 ? "" : "s"}
                </div>
              </div>

              {sh.status && (
                <span
                  className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs ${statusColor(
                    sh.status
                  )}`}
                >
                  {sh.status}
                </span>
              )}

              {lineup.length > 0 && (
                <div className="mt-3 space-y-1">
                  {lineup.map((g) => (
                    <div
                      key={g!.id}
                      className="flex items-center justify-between rounded-lg bg-slate-900/50 px-2.5 py-1.5"
                    >
                      <span className="text-sm text-slate-200">
                        {g!.number} · {g!.title || "Untitled"}
                      </span>
                      <span className={`text-xs ${statusColor(g!.status)}`}>
                        {g!.currentSafeName || g!.status || "—"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
        {shows.length === 0 && (
          <Card className="text-sm text-slate-400">No shows scheduled.</Card>
        )}
      </div>
    </div>
  );
}
