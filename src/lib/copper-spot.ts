export async function fetchCopperSpotUsdPerLb(): Promise<number> {
  try {
    // Use front-month COMEX copper futures as a spot proxy.
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/HG=F?range=1d&interval=1d", {
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const close = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const value = Number(close);
    if (Number.isFinite(value) && value > 0) return value;
    throw new Error("Invalid copper spot response");
  } catch {
    // Fallback to a conservative default so UI remains available.
    return 4.3;
  }
}

export async function fetchGoldSpotUsdPerOz(): Promise<number> {
  try {
    // Use front-month COMEX gold futures as a spot proxy.
    const res = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=1d&interval=1d", {
      next: { revalidate: 900 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const close = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    const value = Number(close);
    if (Number.isFinite(value) && value > 0) return value;
    throw new Error("Invalid gold spot response");
  } catch {
    // Fallback keeps DCF widgets available when quote fetch fails.
    return 2500;
  }
}

export type CommoditySpotQuotes = {
  goldUsdPerOz: number;
  copperUsdPerLb: number;
};

/** Fetch gold and copper spot proxies in one round trip. */
export async function fetchCommoditySpotQuotes(): Promise<CommoditySpotQuotes> {
  const [goldUsdPerOz, copperUsdPerLb] = await Promise.all([
    fetchGoldSpotUsdPerOz(),
    fetchCopperSpotUsdPerLb(),
  ]);
  return { goldUsdPerOz, copperUsdPerLb };
}

function commodityNameLower(commodityName?: string | null): string {
  return (commodityName ?? "").trim().toLowerCase();
}

export function isCopperCommodity(commodityName?: string | null): boolean {
  return commodityNameLower(commodityName).includes("copper");
}

export function isGoldCommodity(commodityName?: string | null): boolean {
  const n = commodityNameLower(commodityName);
  return n.length === 0 || n === "gold" || n.includes("gold");
}

/**
 * Map DCF config + live quotes to the price used for "spot" labels and spot NAV.
 * Non-traded commodities (e.g. rutile $/t) use assumption baseline or config default.
 */
export function resolveSpotCommodityPriceUsd(params: {
  commodityName?: string | null;
  commodityPriceUnit?: string | null;
  initialPriceUsd?: number | null;
  assumptionBaselinePriceUsd?: number | null;
  quotes: CommoditySpotQuotes;
}): number {
  const { commodityName, commodityPriceUnit, initialPriceUsd, assumptionBaselinePriceUsd, quotes } =
    params;

  if (isCopperCommodity(commodityName)) return quotes.copperUsdPerLb;
  if (isGoldCommodity(commodityName)) return quotes.goldUsdPerOz;

  const unit = (commodityPriceUnit ?? "").toLowerCase();
  if (unit.includes("/lb")) return quotes.copperUsdPerLb;
  if (unit.includes("/oz")) return quotes.goldUsdPerOz;

  const baseline = assumptionBaselinePriceUsd ?? initialPriceUsd;
  if (baseline != null && Number.isFinite(baseline) && baseline > 0) return baseline;

  if (unit.includes("/t")) {
    return initialPriceUsd != null && initialPriceUsd > 0 ? initialPriceUsd : quotes.goldUsdPerOz;
  }

  return quotes.goldUsdPerOz;
}

