import { NextRequest, NextResponse } from "next/server";
import {
  FIELDS,
  MOVEMENT_TYPES,
  TABLES,
  logMovement,
  updateRecord,
} from "@/lib/airtable";

// Quick Move: log a custody hand-off and advance the game in one shot.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, type, expectedCount } = body || {};

    if (!gameId || !type) {
      return NextResponse.json(
        { error: "gameId and type are required" },
        { status: 400 }
      );
    }
    if (!MOVEMENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Unknown movement type "${type}"` },
        { status: 400 }
      );
    }

    // On a Transport, the mover records how many coins are in the case. This
    // becomes the Game's Expected count, which Check-in reconciles Actual against.
    if (
      type === "Transport" &&
      expectedCount != null &&
      expectedCount !== "" &&
      !Number.isNaN(Number(expectedCount))
    ) {
      await updateRecord(TABLES.games, gameId, {
        [FIELDS.game.expectedCount]: Number(expectedCount),
      } as any);
    }

    // On Check-in, record the verified actual count + seal status so the
    // Count check / High-value discrepancy formulas fire immediately.
    if (type === "Check-in") {
      const checkinFields: Record<string, unknown> = {};
      if (
        body.actualCount != null &&
        body.actualCount !== "" &&
        !Number.isNaN(Number(body.actualCount))
      ) {
        checkinFields[FIELDS.game.actualCount] = Number(body.actualCount);
      }
      if (body.sealStatus) checkinFields[FIELDS.game.sealStatus] = body.sealStatus;
      if (Object.keys(checkinFields).length) {
        await updateRecord(TABLES.games, gameId, checkinFields as any);
      }
    }


    const toNum = (v: any) =>
      v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;

    const movement = await logMovement({
      gameId,
      type,
      fromSafeId: body.fromSafeId || null,
      toSafeId: body.toSafeId || null,
      movedById: body.movedById || null,
      receivedById: body.receivedById || null,
      notes: body.notes || undefined,
      returnReason: body.returnReason || null,
      streamerId: body.streamerId || null,
      showId: body.showId || null,
      labelVerified:
        typeof body.labelVerified === "boolean" ? body.labelVerified : null,
      soldCount: toNum(body.soldCount),
      unsoldCount: toNum(body.unsoldCount),
      shipBucket: body.shipBucket || null,
      tracking: body.tracking || null,
    });


    return NextResponse.json({ ok: true, movementId: movement.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to log movement" },
      { status: 500 }
    );
  }
}
