import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { resolveTreasuryCashM } from "@/lib/treasury-cash";

const CASH_MAR_2026_CAD_M = 4.0;
/** ~C$2.4M/yr corporate — JOY field spend is Freeport-funded under JVA. */
const CORPORATE_MONTHLY_BURN_CAD_M = 0.2;

export function buildAmarcCashRunwayModel(balanceCashCad?: number | null): CashRunwayModel {
  const publishedCashCadM = resolveTreasuryCashM(balanceCashCad, CASH_MAR_2026_CAD_M);

  return buildCashRunwayModel({
    companyDisplayName: "Amarc Resources",
    currentCashCadM: publishedCashCadM,
    currentCashAsOf: "2026-03-31",
    monthlyNetCashChangeCadM: -CORPORATE_MONTHLY_BURN_CAD_M,
    monthlyBurnNote:
      "Corporate G&A + DUKE/IKE only (~C$2.4M/yr); JOY drilling is partner-funded (Freeport Stage 2 min C$10M/yr).",
    minimumLiquidityCadM: 2.0,
    snapshots: [
      {
        asOf: "2025-12-31",
        label: "Dec '25",
        cashCadM: 3.2,
        kind: "actual",
        note: "Approx. group cash pre-2026 field season",
      },
      {
        asOf: "2026-03-31",
        label: "Mar '26",
        cashCadM: publishedCashCadM,
        kind: "actual",
        note: "Corporate treasury; JOY exploration partner-funded",
      },
    ],
    methodology: [
      "Cash from Amarc corporate filings / tracker (CAD).",
      "Burn excludes Freeport-funded JOY exploration.",
      "Corporate runway ~20 months at modeled G&A-only burn.",
    ],
  });
}
