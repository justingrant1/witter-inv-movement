# Witter Inventory Movement — Staff Web App

A mobile-first web app that sits on top of the **Witter Inventory Movement** Airtable
base. It gives streaming, booking, and movement staff a fast, phone-friendly way to log
custody hand-offs without touching Airtable directly — while the base stays the system
of record.

> V1 is a **custody-and-location tracker**, not an inventory system. Shopify/X42 stay the
> book of record for sales and valuation. This app only answers: _where is each game,
> what state is it in, and who moved it last?_

---

## What it does

| Screen | Purpose |
| --- | --- |
| **Move** | One-tap custody hand-off: pick a game, pick a move type, pick the destination safe. Status + location update automatically. |
| **Check-in** | The high-stakes receiving step. Records actual count + seal status, and flags the "says 400, only 300" mismatch instantly. |
| **Dashboard** | Live snapshot: games by state, by location, total value at Webster, and every open alert (over-cap safes, count mismatches, high-value discrepancies, overdue returns, compromised seals). |
| **Safes** | Live value vs. cap for every safe, with a fill bar and over-cap flag (enforces the $100k senior / $25k junior tiers). |
| **Shows** | Each show's lineup and where each game in it physically is right now. |
| **Returns** | Closes the returns black hole — lists everything in `Returned`, flags anything overdue >48h, and lets staff log it back to HQ in one tap. |
| **Log** | The full custody audit trail, newest first. |

Every action is attributed to the signed-in person (a lightweight "pick your name"
gate — no passwords in V1, matching the trust-tier model from the meeting).

---

## The movement model

A logged **Movement** drives everything. Each move `Type` maps to a resulting `Status`:

| Move type | Resulting status |
| --- | --- |
| Transport | In transit |
| Check-in | Checked in |
| Stage | Staged (master) |
| Delegate | Ready |
| Completed handoff | Completed |
| Booking pull | In booking |
| Ship | Shipping |
| Return | Returned |

When a movement is logged, the app sets the game's **Current safe** and **Status**
from the move — single entry, no double data-entry.

---

## Setup

### 1. Prerequisites
- Node.js 18+ and npm
- An Airtable Personal Access Token with `data.records:read`, `data.records:write`,
  and `schema.bases:read` scopes, granted access to the **Witter Inventory Movement** base.

### 2. Configure environment
Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

```
AIRTABLE_API_KEY=pat_xxxxxxxxxxxxxxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

The base ID is in the Airtable API URL (`https://airtable.com/appXXXXXXXXXXXXXX/...`).

### 3. Install & run

```bash
npm install
npm run dev
```

Open http://localhost:3000. To run a production build:

```bash
npm run build
npm start
```

---

## Deploy to production (Vercel)

1. Push this repo to GitHub (already done if you cloned it from there).
2. In [Vercel](https://vercel.com), **New Project → Import** this repo. Framework
   auto-detects as Next.js — no build settings to change.
3. Under **Settings → Environment Variables**, add:
   - `AIRTABLE_API_KEY` → your Personal Access Token
   - `AIRTABLE_BASE_ID` → `app7Z7jIfWJFOUfkx`
4. Deploy. Every push to `main` redeploys automatically.

The Airtable token only ever lives server-side (used inside the `/api/*` routes), so
it is never exposed to the browser.

---

## Notes / next steps

- **Auth:** V1 uses a name-picker only. For production, put it behind your SSO or add a
  simple PIN per person.
- **Auto-timestamps:** Movements use the Airtable-created time for a clean audit trail.
- **Returns watchdog:** The Returns screen flags >48h locally; the Airtable scheduled
  automation (Recipe 4) sends the daily email/Slack alert as a backstop.
- **Not in V1 (by design):** no per-spot tracking, no barcode hardware, no Whatnot/eBay
  sync, no valuation. Those belong to the V2 numismatic-ops / upload-automation project.
