import { FieldSet, Record as AirtableRecord } from "airtable";
import { FIELDS } from "./airtable";
import { Game, Movement, Person, Safe, ShowSummary } from "./types";

// Airtable lookup/rollup fields come back as arrays; these helpers normalize them.
const str = (v: unknown): string | undefined => {
  if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
  return v == null ? undefined : String(v);
};
const num = (v: unknown): number | undefined => {
  if (Array.isArray(v)) v = v[0];
  if (v == null || v === "") return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};
const bool = (v: unknown): boolean => v === true;
const linkIds = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x)) : [];
const firstLinkId = (v: unknown): string | undefined =>
  Array.isArray(v) && v.length ? String(v[0]) : undefined;

export function toPerson(r: AirtableRecord<FieldSet>): Person {
  const f = FIELDS.person;
  return {
    id: r.id,
    name: str(r.get(f.name)) || "(unnamed)",
    role: str(r.get(f.role)),
    accessTier: str(r.get(f.accessTier)),
    valueCap: num(r.get(f.valueCap)),
    frontDoorKey: bool(r.get(f.frontDoorKey)),
  };
}

export function toSafe(r: AirtableRecord<FieldSet>): Safe {
  const f = FIELDS.safe;
  const accessRaw = r.get(f.access);
  const access = Array.isArray(accessRaw)
    ? accessRaw.map(String)
    : accessRaw
    ? [String(accessRaw)]
    : [];
  return {
    id: r.id,
    name: str(r.get(f.name)) || "(unnamed safe)",
    type: str(r.get(f.type)),
    location: str(r.get(f.location)),
    access,
    valueCap: num(r.get(f.valueCap)),
    notes: str(r.get(f.notes)),
    currentValue: num(r.get(f.currentValue)) || 0,
    currentCount: num(r.get(f.currentCount)) || 0,
    overCap: !!str(r.get(f.overCap)),
  };
}

export function toGame(
  r: AirtableRecord<FieldSet>,
  safeNames?: Map<string, string>,
  peopleNames?: Map<string, string>
): Game {
  const f = FIELDS.game;
  const safeId = firstLinkId(r.get(f.currentSafe));
  const streamerId = firstLinkId(r.get(f.streamer));
  return {
    id: r.id,
    number: str(r.get(f.number)) || r.id,
    title: str(r.get(f.title)),
    status: str(r.get(f.status)),
    itemType: str(r.get(f.itemType)),
    retailValue: num(r.get(f.retailValue)),
    listedValue: num(r.get(f.listedValue)),
    expectedCount: num(r.get(f.expectedCount)),
    actualCount: num(r.get(f.actualCount)),
    checkVerified: bool(r.get(f.checkVerified)),
    countCheck: str(r.get(f.countCheck)),
    highValueDiscrepancy: str(r.get(f.highValueDiscrepancy)),
    sealId: str(r.get(f.sealId)),
    sealStatus: str(r.get(f.sealStatus)),
    returnReason: str(r.get(f.returnReason)),
    notes: str(r.get(f.notes)),
    currentSafeId: safeId,
    currentSafeName: safeId ? safeNames?.get(safeId) : undefined,
    showId: firstLinkId(r.get(f.show)),
    streamerId,
    streamerName: streamerId ? peopleNames?.get(streamerId) : undefined,
    returnedAt: str(r.get(f.returnedAt)),
  };
}

export function toShow(
  r: AirtableRecord<FieldSet>,
  peopleNames?: Map<string, string>
): ShowSummary {
  const f = FIELDS.show;
  const streamerId = firstLinkId(r.get(f.streamer));
  return {
    id: r.id,
    showId: str(r.get(f.id)) || r.id,
    start: str(r.get(f.start)),
    platform: str(r.get(f.platform)),
    status: str(r.get(f.status)),
    streamerName: streamerId ? peopleNames?.get(streamerId) : undefined,
    gameIds: linkIds(r.get(f.games)),
  };
}

export function toMovement(
  r: AirtableRecord<FieldSet>,
  safeNames?: Map<string, string>,
  peopleNames?: Map<string, string>,
  gameNumbers?: Map<string, string>
): Movement {
  const f = FIELDS.movement;
  const gameId = firstLinkId(r.get(f.game));
  const fromId = firstLinkId(r.get(f.fromSafe));
  const toId = firstLinkId(r.get(f.toSafe));
  const movedById = firstLinkId(r.get(f.movedBy));
  const receivedById = firstLinkId(r.get(f.receivedBy));
  return {
    id: r.id,
    type: str(r.get(f.type)),
    at: str(r.get(f.at)),
    gameId,
    gameNumber: gameId ? gameNumbers?.get(gameId) : undefined,
    fromSafeName: fromId ? safeNames?.get(fromId) : undefined,
    toSafeName: toId ? safeNames?.get(toId) : undefined,
    movedByName: movedById ? peopleNames?.get(movedById) : undefined,
    receivedByName: receivedById ? peopleNames?.get(receivedById) : undefined,
    notes: str(r.get(f.notes)),
  };
}
