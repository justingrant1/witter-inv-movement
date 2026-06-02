"use client";

import { useMemo, useState } from "react";
import { useBootstrap } from "@/lib/useBootstrap";
import { useUser } from "@/components/UserProvider";
import { GamePicker } from "@/components/GamePicker";
import { Button, Card, Field, Input, Select, Spinner } from "@/components/ui";

import { MOVEMENT_TYPES } from "@/lib/movementTypes";
import { money } from "@/lib/format";

// The home screen: log a custody hand-off in seconds.
export default function MovePage() {
  const { data, loading, error, reload } = useBootstrap();
  const { user } = useUser();

  const [gameId, setGameId] = useState("");
  const [type, setType] = useState("");
  const [toSafeId, setToSafeId] = useState("");
  const [receivedById, setReceivedById] = useState("");
  const [notes, setNotes] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [coinCount, setCoinCount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [done, setDone] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedGame = data?.games.find((g) => g.id === gameId);

  // Transport has no destination safe (in-flight); Return wants a reason.
  const needsSafe = type !== "Transport" && type !== "";
  const isReturn = type === "Return";
  const isTransport = type === "Transport";


  const reset = () => {
    setGameId("");
    setType("");
    setToSafeId("");
    setReceivedById("");
    setNotes("");
    setReturnReason("");
    setCoinCount("");
  };


  const submit = async () => {
    setSubmitError(null);
    setDone(null);
    if (!gameId || !type) {
      setSubmitError("Pick a game and a movement type.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          type,
          toSafeId: needsSafe ? toSafeId || null : null,
          fromSafeId: selectedGame?.currentSafeId || null,
          movedById: user?.id || null,
          receivedById: receivedById || null,
          notes: notes || undefined,
          returnReason: isReturn ? returnReason || null : null,
          expectedCount: isTransport && coinCount !== "" ? Number(coinCount) : null,
        }),

      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setDone(
        `${selectedGame?.number || "Game"} → ${type}${
          needsSafe && toSafeId
            ? " · " + data?.safes.find((s) => s.id === toSafeId)?.name
            : ""
        }`
      );
      reset();
      reload();
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to log movement");
    } finally {
      setSubmitting(false);
    }
  };

  const websterSafes = useMemo(
    () =>
      (data?.safes || []).filter((s) =>
        (s.location || "").toLowerCase().includes("webster")
      ),
    [data]
  );

  if (loading) return <Spinner label="Loading inventory…" />;
  if (error)
    return (
      <Card className="border-rose-600/50 bg-rose-500/10 text-rose-200">
        {error}
      </Card>
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Move a game</h1>
        <p className="text-sm text-slate-400">
          Log a hand-off. Status and location update automatically.
        </p>
      </div>

      {done && (
        <Card className="border-emerald-600/50 bg-emerald-500/10 text-emerald-200">
          ✓ Logged: {done}
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

        {selectedGame && (
          <div className="rounded-lg bg-slate-900/60 px-3 py-2 text-xs text-slate-400">
            Now in{" "}
            <span className="text-slate-200">
              {selectedGame.currentSafeName || "no safe"}
            </span>{" "}
            · listed {money(selectedGame.listedValue)}
            {selectedGame.streamerName && (
              <> · streamer {selectedGame.streamerName}</>
            )}
          </div>
        )}

        <Field label="Movement type">
          <div className="grid grid-cols-2 gap-2">
            {MOVEMENT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg border px-3 py-2.5 text-sm transition ${
                  type === t
                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                    : "border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        {needsSafe && (
          <Field
            label="To safe"
            hint="Where the game physically goes now."
          >
            <Select value={toSafeId} onChange={setToSafeId}>
              <option value="">Select safe…</option>
              {(websterSafes.length ? websterSafes : data!.safes).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.location ? `· ${s.location}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {isTransport && (
          <Field
            label="Coin count (expected)"
            hint="How many coins are in the case. Check-in verifies the actual count against this."
          >
            <Input
              type="number"
              value={coinCount}
              onChange={setCoinCount}
              placeholder={
                selectedGame?.expectedCount != null
                  ? String(selectedGame.expectedCount)
                  : "e.g. 400"
              }
            />
          </Field>
        )}

        {isReturn && (
          <Field label="Return reason">

            <Select value={returnReason} onChange={setReturnReason}>
              <option value="">Select…</option>
              <option value="Unsold">Unsold</option>
              <option value="Plan B (unused)">Plan B (unused)</option>
              <option value="Ended early">Ended early</option>
              <option value="Surprise set remainder">Surprise set remainder</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
        )}

        <Field
          label="Received by (optional)"
          hint="Who took custody on the other end of this hand-off."
        >
          <Select value={receivedById} onChange={setReceivedById}>
            <option value="">—</option>
            {data!.people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.role ? `· ${p.role}` : ""}
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
          {submitting ? "Logging…" : "Log movement"}
        </Button>
        <p className="text-center text-xs text-slate-500">
          Moving as {user?.name || "—"}
        </p>
      </Card>
    </div>
  );
}
