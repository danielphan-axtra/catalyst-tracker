import type { Company } from "@prisma/client";
import { computeSimplifiedDcfFromAssumptions, type DcfAssumptionsFile } from "@/lib/dcf-core";

export type SpotNavSummary = {
  spotCommodityPrice: number;
  mineNavUsdM: number;
  mineNavByAsset: Array<{ name: string; navUsdM: number }>;
  balanceCashUsdM: number;
  balanceDebtUsdM: number;
  equitySpotNavUsdM: number;
  marketCapUsdM: number;
  pNavRatio: number;
};

export function computeSpotNavSummary(params: {
  assumptions: DcfAssumptionsFile;
  spotCommodityPrice: number;
  discountRatePct: number;
  yearsForward?: number;
  startYear?: number;
  company: Company;
}): SpotNavSummary {
  const {
    assumptions,
    spotCommodityPrice,
    discountRatePct,
    yearsForward = 5,
    startYear = 2026,
    company,
  } = params;

  const combined = computeSimplifiedDcfFromAssumptions({
    assumptions,
    goldPriceUsdPerOz: spotCommodityPrice,
    discountRatePct,
    yearsForward,
    startYear,
    balanceDebtUsd: (company.balanceDebt ?? 0),
    balanceCashUsd: company.balanceCash ?? 0,
  });

  const mineNavByAsset = assumptions.assets.map((asset) => {
    const result = computeSimplifiedDcfFromAssumptions({
      assumptions: { source: assumptions.source, assets: [asset] },
      goldPriceUsdPerOz: spotCommodityPrice,
      discountRatePct,
      yearsForward,
      startYear,
    });
    return { name: asset.name, navUsdM: result.navUsdM };
  });

  const mineNavUsdM = combined.navUsdM;
  const balanceCashUsdM = (company.balanceCash ?? 0) / 1_000_000;
  const balanceDebtUsdM = ((company.balanceDebt ?? 0) + (company.minorityInterest ?? 0)) / 1_000_000;
  const equitySpotNavUsdM = mineNavUsdM + balanceCashUsdM - balanceDebtUsdM;
  const marketCapUsdM = (company.marketCap ?? 0) / 1_000_000;
  const pNavRatio = equitySpotNavUsdM > 0 ? marketCapUsdM / equitySpotNavUsdM : NaN;

  return {
    spotCommodityPrice,
    mineNavUsdM,
    mineNavByAsset,
    balanceCashUsdM,
    balanceDebtUsdM,
    equitySpotNavUsdM,
    marketCapUsdM,
    pNavRatio,
  };
}

