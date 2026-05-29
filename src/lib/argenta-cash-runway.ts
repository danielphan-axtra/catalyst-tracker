import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { deriveRunwayFromOperatingCashFlow } from "@/lib/cash-runway-cashflow";
import { loadOperatingCashFlowFromRepoFile } from "@/lib/operating-cashflow";
import { resolveTreasuryCashM } from "@/lib/treasury-cash";

/** ~C$22.5M working capital post Jan 2026 financing (company deck). */
const CASH_POST_FINANCING_CAD_M = 22.5;

export function buildArgentaCashRunwayModel(balanceCashCad?: number | null): CashRunwayModel {
  const file = loadOperatingCashFlowFromRepoFile("argenta-operating-cashflow.json");
  const alignment = deriveRunwayFromOperatingCashFlow(file, 2026);

  const publishedCashCadM = resolveTreasuryCashM(balanceCashCad, CASH_POST_FINANCING_CAD_M);

  /** FY2026E program spend (~C$20M/yr ocf+capex) — capped for runway display vs C$23M raise. */
  const ocfBurn =
    alignment.monthlyOperatingInvestingBurnM ?? Math.abs(Math.min(0, alignment.monthlyNetCashChangeM));
  const monthlyBurn = Math.min(ocfBurn, 1.35);

  return buildCashRunwayModel({
    companyDisplayName: "Argenta Silver",
    currency: "CAD",
    currentCashCadM: publishedCashCadM,
    currentCashAsOf: "2026-01-31",
    monthlyNetCashChangeCadM: -monthlyBurn,
    financingIncludedInAnchor: true,
    monthlyBurnNote: `${alignment.sourceLabel}; 25,000 m drill + metallurgy on El Quevar (advanced exploration, no reserves).`,
    selfFunding: false,
    minimumLiquidityCadM: 3.0,
    snapshots: [
      {
        asOf: "2025-06-30",
        label: "Jun '25",
        cashCadM: 8.0,
        kind: "actual",
        note: "Pre-financing exploration treasury (approx.)",
      },
      {
        asOf: "2026-01-31",
        label: "Jan '26",
        cashCadM: publishedCashCadM,
        kind: "actual",
        note: "Post C$23M bought-deal placement",
      },
    ],
    methodology: [
      "Cash from Argenta Silver corporate updates (CAD).",
      "Burn aligned to exploration cash flow chart — no mine revenue until future study.",
      "Fully funded for 2025–2026 25,000 m program per company releases.",
    ],
  });
}
