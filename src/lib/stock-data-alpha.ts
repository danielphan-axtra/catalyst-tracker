/**
 * Alpha Vantage API integration for stock prices and company data.
 * TSXV symbols use the .V suffix (e.g. EXM.V).
 * This is a parallel implementation - existing FMP code remains unchanged.
 */

import { prisma } from "@/lib/prisma";

const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

function getApiKey(): string {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("ALPHA_VANTAGE_API_KEY is not set in .env");
  return key;
}

/** Alpha Vantage symbol for TSXV: raw symbol + .V */
export function toAlphaVantageSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.endsWith(".V") || s.endsWith(".TO")) return s.replace(".TO", ".V");
  return `${s}.V`;
}

export type PricePoint = { date: string; price: number; volume: number };

/** Fetch ~90 days of daily history from Alpha Vantage. Tries .V then raw symbol. Returns empty array on error. */
export async function fetchHistoricalPricesAlpha(symbol: string): Promise<PricePoint[]> {
  const key = getApiKey();
  const candidates = [toAlphaVantageSymbol(symbol), symbol.trim().toUpperCase()];

  for (const sym of candidates) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}&outputsize=compact`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data["Error Message"] || data["Note"]) continue;
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

/** Fetch current quote from Alpha Vantage. Tries .V then raw symbol. Returns null on error. */
export async function fetchQuoteAlpha(symbol: string): Promise<{
  price: number;
  high52: number | null;
  low52: number | null;
  volume: number | null;
} | null> {
  const key = getApiKey();
  const s = symbol.trim().toUpperCase();
  const candidates = [`${s}.V`, s];

  for (const sym of candidates) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data["Error Message"] || data["Note"]) continue;
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

/** Fetch company overview (name, description, website) from Alpha Vantage. */
export async function fetchCompanyOverviewAlpha(symbol: string): Promise<{
  name: string | null;
  description: string | null;
  website: string | null;
} | null> {
  const key = getApiKey();
  const candidates = [toAlphaVantageSymbol(symbol), symbol.trim().toUpperCase()];

  for (const sym of candidates) {
    try {
      const url = `${ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${encodeURIComponent(sym)}&apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url, { next: { revalidate: 86400 } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data["Error Message"] || data["Note"]) continue;
      if (!data["Name"] && !data["Website"]) continue;
      return {
        name: data["Name"] ?? null,
        description: data["Description"] ?? null,
        website: data["Website"] ?? null,
      };
    } catch {
      continue;
    }
  }
  return null;
}

/** Ensure company has recent price history and updated quote from Alpha Vantage. */
export async function ensurePriceDataAlpha(companyId: string, symbol: string): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 2);

  const latest = await prisma.pricePoint.findFirst({
    where: { companyId },
    orderBy: { date: "desc" },
  });
  const hasRecentData = latest && new Date(latest.date) >= cutoff;

  if (!hasRecentData) {
    const [history, quote] = await Promise.all([
      fetchHistoricalPricesAlpha(symbol),
      fetchQuoteAlpha(symbol),
    ]);

    for (const p of history) {
      const d = new Date(p.date);
      await prisma.pricePoint.upsert({
        where: {
          companyId_date: { companyId, date: d },
        },
        update: { price: p.price, volume: p.volume },
        create: {
          companyId,
          date: d,
          price: p.price,
          volume: p.volume,
        },
      });
    }

    if (quote) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          stockPrice: quote.price,
          price52WeekHigh: quote.high52 ?? undefined,
          price52WeekLow: quote.low52 ?? undefined,
          avgDailyVolume: quote.volume ?? undefined,
        },
      });
    }
  }
}
