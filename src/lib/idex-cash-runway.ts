import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";

export type { CashRunwayModel as IdexCashRunwayModel };

const FY25_OPERATING_CASH_USE_CADM = 2_973_897;
const FY25_INVESTING_CASH_USE_CADM = 499_984;
const MONTHLY_BURN_CADM = (FY25_OPERATING_CASH_USE_CADM + FY25_INVESTING_CASH_USE_CADM) / 12;

const CASH_JUL_31_2024_CADM = 400_480 / 1e6;
const CASH_APR_30_2025_CADM = (3_679 + 4_333_525) / 1e6;
const CASH_JUL_31_2025_CADM = 1_603_811 / 1e6;

const MAY_2026_FINANCING = {
  closeDate: "2026-05-05",
  grossCadM: 8.05,
  feesCadM: 0.449,
  netCadM: 8.05 - 0.449,
};

export function buildIdexCashRunwayModel(): CashRunwayModel {
  const monthlyBurnM = MONTHLY_BURN_CADM / 1e6;

  return buildCashRunwayModel({
    companyDisplayName: "IDEX Metals",
    currentCashCadM: CASH_JUL_31_2025_CADM,
    currentCashAsOf: "2025-07-31",
    monthlyNetCashChangeCadM: -monthlyBurnM,
    monthlyBurnNote:
      "Trailing FY2025 cash used in operating + investing activities, divided by 12 (excludes May 2026 financing inflow).",
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
        note: "Latest audited cash (anchor for forward path)",
      },
    ],
    financingEvent: {
      date: MAY_2026_FINANCING.closeDate,
      grossCadM: MAY_2026_FINANCING.grossCadM,
      feesCadM: MAY_2026_FINANCING.feesCadM,
      netCadM: MAY_2026_FINANCING.netCadM,
      label: "Brokered private placement (May 5, 2026)",
    },
    methodology: [
      "Jul 31, 2025 cash: C$1.60M (audited consolidated balance sheet)—latest published balance for forward runway.",
      "May 2026 financing shown as historical context only; forward path does not assume repeat raises.",
      "Monthly burn: FY2025 operating + investing cash outflows ÷ 12.",
    ],
  });
}
