"use client";

import { useState } from "react";
import { useBootstrap } from "@/lib/useBootstrap";
import { useUser } from "@/components/UserProvider";
import { GamePicker } from "@/components/GamePicker";
import { Button, Card, Field, Input, Select, Spinner } from "@/components/ui";
import { money } from "@/lib/format";

// Check-in: the "says 400, only 300" catch. Record actual count + seal, drop into a safe.
export default function CheckinPage() {
  const { data, loading, error, reload } = useBootstrap();
  const { user } = useUser();

  const [gameId, setGameId] = useState("");
  const [actualCount, setActualCount] = useState("");
  const [sealStatus, setSealStatus] = useState("Intact");
  const [toSafeId, setToSafeId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const game = data?.games.find((g) => g.id === gameId);
  const expected = game?.expectedCount;
  const actualNum = actualCount === "" ? null : Number(actualCount);
  const mismatch =
    expected != null && actualNum != null && expected !== actualNum;

  const submit = async () => {
    setSubmitError(null);
    setDone(null);
    if (!gameId) {
      setSubmitError("Pick a game first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          actualCount: actualCount === "" ? null : Number(actualCount),
          sealStatus,
          toSafeId: toSafeId || null,
          movedById: user?.id || null,
          receivedById: user?.id || null,
          notes: notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setDone(
        `${game?.number || "Game"} checked in${
          mismatch ? " — ⚠ COUNT MISMATCH flagged" : ""
        }`
      );
      setGameId("");
      setActualCount("");
      setSealStatus("Intact");
      setToSafeId("");
      setNotes("");
      reload();
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to check in");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner label="Loading inventory…" />;
  if (error)
    return (
      <Card className="border-rose-600/50 bg-rose-500/10 text-rose-200">
        {error}
      </Card>
    );

  const masterSafes = (data!.safes || []).filter(
    (s) =>
      (s.type || "").toLowerCase().includes("master") ||
      (s.name || "").toLowerCase().includes("master")
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Check in inventory</h1>
        <p className="text-sm text-slate-400">
          Verify the count and seal as it lands at the master safe. Mismatches
          flag instantly.
        </p>
      </div>

      {done && (
        <Card className="border-emerald-600/50 bg-emerald-500/10 text-emerald-200">
          ✓ {done}
        </Card>
      )}
      {submitError && (
        <Card className="border-rose-600/50 bg-rose-500/10 text-rose-200">
          {submitError}
        </Card>
      )}

      <Card className="space-y-4">
        <Field label="Game">
          <GamePicker games={data!.games} value={gameId} onChange={setGameId} />
        </Field>

        {game && (
          <div className="rounded-lg bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
            Expected count:{" "}
            <span className="text-slate-200">{expected ?? "—"}</span> · listed{" "}
            {money(game.listedValue)} · seal {game.sealId || "—"}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Actual count" hint="Count what's physically in the box.">
            <Input
              type="number"
              value={actualCount}
              onChange={setActualCount}
              placeholder={expected != null ? String(expected) : "0"}
            />
          </Field>
          <Field label="Seal status">
            <Select value={sealStatus} onChange={setSealStatus}>
              <option value="Intact">Intact</option>
              <option value="Compromised">Compromised</option>
              <option value="Re-sealed">Re-sealed</option>
            </Select>
          </Field>
        </div>

        {mismatch && (
          <Card className="border-amber-500/50 bg-amber-500/10 text-amber-200">
            ⚠ Count mismatch — expected {expected}, got {actualNum}. This will be
            flagged on the dashboard.
          </Card>
        )}
        {sealStatus === "Compromised" && (
          <Card className="border-rose-500/50 bg-rose-500/10 text-rose-200">
            ⚠ Seal compromised — photograph and escalate to management before
            storing.
          </Card>
        )}

        <Field label="Into safe" hint="Usually a master safe at Webster.">
          <Select value={toSafeId} onChange={setToSafeId}>
            <option value="">Select safe…</option>
            {(masterSafes.length ? masterSafes : data!.safes).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.location ? `· ${s.location}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes (optional)">
          <textarea
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 focus:border-emerald-500 focus:outline-none"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>

        <Button onClick={submit} disabled={submitting} className="w-full">
          {submitting ? "Checking in…" : "Check in"}
        </Button>
        <p className="text-center text-xs text-slate-500">
          Verified by {user?.name || "—"}
        </p>
      </Card>
    </div>
  );
}
