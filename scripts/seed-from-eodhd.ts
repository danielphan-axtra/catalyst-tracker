/**
 * Seeds top 20 TSX + TSXV Metals & Mining companies by market cap from EODHD.
 * - Fetches symbol lists from TO (TSX) and V (TSXV)
 * - Filters to Common Stock + Metals & Mining
 * - Fetches fundamentals for all to get market cap, ranks and takes top 20
 * - For top 20: creates companies with fundamentals + EOD price/volume
 *
 * Uses EODHD_API_KEY from .env
 * Run: npm run db:seed-eodhd
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
const EODHD_BASE = "https://eodhd.com/api";
const TOP_N = 20;

function getApiKey(): string {
  const key = process.env.EODHD_API_KEY;
  if (!key) throw new Error("EODHD_API_KEY is not set in .env");
  return key;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function inferIndustry(name: string, fromFundamentals?: string): string {
  if (fromFundamentals && fromFundamentals.trim()) return fromFundamentals;
  const n = name.toLowerCase();
  if (/\bgold\b/.test(n)) return "Gold";
  if (/\bsilver\b/.test(n)) return "Silver";
  if (/\bcopper\b/.test(n)) return "Copper";
  if (/\bnickel\b/.test(n)) return "Nickel";
  if (/\buranium\b/.test(n)) return "Uranium";
  if (/\blithium\b/.test(n)) return "Lithium";
  if (/\bcobalt\b/.test(n)) return "Cobalt";
  if (/\bdiamond\b/.test(n)) return "Diamond";
  if (/\bcoal\b/.test(n)) return "Coal";
  if (/\bpotash\b/.test(n)) return "Potash";
  if (/\brare earth\b/.test(n) || /\brare earths\b/.test(n)) return "Rare Earth";
  if (/\bzinc\b/.test(n)) return "Zinc";
  if (/\blead\b/.test(n)) return "Lead";
  if (/\bmining\b|\bmetals\b|\bresources\b|\bexploration\b|\bminerals\b|\bmines\b/.test(n)) return "Mining";
  return "Mining";
}

const MINING_KEYWORDS =
  /gold|silver|copper|nickel|uranium|lithium|cobalt|diamond|coal|potash|zinc|lead|mining|mines|minerals|metals|resources|exploration/i;

function isMiningRelated(ticker: Record<string, unknown>): boolean {
  const name = String(ticker.name ?? ticker.Name ?? "").toLowerCase();
  const type = String(ticker.Type ?? ticker.type ?? "").toLowerCase();
  if (!type.includes("common") && !type.includes("stock")) return false;
  return MINING_KEYWORDS.test(name);
}

function getCode(t: Record<string, unknown>): string {
  return String(t.code ?? t.Code ?? "").trim();
}
function getName(t: Record<string, unknown>): string {
  return String(t.name ?? t.Name ?? "").trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

interface Candidate {
  code: string;
  name: string;
  eodSymbol: string;
  marketCap: number;
  fund: Record<string, unknown>;
}

async function main() {
  const key = getApiKey();
  const API_DELAY_MS = 250;

  const exchanges: { code: string; suffix: string; name: string }[] = [
    { code: "TO", suffix: ".TO", name: "TSX" },
    { code: "V", suffix: ".V", name: "TSXV" },
  ];

  const allMining: { code: string; name: string; exchange: string; eodSymbol: string }[] = [];

  for (const ex of exchanges) {
    console.log(`Fetching ${ex.name} symbol list...`);
    const url = `${EODHD_BASE}/exchange-symbol-list/${ex.code}?api_token=${encodeURIComponent(key)}&fmt=json`;
    const list = await fetchJson<Record<string, unknown>[]>(url);
    if (!Array.isArray(list)) throw new Error(`Unexpected response from EODHD for ${ex.code}`);

    const mining = list.filter(isMiningRelated);
    for (const t of mining) {
      const code = getCode(t).replace(/\.(TO|V)$/, "");
      allMining.push({
        code,
        name: getName(t) || code,
        exchange: ex.name,
        eodSymbol: `${code}${ex.suffix}`,
      });
    }
    console.log(`  ${ex.name}: ${mining.length} Metals & Mining tickers`);
    await delay(300);
  }

  const seen = new Set<string>();
  const unique = allMining.filter((m) => {
    const k = m.code.toUpperCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  console.log(`Total unique: ${unique.length}. Fetching fundamentals to rank by market cap...`);

  const candidates: Candidate[] = [];

  for (let i = 0; i < unique.length; i++) {
    const m = unique[i];
    try {
      await delay(API_DELAY_MS);
      const fundUrl = `${EODHD_BASE}/fundamentals/${m.eodSymbol}?api_token=${encodeURIComponent(key)}&fmt=json`;
      const fund = await fetchJson<Record<string, unknown>>(fundUrl).catch(() => null);
      if (!fund) continue;

      const general = (fund.General ?? fund.general ?? {}) as Record<string, unknown>;
      const highlights = (fund.Highlights ?? fund.highlights ?? {}) as Record<string, unknown>;
      const marketCap =
        general.MarketCapitalization != null
          ? Number(general.MarketCapitalization)
          : highlights.MarketCapitalization != null
            ? Number(highlights.MarketCapitalization)
            : 0;

      if (marketCap > 0) {
        candidates.push({
          code: m.code,
          name: m.name,
          eodSymbol: m.eodSymbol,
          marketCap,
          fund,
        });
      }
      if ((i + 1) % 50 === 0) console.log(`  ... ${i + 1}/${unique.length} fetched`);
    } catch {
      // skip failed fetches
    }
  }

  candidates.sort((a, b) => b.marketCap - a.marketCap);
  const top20 = candidates.slice(0, TOP_N);
  console.log(`Top ${TOP_N} by market cap:`);
  top20.forEach((c, i) => console.log(`  ${i + 1}. ${c.eodSymbol} - ${c.name} ($${(c.marketCap / 1e9).toFixed(2)}B)`));

  console.log("\nClearing DB and seeding top 20...");
  await prisma.watchlistItem.deleteMany({});
  await prisma.companyEditor.deleteMany({});
  await prisma.catalyst.deleteMany({});
  await prisma.pricePoint.deleteMany({});
  await prisma.company.deleteMany({});

  for (let i = 0; i < top20.length; i++) {
    const c = top20[i];
    const fund = c.fund;
    const general = (fund.General ?? fund.general ?? {}) as Record<string, unknown>;
    const balanceSheet = (fund.Balance_Sheet ?? fund.balance_sheet ?? fund?.["Balance Sheet"]) as
      | Record<string, unknown>[]
      | Record<string, unknown>
      | undefined;
    const valuation = (fund.Valuation ?? fund.valuation ?? {}) as Record<string, unknown>;
    const technicals = (fund.Technicals ?? fund.technicals ?? {}) as Record<string, unknown>;
    const highlights = (fund.Highlights ?? fund.highlights ?? {}) as Record<string, unknown>;

    const fName = (general.Name ?? general.name ?? c.name) as string;
    const website = (general.Website ?? general.WebURL ?? general.webURL ?? general.webUrl) as string | null;
    const description = (general.Description ?? general.description) as string | null;
    const industryFromApi = (general.Industry ?? general.industry) as string | undefined;
    const industry = inferIndustry(fName, industryFromApi);

    const latestBS = Array.isArray(balanceSheet) && balanceSheet.length > 0
      ? (balanceSheet[balanceSheet.length - 1] as Record<string, unknown>)
      : (balanceSheet as Record<string, unknown> | undefined);

    const cash = latestBS?.CashAndCashEquivalents != null
      ? Number(latestBS.CashAndCashEquivalents)
      : latestBS?.cashAndCashEquivalents != null ? Number(latestBS.cashAndCashEquivalents) : null;
    const debt = latestBS?.TotalDebt != null
      ? Number(latestBS.TotalDebt)
      : latestBS?.totalDebt != null ? Number(latestBS.totalDebt) : null;
    const enterpriseValue = valuation?.EnterpriseValue != null
      ? Number(valuation.EnterpriseValue)
      : valuation?.enterpriseValue != null ? Number(valuation.enterpriseValue) : null;
    const price52High = technicals?.["52WeekHigh"] ?? technicals?.["52weekHigh"] ?? null;
    const price52Low = technicals?.["52WeekLow"] ?? technicals?.["52weekLow"] ?? null;
    const peRatio =
      highlights?.PERatio != null
        ? Number(highlights.PERatio)
        : highlights?.peRatio != null
          ? Number(highlights.peRatio)
          : null;
    const dividendYield =
      highlights?.DividendYield != null
        ? Number(highlights.DividendYield)
        : highlights?.dividendYield != null
          ? Number(highlights.dividendYield)
          : null;

    await delay(API_DELAY_MS);
    const toDate = new Date();
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 400);
    const eodUrl = `${EODHD_BASE}/eod/${c.eodSymbol}?api_token=${encodeURIComponent(key)}&fmt=json&from=${fromDate.toISOString().slice(0, 10)}&to=${toDate.toISOString().slice(0, 10)}`;
    const eodData = await fetchJson<Record<string, unknown>[] | Record<string, unknown>>(eodUrl).catch(() => null);
    const prices = Array.isArray(eodData) ? eodData : eodData?.date ? [eodData] : [];

    const company = await prisma.company.create({
      data: {
        symbol: c.eodSymbol,
        name: fName,
        description: description || null,
        website: website || null,
        industry: industry || "Mining",
        marketCap: c.marketCap,
        balanceCash: cash != null && !Number.isNaN(cash) ? cash : null,
        balanceDebt: debt != null && !Number.isNaN(debt) ? debt : null,
        enterpriseValue: enterpriseValue && enterpriseValue > 0 ? enterpriseValue : null,
        price52WeekHigh: price52High != null ? Number(price52High) : null,
        price52WeekLow: price52Low != null ? Number(price52Low) : null,
        peRatio: peRatio != null && !Number.isNaN(peRatio) && peRatio > 0 ? peRatio : null,
        dividendYield:
          dividendYield != null && !Number.isNaN(dividendYield) && dividendYield >= 0 ? dividendYield : null,
      },
    });

    let price52HighFromData: number | null = null;
    let price52LowFromData: number | null = null;
    const last252 = prices.slice(-252);

    for (const row of last252.length > 0 ? last252 : prices.slice(-90)) {
      const d = new Date(String(row.date ?? row.Date ?? "").slice(0, 10));
      const price = Number(row.close ?? row.adjusted_close ?? 0) || 0;
      const volume = Number(row.volume ?? 0) || 0;
      if (price > 0) {
        if (price52HighFromData == null || price > price52HighFromData) price52HighFromData = price;
        if (price52LowFromData == null || price < price52LowFromData) price52LowFromData = price;
      }
      await prisma.pricePoint.create({
        data: { companyId: company.id, date: d, price, volume },
      });
    }

    const lastPrice = prices.length > 0 ? (prices[prices.length - 1] as Record<string, unknown>) : null;
    const stockPrice = lastPrice && Number(lastPrice.close) > 0 ? Number(lastPrice.close) : null;
    const avgVolume = lastPrice?.volume ? Number(lastPrice.volume) : null;

    const updateData: Record<string, unknown> = {};
    if (stockPrice != null) updateData.stockPrice = stockPrice;
    if (avgVolume != null) updateData.avgDailyVolume = avgVolume;
    if (price52HighFromData != null && company.price52WeekHigh == null) updateData.price52WeekHigh = price52HighFromData;
    if (price52LowFromData != null && company.price52WeekLow == null) updateData.price52WeekLow = price52LowFromData;

    if (Object.keys(updateData).length > 0) {
      await prisma.company.update({
        where: { id: company.id },
        data: updateData as Parameters<typeof prisma.company.update>[0]["data"],
      });
    }

    console.log(`  [${i + 1}/${TOP_N}] ${company.symbol} - ${fName} (${prices.length} price points)`);
  }

  const total = await prisma.company.count();
  console.log(`\nDone. Seeded ${total} top TSX + TSXV Metals & Mining companies by market cap.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
