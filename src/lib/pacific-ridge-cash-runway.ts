import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";

/** FY ended Dec 31, 2025 — consolidated statement of cash flows */
const FY25_OPERATING_CASH_USE_CADM = 5_186_609;
const FY25_INVESTING_CASH_USE_CADM = 21_670;
const MONTHLY_BURN_CADM = (FY25_OPERATING_CASH_USE_CADM + FY25_INVESTING_CASH_USE_CADM) / 12;

const CASH_DEC_31_2024_CADM = 12_095 / 1e6;
const CASH_SEP_30_2025_CADM = 2_613_957 / 1e6;
const CASH_DEC_31_2025_CADM = 2_194_173 / 1e6;

const SEP_2025_FINANCING = {
  closeDate: "2025-09-26",
  grossCadM: 4.651,
  feesCadM: 0.563,
  netCadM: 4.651 - 0.563,
  label: "Brokered private placement (Sep 2025, aggregate gross)",
};

export function buildPacificRidgeCashRunwayModel(): CashRunwayModel {
  const monthlyBurnM = MONTHLY_BURN_CADM / 1e6;

  return buildCashRunwayModel({
    companyDisplayName: "Pacific Ridge Exploration",
    currentCashCadM: CASH_DEC_31_2025_CADM,
    currentCashAsOf: "2025-12-31",
    monthlyNetCashChangeCadM: -monthlyBurnM,
    monthlyBurnNote:
      "FY2025 cash used in operating + investing activities, divided by 12 (excludes prior equity financing).",
    snapshots: [
      {
        asOf: "2024-12-31",
        label: "Dec '24",
        cashCadM: CASH_DEC_31_2024_CADM,
        kind: "actual",
      },
      {
        asOf: "2025-09-30",
        label: "Sep '25",
        cashCadM: CASH_SEP_30_2025_CADM,
        kind: "actual",
        note: "Interim Q3 — after Sep brokered financing",
      },
      {
        asOf: "2025-12-31",
        label: "Dec '25",
        cashCadM: CASH_DEC_31_2025_CADM,
        kind: "actual",
        note: "Latest year-end cash (anchor for forward path)",
      },
    ],
    financingEvent: {
      date: SEP_2025_FINANCING.closeDate,
      grossCadM: SEP_2025_FINANCING.grossCadM,
      feesCadM: SEP_2025_FINANCING.feesCadM,
      netCadM: SEP_2025_FINANCING.netCadM,
      label: SEP_2025_FINANCING.label,
    },
    methodology: [
      "Dec 31, 2025 cash: C$2.19M (audited year-end)—latest published balance for forward runway.",
      "Sep 2025 financing is historical; forward path assumes operating/investing burn only.",
      "Monthly burn: FY2025 operating + investing cash outflows ÷ 12 (~C$0.43M/month).",
    ],
  });
}
