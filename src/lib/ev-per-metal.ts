import type { Company } from "@prisma/client";
import type { MineralInventoryFile } from "@/lib/mineral-inventory-types";

export type EvPerMetalMetrics = {
  spotGoldUsdPerOz?: number;
  spotCopperUsdPerLb?: number;
  spotSilverUsdPerOz?: number;
  evPerReserveOzLabel: string;
  evPerReserveOzValue: string;
  evPerResourceOzLabel: string;
  evPerResourceOzValue: string;
  /** Raw USD per unit for sorting (reserve metric). */
  evPerReserveUsdPerUnit?: number | null;
  /** Raw USD per unit for sorting (resource metric). */
  evPerResourceUsdPerUnit?: number | null;
  reserveOuncesUsed?: number;
  resourceOuncesUsed?: number;
  reserveMetalNote?: string;
  resourceMetalNote?: string;
};

const METRIC_TONNES_TO_LB = 22.0462;
const GT_TO_OZ_PER_TONNE = 0.032151;

/** Kemess / Mount Milligan / Red Chris recovery assumptions (Pacific Ridge NI 43-101). */
const PEX_CU_RECOVERY = 0.84;
const PEX_AU_RECOVERY = 0.7;
const PEX_AG_RECOVERY = 0.65;

function resolveEnterpriseValueUsd(company: Company): number | null {
  if (company.enterpriseValue != null && company.enterpriseValue > 0) return company.enterpriseValue;
  const mc = company.marketCap ?? 0;
  const cash = company.balanceCash ?? 0;
  const debt = (company.balanceDebt ?? 0) + (company.minorityInterest ?? 0);
  if (mc > 0) return mc + debt - cash;
  return null;
}

function isOunceDenominatedUnit(unit: string): boolean {
  return /\boz\b/i.test(unit);
}

/** USD per physical unit (oz, lb, etc.) — null when undefined. */
export function computeEvPerUnitUsd(evUsd: number, divisorUnits: number): number | null {
  if (!Number.isFinite(evUsd) || evUsd <= 0 || !Number.isFinite(divisorUnits) || divisorUnits <= 0) {
    return null;
  }
  return evUsd / divisorUnits;
}

/**
 * Gold/silver/AuEq: always $/oz (e.g. $2,047/oz Au), never $K/oz.
 * Copper/lb: $/lb with extra decimals when &lt; $0.01/lb.
 */
export function formatEvPerUnitUsd(perUnitUsd: number | null, unit: string): string {
  if (perUnitUsd == null || !Number.isFinite(perUnitUsd) || perUnitUsd <= 0) return "—";

  if (isOunceDenominatedUnit(unit)) {
    if (perUnitUsd >= 1_000_000) {
      return `$${perUnitUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}/${unit}`;
    }
    if (perUnitUsd >= 100) {
      return `$${Math.round(perUnitUsd).toLocaleString("en-US")}/${unit}`;
    }
    return `$${perUnitUsd.toFixed(2)}/${unit}`;
  }

  if (perUnitUsd >= 1_000_000) return `$${(perUnitUsd / 1_000_000).toFixed(2)}M/${unit}`;
  if (perUnitUsd < 0.01) return `$${perUnitUsd.toFixed(4)}/${unit}`;
  if (perUnitUsd < 1) return `$${perUnitUsd.toFixed(3)}/${unit}`;
  return `$${perUnitUsd.toFixed(2)}/${unit}`;
}

/** Grade is % (e.g. 0.33 = 0.33% CuEq). Uses standard factor 22.0462 lb per metric tonne per 1% grade. */
function containedLbFromMtAndGradePercent(tonnesMt: number, gradePercent: number): number {
  return tonnesMt * 1_000_000 * METRIC_TONNES_TO_LB * gradePercent;
}

function pacificRidgeSpotCuEqPct(params: {
  cuPct: number;
  auGt: number;
  agGt: number;
  spotCuUsdPerLb: number;
  spotAuUsdPerOz: number;
  spotAgUsdPerOz: number;
}): number {
  const { cuPct, auGt, agGt, spotCuUsdPerLb, spotAuUsdPerOz, spotAgUsdPerOz } = params;
  const cuR = PEX_CU_RECOVERY;
  const auR = PEX_AU_RECOVERY;
  const agR = PEX_AG_RECOVERY;
  const numerator =
    cuPct * spotCuUsdPerLb * METRIC_TONNES_TO_LB +
    auGt * (auR / cuR) * spotAuUsdPerOz * GT_TO_OZ_PER_TONNE +
    agGt * (agR / cuR) * spotAgUsdPerOz * GT_TO_OZ_PER_TONNE;
  return numerator / (spotCuUsdPerLb * METRIC_TONNES_TO_LB);
}

/** Total in-situ AuEq oz at spot from NI 43-101 contained metal (lb Cu, oz Au/Ag). */
function pacificRidgeAuEqOzFromContainedAtSpot(params: {
  containedCuLb: number;
  containedAuOz: number;
  containedAgOz: number;
  spotCuUsdPerLb: number;
  spotAuUsdPerOz: number;
  spotAgUsdPerOz: number;
}): number {
  const { containedCuLb, containedAuOz, containedAgOz, spotCuUsdPerLb, spotAuUsdPerOz, spotAgUsdPerOz } =
    params;
  const cuValueUsd = containedCuLb * spotCuUsdPerLb * PEX_CU_RECOVERY;
  const agValueUsd = containedAgOz * spotAgUsdPerOz * PEX_AG_RECOVERY;
  const auEqFromCu = cuValueUsd / spotAuUsdPerOz;
  const auEqFromAg = agValueUsd / spotAuUsdPerOz;
  return containedAuOz * PEX_AU_RECOVERY + auEqFromCu + auEqFromAg;
}

export function computeEvPerMetalMetrics(params: {
  company: Company;
  inventory: MineralInventoryFile;
  spotGoldUsdPerOz: number;
  spotCopperUsdPerLb: number;
  spotSilverUsdPerOz?: number;
}): EvPerMetalMetrics | null {
  const { company, inventory, spotGoldUsdPerOz, spotCopperUsdPerLb } = params;
  const spotSilverUsdPerOz = params.spotSilverUsdPerOz ?? 30;
  const evUsd = resolveEnterpriseValueUsd(company);
  if (evUsd == null || evUsd <= 0) return null;

  const s = inventory.summary;

  if (
    inventory.commodityFocus === "copper-gold" &&
    s.resourceTonnesMt &&
    s.containedCuEqLb &&
    !s.reserves?.containedMoz &&
    !(s.reserves?.containedCuLb && s.reserves.containedCuLb > 0)
  ) {
    const tonnesMt = s.resourceTonnesMt ?? 0;
    const cuPct = s.resourceCuPct ?? 0;
    const auGt = s.resourceAuGt ?? 0;
    const agGt = s.resourceAgGt ?? 0;
    const cuEqPctSpot = pacificRidgeSpotCuEqPct({
      cuPct,
      auGt,
      agGt,
      spotCuUsdPerLb: spotCopperUsdPerLb,
      spotAuUsdPerOz: spotGoldUsdPerOz,
      spotAgUsdPerOz: spotSilverUsdPerOz,
    });
    const cuEqLbSpot = containedLbFromMtAndGradePercent(tonnesMt, cuEqPctSpot);
    const cuEqLbReported = s.containedCuEqLb ?? containedLbFromMtAndGradePercent(tonnesMt, s.resourceCuEqPct ?? 0);
    const auEqOzSpot = pacificRidgeAuEqOzFromContainedAtSpot({
      containedCuLb: s.containedCuLb ?? 0,
      containedAuOz: s.containedAuOz ?? 0,
      containedAgOz: s.containedAgOz ?? 0,
      spotCuUsdPerLb: spotCopperUsdPerLb,
      spotAuUsdPerOz: spotGoldUsdPerOz,
      spotAgUsdPerOz: spotSilverUsdPerOz,
    });
    const reservePerUnit = computeEvPerUnitUsd(evUsd, cuEqLbReported);
    const resourcePerUnit = computeEvPerUnitUsd(evUsd, auEqOzSpot);
    return {
      spotGoldUsdPerOz,
      spotCopperUsdPerLb,
      spotSilverUsdPerOz,
      evPerReserveOzLabel: "EV / lb CuEq (inferred)",
      evPerReserveOzValue: formatEvPerUnitUsd(reservePerUnit, "lb CuEq"),
      evPerResourceOzLabel: "EV / oz AuEq (spot)",
      evPerResourceOzValue: formatEvPerUnitUsd(resourcePerUnit, "oz AuEq"),
      evPerReserveUsdPerUnit: reservePerUnit,
      evPerResourceUsdPerUnit: resourcePerUnit,
      reserveMetalNote: `${(cuEqLbReported / 1e9).toFixed(2)} Blb CuEq (KMZ inferred)`,
      resourceMetalNote: `Spot AuEq from contained Au/Cu/Ag at spot prices`,
    };
  }

  const reserveCuLb = s.reserves?.containedCuLb ?? s.containedCuEqLb ?? 0;
  const miCuLb = s.measuredIndicated?.containedCuLb ?? reserveCuLb;
  if (inventory.commodityFocus === "copper-gold" && miCuLb > 0 && !reserveCuLb) {
    const perUnit = computeEvPerUnitUsd(evUsd, miCuLb);
    const isNonCompliant = inventory.resourceReporting?.disclosureNote?.toLowerCase().includes("non-jorc")
      || inventory.resourceReporting?.disclosureNote?.toLowerCase().includes("non-code");
    return {
      spotCopperUsdPerLb,
      evPerReserveOzLabel: isNonCompliant ? "EV / lb Cu (hist. non-JORC)" : "EV / lb Cu (M&I)",
      evPerReserveOzValue: formatEvPerUnitUsd(perUnit, "lb Cu"),
      evPerResourceOzLabel: "EV / lb Cu (same basis)",
      evPerResourceOzValue: formatEvPerUnitUsd(perUnit, "lb Cu"),
      evPerReserveUsdPerUnit: perUnit,
      evPerResourceUsdPerUnit: perUnit,
      reserveMetalNote: `${(miCuLb / 1e9).toFixed(2)} Blb Cu basis (no reserves declared)`,
      resourceMetalNote: inventory.resourceReporting?.disclosureNote,
    };
  }
  if (inventory.commodityFocus === "copper-gold" && reserveCuLb > 0) {
    const reservePerUnit = computeEvPerUnitUsd(evUsd, reserveCuLb);
    const resourcePerUnit = computeEvPerUnitUsd(evUsd, miCuLb);
    return {
      spotCopperUsdPerLb,
      evPerReserveOzLabel: "EV / lb Cu (reserves)",
      evPerReserveOzValue: formatEvPerUnitUsd(reservePerUnit, "lb Cu"),
      evPerResourceOzLabel: "EV / lb Cu (M&I)",
      evPerResourceOzValue: formatEvPerUnitUsd(resourcePerUnit, "lb Cu"),
      evPerReserveUsdPerUnit: reservePerUnit,
      evPerResourceUsdPerUnit: resourcePerUnit,
      reserveMetalNote: `${(reserveCuLb / 1e9).toFixed(2)} Blb Cu in reserves`,
      resourceMetalNote: `${(miCuLb / 1e9).toFixed(2)} Blb Cu in M&I`,
    };
  }

  const reserveSnLb = s.reserves?.containedSnLb ?? 0;
  const miSnLb = s.measuredIndicated?.containedSnLb ?? s.containedSnLb ?? 0;
  if (inventory.commodityFocus === "tin" && miSnLb > 0) {
    const reservePerUnit = computeEvPerUnitUsd(evUsd, reserveSnLb > 0 ? reserveSnLb : miSnLb);
    const resourcePerUnit = computeEvPerUnitUsd(evUsd, miSnLb);
    const reserveT = s.reserves?.containedSnT ?? 0;
    const miT = s.measuredIndicated?.containedSnT ?? s.containedSnT ?? 0;
    return {
      evPerReserveOzLabel: reserveSnLb > 0 ? "EV / lb Sn (reserves)" : "EV / lb Sn (M&I proxy)",
      evPerReserveOzValue: formatEvPerUnitUsd(reservePerUnit, "lb Sn"),
      evPerResourceOzLabel: "EV / lb Sn (M&I)",
      evPerResourceOzValue: formatEvPerUnitUsd(resourcePerUnit, "lb Sn"),
      evPerReserveUsdPerUnit: reservePerUnit,
      evPerResourceUsdPerUnit: resourcePerUnit,
      reserveMetalNote: reserveT > 0 ? `${(reserveT / 1000).toFixed(0)} kt Sn in reserves` : undefined,
      resourceMetalNote: miT > 0 ? `${(miT / 1000).toFixed(0)} kt Sn in M&I` : undefined,
    };
  }

  const et = inventory.explorationTarget;
  if (et && et.containedCuMtMin > 0 && et.containedCuMtMax > 0) {
    const cuMtMid = (et.containedCuMtMin + et.containedCuMtMax) / 2;
    const cuLbMid = cuMtMid * 1_000_000 * METRIC_TONNES_TO_LB;
    const agMozMid =
      et.containedAgMozMin != null && et.containedAgMozMax != null
        ? (et.containedAgMozMin + et.containedAgMozMax) / 2
        : null;
    const cuPerUnit = computeEvPerUnitUsd(evUsd, cuLbMid);
    const agPerUnit =
      agMozMid != null ? computeEvPerUnitUsd(evUsd, agMozMid * 1_000_000) : null;
    return {
      spotCopperUsdPerLb,
      spotSilverUsdPerOz,
      evPerReserveOzLabel: "EV / lb Cu (ET mid)",
      evPerReserveOzValue: formatEvPerUnitUsd(cuPerUnit, "lb Cu"),
      evPerResourceOzLabel: agPerUnit != null ? "EV / oz Ag (ET mid)" : "EV / oz (ET)",
      evPerResourceOzValue:
        agPerUnit != null ? formatEvPerUnitUsd(agPerUnit, "oz Ag") : formatEvPerUnitUsd(cuPerUnit, "lb Cu"),
      evPerReserveUsdPerUnit: cuPerUnit,
      evPerResourceUsdPerUnit: agPerUnit ?? cuPerUnit,
      reserveMetalNote: `${cuMtMid.toFixed(1)} Mt Cu contained (ET midpoint; ${et.containedCuMtMin}–${et.containedCuMtMax} Mt range)`,
      resourceMetalNote:
        agMozMid != null
          ? `${agMozMid.toFixed(0)} Moz Ag contained (ET midpoint)`
          : "Exploration target only — not a mineral resource",
    };
  }

  if (inventory.commodityFocus === "silver" || inventory.commodityFocus === "gold") {
    const metal = inventory.commodityFocus === "silver" ? "Ag" : "Au";
    const spotOz = inventory.commodityFocus === "silver" ? (params.spotSilverUsdPerOz ?? 32) : spotGoldUsdPerOz;
    const reserveOz = inventory.summary.reserves?.attributableMoz ?? inventory.summary.reserves?.containedMoz;
    const resourceOz =
      inventory.summary.measuredIndicated?.attributableMoz ??
      inventory.summary.measuredIndicated?.containedMoz;

    const reserveOzUnits = (reserveOz ?? 0) * 1_000_000;
    const resourceOzUnits = (resourceOz ?? 0) * 1_000_000;
    const reservePerUnit = computeEvPerUnitUsd(evUsd, reserveOzUnits);
    const resourcePerUnit = computeEvPerUnitUsd(evUsd, resourceOzUnits);
    const miExclReserves = inventory.resourceReporting?.measuredIndicatedIncludesReserves === false;
    const noReserves = !reserveOz || reserveOz <= 0;
    return {
      spotGoldUsdPerOz: spotOz,
      spotSilverUsdPerOz: inventory.commodityFocus === "silver" ? spotOz : params.spotSilverUsdPerOz,
      evPerReserveOzLabel: noReserves
        ? "EV / M&I oz Ag (no reserves)"
        : `EV / reserve oz (spot)`,
      evPerReserveOzValue: formatEvPerUnitUsd(
        noReserves ? resourcePerUnit : reservePerUnit,
        `oz ${metal}`,
      ),
      evPerResourceOzLabel: miExclReserves ? `EV / M&I oz (excl. reserves)` : `EV / M&I oz (incl. reserves)`,
      evPerResourceOzValue: formatEvPerUnitUsd(resourcePerUnit, `oz ${metal}`),
      evPerReserveUsdPerUnit: reservePerUnit,
      evPerResourceUsdPerUnit: resourcePerUnit,
      reserveOuncesUsed: reserveOz,
      resourceOuncesUsed: resourceOz,
      reserveMetalNote: reserveOz
        ? `Attributable P&P reserves (${metal})`
        : noReserves
          ? "No reserves declared — M&I resource only"
          : undefined,
      resourceMetalNote: resourceOz ? `M&I resource (${metal})` : undefined,
    };
  }

  return null;
}
