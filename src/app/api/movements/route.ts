import { NextResponse } from "next/server";
import { getRecentMovements } from "@/lib/data";

// Always read the live custody log.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {

  try {
    const data = await getRecentMovements(80);
    return NextResponse.json({ movements: data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load movements" },
      { status: 500 }
    );
  }
}
