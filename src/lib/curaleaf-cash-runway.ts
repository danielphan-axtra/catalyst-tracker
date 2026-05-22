import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { deriveRunwayFromOperatingCashFlow } from "@/lib/cash-runway-cashflow";
import { loadOperatingCashFlowFromRepoFile } from "@/lib/operating-cashflow";

const CASH_DEC_2023_USDM = 95;
const CASH_SEP_2024_USDM = 103;
const CASH_MAR_2025_USDM = 129;

export function buildCuraleafCashRunwayModel(balanceCashUsd?: number | null): CashRunwayModel {
  const file = loadOperatingCashFlowFromRepoFile("curaleaf-operating-cashflow.json");
  const alignment = deriveRunwayFromOperatingCashFlow(file);

  const publishedCashUsdM =
    balanceCashUsd != null && balanceCashUsd > 0
      ? balanceCashUsd / 1_000_000
      : CASH_MAR_2025_USDM;

  return buildCashRunwayModel({
    companyDisplayName: "Curaleaf Holdings",
    currency: "USD",
    currentCashCadM: publishedCashUsdM,
    currentCashAsOf: "2025-03-31",
    monthlyNetCashChangeCadM: alignment.monthlyNetCashChangeM,
    monthlyBurnNote: alignment.sourceLabel,
    selfFunding: alignment.selfFunding,
    minimumLiquidityCadM: 50,
    snapshots: [
      {
        asOf: "2023-12-31",
        label: "Dec '23",
        cashCadM: CASH_DEC_2023_USDM,
        kind: "actual",
      },
      {
        asOf: "2024-09-30",
        label: "Sep '24",
        cashCadM: CASH_SEP_2024_USDM,
        kind: "actual",
        note: "Q3 2024 balance sheet",
      },
      {
        asOf: "2025-03-31",
        label: "Mar '25",
        cashCadM: publishedCashUsdM,
        kind: "actual",
        note: "Latest reported cash",
      },
    ],
    methodology: [
      "Cash balances from Curaleaf quarterly filings (USD, consolidated).",
      "Runway monthly net cash change is derived from the same forward years as the cash flow chart (OCF + capex + financing).",
      "When projected FCF is positive, no forward financing window is shown.",
    ],
  });
}
