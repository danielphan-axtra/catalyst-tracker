import type { Company } from "@prisma/client";
import {
  fetchCommoditySpotQuotes,
  resolveSpotCommodityPriceUsd,
  type CommoditySpotQuotes,
} from "@/lib/copper-spot";
import { getAssumptionBaselinePriceUsd } from "@/lib/dcf-price-scenario";
import { computeEvPerMetalMetrics, type EvPerMetalMetrics } from "@/lib/ev-per-metal";
import { getMineralInventory } from "@/lib/mineral-inventory-registry";
import { isOperatingCompany } from "@/lib/operating-company-registry";
import {
  getMiningCompanyProfile,
  isAgnicoCompany,
  isEndeavourCompany,
} from "@/lib/mining-company-config";
import { loadAssumptionsFromRepoFile } from "@/lib/endeavour-dcf";
import { computeSpotNavSummary } from "@/lib/spot-nav";

export type CompanyListValuation = {
  pNavDisplay: string;
  pNavRatio: number | null;
  evMetricDisplay: string;
  evMetricSort: number | null;
};

export function formatPNavDisplay(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio) || ratio <= 0) return "—";
  return `${ratio.toFixed(2)}x`;
}

/** Compact list cell: reserve-based EV metric, else resource metric. */
export function formatEvMetricDisplay(metrics: EvPerMetalMetrics | null): string {
  if (!metrics) return "—";
  const primary =
    metrics.evPerReserveOzValue !== "—"
      ? metrics.evPerReserveOzValue
      : metrics.evPerResourceOzValue;
  if (primary === "—") return "—";
  return primary;
}

/** Parse formatted EV string to a sortable number (USD per unit). */
export function parseEvMetricSortValue(display: string): number | null {
  if (display === "—") return null;
  const slash = display.indexOf("/");
  if (slash <= 1) return null;
  const amountPart = display.slice(1, slash).replace(/,/g, "");
  const m = amountPart.match(/^([0-9.]+)([KMB]?)$/);
  if (!m) return null;
  let n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = m[2];
  if (suffix === "K") n *= 1_000;
  else if (suffix === "M") n *= 1_000_000;
  else if (suffix === "B") n *= 1_000_000_000;
  return n;
}

export function primaryEvSortValue(metrics: EvPerMetalMetrics | null): number | null {
  if (!metrics) return null;
  if (metrics.evPerReserveUsdPerUnit != null && metrics.evPerReserveUsdPerUnit > 0) {
    return metrics.evPerReserveUsdPerUnit;
  }
  if (metrics.evPerResourceUsdPerUnit != null && metrics.evPerResourceUsdPerUnit > 0) {
    return metrics.evPerResourceUsdPerUnit;
  }
  return parseEvMetricSortValue(formatEvMetricDisplay(metrics));
}

function computePNavForCompany(
  company: Company,
  quotes: CommoditySpotQuotes,
): { display: string; ratio: number | null } {
  if (isOperatingCompany(company.symbol, company.name)) {
    return { display: "—", ratio: null };
  }

  const profile = getMiningCompanyProfile(company.symbol, company.name, company.industry);

  const trySpotNav = (
    fileName: string,
    dcfConfig?: {
      commodityName?: string;
      commodityPriceUnit?: string;
      initialGoldPriceUsdPerOz?: number;
      discountRatePct?: number;
      chartYears?: number;
      startYear?: number;
    },
  ): { display: string; ratio: number | null } => {
    try {
      const assumptions = loadAssumptionsFromRepoFile(fileName);
      const spotCommodityPrice = resolveSpotCommodityPriceUsd({
        commodityName: dcfConfig?.commodityName,
        commodityPriceUnit: dcfConfig?.commodityPriceUnit,
        initialPriceUsd: dcfConfig?.initialGoldPriceUsdPerOz,
        assumptionBaselinePriceUsd: getAssumptionBaselinePriceUsd(
          assumptions,
          dcfConfig?.initialGoldPriceUsdPerOz ?? 2500,
        ),
        quotes,
      });
      const mineLifeYears = assumptions.assets[0]?.mineLifeEndYear ?? 5;
      const summary = computeSpotNavSummary({
        assumptions,
        spotCommodityPrice,
        discountRatePct: dcfConfig?.discountRatePct ?? 5,
        yearsForward: dcfConfig?.chartYears ?? mineLifeYears,
        startYear: dcfConfig?.startYear ?? 2026,
        company,
      });
      const ratio = Number.isFinite(summary.pNavRatio) ? summary.pNavRatio : null;
      return { display: formatPNavDisplay(ratio), ratio };
    } catch {
      return { display: "—", ratio: null };
    }
  };

  if (isEndeavourCompany(company.symbol, company.name)) {
    return trySpotNav("endeavour-dcf-assumptions.json");
  }
  if (isAgnicoCompany(company.symbol, company.name)) {
    return trySpotNav("agnico-eagle-dcf-assumptions.json");
  }
  if ((profile.showProducingDcf || profile.showFeasibilityDcf) && profile.dcfConfig) {
    return trySpotNav(profile.dcfConfig.assumptionsFileName, profile.dcfConfig);
  }

  return { display: "—", ratio: null };
}

export function computeCompanyListValuation(
  company: Company,
  quotes: CommoditySpotQuotes,
): CompanyListValuation {
  const pNav = computePNavForCompany(company, quotes);

  const inventory = getMineralInventory(company.symbol, company.name);
  let evMetricDisplay = "—";
  let evMetricSort: number | null = null;
  if (inventory) {
    const metrics = computeEvPerMetalMetrics({
      company,
      inventory,
      spotGoldUsdPerOz: quotes.goldUsdPerOz,
      spotCopperUsdPerLb: quotes.copperUsdPerLb,
    });
    evMetricDisplay = formatEvMetricDisplay(metrics);
    evMetricSort = primaryEvSortValue(metrics);
  }

  return {
    pNavDisplay: pNav.display,
    pNavRatio: pNav.ratio,
    evMetricDisplay,
    evMetricSort,
  };
}

export async function computeValuationsForCompanies(
  companies: Company[],
): Promise<Map<string, CompanyListValuation>> {
  const quotes = await fetchCommoditySpotQuotes();
  const map = new Map<string, CompanyListValuation>();
  for (const company of companies) {
    map.set(company.id, computeCompanyListValuation(company, quotes));
  }
  return map;
}
