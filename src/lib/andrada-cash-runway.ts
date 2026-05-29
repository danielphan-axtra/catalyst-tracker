import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { deriveRunwayFromOperatingCashFlow } from "@/lib/cash-runway-cashflow";
import { loadOperatingCashFlowFromRepoFile } from "@/lib/operating-cashflow";

const CASH_FEB_2025_GBP_M = 1.82;
const CASH_FEB_2026_GBP_M = 4.2;

export function buildAndradaCashRunwayModel(balanceCashGbp?: number | null): CashRunwayModel {
  const file = loadOperatingCashFlowFromRepoFile("andrada-operating-cashflow.json");
  const alignment = deriveRunwayFromOperatingCashFlow(file, 2026);

  const publishedCashGbpM =
    balanceCashGbp != null && balanceCashGbp > 0
      ? balanceCashGbp / 1_000_000
      : CASH_FEB_2026_GBP_M;

  const monthlyChange =
    alignment.selfFunding && alignment.monthlyNetCashChangeM > 0
      ? alignment.monthlyNetCashChangeM
      : alignment.monthlyOperatingInvestingBurnM != null
        ? -alignment.monthlyOperatingInvestingBurnM
        : alignment.monthlyNetCashChangeM;

  return buildCashRunwayModel({
    companyDisplayName: "Andrada Mining",
    currency: "GBP",
    currentCashCadM: publishedCashGbpM,
    currentCashAsOf: "2026-02-28",
    monthlyNetCashChangeCadM: monthlyChange,
    monthlyBurnNote: alignment.selfFunding
      ? `${alignment.sourceLabel}; Uis is self-funding on modeled FCF — jig/lithium capex is the main use of cash.`
      : `${alignment.sourceLabel}; stress view uses operating + investing outflows.`,
    selfFunding: alignment.selfFunding,
    minimumLiquidityCadM: 1.0,
    snapshots: [
      {
        asOf: "2025-02-28",
        label: "Feb '25",
        cashCadM: CASH_FEB_2025_GBP_M,
        kind: "actual",
        note: "FY2025 year-end cash (annual report)",
      },
      {
        asOf: "2026-02-28",
        label: "Feb '26",
        cashCadM: publishedCashGbpM,
        kind: "actual",
        note: "FY2026 year-end cash (operational update)",
      },
    ],
    methodology: [
      "Cash from Andrada consolidated statements (GBP, year ended 28 February).",
      "Forward path aligned to operating cash flow chart (FY2027–28 estimates).",
      "Financing window only if forward operating/investing paths imply cash stress.",
    ],
  });
}
