import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { resolveTreasuryCashM } from "@/lib/treasury-cash";

const CASH_DEC_2025_AUD_M = 2.1;

/** ~A$4.2M/yr pre-FID (between FY2025 and H1 FY2026 run-rates; excludes FY2028 build capex). */
const PRE_FID_MONTHLY_BURN_AUD_M = 0.35;

export function buildCelsiusCashRunwayModel(balanceCashAud?: number | null): CashRunwayModel {
  const publishedCashAudM = resolveTreasuryCashM(balanceCashAud, CASH_DEC_2025_AUD_M);

  return buildCashRunwayModel({
    companyDisplayName: "Celsius Resources",
    currency: "USD",
    currentCashCadM: publishedCashAudM,
    currentCashAsOf: "2025-12-31",
    monthlyNetCashChangeCadM: -PRE_FID_MONTHLY_BURN_AUD_M,
    monthlyBurnNote: `~A$${(PRE_FID_MONTHLY_BURN_AUD_M * 12).toFixed(1)}M/yr pre-FID burn (H1 FY2026 run-rate). FY2028 construction capex not in runway — funded via project finance.`,
    selfFunding: false,
    minimumLiquidityCadM: 1.0,
    snapshots: [
      {
        asOf: "2024-12-31",
        label: "Dec '24",
        cashCadM: 3.5,
        kind: "actual",
        note: "Approx. group cash pre-bridge drawdowns",
      },
      {
        asOf: "2025-12-31",
        label: "Dec '25",
        cashCadM: publishedCashAudM,
        kind: "actual",
        note: "Quarter-end cash (~A$2.1M per Dec 2025 report)",
      },
    ],
    financingEvent: {
      date: "2026-09-01",
      grossCadM: 25,
      feesCadM: 1.5,
      netCadM: 23.5,
      label: "Project finance / FID package (modeled — not in runway anchor)",
    },
    methodology: [
      "Cash from Celsius ASX quarterly reports (AUD; chart uses $ prefix).",
      "Forward burn uses H1 FY2026 operating + investing rate only — not blended with FY2028 construction.",
      "MCB FID / build capex assumed separately funded; near-term runway is corporate treasury stress.",
    ],
  });
}
