import {
  estimateCorporateFinancingUsdMByYear,
  mergeFinancingSchedules,
  resolveFinancingUsdMForYear,
} from "@/lib/dcf-financing";

export type DcfAsset = {
  name: string;
  type?: "production" | "development" | string;
  jurisdiction?: string | null;
  payableGoldProductionKozByYear?: Record<string, number>;
  mineLifeEndYear?: number;
  /** Revenue price for this stream (USD/unit). Falls back to scenario commodity price when omitted. */
  revenueUsdPerUnit?: number;
  aiscUsdPerOz?: number;
  aiscUsdPerOzByYear?: Record<string, number> | null;
  capexUsdMByYear?: Record<string, number>;
  sustainingCapexUsdMByYear?: Record<string, number> | null;
};

export type DcfAssumptionsFile = {
  source?: string;
  /** DFS / study pre-tax NPV at 8% (USD M), for reference on feasibility projects. */
  dfsPreTaxNpv8UsdM?: number;
  assets: DcfAsset[];
  /** Corporate-level financing cash flows by model year (USD M). Negative = outflow. */
  corporateFinancingUsdMByYear?: Record<string, number>;
  financingNotes?: string;
};

export type DcfPoint = {
  yearIndex: number;
  yearLabel: string;
  productionKoz: number;
  mineProductionKozByAsset: Record<string, number>;
  aiscUsdPerOz: number;
  ocfUsdM: number;
  capexUsdM: number;
  financingUsdM: number;
  fcfUsdM: number;
  pvUsdM: number;
};

export type DcfResult = {
  goldPriceUsdPerOz: number;
  discountRatePct: number;
  discountRate: number;
  source?: string;
  assetName: string;
  rows: DcfPoint[];
  navUsdM: number;
  nav5UsdM: number;
};

function parseYearIndex(k: string): number | null {
  const m = k.match(/(?:^|[^0-9])(\d+)(?:[^0-9]|$)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveCapexUsdMByYear(params: {
  capexUsdMByYear?: Record<string, number>;
  sustainingCapexUsdMByYear?: Record<string, number> | null;
  modeledYearsCount: number;
}): Map<number, number> {
  const capexMap = new Map<number, number>();
  const capexUsdMByYear = params.capexUsdMByYear ?? {};

  for (const [k, v] of Object.entries(capexUsdMByYear)) {
    const idx = parseYearIndex(k);
    if (idx != null) capexMap.set(idx, Number(v));
  }

  const initialM = Number(capexUsdMByYear.Initial ?? capexUsdMByYear.initial ?? 0) || 0;
  if (initialM !== 0) capexMap.set(1, (capexMap.get(1) ?? 0) + initialM);

  const sustainingTotalM =
    Number(capexUsdMByYear.Sustaining_Total ?? capexUsdMByYear.sustaining_total ?? 0) ||
    Number(params.sustainingCapexUsdMByYear?.Sustaining_Total ?? params.sustainingCapexUsdMByYear?.Total ?? 0) ||
    0;

  const anyExplicitAnnual = Array.from(capexMap.keys()).some((k) => k >= 1 && k <= params.modeledYearsCount);
  if (!anyExplicitAnnual && sustainingTotalM !== 0) {
    const perYear = sustainingTotalM / params.modeledYearsCount;
    for (let i = 1; i <= params.modeledYearsCount; i++) capexMap.set(i, perYear);
  }

  return capexMap;
}

export function computeSimplifiedDcfFromAssumptions(params: {
  assumptions: DcfAssumptionsFile;
  goldPriceUsdPerOz: number;
  discountRatePct: number;
  yearsForward?: number;
  startYear?: number;
  balanceDebtUsd?: number | null;
  balanceCashUsd?: number | null;
}): DcfResult {
  const { assumptions, goldPriceUsdPerOz, discountRatePct, yearsForward = 5, startYear, balanceDebtUsd } =
    params;
  if (!Array.isArray(assumptions.assets) || assumptions.assets.length === 0) {
    throw new Error("No assets found in assumptions JSON under `assets[]`.");
  }

  const sources = assumptions.assets;
  const asset0 = assumptions.assets[0];

  const productionByAsset: Array<{ asset: DcfAsset; map: Map<number, number> }> = sources.map((asset) => {
    const schedule = asset.payableGoldProductionKozByYear ?? {};
    const entries = Object.entries(schedule)
      .map(([k, v]) => {
        const idx = parseYearIndex(k);
        return idx == null ? null : { idx, v: Number(v) };
      })
      .filter(Boolean) as Array<{ idx: number; v: number }>;
    const map = new Map<number, number>();
    for (const e of entries) map.set(e.idx, e.v);
    return { asset, map };
  });

  const maxYear = Math.max(
    ...productionByAsset.map(({ asset, map }) => {
      const keys = Array.from(map.keys());
      const maxSchedule = keys.length ? Math.max(...keys) : 0;
      const mineLifeYears = Number.isFinite(asset.mineLifeEndYear ?? NaN) ? (asset.mineLifeEndYear as number) : undefined;
      if (mineLifeYears != null && mineLifeYears > 0) return Math.min(maxSchedule, mineLifeYears);
      return maxSchedule;
    }),
  );

  const modeledYears = maxYear > 0 ? maxYear : yearsForward;
  const yearRange = Array.from({ length: modeledYears }, (_, i) => i + 1);
  const discountRate = discountRatePct / 100;

  const financingSchedule = mergeFinancingSchedules(
    estimateCorporateFinancingUsdMByYear({
      balanceDebtUsd: balanceDebtUsd,
      modeledYears,
    }),
    assumptions.corporateFinancingUsdMByYear
  );

  const rows: DcfPoint[] = yearRange.map((yearIndex) => {
    let productionKoz = 0;
    let ocfUsd = 0;
    let capexUsd = 0;
    let weightedAiscNumerator = 0;
    let weightedAiscDenominator = 0;
    const mineProductionKozByAsset: Record<string, number> = {};

    for (const { asset, map } of productionByAsset) {
      const koz = map.get(yearIndex) ?? 0;
      productionKoz += koz;
      mineProductionKozByAsset[asset.name] = koz;

      const units = koz * 1000;
      const unitPrice = asset.revenueUsdPerUnit ?? goldPriceUsdPerOz;
      const aiscConstant = asset.aiscUsdPerOz ?? 0;
      const aiscByYear = asset.aiscUsdPerOzByYear?.[`Year${yearIndex}`] ?? null;
      const aisc = aiscByYear ?? aiscConstant;

      weightedAiscNumerator += aisc * units;
      weightedAiscDenominator += units;
      ocfUsd += (unitPrice - aisc) * units;

      const capexMap = resolveCapexUsdMByYear({
        capexUsdMByYear: asset.capexUsdMByYear,
        sustainingCapexUsdMByYear: asset.sustainingCapexUsdMByYear ?? null,
        modeledYearsCount: modeledYears,
      });
      const capexUsdM = capexMap.get(yearIndex) ?? 0;
      if (capexUsdM !== 0) capexUsd += -capexUsdM * 1_000_000;
    }

    const aiscUsdPerOz = weightedAiscDenominator > 0 ? weightedAiscNumerator / weightedAiscDenominator : 0;
    const financingUsdM = resolveFinancingUsdMForYear(yearIndex, financingSchedule);
    const financingUsd = financingUsdM * 1_000_000;
    const fcfUsd = ocfUsd + capexUsd + financingUsd;
    const pvUsd = fcfUsd / Math.pow(1 + discountRate, yearIndex);

    return {
      yearIndex,
      yearLabel: Number.isFinite(startYear ?? NaN) ? String((startYear as number) + yearIndex - 1) : `Year ${yearIndex}`,
      productionKoz,
      mineProductionKozByAsset,
      aiscUsdPerOz,
      ocfUsdM: ocfUsd / 1_000_000,
      capexUsdM: capexUsd / 1_000_000,
      financingUsdM,
      fcfUsdM: fcfUsd / 1_000_000,
      pvUsdM: pvUsd / 1_000_000,
    };
  });

  const navUsdM = rows.reduce((sum, r) => sum + r.pvUsdM, 0);
  const nav5UsdM = rows.slice(0, yearsForward).reduce((sum, r) => sum + r.pvUsdM, 0);

  return {
    goldPriceUsdPerOz,
    discountRatePct,
    discountRate,
    source: assumptions.source,
    assetName: asset0.name,
    rows,
    navUsdM,
    nav5UsdM,
  };
}

