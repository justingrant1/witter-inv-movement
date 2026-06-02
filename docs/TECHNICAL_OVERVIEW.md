# Witter Inventory Movement — Technical Overview

**Audience:** CEO / CTO / Senior Engineering
**Status:** V1 (interim custody-and-location tracker for the Webster St. streaming launch)
**Last updated:** June 2026

---

## 1. What this is (and deliberately is not)

This system answers exactly one question, in real time:

> **Where is each game right now, what state is it in, and who moved it last?**

It is a **chain-of-custody tracker** — a digital ledger that mirrors the physical
flow of sealed coin "games" as they travel from the Lombard vault, through the
Webster streaming facility, to booking and shipping, and back.

**It is NOT:**

- A system of record for **sales or valuation** — that stays in **Shopify POS**.
- An inventory/SKU master — that's **X42** (and Shopify).
- A per-coin/per-spot tracker — the **unit is the game** (a sealed box/show), not the individual coin. Counts are captured as expected-vs-actual integers, not 500 child records.
- A custom WMS. This is intentionally an off-the-shelf data layer (Airtable) with a thin custom UI on top.

The design philosophy from the planning meetings: **V1 should stay a custody-and-location tracker, not a parallel inventory system.** Don't let scope creep turn it into a WMS. V2 (fall) layers in the Numismatic Ops inventory automation and the Shopify/eBay/Whatnot upload pipeline — separate project.

---

## 2. Architecture

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐     REST     ┌─────────────┐
│  Staff browser  │ ◄───────────► │  Next.js app (Vercel)│ ◄─────────► │  Airtable   │
│  (phone/tablet) │   JSON API     │  - App Router        │  API key    │  (base)     │
│  PWA-style UI   │                │  - /api/* routes     │ server-only │  5 tables   │
└─────────────────┘                └──────────────────────┘             └─────────────┘
```

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind. Mobile-first — staff use it on phones on the floor.
- **Backend:** Next.js API routes (serverless). All Airtable access is **server-side only** — the Airtable API key never reaches the browser.
- **Data layer:** Airtable base `Witter Inventory Movement` (base ID `app7Z7jIfWJFOUfkx`).
- **Hosting:** Vercel (or any Node host). Repo: `github.com/justingrant1/witter-inv-movement`.

### Key architectural decisions

| Decision | Rationale |
|---|---|
| Airtable as the DB | Off-the-shelf, fast to stand up, non-engineers can read/edit it directly, native audit views. The meeting explicitly warned against building a custom WMS for V1. |
| Server-only Airtable client (`src/lib/airtable.ts`) | The API key is a write-capable secret. It must never ship to the client. Every read/write goes through `/api/*`. |
| **Field IDs over field names** | `TABLES`/`FIELDS` maps in `airtable.ts` reference Airtable table/field IDs, decoupling code from display-name changes in the UI. |
| Single-entry custody log | Logging one **Movement** advances the **Game** (status + location) in the same write. The mover enters data once; state derives. |
| Status is the abstraction, Safe is the physical pointer | One `Status` field (the state machine) + one `Current safe` link. We never duplicate "which streamer / which shipping bucket" into status — the safe link carries that. |

---

## 3. Data model (5 core tables)

```
People ──< Movements >── Games ──> Safes
  │                        │  │
  └──< Shows >─────────────┘  └──> Cases (transport)
```

### `Games` — one record per sealed game (the core table)
The unit of tracking. Carries the lifecycle `Status`, `Current safe` link, value, and
the expected/actual count reconciliation.

Key fields: `Game #` (primary), `Title`, `Status`, `Item type`, `Retail value`,
`Listed value` (north-star), `Expected count`, `Actual count`, `Check verified`,
`Count check` (formula → flags `⚠ MISMATCH`), `High-value discrepancy`,
`Seal ID`, `Seal status`, `Return reason`, `Label verified`, `Sold count`,
`Unsold count`, `Tracking #`, `Ship bucket`, `Current safe`, `Show`, `Streamer`, `Returned at`, `Case`.

### `Safes` — one record per safe/cabinet (the physical states)
Lombard vault, Master 1–2, Senior safe, Junior cabinets, Auction safe(s), Booking
safe, the three Shipping buckets.

Key fields: `Safe name`, `Type`, `Location` (Lombard / Webster ground / Webster
upstairs), `Who can access`, `Value cap`, plus rollups `Current value`,
`Current count`, and the `Over cap?` formula. The **value-cap rollup is the live
control** that enforces the $100k senior / $25k junior tiering and watches the
booking-safe giveaway "tip jar."

### `Movements` — the custody log (one record per hand-off)
The audit trail. Every coin's full chain of custody reconstructs from here.

Key fields: `Game`, `From safe`, `To safe`, `Moved by`, `Received by`, `At`
(timestamp), `Type`, `Resulting status` (formula), `Verified`, `Notes`, `Photo`.

### `Shows` — one record per stream event
Drives show-by-show delegation. `Show ID`, `Date / start`, `Platform`
(Whatnot / eBay / TikTok), `Streamer`, `Games` (the lineup), `Status`.

### `People` — roster + access tiers
`Name`, `Role` (Senior streamer / Junior streamer / Mover / Booking / NumOps /
Coordinator), `Access tier`, `Value cap`, `Front-door key` (the 6am access problem).

### `Cases` — transport containers (Lombard→Webster)
Numbered locking travel cases. Logged at 4 stages: packed → loaded → received →
unpacked. `Case #`, `Status`, the four timestamps, `2-person transport`,
`Camera in vehicle`, `Packed by`, `Driver`, `Received by`, `Shows`, `Games`.

---

## 4. The state machine

A game is always in exactly one `Status`. Movement `Type` → resulting `Status`
is the central mapping (mirrored in code as `MOVEMENT_STATUS_MAP` and in Airtable
as the `Resulting status` formula):

| Movement Type | → Resulting Status | Physical meaning |
|---|---|---|
| Transport | In transit | Lombard → Webster, no safe yet |
| Check-in | Checked in | Received & verified at Webster master safe |
| Stage | Staged (master) | Held in master, ready to delegate |
| Delegate | Ready | In a streamer's room safe, assigned to a show |
| Completed handoff | Completed | Show wrapped, dropped for booking |
| Booking pull | In booking | Booking has custody |
| Ship | Shipping | In a shipping bucket |
| Return | Returned | Unsold/leftover, pending route back |
| Arrive HQ | At HQ | Back at Lombard, loop closed |

This single source of truth lives in **two places that must stay in sync**:
`src/lib/airtable.ts` (`MOVEMENT_STATUS_MAP`) and `src/lib/movementTypes.ts`
(client-safe copy). If you add a state, update both.

---

## 5. The "single-entry" flow (most important code path)

`POST /api/move` → `logMovement()` in `src/lib/airtable.ts`:

1. Writes one **Movement** record (the custody-log entry).
2. In the **same operation**, updates the **Game**: sets `Status` from the move
   type, sets `Current safe` (cleared on Transport since the game is in-flight),
   and persists any context fields the step captured.

The UI (`src/app/page.tsx`) is **context-aware**: each movement type renders only
the fields relevant to that step, and the destination-safe dropdown auto-filters
to the safes that fit (e.g. Check-in → master safes only; Delegate → senior/junior/
room safes). Per-type fields reset on type change so stale values never leak.

Context fields captured per step:
- **Transport** → expected coin count
- **Check-in** → actual count (live mismatch warning) + seal status (escalation banner if compromised)
- **Delegate** → streamer + show
- **Completed handoff** → label-verified checkbox, sold/unsold counts
- **Ship** → ship bucket + tracking #
- **Return** → reason (routes unsold→HQ vs. leftover→auction safe)
- **Arrive HQ / Booking pull** → received-by confirmation

---

## 6. Built-in controls / watchdogs

These are the auditable guardrails the leadership team asked for:

1. **Count mismatch** — `Count check` formula on Games flags `⚠ MISMATCH` the
   instant Actual ≠ Expected. This is the fast catch for the "says 400, only 300
   in the box" error that was Seth's biggest check-in concern.
2. **High-value discrepancy** — surfaces mismatches on high-value games for
   priority escalation.
3. **Over-cap** — `Over cap?` formula + the value-cap rollups flag any safe over
   its limit (enforces senior $100k / junior $25k tiering and the giveaway tip-jar).
4. **Seal compromised** — Check-in flags a broken seal for photograph + escalation.
5. **Returns overdue** — a game sitting in `Returned` with no `Arrive HQ` movement
   after a threshold surfaces on the Returns view. This closes the **returns
   black hole** — the leg most likely to lose inventory, which currently has no
   process at all.

---

## 7. Repo map

```
src/
  app/
    page.tsx              # Home: the context-aware "Move a game" screen
    checkin/page.tsx      # Receiving / check-in flow
    dashboard/page.tsx    # Status + location rollups, alerts
    safes/page.tsx        # Per-safe contents & value-cap monitor
    shows/page.tsx        # Tonight's lineups
    log/page.tsx          # Movement audit trail
    returns/page.tsx      # Returns-overdue watchdog
    api/
      move/route.ts       # POST a movement → advances the game
      checkin/route.ts    # Check-in write path
      bootstrap/route.ts  # Loads roster/safes/games/shows for the forms
      dashboard/route.ts  # Aggregations + alerts
      movements/route.ts  # Audit-log feed
  lib/
    airtable.ts           # SERVER-ONLY Airtable client + logMovement()
    types.ts              # Client DTOs (we never send raw Airtable records)
    movementTypes.ts      # Client-safe movement vocabulary
    serialize.ts / data.ts / format.ts
  components/             # UI primitives, NavBar, UserProvider/Gate, GamePicker
```

---

## 8. Setup / deploy

```bash
npm install
cp .env.local.example .env.local   # add AIRTABLE_API_KEY (and optionally AIRTABLE_BASE_ID)
npm run dev                         # local dev at http://localhost:3000
npm run build                       # production build (type-checked)
```

Environment:
- `AIRTABLE_API_KEY` — write-capable token, **server-side secret**. Set in Vercel project env, never commit.
- `AIRTABLE_BASE_ID` — defaults to the live base; override per environment.

Deploy: push to `main` → Vercel auto-builds. The build is fully type-checked
(`npm run build` runs `tsc` validation across all routes).

---

## 9. Known limitations & V2 roadmap

**V1 deliberately omits** (to stay off the custom-build path):
- No per-spot tracking, no barcode hardware, no live Whatnot/eBay sync.
- No custom auth — staff identify via a lightweight user picker (`UserProvider`). Acceptable for an internal, trusted-floor tool; **harden before any external exposure**.
- Movement timestamps are app-set; consider an Airtable created-time field for a tamper-resistant audit stamp.

**V2 (fall) candidates:**
- Numismatic Ops inventory system integration → shrink check-in verification from ~2.5 hrs/week to ~15 min.
- Automated show upload pipeline (eBay APIs / Whatnot batch) — the meeting flagged eBay's API as the high-value target; Whatnot only batches 10 shows at a time.
- Shopify POS reconciliation hooks.
- Real auth + role-based access matching the People access tiers.
- Camera/transport metadata capture (open SOP item).

**Open SOP items still to resolve** (carried from the planning meetings): sealing/
packaging spec, cameras in transport/facility, auction-safe scope, the formal
returns process, and the coordinator/"deputized" role definition.
