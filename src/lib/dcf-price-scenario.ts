import type { DcfAssumptionsFile } from "@/lib/dcf-core";

/** Baseline commodity price used when assumptions were authored (for scenario scaling). */
export function getAssumptionBaselinePriceUsd(
  assumptions: DcfAssumptionsFile,
  fallbackUsd: number,
): number {
  for (const asset of assumptions.assets) {
    if (asset.revenueUsdPerUnit != null && asset.revenueUsdPerUnit > 0) {
      return asset.revenueUsdPerUnit;
    }
  }
  return fallbackUsd;
}

/**
 * Scale per-asset revenue prices when the user changes the scenario commodity price.
 * Gold/copper miners without revenueUsdPerUnit still respond via goldPriceUsdPerOz in dcf-core.
 */
export function applyCommodityPriceScenario(
  assumptions: DcfAssumptionsFile,
  scenarioPriceUsd: number,
  baselinePriceUsd: number,
): DcfAssumptionsFile {
  const factor =
    baselinePriceUsd > 0 ? scenarioPriceUsd / baselinePriceUsd : 1;
  if (!Number.isFinite(factor) || Math.abs(factor - 1) < 1e-6) {
    return assumptions;
  }
  return {
    ...assumptions,
    assets: assumptions.assets.map((asset) => {
      if (asset.revenueUsdPerUnit == null) {
        return asset;
      }
      return {
        ...asset,
        revenueUsdPerUnit: asset.revenueUsdPerUnit * factor,
      };
    }),
  };
}
