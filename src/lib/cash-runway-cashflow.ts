import type { OperatingCashFlowFile, OperatingCashFlowYear } from "@/lib/operating-cashflow";

export type CashFlowRunwayAlignment = {
  /** Signed: positive = net cash generation per month, negative = net burn. */
  monthlyNetCashChangeM: number;
  annualFcfM: number;
  sourceLabel: string;
  selfFunding: boolean;
  /** Operating + investing only (excludes financing) — stress-case burn. */
  monthlyOperatingInvestingBurnM: number | null;
};

function yearFcf(y: OperatingCashFlowYear): number {
  return y.ocfUsdM + y.capexUsdM + y.financingUsdM;
}

function yearOperatingInvesting(y: OperatingCashFlowYear): number {
  return y.ocfUsdM + y.capexUsdM;
}

function isForwardYear(y: OperatingCashFlowYear, calendarYear: number): boolean {
  if (y.calendarYear > calendarYear) return true;
  const label = (y.label ?? "").toUpperCase();
  return label.includes("E") || label.includes("EST");
}

/** Pick forward / current-year periods for runway alignment with the cash flow chart. */
export function pickForwardCashFlowYears(
  file: OperatingCashFlowFile,
  asOfYear = new Date().getUTCFullYear(),
): OperatingCashFlowYear[] {
  const forward = file.years.filter((y) => isForwardYear(y, asOfYear));
  if (forward.length > 0) return forward.slice(0, 2);
  return file.years.slice(-2);
}

export function deriveRunwayFromOperatingCashFlow(
  file: OperatingCashFlowFile,
  asOfYear = new Date().getUTCFullYear(),
): CashFlowRunwayAlignment {
  const focus = pickForwardCashFlowYears(file, asOfYear);
  const annualFcfM = focus.reduce((s, y) => s + yearFcf(y), 0) / focus.length;
  const annualOiM =
    focus.reduce((s, y) => s + yearOperatingInvesting(y), 0) / focus.length;
  const monthlyNetCashChangeM = annualFcfM / 12;
  const monthlyOperatingInvestingBurnM = annualOiM < 0 ? Math.abs(annualOiM) / 12 : 0;

  const labels = focus.map((y) => y.label ?? String(y.calendarYear)).join(", ");
  const selfFunding = annualFcfM > 0.05;

  return {
    monthlyNetCashChangeM,
    annualFcfM,
    sourceLabel: `Aligned to cash flow chart (${labels}; avg FCF ${annualFcfM >= 0 ? "+" : ""}${annualFcfM.toFixed(1)}M/yr)`,
    selfFunding,
    monthlyOperatingInvestingBurnM:
      monthlyOperatingInvestingBurnM > 0 ? monthlyOperatingInvestingBurnM : null,
  };
}
