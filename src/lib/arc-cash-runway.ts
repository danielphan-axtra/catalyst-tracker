import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { resolveTreasuryCashM } from "@/lib/treasury-cash";

const APR_2026_FINANCING = {
  closeDate: "2026-04-24",
  grossGbpM: 3.0,
  feesGbpM: 0.18,
  netGbpM: 2.82,
};

const CASH_PRE_FINANCING_OCT_2025_GBP_M = 1.2;
const CASH_POST_FINANCING_GBP_M = CASH_PRE_FINANCING_OCT_2025_GBP_M + APR_2026_FINANCING.netGbpM;
/** ~£1.5M/yr — Virgo + limited Kabompo work post-settlement. */
const MONTHLY_BURN_GBP_M = 0.125;

export function buildArcCashRunwayModel(balanceCashGbp?: number | null): CashRunwayModel {
  const publishedCashGbpM = resolveTreasuryCashM(balanceCashGbp, CASH_POST_FINANCING_GBP_M);

  return buildCashRunwayModel({
    companyDisplayName: "Arc Minerals",
    currency: "GBP",
    currentCashCadM: publishedCashGbpM,
    currentCashAsOf: APR_2026_FINANCING.closeDate,
    monthlyNetCashChangeCadM: -MONTHLY_BURN_GBP_M,
    monthlyBurnNote: `~£${(MONTHLY_BURN_GBP_M * 12).toFixed(1)}M/yr corporate exploration + admin (post Apr 2026 placing).`,
    minimumLiquidityCadM: 1.0,
    financingIncludedInAnchor: true,
    snapshots: [
      {
        asOf: "2025-10-31",
        label: "Oct '25",
        cashCadM: CASH_PRE_FINANCING_OCT_2025_GBP_M,
        kind: "actual",
        note: "Pre-financing; Anglo JV exit",
      },
      {
        asOf: APR_2026_FINANCING.closeDate,
        label: "Apr '26",
        cashCadM: publishedCashGbpM,
        kind: "proforma",
        note: `Oct'25 £${CASH_PRE_FINANCING_OCT_2025_GBP_M.toFixed(1)}M + £${APR_2026_FINANCING.netGbpM.toFixed(2)}M net placing`,
      },
    ],
    financingEvent: {
      date: APR_2026_FINANCING.closeDate,
      grossCadM: APR_2026_FINANCING.grossGbpM,
      feesCadM: APR_2026_FINANCING.feesGbpM,
      netCadM: APR_2026_FINANCING.netGbpM,
      label: "Placing & creditor subscription (Apr 24, 2026)",
    },
    methodology: [
      "Cash in GBP (AIM: ARCM). Apr 2026 ~£3.0M gross placing per RNS.",
      "Post-close anchor = pre-raise cash + net proceeds (tracker may show rounded £5M).",
      "Kabompo West exploration-only; runway is corporate treasury.",
    ],
  });
}
