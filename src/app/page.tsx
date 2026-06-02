"use client";

import { useEffect, useMemo, useState } from "react";
import { useBootstrap } from "@/lib/useBootstrap";
import { useUser } from "@/components/UserProvider";
import { GamePicker } from "@/components/GamePicker";
import { Button, Card, Field, Input, Select, Spinner } from "@/components/ui";

import { MOVEMENT_TYPES, MovementType } from "@/lib/movementTypes";
import { money } from "@/lib/format";
import type { Safe } from "@/lib/types";

// ---------------------------------------------------------------------------
// Per-type form configuration. This is what makes the Move screen context-aware:
// each movement type only surfaces the inputs that matter for it, and the
// "To safe" dropdown is filtered to the safes that make sense for that step.
// ---------------------------------------------------------------------------
type SafeFilter = (s: Safe) => boolean;

const has = (s: Safe, ...needles: string[]) => {
  const hay = `${s.name} ${s.type ?? ""}`.toLowerCase();
  return needles.some((n) => hay.includes(n));
};

interface TypeConfig {
  needsSafe: boolean;
  safeFilter?: SafeFilter; // narrows the To-safe list
  safeHint?: string;
  fields: {
    expectedCount?: boolean; // Transport
    checkin?: boolean; // Check-in: actual count + seal
    streamerShow?: boolean; // Delegate
    completed?: boolean; // Completed handoff: label + sold/unsold
    bookingRep?: boolean; // Booking pull
    ship?: boolean; // Ship: bucket + tracking
    returnReason?: boolean; // Return
    receivedBy?: boolean; // Arrive HQ / generic confirm
  };
  blurb: string;
}

const TYPE_CONFIG: Record<MovementType, TypeConfig> = {
  Transport: {
    needsSafe: false,
    fields: { expectedCount: true },
    blurb: "Lombard → Webster. No safe yet — the game is in-flight until check-in.",
  },
  "Check-in": {
    needsSafe: true,
    safeFilter: (s) => has(s, "master"),
    safeHint: "Master safe it's received into.",
    fields: { checkin: true, receivedBy: true },
    blurb: "Receive at Webster. Verify the actual count and seal against expected.",
  },
  Stage: {
    needsSafe: true,
    safeFilter: (s) => has(s, "master"),
    safeHint: "Holds in a master safe until delegated.",
    fields: {},
    blurb: "Hold in the master safe, ready to delegate out to a streamer.",
  },
  Delegate: {
    needsSafe: true,
    safeFilter: (s) => has(s, "senior", "junior", "room", "cabinet"),
    safeHint: "The streamer's senior/junior room safe or cabinet.",
    fields: { streamerShow: true },
    blurb: "Assign to a streamer + show and move into their room safe.",
  },
  "Completed handoff": {
    needsSafe: true,
    safeFilter: (s) => has(s, "completed", "booking"),
    safeHint: "Completed / booking drop safe.",
    fields: { completed: true },
    blurb: "Show wrapped. Verify labeling, record sold/unsold, drop for booking.",
  },
  "Booking pull": {
    needsSafe: true,
    safeFilter: (s) => has(s, "booking"),
    safeHint: "Booking safe.",
    fields: { bookingRep: true },
    blurb: "Booking takes custody of the completed show.",
  },
  Ship: {
    needsSafe: true,
    safeFilter: (s) => has(s, "shipping", "ship"),
    safeHint: "Shipping safe.",
    fields: { ship: true },
    blurb: "Into shipping. Set the bucket and capture the tracking #.",
  },
  Return: {
    needsSafe: true,
    safeFilter: (s) => has(s, "auction", "senior", "master"),
    safeHint: "Where the unsold/leftover goes (auction or senior safe).",
    fields: { returnReason: true },
    blurb: "Unsold or leftover. Record the reason and where it lands.",
  },
  "Arrive HQ": {
    needsSafe: false,
    fields: { receivedBy: true },
    blurb: "Closes the loop — back at Lombard HQ. Confirm who received it.",
  },
};

// The home screen: log a custody hand-off in seconds.
export default function MovePage() {
  const { data, loading, error, reload } = useBootstrap();
  const { user } = useUser();

  const [gameId, setGameId] = useState("");
  const [type, setType] = useState<MovementType | "">("");
  const [toSafeId, setToSafeId] = useState("");
  const [receivedById, setReceivedById] = useState("");
  const [notes, setNotes] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [coinCount, setCoinCount] = useState("");

  // Context-specific state
  const [actualCount, setActualCount] = useState("");
  const [sealStatus, setSealStatus] = useState("");
  const [streamerId, setStreamerId] = useState("");
  const [showId, setShowId] = useState("");
  const [labelVerified, setLabelVerified] = useState(false);
  const [soldCount, setSoldCount] = useState("");
  const [unsoldCount, setUnsoldCount] = useState("");
  const [shipBucket, setShipBucket] = useState("");
  const [tracking, setTracking] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedGame = data?.games.find((g) => g.id === gameId);
  const cfg = type ? TYPE_CONFIG[type] : null;

  // Reset per-type fields whenever the type changes, so stale values from a
  // previous type can't leak into the next move.
  useEffect(() => {
    setToSafeId("");
    setReceivedById("");
    setReturnReason("");
    setCoinCount("");
    setActualCount("");
    setSealStatus("");
    setStreamerId("");
    setShowId("");
    setLabelVerified(false);
    setSoldCount("");
    setUnsoldCount("");
    setShipBucket("");
    setTracking("");
  }, [type]);

  const reset = () => {
    setGameId("");
    setType("");
  };

  const submit = async () => {
    setSubmitError(null);
    setDone(null);
    if (!gameId || !type || !cfg) {
      setSubmitError("Pick a game and a movement type.");
      return;
    }
    if (cfg.needsSafe && !toSafeId) {
      setSubmitError("Pick the destination safe for this move.");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        gameId,
        type,
        toSafeId: cfg.needsSafe ? toSafeId || null : null,
        fromSafeId: selectedGame?.currentSafeId || null,
        movedById: user?.id || null,
        receivedById: receivedById || null,
        notes: notes || undefined,
      };
      if (cfg.fields.expectedCount && coinCount !== "")
        body.expectedCount = Number(coinCount);
      if (cfg.fields.checkin) {
        if (actualCount !== "") body.actualCount = Number(actualCount);
        if (sealStatus) body.sealStatus = sealStatus;
      }
      if (cfg.fields.streamerShow) {
        body.streamerId = streamerId || null;
        body.showId = showId || null;
      }
      if (cfg.fields.completed) {
        body.labelVerified = labelVerified;
        if (showId) body.showId = showId;
        if (soldCount !== "") body.soldCount = Number(soldCount);
        if (unsoldCount !== "") body.unsoldCount = Number(unsoldCount);
      }
      if (cfg.fields.ship) {
        body.shipBucket = shipBucket || null;
        body.tracking = tracking || null;
      }
      if (cfg.fields.returnReason) body.returnReason = returnReason || null;

      const res = await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setDone(
        `${selectedGame?.number || "Game"} → ${type}${
          cfg.needsSafe && toSafeId
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

  // Build the destination-safe list: apply the type's filter, but fall back to
  // all safes if the filter matches nothing (so the form is never a dead end).
  const safeOptions = useMemo(() => {
    const all = data?.safes || [];
    if (!cfg?.safeFilter) return all;
    const filtered = all.filter(cfg.safeFilter);
    return filtered.length ? filtered : all;
  }, [data, cfg]);

  const streamers = useMemo(
    () =>
      (data?.people || []).filter((p) =>
        (p.role || "").toLowerCase().includes("streamer")
      ),
    [data]
  );
  const bookingPeople = useMemo(
    () =>
      (data?.people || []).filter((p) =>
        (p.role || "").toLowerCase().includes("booking")
      ),
    [data]
  );

  // Live mismatch warning for check-in.
  const checkinMismatch =
    cfg?.fields.checkin &&
    actualCount !== "" &&
    selectedGame?.expectedCount != null &&
    Number(actualCount) !== selectedGame.expectedCount;

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
            {selectedGame.expectedCount != null && (
              <> · expects {selectedGame.expectedCount}</>
            )}
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

        {cfg && (
          <p className="rounded-lg bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            {cfg.blurb}
          </p>
        )}

        {/* Destination safe — filtered to the safes that fit this step */}
        {cfg?.needsSafe && (
          <Field label="To safe" hint={cfg.safeHint}>
            <Select value={toSafeId} onChange={setToSafeId}>
              <option value="">Select safe…</option>
              {safeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.location ? `· ${s.location}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}

        {/* Transport: expected coin count */}
        {cfg?.fields.expectedCount && (
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

        {/* Check-in: actual count + seal */}
        {cfg?.fields.checkin && (
          <>
            <Field
              label="Actual count"
              hint={
                selectedGame?.expectedCount != null
                  ? `Expected ${selectedGame.expectedCount}.`
                  : "Count what's physically in the case."
              }
            >
              <Input
                type="number"
                value={actualCount}
                onChange={setActualCount}
                placeholder="e.g. 400"
              />
            </Field>
            {checkinMismatch && (
              <div className="rounded-lg border border-amber-600/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                ⚠ Count mismatch — expected {selectedGame!.expectedCount}, got{" "}
                {actualCount}. Flag before accepting.
              </div>
            )}
            <Field label="Seal status">
              <Select value={sealStatus} onChange={setSealStatus}>
                <option value="">Select…</option>
                <option value="Intact">Intact</option>
                <option value="Compromised">Compromised</option>
                <option value="N/A">N/A</option>
              </Select>
            </Field>
            {sealStatus === "Compromised" && (
              <div className="rounded-lg border border-rose-600/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                🚨 Seal compromised — photograph and escalate to management.
              </div>
            )}
          </>
        )}

        {/* Delegate: streamer + show */}
        {cfg?.fields.streamerShow && (
          <>
            <Field label="Streamer">
              <Select value={streamerId} onChange={setStreamerId}>
                <option value="">Select streamer…</option>
                {streamers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.accessTier ? `· ${p.accessTier}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Show (optional)">
              <Select value={showId} onChange={setShowId}>
                <option value="">—</option>
                {(data?.shows || []).map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.showId} {sh.platform ? `· ${sh.platform}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {/* Completed handoff: label verified + sold/unsold */}
        {cfg?.fields.completed && (
          <>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={labelVerified}
                onChange={(e) => setLabelVerified(e.target.checked)}
                className="h-4 w-4 accent-emerald-500"
              />
              Labeling double-checked
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sold">
                <Input type="number" value={soldCount} onChange={setSoldCount} placeholder="0" />
              </Field>
              <Field label="Unsold">
                <Input type="number" value={unsoldCount} onChange={setUnsoldCount} placeholder="0" />
              </Field>
            </div>
            <Field label="Show (optional)">
              <Select value={showId} onChange={setShowId}>
                <option value="">—</option>
                {(data?.shows || []).map((sh) => (
                  <option key={sh.id} value={sh.id}>
                    {sh.showId} {sh.platform ? `· ${sh.platform}` : ""}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {/* Ship: bucket + tracking */}
        {cfg?.fields.ship && (
          <>
            <Field label="Ship bucket">
              <Select value={shipBucket} onChange={setShipBucket}>
                <option value="">Select…</option>
                <option value="Main holding">Main holding</option>
                <option value="In-process">In-process</option>
                <option value="Ready to ship">Ready to ship</option>
              </Select>
            </Field>
            <Field label="Tracking # (optional)">
              <Input value={tracking} onChange={setTracking} placeholder="Carrier tracking #" />
            </Field>
          </>
        )}

        {/* Return: reason */}
        {cfg?.fields.returnReason && (
          <Field label="Return reason">
            <Select value={returnReason} onChange={setReturnReason}>
              <option value="">Select…</option>
              <option value="Unsold → HQ">Unsold → HQ</option>
              <option value="Leftover auction → Auction safe">
                Leftover auction → Auction safe
              </option>
              <option value="Plan B / didn't run">Plan B / didn&apos;t run</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
        )}

        {/* Booking rep / Arrive HQ confirm */}
        {(cfg?.fields.bookingRep || cfg?.fields.receivedBy) && (
          <Field
            label={cfg?.fields.bookingRep ? "Received by (booking)" : "Received by"}
            hint="Who took custody on the other end of this hand-off."
          >
            <Select value={receivedById} onChange={setReceivedById}>
              <option value="">—</option>
              {(cfg?.fields.bookingRep && bookingPeople.length
                ? bookingPeople
                : data!.people
              ).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.role ? `· ${p.role}` : ""}
                </option>
              ))}
            </Select>
          </Field>
        )}

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
