// Client-safe copy of the movement vocabulary. Mirrors MOVEMENT_STATUS_MAP in
// airtable.ts (which is server-only and must not be imported by the browser).
export const MOVEMENT_TYPES = [
  "Transport",
  "Check-in",
  "Stage",
  "Delegate",
  "Completed handoff",
  "Booking pull",
  "Ship",
  "Return",
  "Arrive HQ",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];
