import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { resolveTreasuryCashM } from "@/lib/treasury-cash";

export type { CashRunwayModel as IdexCashRunwayModel };

/** FY ended Jul 31, 2025 — consolidated statement of cash flows */
const FY25_OPERATING_CASH_USE_CADM = 2_973_897;
const FY25_INVESTING_CASH_USE_CADM = 499_984;
const FY25_MONTHLY_BURN_CADM = (FY25_OPERATING_CASH_USE_CADM + FY25_INVESTING_CASH_USE_CADM) / 12;

/**
 * Post–May 5, 2026 treasury: Jul'25 audited cash + net placement proceeds.
 * Do not subtract interim burn on top — the raise funds the gap to the 10,000 m program.
 */
const MAY_2026_FINANCING = {
  closeDate: "2026-05-05",
  grossCadM: 8.05,
  feesCadM: 449_220 / 1e6,
  netCadM: 8.05 - 449_220 / 1e6,
};

const CASH_JUL_31_2024_CADM = 400_480 / 1e6;
const CASH_APR_30_2025_CADM = (3_679 + 4_333_525) / 1e6;
const CASH_JUL_31_2025_CADM = 1_603_811 / 1e6;
const CASH_POST_MAY_2026_CADM = CASH_JUL_31_2025_CADM + MAY_2026_FINANCING.netCadM;

/** ~C$3.6M/yr — 10,000 m Freeze program + G&A on ~C$9.2M treasury (~2.5 yr runway). */
const FORWARD_MONTHLY_BURN_CADM = 300_000;

export function buildIdexCashRunwayModel(balanceCashCad?: number | null): CashRunwayModel {
  const publishedCashCadM = resolveTreasuryCashM(balanceCashCad, CASH_POST_MAY_2026_CADM);
  const forwardBurnM = FORWARD_MONTHLY_BURN_CADM / 1e6;
  const trailingBurnM = FY25_MONTHLY_BURN_CADM / 1e6;

  return buildCashRunwayModel({
    companyDisplayName: "IDEX Metals",
    currentCashCadM: publishedCashCadM,
    currentCashAsOf: MAY_2026_FINANCING.closeDate,
    monthlyNetCashChangeCadM: -forwardBurnM,
    monthlyBurnNote: `Forward ~C$${forwardBurnM.toFixed(2)}M/mo (10,000 m Freeze season on ~C$${publishedCashCadM.toFixed(1)}M post-raise cash). FY2025 trailing op+investing burn ~C$${trailingBurnM.toFixed(2)}M/mo.`,
    financingIncludedInAnchor: true,
    snapshots: [
      {
        asOf: "2024-07-31",
        label: "Jul '24",
        cashCadM: CASH_JUL_31_2024_CADM,
        kind: "actual",
      },
      {
        asOf: "2025-04-30",
        label: "Apr '25",
        cashCadM: CASH_APR_30_2025_CADM,
        kind: "actual",
        note: "Includes restricted cash in escrow",
      },
      {
        asOf: "2025-07-31",
        label: "Jul '25",
        cashCadM: CASH_JUL_31_2025_CADM,
        kind: "actual",
        note: "Latest audited year-end cash (pre–May 2026 financing)",
      },
      {
        asOf: MAY_2026_FINANCING.closeDate,
        label: "May '26",
        cashCadM: publishedCashCadM,
        kind: "proforma",
        note: `Jul'25 C$${CASH_JUL_31_2025_CADM.toFixed(2)}M + C$${MAY_2026_FINANCING.netCadM.toFixed(2)}M net placement`,
      },
    ],
    financingEvent: {
      date: MAY_2026_FINANCING.closeDate,
      grossCadM: MAY_2026_FINANCING.grossCadM,
      feesCadM: MAY_2026_FINANCING.feesCadM,
      netCadM: MAY_2026_FINANCING.netCadM,
      label: "Brokered private placement — Special Warrants (May 5, 2026)",
    },
    methodology: [
      `May 2026 anchor: C$${CASH_JUL_31_2025_CADM.toFixed(2)}M (Jul 31, 2025 audited) + C$${MAY_2026_FINANCING.netCadM.toFixed(2)}M net proceeds (C$${MAY_2026_FINANCING.grossCadM.toFixed(2)}M gross, C$${MAY_2026_FINANCING.feesCadM.toFixed(2)}M fees).`,
      "Interim burn to close is not double-counted — proceeds fund the 2026 drill program from the post-close balance.",
      `Forward burn ~C$${forwardBurnM.toFixed(2)}M/mo for funded 10,000 m program (below stress-case FY2025 trailing rate).`,
    ],
  });
}
