"use client";

import { useMemo, useState } from "react";
import { EndeavourDcfCharts } from "@/components/EndeavourDcfCharts";
import { computeSimplifiedDcfFromAssumptions, type DcfAssumptionsFile } from "@/lib/dcf-core";
import { applyCommodityPriceScenario } from "@/lib/dcf-price-scenario";

export function AgnicoEagleDcfInteractive({
  assumptions,
  initialGoldPriceUsdPerOz = 2500,
  discountRatePct = 5,
  startYear = 2026,
  balanceDebtUsd,
  balanceCashUsd,
  spotCommodityPrice,
}: {
  assumptions: DcfAssumptionsFile;
  initialGoldPriceUsdPerOz?: number;
  discountRatePct?: number;
  startYear?: number;
  balanceDebtUsd?: number | null;
  balanceCashUsd?: number | null;
  spotCommodityPrice: number;
}) {
  const [goldPriceUsdPerOz, setGoldPriceUsdPerOz] = useState(initialGoldPriceUsdPerOz);
  const baselinePriceUsd = initialGoldPriceUsdPerOz;

  const scaledAssumptions = useMemo(
    () => applyCommodityPriceScenario(assumptions, goldPriceUsdPerOz, baselinePriceUsd),
    [assumptions, goldPriceUsdPerOz, baselinePriceUsd],
  );

  const result = useMemo(
    () =>
      computeSimplifiedDcfFromAssumptions({
        assumptions: scaledAssumptions,
        goldPriceUsdPerOz,
        discountRatePct,
        yearsForward: 5,
        startYear,
        balanceDebtUsd,
        balanceCashUsd,
      }),
    [
      scaledAssumptions,
      goldPriceUsdPerOz,
      discountRatePct,
      startYear,
      balanceDebtUsd,
      balanceCashUsd,
    ],
  );

  const spotNavResult = useMemo(() => {
    if (!Number.isFinite(spotCommodityPrice)) return null;
    const spotAssumptions = applyCommodityPriceScenario(
      assumptions,
      spotCommodityPrice,
      baselinePriceUsd,
    );
    return computeSimplifiedDcfFromAssumptions({
      assumptions: spotAssumptions,
      goldPriceUsdPerOz: spotCommodityPrice,
      discountRatePct,
      yearsForward: 5,
      startYear,
      balanceDebtUsd,
      balanceCashUsd,
    });
  }, [
    assumptions,
    spotCommodityPrice,
    baselinePriceUsd,
    discountRatePct,
    startYear,
    balanceDebtUsd,
    balanceCashUsd,
  ]);

  const mineCount = assumptions.assets.length;

  return (
    <>
      {mineCount > 1 && (
        <p className="mb-3 text-sm text-neutral-600">
          Production and cash flow use <span className="font-medium text-neutral-800">{mineCount} mine-level plans</span>{" "}
          (Q2 2025 MD&A + LaRonde TR LOM shapes). Adjust gold price above to rerun OCF and NAV.
        </p>
      )}
      <EndeavourDcfCharts
      rows={result.rows.slice(0, 5)}
      startYear={startYear}
      assumptionsSource={assumptions.source}
      navUsdM={result.navUsdM}
      nav5UsdM={result.nav5UsdM}
      goldPriceUsdPerOz={result.goldPriceUsdPerOz}
      discountRatePct={result.discountRatePct}
      goldPriceInput={{
        value: goldPriceUsdPerOz,
        onChange: setGoldPriceUsdPerOz,
      }}
      spotCommodityPrice={spotCommodityPrice}
      impliedNavAtSpotUsdM={spotNavResult?.navUsdM ?? null}
    />
    </>
  );
}

