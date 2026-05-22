import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";

/** Balance-sheet-based runway for explorers without custom financials in the tracker. */
export function buildGenericExplorerCashRunway(params: {
  companyDisplayName: string;
  symbol: string;
  balanceCashUsd: number;
  currency?: "CAD" | "USD";
}): CashRunwayModel {
  const currency = params.currency ?? (params.symbol.toUpperCase().includes(".V") ? "CAD" : "USD");
  const cashM = params.balanceCashUsd / 1_000_000;
  const annualBurnPct = 0.72;
  const monthlyBurnM = Math.max(0.12, (cashM * annualBurnPct) / 12);
  const asOf = new Date().toISOString().slice(0, 10);

  return buildCashRunwayModel({
    companyDisplayName: params.companyDisplayName,
    currency,
    currentCashCadM: cashM,
    currentCashAsOf: asOf,
    monthlyNetCashChangeCadM: -monthlyBurnM,
    monthlyBurnNote: `Estimated monthly burn at ~${Math.round(annualBurnPct * 100)}% of reported cash per year (placeholder until filing-linked cash flows are added).`,
    snapshots: [
      {
        asOf,
        label: "Latest BS",
        cashCadM: cashM,
        kind: "actual",
        note: `Cash from market data (${currency})`,
      },
    ],
    methodology: [
      "Explorer–developer profile: no current mine production in DCF assumptions.",
      `Cash balance sourced from company market-data fields (${currency}).`,
      "Burn rate is a simplified estimate for runway visualization—not from audited cash-flow statements.",
    ],
  });
}
