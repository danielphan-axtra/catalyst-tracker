import { GenericMiningDcfInteractive } from "@/components/GenericMiningDcfInteractive";
import { loadAssumptionsFromRepoFile } from "@/lib/endeavour-dcf";

export function GenericMiningDcfSection({
  assumptionsFileName,
  companyName,
  initialGoldPriceUsdPerOz = 2500,
  discountRatePct = 5,
  chartYears = 5,
  startYear = 2026,
  dfsPreTaxNpv8UsdM = null,
  commodityName = "Gold",
  commodityPriceUnit = "USD/oz",
  spotCommodityPrice,
  productionUnitLabel = "Koz",
  productionValueSuffix = " koz",
  costUnitLabel = "$/oz",
  costSeriesLabel = "AISC",
  balanceDebtUsd,
  balanceCashUsd,
}: {
  assumptionsFileName: string;
  companyName: string;
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
  try {
    const assumptions = loadAssumptionsFromRepoFile(assumptionsFileName);
    const studyNpv =
      dfsPreTaxNpv8UsdM ?? assumptions.dfsPreTaxNpv8UsdM ?? null;
    return (
      <GenericMiningDcfInteractive
        assumptions={assumptions}
        initialGoldPriceUsdPerOz={initialGoldPriceUsdPerOz}
        discountRatePct={discountRatePct}
        chartYears={chartYears}
        startYear={startYear}
        dfsPreTaxNpv8UsdM={studyNpv}
        commodityName={commodityName}
        commodityPriceUnit={commodityPriceUnit}
        spotCommodityPrice={spotCommodityPrice}
        productionUnitLabel={productionUnitLabel}
        productionValueSuffix={productionValueSuffix}
        costUnitLabel={costUnitLabel}
        costSeriesLabel={costSeriesLabel}
        balanceDebtUsd={balanceDebtUsd}
        balanceCashUsd={balanceCashUsd}
      />
    );
  } catch {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm border border-neutral-100 mt-5">
        <h2 className="text-lg font-semibold text-neutral-900">DCF & NAV (simplified)</h2>
        <p className="mt-2 text-sm text-neutral-600">
          {companyName} assumptions not found yet. Add{" "}
          <span className="font-mono text-neutral-900">data/{assumptionsFileName}</span>.
        </p>
      </div>
    );
  }
}

