import type { MineralInventoryFile } from "@/lib/mineral-inventory-types";

export type ResourceReportingLabels = {
  measuredIndicatedTitle: string;
  measuredIndicatedMozSuffix: string;
  inferredTitle: string;
  inferredNote: string;
  reservesNote?: string;
  combinedExclusiveMoz?: number | null;
};

export function getResourceReportingLabels(inventory: MineralInventoryFile): ResourceReportingLabels {
  const rr = inventory.resourceReporting;
  const miIncludesReserves = rr?.measuredIndicatedIncludesReserves ?? false;
  const inferredSeparate = rr?.inferredReportedSeparately ?? true;

  const reservesMoz = inventory.summary.reserves?.attributableMoz ?? inventory.summary.reserves?.containedMoz;
  const miMoz =
    inventory.summary.measuredIndicated?.attributableMoz ??
    inventory.summary.measuredIndicated?.containedMoz;

  let combinedExclusiveMoz: number | null = null;
  if (!miIncludesReserves && reservesMoz != null && miMoz != null) {
    combinedExclusiveMoz = reservesMoz + miMoz;
  }

  return {
    measuredIndicatedTitle: miIncludesReserves
      ? "Measured & indicated (incl. reserves)"
      : "Measured & indicated (excl. reserves)",
    measuredIndicatedMozSuffix: miIncludesReserves ? "Moz Au (incl. reserves)" : "Moz Au (excl. reserves)",
    inferredTitle: "Inferred resources",
    inferredNote: inferredSeparate
      ? "Reported separately; not included in M&I above."
      : "",
    reservesNote: miIncludesReserves
      ? undefined
      : "Reserves are not included in the M&I resource figure below (per company disclosure).",
    combinedExclusiveMoz,
  };
}

export function formatMiSummaryLine(
  inventory: MineralInventoryFile,
  moz: number,
  attributableMoz?: number | null,
): string {
  const labels = getResourceReportingLabels(inventory);
  const base = `${moz.toFixed(1)} ${labels.measuredIndicatedMozSuffix}`;
  if (attributableMoz != null && attributableMoz !== moz) {
    return `${base}; ${attributableMoz.toFixed(1)} Moz attributable`;
  }
  return base;
}
