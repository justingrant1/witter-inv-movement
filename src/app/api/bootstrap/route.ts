import { NextResponse } from "next/server";
import { getGames, getPeople, getSafes, getShows } from "@/lib/data";

// Always read live from Airtable — never serve a cached snapshot, or records
// added after the last build/deploy won't show up.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// One call that feeds every form: roster, safes, games, shows.
export async function GET() {

  try {
    const [people, safes, games, shows] = await Promise.all([
      getPeople(),
      getSafes(),
      getGames(),
      getShows(),
    ]);
    return NextResponse.json({ people, safes, games, shows });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load base data" },
      { status: 500 }
    );
  }
}
