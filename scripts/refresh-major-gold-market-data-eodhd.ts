import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const prisma = new PrismaClient();
const EODHD_BASE = "https://eodhd.com/api";

function getApiKey(): string {
  const key = process.env.EODHD_API_KEY;
  if (!key) throw new Error("EODHD_API_KEY is not set in .env");
  return key;
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toEodCandidates(dbSymbol: string): string[] {
  const s = dbSymbol.trim().toUpperCase();
  if (s === "PRU") return ["PRU.AU", "PRU.TO", "PRU.US"];
  if (s === "IAG.TO") return ["IAG.TO", "IAG.US"];
  if (s === "BTO.TO") return ["BTO.TO", "BTG.US"];
  if (s === "AU") return ["AU.US", "AU.JSE"];
  if (s === "GFI") return ["GFI.US", "GFI.JSE"];
  if (s === "RSG") return ["RSG.AU", "RSG.LSE"];
  return [s];
}

function latestBalanceSheetEntry(balanceSheet: any): Record<string, unknown> | null {
  if (!balanceSheet || typeof balanceSheet !== "object") return null;
  const quarterly = (balanceSheet.quarterly ?? balanceSheet.Quarterly) as Record<string, unknown> | undefined;
  if (!quarterly || typeof quarterly !== "object") return null;
  const keys = Object.keys(quarterly).sort().reverse();
  if (keys.length === 0) return null;
  const row = quarterly[keys[0]];
  return row && typeof row === "object" ? (row as Record<string, unknown>) : null;
}

async function main() {
  const key = getApiKey();
  const symbols = ["PRU", "IAG.TO", "BTO.TO", "AU", "GFI", "RSG"];
  const companies = await prisma.company.findMany({
    where: { symbol: { in: symbols } },
    select: { id: true, symbol: true, name: true },
  });

  for (const c of companies) {
    const candidates = toEodCandidates(c.symbol);
    let chosen: string | null = null;
    let fund: any = null;
    let rt: any = null;

    for (const eodSymbol of candidates) {
      const fundUrl = `${EODHD_BASE}/fundamentals/${eodSymbol}?api_token=${encodeURIComponent(key)}&fmt=json`;
      const fundTry = await fetchJson(fundUrl);
      const hasData = fundTry && (fundTry.General || fundTry.Highlights || fundTry.Valuation || fundTry.Financials);
      if (!hasData) continue;

      const rtUrl = `${EODHD_BASE}/real-time/${eodSymbol}?api_token=${encodeURIComponent(key)}&fmt=json`;
      const rtTry = await fetchJson(rtUrl);

      chosen = eodSymbol;
      fund = fundTry;
      rt = rtTry;
      break;
    }

    if (!chosen || !fund) {
      console.log(`Skipping ${c.symbol}: no usable EODHD symbol from [${candidates.join(", ")}]`);
      continue;
    }

    const general = (fund.General ?? {}) as Record<string, unknown>;
    const highlights = (fund.Highlights ?? {}) as Record<string, unknown>;
    const valuation = (fund.Valuation ?? {}) as Record<string, unknown>;
    const technicals = (fund.Technicals ?? {}) as Record<string, unknown>;
    const bs = latestBalanceSheetEntry((fund.Financials ?? {}).Balance_Sheet ?? (fund.Financials ?? {}).balance_sheet);

    const marketCapRaw =
      general.MarketCapitalization ??
      highlights.MarketCapitalization ??
      highlights.MarketCapitalisation ??
      null;
    const evRaw = valuation.EnterpriseValue ?? null;
    const cashRaw =
      bs?.cashAndCashEquivalents ??
      bs?.CashAndCashEquivalents ??
      bs?.cashAndEquivalents ??
      bs?.cashAndShortTermInvestments ??
      bs?.cash ??
      null;
    const debtRaw =
      bs?.totalDebt ??
      bs?.TotalDebt ??
      ((Number(bs?.longTermDebtTotal ?? bs?.longTermDebt ?? 0) || 0) +
        (Number(bs?.shortLongTermDebtTotal ?? bs?.shortLongTermDebt ?? bs?.shortTermDebt ?? 0) || 0) || null);
    const peRaw = highlights.PERatio ?? null;
    const divRaw = highlights.DividendYield ?? null;

    const priceRaw = rt?.close ?? rt?.last ?? null;
    const volRaw = rt?.volume ?? null;
    const hiRaw = technicals["52WeekHigh"] ?? technicals["52weekHigh"] ?? rt?.["52_week_high"] ?? null;
    const loRaw = technicals["52WeekLow"] ?? technicals["52weekLow"] ?? rt?.["52_week_low"] ?? null;

    const update: Record<string, unknown> = {
      marketCap: marketCapRaw != null ? Number(marketCapRaw) : undefined,
      enterpriseValue: evRaw != null ? Number(evRaw) : undefined,
      balanceCash: cashRaw != null ? Number(cashRaw) : undefined,
      balanceDebt: debtRaw != null ? Number(debtRaw) : undefined,
      peRatio: peRaw != null ? Number(peRaw) : undefined,
      dividendYield: divRaw != null ? Number(divRaw) : undefined,
      stockPrice: priceRaw != null ? Number(priceRaw) : undefined,
      avgDailyVolume: volRaw != null ? Number(volRaw) : undefined,
      price52WeekHigh: hiRaw != null ? Number(hiRaw) : undefined,
      price52WeekLow: loRaw != null ? Number(loRaw) : undefined,
      website: (general.Website as string) || undefined,
      description: (general.Description as string) || undefined,
      name: (general.Name as string) || c.name,
    };

    await prisma.company.update({
      where: { id: c.id },
      data: update,
    });

    console.log(`Updated ${c.symbol} from ${chosen}`);
  }

  console.log("EODHD refresh complete.");
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

