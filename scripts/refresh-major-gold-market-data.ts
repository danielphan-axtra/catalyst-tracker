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

function toFmpSymbols(symbol: string): string[] {
  const base = symbol.trim().toUpperCase().replace(/\.(V|TO)$|:CA$/i, "");
  return [base, `${base}.TO`, `${base}.V`, `${base}:CA`];
}

async function fetchFirstJson(urls: string[]): Promise<any | null> {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = await res.json();
      if (json == null) continue;
      if (Array.isArray(json)) {
        if (json.length > 0) return json[0];
      } else {
        return json;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function main() {
  const key = getApiKey();
  const symbols = ["PRU", "IAG.TO", "BTO.TO", "AU", "GFI", "RSG"];
  const companies = await prisma.company.findMany({
    where: { symbol: { in: symbols } },
    select: { id: true, symbol: true, name: true },
  });

  if (companies.length === 0) {
    console.log("No matching companies found for market data refresh.");
    return;
  }

  for (const c of companies) {
    const candidates = toFmpSymbols(c.symbol);
    let profile: any = null;
    let quote: any = null;
    let balanceSheet: any = null;
    let enterpriseValue: any = null;
    let historical: any[] = [];
    let chosen = "";

    for (const sym of candidates) {
      const p = await fetchFirstJson([
        `${FMP_BASE}/profile/${sym}?apikey=${key}`,
        `${FMP_STABLE}/profile/${sym}?apikey=${key}`,
      ]);
      if (p && (p.symbol || p.companyName || p.name)) {
        profile = p;
        chosen = sym;
        break;
      }
    }

    if (!chosen) {
      console.log(`Skipping ${c.symbol}: no FMP symbol matched (${candidates.join(", ")})`);
      continue;
    }

    quote = await fetchFirstJson([`${FMP_STABLE}/quote-short/${chosen}?apikey=${key}`]);
    const histRes = await fetch(`${FMP_BASE}/historical-price-full/${chosen}?apikey=${key}`).then((r) =>
      r.ok ? r.json() : null
    );
    historical = Array.isArray(histRes) ? histRes : (histRes?.historical ?? []);
    balanceSheet = await fetchFirstJson([
      `${FMP_BASE}/balance-sheet-statement/${chosen}?period=quarter&limit=1&apikey=${key}`,
    ]);
    enterpriseValue = await fetchFirstJson([
      `${FMP_BASE}/enterprise-values/${chosen}?period=quarter&limit=1&apikey=${key}`,
    ]);

    const stockPrice = quote?.price ?? quote?.close ?? null;
    const price52WeekHigh = profile?.yearHigh ?? quote?.yearHigh ?? null;
    const price52WeekLow = profile?.yearLow ?? quote?.yearLow ?? null;
    const avgDailyVolume = quote?.volume ?? null;
    const marketCap = profile?.mktCap ?? profile?.marketCap ?? null;
    const balanceCash = balanceSheet?.cashAndCashEquivalents ?? null;
    const balanceDebt = balanceSheet?.totalDebt ?? null;
    const enterpriseVal = enterpriseValue?.enterpriseValue ?? null;
    const peRatio = profile?.pe ?? profile?.peRatio ?? null;
    const dividendYield = profile?.lastDiv != null && stockPrice ? Number(profile.lastDiv) / Number(stockPrice) : null;

    await prisma.company.update({
      where: { id: c.id },
      data: {
        name: profile?.companyName ?? profile?.name ?? c.name,
        website: profile?.website ?? undefined,
        description: profile?.description ?? undefined,
        stockPrice: stockPrice ? Number(stockPrice) : undefined,
        price52WeekHigh: price52WeekHigh ? Number(price52WeekHigh) : undefined,
        price52WeekLow: price52WeekLow ? Number(price52WeekLow) : undefined,
        avgDailyVolume: avgDailyVolume ? Number(avgDailyVolume) : undefined,
        marketCap: marketCap ? Number(marketCap) : undefined,
        balanceCash: balanceCash ? Number(balanceCash) : undefined,
        balanceDebt: balanceDebt ? Number(balanceDebt) : undefined,
        enterpriseValue: enterpriseVal ? Number(enterpriseVal) : undefined,
        peRatio: peRatio ? Number(peRatio) : undefined,
        dividendYield: dividendYield && Number.isFinite(dividendYield) ? Number(dividendYield) : undefined,
      },
    });

    for (const row of historical.slice(-90)) {
      const d = new Date(String(row.date).slice(0, 10));
      const price = Number(row.close ?? 0) || 0;
      const volume = Number(row.volume ?? 0) || 0;
      if (price <= 0) continue;
      await prisma.pricePoint.upsert({
        where: { companyId_date: { companyId: c.id, date: d } },
        update: { price, volume },
        create: { companyId: c.id, date: d, price, volume },
      });
    }

    console.log(`Updated ${c.symbol} using ${chosen}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

