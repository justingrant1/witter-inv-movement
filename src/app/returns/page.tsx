"use client";

import { useMemo, useState } from "react";
import { useBootstrap } from "@/lib/useBootstrap";
import { useUser } from "@/components/UserProvider";
import { Button, Card, Select, Spinner } from "@/components/ui";
import { money, when } from "@/lib/format";

// Closes the returns black hole: list everything in "Returned", flag overdue,
// and let staff log it back to HQ (an "Arrive HQ" move -> status "At HQ").
export default function ReturnsPage() {
  const { data, loading, error, reload } = useBootstrap();
  const { user } = useUser();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hqSafeId, setHqSafeId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const returned = useMemo(
    () =>
      (data?.games || []).filter((g) =>
        (g.status || "").toLowerCase().includes("returned")
      ),
    [data]
  );

  const hqSafes = useMemo(
    () =>
      (data?.safes || []).filter(
        (s) =>
          (s.location || "").toLowerCase().includes("lombard") ||
          (s.name || "").toLowerCase().includes("hq") ||
          (s.name || "").toLowerCase().includes("vault")
      ),
    [data]
  );

  const isOverdue = (iso?: string) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return !Number.isNaN(t) && Date.now() - t > 48 * 3600 * 1000;
  };

  const receiveBack = async (gameId: string) => {
    setMsg(null);
    setBusyId(gameId);
    try {
      const res = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          type: "Arrive HQ", // arrives at HQ vault -> status "At HQ" (clears the >48h watchdog)
          toSafeId: hqSafeId || null,
          movedById: user?.id || null,
          receivedById: user?.id || null,
          notes: "Returned to HQ",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setMsg("Logged back to HQ.");
      reload();
    } catch (e: any) {
      setMsg(e?.message || "Failed");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Spinner label="Loading returns…" />;
  if (error)
    return (
      <Card className="border-rose-600/50 bg-rose-500/10 text-rose-200">
        {error}
      </Card>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Returns</h1>
        <p className="text-sm text-slate-400">
          Unsold / leftover games waiting to get back to HQ. Overdue &gt;48h
          flags orange.
        </p>
      </div>

      {msg && (
        <Card className="border-emerald-600/50 bg-emerald-500/10 text-emerald-200">
          {msg}
        </Card>
      )}

      <Card className="space-y-2">
        <label className="text-xs text-slate-400">Receive-back destination</label>
        <Select value={hqSafeId} onChange={setHqSafeId}>
          <option value="">Select HQ / vault safe…</option>
          {(hqSafes.length ? hqSafes : data!.safes).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.location ? `· ${s.location}` : ""}
            </option>
          ))}
        </Select>
      </Card>

      <div className="space-y-2">
        {returned.map((g) => {
          const overdue = isOverdue(g.returnedAt);
          return (
            <Card
              key={g.id}
              className={overdue ? "border-orange-500/60 bg-orange-500/5" : ""}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-slate-100">
                    {g.number} · {g.title || "Untitled"}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {g.returnReason || "—"} · {money(g.listedValue)} ·{" "}
                    {g.currentSafeName || "no safe"}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    returned {when(g.returnedAt)}
                    {overdue && (
                      <span className="ml-1 font-semibold text-orange-300">
                        · OVERDUE
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => receiveBack(g.id)}
                  disabled={busyId === g.id}
                >
                  {busyId === g.id ? "…" : "→ HQ"}
                </Button>
              </div>
            </Card>
          );
        })}
        {returned.length === 0 && (
          <Card className="text-sm text-emerald-300">
            ✓ Nothing waiting to return.
          </Card>
        )}
      </div>
    </div>
  );
}
