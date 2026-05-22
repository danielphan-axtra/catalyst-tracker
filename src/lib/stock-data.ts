/**
 * Fetches stock price and history from EODHD.com.
 * TSXV symbols use the .V suffix (e.g. AAG.V, EXM.V).
 * Note: EODHD free tier does not include fundamentals (market cap, cash, debt).
 */

import { prisma } from "@/lib/prisma";

const EODHD_BASE = "https://eodhd.com/api";

function getApiKey(): string {
  const key = process.env.EODHD_API_KEY;
  if (!key) throw new Error("EODHD_API_KEY is not set in .env");
  return key;
}

/** EODHD symbol: preserve .TO (TSX) or .V (TSXV) if present; otherwise default to .TO first (TSX) for symbols like EDV (Endeavour). */
export function toEodhdSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.endsWith(".TO") || s.endsWith(".V") || s.endsWith(".US") || s.endsWith(".LSE") || s.endsWith(".AU")) {
    return s;
  }
  if (s.endsWith(".AX")) return s.replace(/\.AX$/, ".AU");
  if (s.endsWith(".L")) return s.replace(/\.L$/, ".LSE");
  return `${s}.TO`;
}

function getEodhdCandidates(symbol: string): string[] {
  const s = symbol.trim().toUpperCase();
  if (!s) return [];

  if (s.endsWith(".TO") || s.endsWith(".V") || s.endsWith(".US") || s.endsWith(".LSE") || s.endsWith(".AU")) {
    return [s];
  }
  if (s.endsWith(".AX")) return [s.replace(/\.AX$/, ".AU"), s];
  if (s.endsWith(".L")) return [s.replace(/\.L$/, ".LSE"), s];

  // Try major exchange mappings for unsuffixed symbols.
  return [`${s}.TO`, `${s}.V`, `${s}.US`, `${s}.LSE`, `${s}.AU`];
}

export type PricePoint = { date: string; price: number; volume: number };

/** Fetch ~90 days of daily history from EODHD. Returns empty array on error. */
export async function fetchHistoricalPrices(symbol: string): Promise<PricePoint[]> {
  const key = getApiKey();
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 95);
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);

  const tryFetch = async (eodSym: string): Promise<PricePoint[]> => {
    try {
      const url = `${EODHD_BASE}/eod/${eodSym}?api_token=${encodeURIComponent(key)}&fmt=json&from=${fromStr}&to=${toStr}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data?.date ? [data] : []);
      if (arr.length === 0) return [];
      return arr.map((row: { date?: string; close?: number; adjusted_close?: number; volume?: number }) => ({
        date: String(row.date ?? "").slice(0, 10),
        price: Number(row.close ?? row.adjusted_close ?? 0) || 0,
        volume: Number(row.volume ?? 0) || 0,
      }));
    } catch {
      return [];
    }
  };

  for (const candidate of getEodhdCandidates(symbol)) {
    const result = await tryFetch(candidate);
    if (result.length > 0) return result;
  }
  return [];
}

/** Fetch current quote from EODHD real-time. Returns null on error. */
export async function fetchQuote(symbol: string): Promise<{
  price: number;
  high52: number | null;
  low52: number | null;
  volume: number | null;
} | null> {
  const key = getApiKey();
  const tryFetch = async (eodSym: string) => {
    try {
      const url = `${EODHD_BASE}/real-time/${eodSym}?api_token=${encodeURIComponent(key)}&fmt=json`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      const q = await res.json();
      if (!q || typeof q !== "object") return null;
      const price = Number(q.close ?? q.last ?? q.price ?? 0) || 0;
      const high52 = q["52WeekHigh"] != null ? Number(q["52WeekHigh"]) : null;
      const low52 = q["52WeekLow"] != null ? Number(q["52WeekLow"]) : null;
      const volume = q.volume != null ? Number(q.volume) : null;
      return { price, high52, low52, volume };
    } catch {
      return null;
    }
  };

  for (const candidate of getEodhdCandidates(symbol)) {
    const result = await tryFetch(candidate);
    if (result != null) return result;
  }
  return null;
}

/** EODHD free tier does not include fundamentals. Returns null. */
export async function fetchFundamentals(_symbol: string): Promise<{
  industry: string | null;
  marketCap: number | null;
  balanceCash: number | null;
  balanceDebt: number | null;
  enterpriseValue: number | null;
} | null> {
  return null;
}

/** Ensure company has recent price history and updated quote; fetches from EODHD if stale or missing. */
export async function ensurePriceData(companyId: string, symbol: string): Promise<void> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 2);

  const [latest, count] = await Promise.all([
    prisma.pricePoint.findFirst({
      where: { companyId },
      orderBy: { date: "desc" },
    }),
    prisma.pricePoint.count({ where: { companyId } }),
  ]);
  const hasRecentData = latest && new Date(latest.date) >= cutoff;
  const hasEnoughData = count >= 5;

  if (!hasRecentData || !hasEnoughData) {
    const [history, quote] = await Promise.all([
      fetchHistoricalPrices(symbol),
      fetchQuote(symbol),
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
