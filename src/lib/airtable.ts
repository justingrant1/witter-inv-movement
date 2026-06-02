import Airtable, { FieldSet, Records } from "airtable";

/**
 * Airtable service layer for Witter Inventory Movement.
 * Runs SERVER-SIDE ONLY — never import this into a client component.
 * The API key lives in process.env and is never shipped to the browser.
 */

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID || "app7Z7jIfWJFOUfkx";

if (!apiKey) {
  // Throwing here surfaces a clear message in the server logs / API responses
  // instead of a cryptic Airtable error deep in a request.
  console.warn(
    "[airtable] AIRTABLE_API_KEY is not set. Copy .env.local.example to .env.local and add your token."
  );
}

const base = new Airtable({ apiKey: apiKey || "missing" }).base(baseId);

// ---------------------------------------------------------------------------
// Table + field IDs (from the live base — keeps us decoupled from display names)
// ---------------------------------------------------------------------------
export const TABLES = {
  people: "tbl2ue3EU6VUL2dtR",
  safes: "tbl8s91VYFU9ypbQc",
  shows: "tblZ8pZp9kNA8KztY",
  games: "tbl8mVqXoqS05zaXa",
  movements: "tblMF7I8XWXQssmj2",
  cases: "tblHFCDDDCxYRayAU",
} as const;

export const FIELDS = {
  game: {
    number: "Game #",
    title: "Title",
    status: "Status",
    itemType: "Item type",
    retailValue: "Retail value",
    listedValue: "Listed value",
    expectedCount: "Expected count",
    actualCount: "Actual count",
    checkVerified: "Check verified",
    countCheck: "Count check",
    highValueDiscrepancy: "High-value discrepancy",
    sealId: "Seal ID",
    sealStatus: "Seal status",
    sealPhoto: "Seal photo",
    returnReason: "Return reason",
    notes: "Notes",
    currentSafe: "Current safe",
    show: "Show",
    streamer: "Streamer",
    movements: "Movements",
    returnedAt: "Returned at",
    case: "Case",
  },
  safe: {
    name: "Safe name",
    type: "Type",
    location: "Location",
    access: "Who can access",
    valueCap: "Value cap",
    notes: "Notes",
    currentValue: "Current value",
    currentCount: "Current count",
    overCap: "Over cap?",
    games: "Games",
  },
  person: {
    name: "Name",
    role: "Role",
    accessTier: "Access tier",
    valueCap: "Value cap",
    frontDoorKey: "Front-door key",
  },
  show: {
    id: "Show ID",
    start: "Date / start",
    platform: "Platform",
    status: "Status",
    streamer: "Streamer",
    games: "Games",
  },
  movement: {
    name: "Movement",
    type: "Type",
    at: "At",
    verified: "Verified",
    notes: "Notes",
    game: "Game",
    fromSafe: "From safe",
    toSafe: "To safe",
    movedBy: "Moved by",
    receivedBy: "Received by",
    resultingStatus: "Resulting status",
    photo: "Photo",
  },
  case: {
    number: "Case #",
    status: "Status",
    packedAt: "Packed at",
    loadedAt: "Loaded at",
    receivedAt: "Received at",
    unpackedAt: "Unpacked at",
    twoPerson: "2-person transport",
    camera: "Camera in vehicle",
    notes: "Notes",
    packedBy: "Packed by",
    driver: "Driver",
    receivedBy: "Received by",
    shows: "Shows",
    games: "Games",
  },
} as const;

// Movement Type -> resulting Game Status. Mirrors the Airtable "Resulting status"
// formula so the app can update the Game in the same write.
export const MOVEMENT_STATUS_MAP: Record<string, string> = {
  Transport: "In transit",
  "Check-in": "Checked in",
  Stage: "Staged (master)",
  Delegate: "Ready",
  "Completed handoff": "Completed",
  "Booking pull": "In booking",
  Ship: "Shipping",
  Return: "Returned",
  "Arrive HQ": "At HQ",
};

export const MOVEMENT_TYPES = Object.keys(MOVEMENT_STATUS_MAP);

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------
function records(tableId: string) {
  return base(tableId);
}

export async function listAll(
  tableId: string,
  options: Airtable.SelectOptions<FieldSet> = {}
): Promise<Records<FieldSet>> {
  return records(tableId).select(options).all();
}

export async function getRecord(tableId: string, id: string) {
  return records(tableId).find(id);
}

export async function createRecord(tableId: string, fields: FieldSet) {
  const created = await records(tableId).create([{ fields }], { typecast: true });
  return created[0];
}

export async function updateRecord(
  tableId: string,
  id: string,
  fields: Partial<FieldSet>
) {
  const updated = await records(tableId).update(
    [{ id, fields }],
    { typecast: true }
  );
  return updated[0];
}

// ---------------------------------------------------------------------------
// Domain helper: log a movement AND advance the game in one call.
// This is the heart of the "Quick Move" flow (replaces the Airtable automation).
// ---------------------------------------------------------------------------
export interface LogMovementInput {
  gameId: string;
  type: string; // one of MOVEMENT_TYPES
  fromSafeId?: string | null;
  toSafeId?: string | null;
  movedById?: string | null;
  receivedById?: string | null;
  notes?: string;
  returnReason?: string | null;
}

export async function logMovement(input: LogMovementInput) {
  const resultingStatus = MOVEMENT_STATUS_MAP[input.type];

  // 1) Write the custody-log entry.
  const movementFields: FieldSet = {
    [FIELDS.movement.type]: input.type,
    [FIELDS.movement.at]: new Date().toISOString(),
    [FIELDS.movement.game]: [input.gameId],
  };
  if (input.toSafeId) movementFields[FIELDS.movement.toSafe] = [input.toSafeId];
  if (input.fromSafeId) movementFields[FIELDS.movement.fromSafe] = [input.fromSafeId];
  if (input.movedById) movementFields[FIELDS.movement.movedBy] = [input.movedById];
  if (input.receivedById)
    movementFields[FIELDS.movement.receivedBy] = [input.receivedById];
  if (input.notes) movementFields[FIELDS.movement.notes] = input.notes;

  const movement = await createRecord(TABLES.movements, movementFields);

  // 2) Advance the game's status + physical location.
  const gameFields: Partial<FieldSet> = {};
  if (resultingStatus) gameFields[FIELDS.game.status] = resultingStatus;
  // On a Transport, the game is in-flight with no safe until check-in.
  if (input.type === "Transport") {
    gameFields[FIELDS.game.currentSafe] = [];
  } else if (input.toSafeId) {
    gameFields[FIELDS.game.currentSafe] = [input.toSafeId];
  }
  if (input.returnReason) gameFields[FIELDS.game.returnReason] = input.returnReason;

  await updateRecord(TABLES.games, input.gameId, gameFields);

  return movement;
}
