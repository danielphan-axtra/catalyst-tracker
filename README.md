# TSXV Catalyst Tracker

A website that tracks upcoming catalysts for companies listed on the Toronto Venture Exchange in the **Metals & Mining** sector.

## Features

- **Company pages**: Stock price/volume chart, company description, market data (price, 52w high/low, avg volume, market cap, cash, debt, enterprise value), and upcoming catalysts.
- **Upcoming catalysts**: Title, description, expected date/range, and **Importance** (paywalled: short explanation of potential share price impact).
- **Views**: Table (Title, Description, Timing, Importance) or **Gantt chart** showing time from today to each catalyst.
- **Companies list**: Sortable by Company Name, Market Cap, Next Catalyst Timing, Importance, and Subsector (e.g. copper, gold, nickel).
- **Design**: White/black base with accents `#7961A9`, `#D199C4`, `#56C4CF`. Sleek, concise layout inspired by Google Finance / Bloomberg / Grafa / Quartr.
- **Auth**: Editor login (per-company catalyst updates) and user accounts (watchlist + paid access to Importance). Auth is stubbed; integrate NextAuth with your providers and DB when ready.
- **Static pages**: Landing, About, Contact, Careers, Terms of Service, Privacy Policy.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Database**

   SQLite is used by default. Create and seed:

   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

3. **Run dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Next.js dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run lint` — ESLint
- `npm run db:push` — Push Prisma schema to DB
- `npm run db:seed` — Seed sample companies (4), price history, and catalysts
- `npm run fetch-tsxv` — Fetch TSXV extractive list (oil & mining) from Revenue Watch → writes `scripts/tsxv-companies.json`
- `npm run db:seed-tsxv` — Seed DB from `scripts/tsxv-companies.json` (run after `fetch-tsxv` for ~900 mining-related TSXV companies)

## Tech stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **Prisma** + **SQLite** (swap to PostgreSQL by changing `datasource` in `prisma/schema.prisma`)
- **Recharts** for price/volume charts
- **date-fns** for dates
- **NextAuth** (stub; add providers and session checks for editors/users and paywall)

## Full TSXV mining list (~900 companies)

The [TSX Current Market Statistics](https://www.tsx.com/en/listings/current-market-statistics) Issuer List is delivered by subscription (PDF/Excel), not as a live table. This repo uses the [Revenue Watch TSXV extractive list](https://data.revenuewatch.org/listings/tsx-venture/) (oil & mining) and filters to mining-related names by keyword (gold, silver, copper, mining, resources, etc.):

1. **Fetch the list** (writes `scripts/tsxv-companies.json`):
   ```bash
   npm run fetch-tsxv
   ```
2. **Seed the database** with those companies:
   ```bash
   npm run db:seed-tsxv
   ```

Companies get `name`, `symbol`, `marketCap` (when available), and inferred `subsector` (gold, silver, copper, nickel, etc.). Price/chart data and catalysts stay empty until you add them or connect a quote API.

**If `npm run fetch-tsxv` returns 0 companies** (e.g. the external site changed), you can import from a CSV:

1. Save your TSXV list as **`scripts/tsxv-upload.csv`** in the project folder (same folder that contains `package.json`).
2. CSV should have a header row with columns such as: **Symbol** (or Ticker), **Company Name** (or Name), and optionally **Sector** / **Market Cap**.
3. Run:
   ```bash
   npm run db:import-csv
   ```
   This upserts companies by symbol (creates or updates).

## Extending

- **Stock charts & market data**: Price history and current quote (price, 52w high/low, volume) are fetched from **Yahoo Finance** when you open a company page. TSXV symbols use the `.V` suffix (e.g. `AIS.V`); if no data is found, `.TO` (TSX) is tried. Data is cached in the DB and refreshed if older than 2 days. Run `npm install` to ensure the `yahoo-finance2` dependency is installed.
- **Live stock data**: To add more fields (e.g. balance sheet, enterprise value), wire a fundamentals API or replace/augment `PricePoint` with another source.
- **Editor dashboard**: Add `/editor` (or per-company `/editor/[companyId]`) protected by session; allow CRUD on catalysts for that company.
- **Paywall**: Check `session.user` and `user.hasPaidAccess` (or a separate subscription table) before rendering Importance in `CatalystsTable` and company list.
- **Stripe**: Add checkout for subscriptions and set `hasPaidAccess` on success.

## License

Private / All rights reserved.
