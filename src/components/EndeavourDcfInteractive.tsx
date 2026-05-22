"use client";

import { useMemo, useState } from "react";
import { EndeavourDcfCharts } from "@/components/EndeavourDcfCharts";
import { computeSimplifiedDcfFromAssumptions, type DcfAssumptionsFile } from "@/lib/dcf-core";
import { applyCommodityPriceScenario } from "@/lib/dcf-price-scenario";

export function EndeavourDcfInteractive({
  assumptions,
  initialGoldPriceUsdPerOz = 2500,
  discountRatePct = 5,
  startYear = 2026,
  chartYears = 5,
  balanceDebtUsd,
  balanceCashUsd,
  spotCommodityPrice = null,
}: {
  assumptions: DcfAssumptionsFile;
  initialGoldPriceUsdPerOz?: number;
  discountRatePct?: number;
  startYear?: number;
  chartYears?: number;
  balanceDebtUsd?: number | null;
  balanceCashUsd?: number | null;
  spotCommodityPrice?: number | null;
}) {
  const [commodityPriceUsd, setCommodityPriceUsd] = useState(initialGoldPriceUsdPerOz);
  const baselinePriceUsd = initialGoldPriceUsdPerOz;

  const scaledAssumptions = useMemo(
    () => applyCommodityPriceScenario(assumptions, commodityPriceUsd, baselinePriceUsd),
    [assumptions, commodityPriceUsd, baselinePriceUsd],
  );

  const result = useMemo(
    () =>
      computeSimplifiedDcfFromAssumptions({
        assumptions: scaledAssumptions,
        goldPriceUsdPerOz: commodityPriceUsd,
        discountRatePct,
        yearsForward: chartYears,
        startYear,
        balanceDebtUsd,
        balanceCashUsd,
      }),
    [
      scaledAssumptions,
      commodityPriceUsd,
      discountRatePct,
      chartYears,
      startYear,
      balanceDebtUsd,
      balanceCashUsd,
    ],
  );

  const spotNavResult = useMemo(() => {
    if (!Number.isFinite(spotCommodityPrice ?? NaN)) return null;
    const spotAssumptions = applyCommodityPriceScenario(
      assumptions,
      Number(spotCommodityPrice),
      baselinePriceUsd,
    );
    return computeSimplifiedDcfFromAssumptions({
      assumptions: spotAssumptions,
      goldPriceUsdPerOz: Number(spotCommodityPrice),
      discountRatePct,
      yearsForward: chartYears,
      startYear,
      balanceDebtUsd,
      balanceCashUsd,
    });
  }, [
    assumptions,
    spotCommodityPrice,
    baselinePriceUsd,
    discountRatePct,
    chartYears,
    startYear,
    balanceDebtUsd,
    balanceCashUsd,
  ]);

  return (
    <EndeavourDcfCharts
      rows={result.rows.slice(0, chartYears)}
      startYear={startYear}
      assumptionsSource={assumptions.source}
      navUsdM={result.navUsdM}
      nav5UsdM={result.nav5UsdM}
      goldPriceUsdPerOz={commodityPriceUsd}
      discountRatePct={result.discountRatePct}
      goldPriceInput={{
        value: commodityPriceUsd,
        onChange: setCommodityPriceUsd,
      }}
      spotCommodityPrice={spotCommodityPrice}
      impliedNavAtSpotUsdM={spotNavResult?.navUsdM ?? null}
    />
  );
}
