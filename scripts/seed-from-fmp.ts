/**
 * Clears all companies and seeds top 10 TSXV companies from FMP.
 * Uses free tier (250 calls/day):
 * - 10 companies × ~5 calls each (profile + quote + historical + balance sheet + enterprise value) = 50 calls
 * Total: ~50 calls (well within 250/day limit)
 *
 * Run: npm run db:seed-fmp
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const prisma = new PrismaClient();
const FMP_BASE = "https://financialmodelingprep.com/api/v3";
const FMP_STABLE = "https://financialmodelingprep.com/stable";

function getApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY is not set in .env");
  return key;
}

/** FMP symbol formats: TSXV (.V), TSX (.TO), raw, or :CA */
function toFmpSymbols(symbol: string): string[] {
  const base = symbol.trim().toUpperCase().replace(/\.(V|TO)$|:CA$/i, "");
  return [base, `${base}.V`, `${base}.TO`, `${base}:CA`];
}

function inferIndustry(name: string, sector: string | null): string {
  const n = name.toLowerCase();
  const s = (sector || "").toLowerCase();
  if (/\bgold\b/.test(n) || /\bgold\b/.test(s)) return "Gold";
  if (/\bsilver\b/.test(n) || /\bsilver\b/.test(s)) return "Silver";
  if (/\bcopper\b/.test(n) || /\bcopper\b/.test(s)) return "Copper";
  if (/\bnickel\b/.test(n) || /\bnickel\b/.test(s)) return "Nickel";
  if (/\buranium\b/.test(n) || /\buranium\b/.test(s)) return "Uranium";
  if (/\blithium\b/.test(n) || /\blithium\b/.test(s)) return "Lithium";
  if (/\bcobalt\b/.test(n) || /\bcobalt\b/.test(s)) return "Cobalt";
  if (/\bdiamond\b/.test(n) || /\bdiamond\b/.test(s)) return "Diamond";
  if (/\bcoal\b/.test(n) || /\bcoal\b/.test(s)) return "Coal";
  if (/\bpotash\b/.test(n) || /\bpotash\b/.test(s)) return "Potash";
  if (/\brare earth\b/.test(n) || /\brare earths\b/.test(n)) return "Rare Earth";
  if (/\bzinc\b/.test(n) || /\bzinc\b/.test(s)) return "Zinc";
  if (/\blead\b/.test(n) || /\blead\b/.test(s)) return "Lead";
  return "Mining";
}

async function main() {
  const key = getApiKey();

  console.log("Clearing all companies, catalysts, and price data...");
  await prisma.catalyst.deleteMany({});
  await prisma.pricePoint.deleteMany({});
  await prisma.company.deleteMany({});
  console.log("Cleared.");

  // Load top 10 TSXV companies list
  const listPath = path.join(process.cwd(), "scripts", "top-10-tsxv.json");
  if (!fs.existsSync(listPath)) {
    console.error(`File not found: ${listPath}`);
    console.error("Run: npx tsx scripts/fetch-top-tsxv-fmp.ts");
    process.exit(1);
  }

  const companies = JSON.parse(fs.readFileSync(listPath, "utf-8")) as Array<{
    symbol: string;
    name: string;
    marketCap: number | null;
    industry?: string | null;
  }>;

  console.log(`Seeding ${companies.length} TSXV companies from FMP...`);

  for (const c of companies) {
    const symbol = c.symbol.trim().toUpperCase().replace(/\.(V|TO)$|:CA$/i, "");
    const candidates = toFmpSymbols(c.symbol.trim().toUpperCase());

    let profile: any = null;
    let quote: any = null;
    let historical: any[] = [];
    let balanceSheet: any = null;
    let enterpriseValue: any = null;
    let workingSymbol = "";

    // Try each symbol format until one works
    for (const sym of candidates) {
      try {
        console.log(`  Fetching ${sym}...`);

        const [profileRes, quoteRes, histRes, bsRes, evRes] = await Promise.all([
          fetch(`${FMP_BASE}/profile/${sym}?apikey=${key}`),
          fetch(`${FMP_STABLE}/quote-short/${sym}?apikey=${key}`),
          fetch(`${FMP_BASE}/historical-price-full/${sym}?apikey=${key}`),
          fetch(`${FMP_BASE}/balance-sheet-statement/${sym}?period=quarter&limit=1&apikey=${key}`),
          fetch(`${FMP_BASE}/enterprise-values/${sym}?period=quarter&limit=1&apikey=${key}`),
        ]);

        if (profileRes.ok) {
          const p = await profileRes.json();
          if ((Array.isArray(p) && p.length > 0) || (!Array.isArray(p) && p.symbol)) {
            profile = Array.isArray(p) ? p[0] : p;
            workingSymbol = sym;
            break;
          }
        } else if (profileRes.status === 403) {
          // v3 deprecated, try stable API
          const stableProfile = await fetch(`${FMP_STABLE}/profile/${sym}?apikey=${key}`);
          if (stableProfile.ok) {
            const p = await stableProfile.json();
            if ((Array.isArray(p) && p.length > 0) || (!Array.isArray(p) && p.symbol)) {
              profile = Array.isArray(p) ? p[0] : p;
              workingSymbol = sym;
              break;
            }
          }
        }
      } catch (e) {
        console.warn(`    Error with ${sym}:`, e);
        continue;
      }
    }

    if (!profile) {
      console.log(`    ✗ No data found for ${c.symbol} (tried ${candidates.join(", ")}), skipping...`);
      continue;
    }

    // Fetch remaining data with working symbol
    try {
      const [quoteRes, histRes, bsRes, evRes] = await Promise.all([
        fetch(`${FMP_STABLE}/quote-short/${workingSymbol}?apikey=${key}`),
        fetch(`${FMP_BASE}/historical-price-full/${workingSymbol}?apikey=${key}`),
        fetch(`${FMP_BASE}/balance-sheet-statement/${workingSymbol}?period=quarter&limit=1&apikey=${key}`),
        fetch(`${FMP_BASE}/enterprise-values/${workingSymbol}?period=quarter&limit=1&apikey=${key}`),
      ]);

      if (quoteRes.ok) {
        const q = await quoteRes.json();
        quote = Array.isArray(q) && q.length > 0 ? q[0] : q;
      }

      if (histRes.ok) {
        const h = await histRes.json();
        historical = Array.isArray(h) ? h : (h.historical ?? []);
      }

      if (bsRes.ok) {
        const bs = await bsRes.json();
        balanceSheet = Array.isArray(bs) && bs.length > 0 ? bs[0] : null;
      }

      if (evRes.ok) {
        const ev = await evRes.json();
        enterpriseValue = Array.isArray(ev) && ev.length > 0 ? ev[0] : null;
      }
    } catch (e) {
      console.warn(`    Warning fetching additional data:`, e);
    }

    const name = profile.companyName ?? profile.name ?? c.name;
    const description = profile.description ?? null;
    const website = profile.website ?? null;
    const industry = profile.industry ?? profile.sector ?? c.industry ?? inferIndustry(name, profile.sector);
    const marketCap = profile.mktCap ?? profile.marketCap ?? c.marketCap;
    const stockPrice = quote?.price ?? quote?.close ?? null;
    const price52WeekHigh = quote?.yearHigh ?? null;
    const price52WeekLow = quote?.yearLow ?? null;
    const avgDailyVolume = quote?.volume ?? null;
    const cash = balanceSheet?.cashAndCashEquivalents ?? null;
    const debt = balanceSheet?.totalDebt ?? null;
    const ev = enterpriseValue?.enterpriseValue ?? null;

    const company = await prisma.company.create({
      data: {
        symbol: symbol.replace(/\.V$|\.TO$|:CA$/, ""),
        name,
        description: description || null,
        website: website || null,
        industry: industry || "Mining",
        stockPrice: stockPrice ? Number(stockPrice) : null,
        price52WeekHigh: price52WeekHigh ? Number(price52WeekHigh) : null,
        price52WeekLow: price52WeekLow ? Number(price52WeekLow) : null,
        avgDailyVolume: avgDailyVolume ? Number(avgDailyVolume) : null,
        marketCap: marketCap && marketCap > 0 ? Number(marketCap) : null,
        balanceCash: cash && cash > 0 ? Number(cash) : null,
        balanceDebt: debt && debt > 0 ? Number(debt) : null,
        enterpriseValue: ev && ev > 0 ? Number(ev) : null,
      },
    });

    // Add historical price data (last 90 days)
    const pricePoints = Array.isArray(historical) ? historical.slice(-90) : [];
    for (const row of pricePoints) {
      const d = new Date(String(row.date || row.Date).slice(0, 10));
      const price = Number(row.close ?? 0) || 0;
      const volume = Number(row.volume ?? 0) || 0;
      if (price > 0) {
        await prisma.pricePoint.create({
          data: {
            companyId: company.id,
            date: d,
            price,
            volume,
          },
        });
      }
    }

    console.log(`    ✓ Created: ${company.symbol} - ${name} (${pricePoints.length} price points)`);
    console.log(`      Market Cap: ${marketCap ? `$${(Number(marketCap) / 1e6).toFixed(0)}M` : "N/A"}`);
  }

  console.log(`\nDone! Seeded ${companies.length} companies from FMP.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
