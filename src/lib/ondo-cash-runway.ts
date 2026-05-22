import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { deriveRunwayFromOperatingCashFlow } from "@/lib/cash-runway-cashflow";
import { loadOperatingCashFlowFromRepoFile } from "@/lib/operating-cashflow";

const CASH_MAR_2024_GBP_M = 0.397;
const CASH_MAR_2025_GBP_M = 3.989;

export function buildOndoCashRunwayModel(balanceCashGbp?: number | null): CashRunwayModel {
  const file = loadOperatingCashFlowFromRepoFile("ondo-operating-cashflow.json");
  const alignment = deriveRunwayFromOperatingCashFlow(file);

  const publishedCashGbpM =
    balanceCashGbp != null && balanceCashGbp > 0
      ? balanceCashGbp / 1_000_000
      : CASH_MAR_2025_GBP_M;

  const monthlyChange =
    alignment.selfFunding && alignment.monthlyNetCashChangeM > 0
      ? alignment.monthlyNetCashChangeM
      : alignment.monthlyOperatingInvestingBurnM != null
        ? -alignment.monthlyOperatingInvestingBurnM
        : alignment.monthlyNetCashChangeM;

  return buildCashRunwayModel({
    companyDisplayName: "Ondo InsurTech",
    currency: "GBP",
    currentCashCadM: publishedCashGbpM,
    currentCashAsOf: "2025-03-31",
    monthlyNetCashChangeCadM: monthlyChange,
    monthlyBurnNote: alignment.selfFunding
      ? `${alignment.sourceLabel}; near-term operating/investing still draws cash before FCF turns positive.`
      : `${alignment.sourceLabel}; stress view uses operating + investing outflows (excludes equity financing).`,
    selfFunding: alignment.selfFunding,
    minimumLiquidityCadM: 1.5,
    snapshots: [
      {
        asOf: "2024-03-31",
        label: "Mar '24",
        cashCadM: CASH_MAR_2024_GBP_M,
        kind: "actual",
        note: "FY2024 year-end net cash",
      },
      {
        asOf: "2025-03-31",
        label: "Mar '25",
        cashCadM: publishedCashGbpM,
        kind: "actual",
        note: "FY2025 year-end net cash",
      },
    ],
    methodology: [
      "Cash from Ondo InsurTech consolidated statements (GBP, year ended 31 March).",
      "Forward burn aligned to cash flow chart forward years; equity financing inflows are not assumed to repeat.",
      "Financing window only appears when forward FCF and operating/investing paths imply future cash stress.",
    ],
  });
}
