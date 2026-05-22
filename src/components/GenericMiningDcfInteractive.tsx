"use client";

import { useMemo, useState } from "react";
import { EndeavourDcfCharts } from "@/components/EndeavourDcfCharts";
import { computeSimplifiedDcfFromAssumptions, type DcfAssumptionsFile } from "@/lib/dcf-core";
import { applyCommodityPriceScenario } from "@/lib/dcf-price-scenario";

export function GenericMiningDcfInteractive({
  assumptions,
  initialGoldPriceUsdPerOz = 2500,
  discountRatePct = 5,
  chartYears = 5,
  startYear = 2026,
  commodityName = "Gold",
  dfsPreTaxNpv8UsdM = null,
  commodityPriceUnit = "USD/oz",
  spotCommodityPrice,
  productionUnitLabel = "Koz",
  productionValueSuffix = " koz",
  costUnitLabel = "$/oz",
  costSeriesLabel = "AISC",
  balanceDebtUsd,
  balanceCashUsd,
}: {
  assumptions: DcfAssumptionsFile;
  initialGoldPriceUsdPerOz?: number;
  discountRatePct?: number;
  chartYears?: number;
  startYear?: number;
  dfsPreTaxNpv8UsdM?: number | null;
  commodityName?: string;
  commodityPriceUnit?: string;
  spotCommodityPrice?: number | null;
  productionUnitLabel?: string;
  productionValueSuffix?: string;
  costUnitLabel?: string;
  costSeriesLabel?: string;
  balanceDebtUsd?: number | null;
  balanceCashUsd?: number | null;
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
        yearsForward: chartYears,
        startYear,
        balanceDebtUsd,
        balanceCashUsd,
      }),
    [
      scaledAssumptions,
      goldPriceUsdPerOz,
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

  const chartRows = result.rows.slice(0, chartYears);

  return (
    <EndeavourDcfCharts
      rows={chartRows}
      startYear={startYear}
      dfsPreTaxNpv8UsdM={dfsPreTaxNpv8UsdM ?? assumptions.dfsPreTaxNpv8UsdM ?? null}
      assumptionsSource={assumptions.source}
      navUsdM={result.navUsdM}
      nav5UsdM={result.nav5UsdM}
      goldPriceUsdPerOz={result.goldPriceUsdPerOz}
      discountRatePct={result.discountRatePct}
      goldPriceInput={{
        value: goldPriceUsdPerOz,
        onChange: setGoldPriceUsdPerOz,
      }}
      commodityName={commodityName}
      commodityPriceUnit={commodityPriceUnit}
      spotCommodityPrice={spotCommodityPrice ?? null}
      impliedNavAtSpotUsdM={spotNavResult?.navUsdM ?? null}
      productionUnitLabel={productionUnitLabel}
      productionValueSuffix={productionValueSuffix}
      costUnitLabel={costUnitLabel}
      costSeriesLabel={costSeriesLabel}
      priceInputMin={commodityPriceUnit.includes("/t") ? 800 : 500}
      priceInputStep={commodityPriceUnit.includes("/t") ? 50 : 25}
    />
  );
}

