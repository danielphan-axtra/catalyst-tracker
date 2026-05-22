/**
 * Populates company data (name, website, description) and stock prices from Alpha Vantage.
 * For each company in the database, fetches OVERVIEW (name, website, description) and
 * TIME_SERIES_DAILY (historical prices).
 *
 * Run: npm run db:populate-alphavantage
 * Optional: npm run db:populate-alphavantage -- --limit=100
 * Requires ALPHA_VANTAGE_API_KEY in .env.
 *
 * Note: Alpha Vantage free tier has 5 API calls per minute limit.
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

/** Fetch company overview (name, website, description). */
async function fetchCompanyOverview(symbol: string): Promise<{
  name: string | null;
  description: string | null;
  website: string | null;
} | null> {
  const key = getApiKey();
  const candidates = [toAlphaVantageSymbol(symbol), symbol.trim().toUpperCase()];

  for (const sym of candidates) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data["Error Message"] || data["Note"]) {
        if (data["Note"]?.includes("API call frequency")) {
          console.log(`  Rate limit hit for ${sym}, waiting 60s...`);
          await sleep(60000);
          continue;
        }
        continue;
      }
      if (!data["Name"] && !data["Website"]) continue;
      return {
        name: data["Name"] ?? null,
        description: data["Description"] ?? null,
        website: data["Website"] ?? null,
      };
    } catch (e) {
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
      if (data["Error Message"] || data["Note"]) {
        if (data["Note"]?.includes("API call frequency")) {
          console.log(`  Rate limit hit for ${sym}, waiting 60s...`);
          await sleep(60000);
          continue;
        }
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

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, symbol: true, name: true, website: true, description: true },
    orderBy: { name: "asc" },
    take: LIMIT,
  });

  console.log(`Populating ${companies.length} companies from Alpha Vantage...`);
  console.log(`Note: Free tier limit is 5 calls/minute. This will take ~${Math.ceil(companies.length / 5)} minutes.`);
  console.log("");

  let updatedOverview = 0;
  let updatedPrices = 0;
  let notFound = 0;
  let rateLimited = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${companies.length} ...`);

    await sleep(13000); // ~5 calls per minute = 12s between calls, add 1s buffer

    const overview = await fetchCompanyOverview(c.symbol);
    if (overview) {
      const updates: { name?: string; website?: string | null; description?: string | null } = {};
      if (overview.name && overview.name !== c.name) updates.name = overview.name;
      if (overview.website && overview.website !== c.website) updates.website = overview.website;
      if (overview.description && overview.description !== c.description) updates.description = overview.description;
      if (Object.keys(updates).length > 0) {
        await prisma.company.update({ where: { id: c.id }, data: updates });
        updatedOverview++;
      }
    } else {
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
      updatedPrices++;
    }
  }

  console.log(`Done. Overview updated: ${updatedOverview}, prices updated: ${updatedPrices}, not found: ${notFound}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
