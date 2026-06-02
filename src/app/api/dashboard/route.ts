import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/data";

// Always compute from live Airtable data.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {

  try {
    const data = await getDashboard();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
