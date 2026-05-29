# Catalyst engine data standard

Every company added or refreshed in the tracker must follow this workflow.

## 1. Primary sources (required)

1. Read the issuer’s **news / RNS page** on their website (current year + prior year).
2. Cross-check dates and terms — do not rely on memory or generic templates.

## 2. Catalyst engine (required for curated companies)

Use `buildCatalystRecord()` from `scripts/lib/build-catalyst.ts`:

- **`summary`** — 1–2 sentences with specific numbers (grades, $ amounts, hole IDs, resource Moz).
- **`impactCategory` + `impactBullets`** — concise share-price drivers (shown in Impact column).
- **`analysis`** (`analysisJson`) — rich expandable content:
  - `companyContext` — how company/project history frames this catalyst
  - `sections[]` — titled blocks with paragraphs and/or bullets
  - `bullCase` / `bearCase` / `watchItems` where useful
- **Dates** — `dateStart` and optional `dateEnd` must be **today or later** (validated at seed time).

```ts
import { buildCatalystRecord, daysFromToday } from "./lib/build-catalyst";

buildCatalystRecord(companyId, {
  title: "...",
  summary: "...",
  impactCategory: "Major",
  impactBullets: ["...", "..."],
  dateStart: daysFromToday(14),
  dateEnd: daysFromToday(180),
  analysis: { version: 1, companyContext: "...", sections: [...], bullCase: "...", bearCase: "...", watchItems: [...] },
});
```

## 3. UI behaviour

- **Upcoming only**: `CatalystsSection` filters out catalysts whose window has fully ended.
- **More Details...**: every row shows expandable analysis from `analysisJson` (fallback for legacy rows).
- **Gantt**: same filter; modal shows full analysis.

## 4. Cash runway

When updating catalysts, also refresh `balanceCash` / financing fields from the same releases and note partner-funded spend (e.g. Amarc JOY) in catalyst text where it affects corporate burn.

## 5. After seeding

```bash
npx prisma db push
npx tsx scripts/seed-<company>.ts
```

Verify on the company page: all catalyst dates are in the future and **More Details...** opens with full sections.
