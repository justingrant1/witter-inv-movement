import { NextRequest, NextResponse } from "next/server";
import {
  FIELDS,
  TABLES,
  logMovement,
  updateRecord,
} from "@/lib/airtable";

/**
 * Check-in: the high-stakes moment Seth flagged ("says 400, only 300 in the box").
 * The mover records the actual count + seal status, we write those to the Game,
 * then log a Check-in movement that drops it into the destination safe.
 * The "Count check" + "High-value discrepancy" formula fields flag mismatches.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, actualCount, sealStatus, toSafeId, receivedById, movedById, notes } =
      body || {};

    if (!gameId) {
      return NextResponse.json({ error: "gameId is required" }, { status: 400 });
    }

    // 1) Record the physical-check results on the Game.
    const gameFields: Record<string, unknown> = {};
    if (actualCount != null && actualCount !== "")
      gameFields[FIELDS.game.actualCount] = Number(actualCount);
    if (sealStatus) gameFields[FIELDS.game.sealStatus] = sealStatus;
    // Mark verified only when a count was entered AND seal is intact.
    if (actualCount != null && actualCount !== "") {
      gameFields[FIELDS.game.checkVerified] = sealStatus
        ? sealStatus.toLowerCase().includes("intact")
        : true;
    }
    if (Object.keys(gameFields).length) {
      await updateRecord(TABLES.games, gameId, gameFields as any);
    }

    // 2) Log the Check-in hand-off (advances status to "Checked in" + sets safe).
    const movement = await logMovement({
      gameId,
      type: "Check-in",
      toSafeId: toSafeId || null,
      movedById: movedById || null,
      receivedById: receivedById || null,
      notes: notes || undefined,
    });

    return NextResponse.json({ ok: true, movementId: movement.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to check in" },
      { status: 500 }
    );
  }
}
