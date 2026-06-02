import { FieldSet, Record as AirtableRecord } from "airtable";
import { FIELDS, TABLES, listAll } from "./airtable";
import { toGame, toMovement, toPerson, toSafe, toShow } from "./serialize";
import { DashboardData, Game, Movement, Person, Safe, ShowSummary } from "./types";

type Rec = AirtableRecord<FieldSet>;
const nameOf = (r: Rec, field: string): [string, string] => [
  r.id,
  String(r.get(field) ?? r.id),
];


// Lombard is HQ; Webster is the streaming facility. Used for the Webster-total alert.
const WEBSTER_HINT = "Webster";

async function nameMaps() {
  const [people, safes, games] = await Promise.all([
    listAll(TABLES.people),
    listAll(TABLES.safes),
    listAll(TABLES.games),
  ]);
  const peopleNames = new Map<string, string>(
    people.map((r: Rec) => nameOf(r, FIELDS.person.name))
  );
  const safeNames = new Map<string, string>(
    safes.map((r: Rec) => nameOf(r, FIELDS.safe.name))
  );
  const gameNumbers = new Map<string, string>(
    games.map((r: Rec) => nameOf(r, FIELDS.game.number))
  );
  return { peopleNames, safeNames, gameNumbers };

}

export async function getPeople(): Promise<Person[]> {
  const recs = await listAll(TABLES.people, {
    sort: [{ field: FIELDS.person.name }],
  });
  return recs.map(toPerson);
}

export async function getSafes(): Promise<Safe[]> {
  const recs = await listAll(TABLES.safes, {
    sort: [{ field: FIELDS.safe.name }],
  });
  return recs.map(toSafe);
}

export async function getGames(): Promise<Game[]> {
  const { peopleNames, safeNames } = await nameMaps();
  const recs = await listAll(TABLES.games, {
    sort: [{ field: FIELDS.game.number }],
  });
  return recs.map((r) => toGame(r, safeNames, peopleNames));
}

export async function getShows(): Promise<ShowSummary[]> {
  const people = await listAll(TABLES.people);
  const peopleNames = new Map<string, string>(
    people.map((r: Rec) => nameOf(r, FIELDS.person.name))
  );
  const recs = await listAll(TABLES.shows, {

    sort: [{ field: FIELDS.show.start, direction: "desc" }],
  });
  return recs.map((r) => toShow(r, peopleNames));
}

export async function getRecentMovements(limit = 60): Promise<Movement[]> {
  const { peopleNames, safeNames, gameNumbers } = await nameMaps();
  const recs = await listAll(TABLES.movements, {
    sort: [{ field: FIELDS.movement.at, direction: "desc" }],
    maxRecords: limit,
  });
  return recs.map((r) => toMovement(r, safeNames, peopleNames, gameNumbers));
}

export async function getDashboard(): Promise<DashboardData> {
  const [games, safes] = await Promise.all([getGames(), getSafes()]);

  // Group by status
  const statusMap = new Map<string, { count: number; value: number }>();
  // Group by physical location (via current safe's location)
  const safeById = new Map(safes.map((s) => [s.id, s]));
  const locMap = new Map<string, { count: number; value: number }>();

  let websterTotalValue = 0;
  let totalValue = 0;

  for (const g of games) {
    const v = g.listedValue ?? 0;
    totalValue += v;

    const st = g.status || "(no status)";
    const s = statusMap.get(st) || { count: 0, value: 0 };
    s.count += 1;
    s.value += v;
    statusMap.set(st, s);

    const safe = g.currentSafeId ? safeById.get(g.currentSafeId) : undefined;
    const loc = safe?.location || "Unassigned / in transit";
    const l = locMap.get(loc) || { count: 0, value: 0 };
    l.count += 1;
    l.value += v;
    locMap.set(loc, l);

    if (loc.includes(WEBSTER_HINT)) websterTotalValue += v;
  }

  // 48h returns-overdue check (Status = Returned and Returned at older than 2 days)
  const twoDaysAgo = Date.now() - 1000 * 60 * 60 * 48;
  const returnsOverdue = games.filter((g) => {
    if (g.status !== "Returned") return false;
    if (!g.returnedAt) return true; // returned with no timestamp yet = surface it
    return new Date(g.returnedAt).getTime() < twoDaysAgo;
  });

  return {
    byStatus: [...statusMap.entries()].map(([status, v]) => ({
      status,
      count: v.count,
      value: v.value,
    })),
    byLocation: [...locMap.entries()].map(([location, v]) => ({
      location,
      count: v.count,
      value: v.value,
    })),
    alerts: {
      overCapSafes: safes.filter((s) => s.overCap),
      countMismatches: games.filter(
        (g) =>
          g.actualCount != null &&
          g.expectedCount != null &&
          g.actualCount !== g.expectedCount
      ),
      highValueDiscrepancies: games.filter((g) => !!g.highValueDiscrepancy),
      returnsOverdue,
      sealCompromised: games.filter(
        (g) => g.sealStatus && g.sealStatus.toLowerCase().includes("compromis")
      ),
    },
    websterTotalValue,
    totals: { games: games.length, value: totalValue },
  };
}
