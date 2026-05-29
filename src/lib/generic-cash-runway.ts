import { buildCashRunwayModel, type CashRunwayCurrency, type CashRunwayModel } from "@/lib/cash-runway";

function inferExplorerCurrency(symbol: string): CashRunwayCurrency {
  const s = symbol.toUpperCase();
  if (s.endsWith(".V")) return "CAD";
  if (s.endsWith(".L")) return "GBP";
  return "USD";
}

/**
 * Annual cash consumption as % of treasury — tiered by scale.
 * Also caps implied runway at 18–36 months so micro-caps are not modeled to zero in <12 mo.
 */
function explorerMonthlyBurnM(cashM: number): number {
  const annualPct = cashM >= 25 ? 0.32 : cashM >= 10 ? 0.45 : 0.55;
  const pctBurn = (cashM * annualPct) / 12;
  const minRunwayMonths = cashM >= 25 ? 36 : cashM >= 10 ? 24 : 18;
  const runwayCapped = cashM / minRunwayMonths;
  return Math.max(0.1, Math.min(pctBurn, runwayCapped));
}

/** Balance-sheet-based runway for explorers without custom financials in the tracker. */
export function buildGenericExplorerCashRunway(params: {
  companyDisplayName: string;
  symbol: string;
  balanceCashUsd: number;
  currency?: CashRunwayCurrency;
}): CashRunwayModel {
  const currency = params.currency ?? inferExplorerCurrency(params.symbol);
  const cashM = params.balanceCashUsd / 1_000_000;
  const monthlyBurnM = explorerMonthlyBurnM(cashM);
  const impliedRunwayMo = Math.round(cashM / monthlyBurnM);
  const asOf = new Date().toISOString().slice(0, 10);

  return buildCashRunwayModel({
    companyDisplayName: params.companyDisplayName,
    currency,
    currentCashCadM: cashM,
    currentCashAsOf: asOf,
    monthlyNetCashChangeCadM: -monthlyBurnM,
    monthlyBurnNote: `Estimated ~C$${monthlyBurnM.toFixed(2)}M/mo burn (~${impliedRunwayMo} mo runway at reported cash; placeholder until filing-linked cash flows).`,
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
