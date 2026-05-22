/**
 * Refreshes all TSXV mining company data from Alpha Vantage:
 * - Company name, website, description (from OVERVIEW)
 * - Historical stock prices (from TIME_SERIES_DAILY)
 * - Current quote data (from GLOBAL_QUOTE)
 *
 * Run: npm run db:refresh-alphavantage
 * Optional: npm run db:refresh-alphavantage -- --limit=100
 * Optional: npm run db:refresh-alphavantage -- --clear-first  (delete all companies first)
 *
 * Requires ALPHA_VANTAGE_API_KEY in .env.
 * Free tier: 5 calls/minute. For 1000 companies (~3000 calls) = ~10 hours.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const prisma = new PrismaClient();
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1] ?? limitArg.split(" ")[1] ?? "0", 10) : undefined;
const CLEAR_FIRST = process.argv.includes("--clear-first");

function getApiKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not set in .env");
  return key;
}

function toAlphaVantageSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.endsWith(".V") || s.endsWith(".TO")) return s.replace(".TO", ".V");
  return `${s}.V`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Fetch company overview (name, website, description, sector). */
async function fetchOverview(symbol: string): Promise<{
  name: string | null;
  website: string | null;
  description: string | null;
  sector: string | null;
} | null> {
  const key = getApiKey();
  const candidates = [toAlphaVantageSymbol(symbol), symbol.trim().toUpperCase()];

  for (const sym of candidates) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data["Error Message"]) {
        console.log(`    Error for ${sym}: ${data["Error Message"]}`);
        continue;
      }
      if (data["Note"]?.includes("API call frequency")) {
        console.log(`    Rate limit hit for ${sym}, waiting 60s...`);
        await sleep(60000);
        continue;
      }
      if (!data["Name"] && !data["Website"]) continue;
      return {
        name: data["Name"] ?? null,
        website: data["Website"] ?? null,
        description: data["Description"] ?? null,
        sector: data["Sector"] ?? null,
      };
    } catch (e: any) {
      continue;
    }
  }
  return null;
}

/** Fetch historical prices (last ~90 days). */
async function fetchHistoricalPrices(symbol: string): Promise<{ date: string; price: number; volume: number }[]> {
  const key = getApiKey();
  const candidates = [toAlphaVantageSymbol(symbol), symbol.trim().toUpperCase()];

  for (const sym of candidates) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}&outputsize=compact`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data["Error Message"]) continue;
      if (data["Note"]?.includes("API call frequency")) {
        console.log(`    Rate limit hit for ${sym}, waiting 60s...`);
        await sleep(60000);
        continue;
      }
      const series = data["Time Series (Daily)"];
      if (!series || typeof series !== "object") continue;
      const entries = Object.entries(series).slice(0, 90);
      return entries.map(([date, values]: [string, any]) => ({
        date: date.slice(0, 10),
        price: Number(values["4. close"] ?? values["Close"] ?? 0) || 0,
        volume: Number(values["5. volume"] ?? values["Volume"] ?? 0) || 0,
      }));
    } catch {
      continue;
    }
  }
  return [];
}

/** Fetch current quote. */
async function fetchQuote(symbol: string): Promise<{
  price: number;
  high52: number | null;
  low52: number | null;
  volume: number | null;
} | null> {
  const key = getApiKey();
  const candidates = [toAlphaVantageSymbol(symbol), symbol.trim().toUpperCase()];

  for (const sym of candidates) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data["Error Message"]) continue;
      if (data["Note"]?.includes("API call frequency")) {
        console.log(`    Rate limit hit for ${sym}, waiting 60s...`);
        await sleep(60000);
        continue;
      }
      const q = data["Global Quote"];
      if (!q) continue;
      const price = Number(q["05. price"] ?? q["Price"] ?? 0) || 0;
      const high52 = q["52WeekHigh"] != null ? Number(q["52WeekHigh"]) : null;
      const low52 = q["52WeekLow"] != null ? Number(q["52WeekLow"]) : null;
      const volume = q["06. volume"] != null ? Number(q["06. volume"]) : null;
      return { price, high52, low52, volume };
    } catch {
      continue;
    }
  }
  return null;
}

/** Infer subsector (primary metal) from company name or sector. */
function inferSubsector(name: string, sector: string | null): string {
  const n = name.toLowerCase();
  if (/\bgold\b/.test(n)) return "gold";
  if (/\bsilver\b/.test(n)) return "silver";
  if (/\bcopper\b/.test(n)) return "copper";
  if (/\bnickel\b/.test(n)) return "nickel";
  if (/\buranium\b/.test(n)) return "uranium";
  if (/\blithium\b/.test(n)) return "lithium";
  if (/\bcobalt\b/.test(n)) return "cobalt";
  if (/\bdiamond\b/.test(n)) return "diamond";
  if (/\bcoal\b/.test(n)) return "coal";
  if (/\bpotash\b/.test(n)) return "potash";
  if (/\brare earth\b/.test(n) || /\brare earths\b/.test(n)) return "rare earth";
  if (/\bzinc\b/.test(n)) return "zinc";
  if (/\blead\b/.test(n)) return "lead";
  if (/\bmolybdenum\b/.test(n) || /\bmoly\b/.test(n)) return "molybdenum";
  if (/\bvanadium\b/.test(n)) return "vanadium";
  if (sector && sector.toLowerCase().includes("mining")) return "mining";
  if (/\bmining\b/.test(n) || /\bmines\b/.test(n) || /\bminerals\b/.test(n) || /\bmetals\b/.test(n) || /\bresources\b/.test(n) || /\bexploration\b/.test(n)) return "mining";
  return "mining";
}

async function main() {
  if (CLEAR_FIRST) {
    console.log("Clearing all existing companies, catalysts, and price data...");
    await prisma.catalyst.deleteMany({});
    await prisma.pricePoint.deleteMany({});
    await prisma.company.deleteMany({});
    console.log("Cleared.");
  }

  const companies = await prisma.company.findMany({
    select: { id: true, symbol: true, name: true },
    orderBy: { symbol: "asc" },
    take: LIMIT,
  });

  if (companies.length === 0) {
    console.error("No companies found. Run db:seed-tsxv or db:import-excel first to create companies.");
    process.exit(1);
  }

  console.log(`Refreshing ${companies.length} companies from Alpha Vantage...`);
  console.log(`Free tier: 5 calls/minute. ~${Math.ceil((companies.length * 3) / 5)} minutes total.`);
  console.log("");

  let updated = 0;
  let overviewFound = 0;
  let pricesFound = 0;
  let quoteFound = 0;
  let notFound = 0;
  let errors = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    console.log(`[${i + 1}/${companies.length}] ${c.symbol} - ${c.name}`);

    await sleep(13000); // ~5 calls/minute = 12s + 1s buffer

    const overview = await fetchOverview(c.symbol);
    if (overview) {
      const subsector = inferSubsector(overview.name ?? c.name, overview.sector);
      await prisma.company.update({
        where: { id: c.id },
        data: {
          name: overview.name ?? c.name,
          website: overview.website ?? undefined,
          description: overview.description ?? undefined,
          subsector,
        },
      });
      overviewFound++;
      console.log(`  ✓ Overview: ${overview.name ?? c.name}${overview.website ? ` | ${overview.website}` : ""}`);
    } else {
      console.log(`  ✗ Overview: not found`);
      notFound++;
    }

    await sleep(13000);
    const prices = await fetchHistoricalPrices(c.symbol);
    if (prices.length > 0) {
      for (const p of prices) {
        const d = new Date(p.date);
        await prisma.pricePoint.upsert({
          where: { companyId_date: { companyId: c.id, date: d } },
          update: { price: p.price, volume: p.volume },
          create: { companyId: c.id, date: d, price: p.price, volume: p.volume },
        });
      }
      pricesFound++;
      console.log(`  ✓ Prices: ${prices.length} days`);
    } else {
      console.log(`  ✗ Prices: not found`);
    }

    await sleep(13000);
    const quote = await fetchQuote(c.symbol);
    if (quote && quote.price > 0) {
      await prisma.company.update({
        where: { id: c.id },
        data: {
          stockPrice: quote.price,
          price52WeekHigh: quote.high52 ?? undefined,
          price52WeekLow: quote.low52 ?? undefined,
          avgDailyVolume: quote.volume ?? undefined,
        },
      });
      quoteFound++;
      console.log(`  ✓ Quote: $${quote.price.toFixed(2)}`);
    } else {
      console.log(`  ✗ Quote: not found`);
    }

    if (overview || prices.length > 0 || quote) updated++;
    console.log("");
  }

  console.log(`Done. Updated: ${updated}/${companies.length}`);
  console.log(`  Overview: ${overviewFound}, Prices: ${pricesFound}, Quote: ${quoteFound}, Not found: ${notFound}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
