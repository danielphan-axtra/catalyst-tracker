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
const BASE = "https://www.alphavantage.co/query";

function getApiKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not set in .env");
  return key;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function safeCall(url: string) {
  const data = await fetchJson(url);
  if (data?.Note && String(data.Note).includes("API call frequency")) {
    await sleep(65000);
    return fetchJson(url);
  }
  return data;
}

async function main() {
  const key = getApiKey();

  const targets: Array<{ dbSymbol: string; avSymbol: string }> = [
    { dbSymbol: "PRU", avSymbol: "PRU.AX" },
    { dbSymbol: "IAG.TO", avSymbol: "IAG" },
    { dbSymbol: "BTO.TO", avSymbol: "BTG" },
    { dbSymbol: "AU", avSymbol: "AU" },
    { dbSymbol: "GFI", avSymbol: "GFI" },
    { dbSymbol: "RSG", avSymbol: "RSG.AX" },
  ];

  for (const t of targets) {
    const company = await prisma.company.findUnique({ where: { symbol: t.dbSymbol } });
    if (!company) {
      console.log(`Skipping ${t.dbSymbol}: not found in DB`);
      continue;
    }

    const overviewUrl = `${BASE}?function=OVERVIEW&symbol=${encodeURIComponent(t.avSymbol)}&apikey=${encodeURIComponent(key)}`;
    const quoteUrl = `${BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(t.avSymbol)}&apikey=${encodeURIComponent(key)}`;
    const dailyUrl = `${BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(t.avSymbol)}&outputsize=compact&apikey=${encodeURIComponent(key)}`;

    const overview = await safeCall(overviewUrl);
    await sleep(13000);
    const quoteData = await safeCall(quoteUrl);
    await sleep(13000);
    const daily = await safeCall(dailyUrl);
    await sleep(13000);

    const q = quoteData?.["Global Quote"] ?? {};
    const series = daily?.["Time Series (Daily)"] ?? {};
    const entries = Object.entries(series).slice(0, 90) as Array<[string, any]>;

    const stockPrice = Number(q["05. price"] ?? 0) || null;
    const volume = Number(q["06. volume"] ?? 0) || null;
    const marketCap = Number(overview?.MarketCapitalization ?? 0) || null;
    const peRatio = Number(overview?.PERatio ?? 0) || null;
    const dividendYieldRaw = Number(overview?.DividendYield ?? 0) || null;
    const dividendYield = dividendYieldRaw != null ? dividendYieldRaw / 100 : null;
    const desc = typeof overview?.Description === "string" ? overview.Description : null;
    const website = typeof overview?.Website === "string" ? overview.Website : null;
    const name = typeof overview?.Name === "string" ? overview.Name : company.name;

    let high52: number | null = null;
    let low52: number | null = null;
    for (const [, row] of entries) {
      const close = Number(row["4. close"] ?? 0) || 0;
      if (close <= 0) continue;
      if (high52 == null || close > high52) high52 = close;
      if (low52 == null || close < low52) low52 = close;
    }

    await prisma.company.update({
      where: { id: company.id },
      data: {
        name,
        website: website ?? undefined,
        description: desc ?? undefined,
        stockPrice: stockPrice ?? undefined,
        avgDailyVolume: volume ?? undefined,
        marketCap: marketCap ?? undefined,
        peRatio: peRatio ?? undefined,
        dividendYield: dividendYield ?? undefined,
        price52WeekHigh: high52 ?? undefined,
        price52WeekLow: low52 ?? undefined,
      },
    });

    for (const [date, row] of entries) {
      const d = new Date(date.slice(0, 10));
      const price = Number(row["4. close"] ?? 0) || 0;
      const vol = Number(row["5. volume"] ?? 0) || 0;
      if (price <= 0) continue;
      await prisma.pricePoint.upsert({
        where: { companyId_date: { companyId: company.id, date: d } },
        update: { price, volume: vol },
        create: { companyId: company.id, date: d, price, volume: vol },
      });
    }

    console.log(`Updated ${t.dbSymbol} from ${t.avSymbol}`);
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

