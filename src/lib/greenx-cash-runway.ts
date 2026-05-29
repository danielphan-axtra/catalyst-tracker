import { buildCashRunwayModel, type CashRunwayModel } from "@/lib/cash-runway";
import { resolveTreasuryCashM } from "@/lib/treasury-cash";

const CASH_MAR_2026_AUD_M = 30.0;
/** ~A$9M/yr — Tannenberg maiden drill (H2 2026) + Greenland / corporate on large treasury. */
const MONTHLY_BURN_AUD_M = 0.75;

export function buildGreenxCashRunwayModel(balanceCashAud?: number | null): CashRunwayModel {
  const publishedCashAudM = resolveTreasuryCashM(balanceCashAud, CASH_MAR_2026_AUD_M);

  return buildCashRunwayModel({
    companyDisplayName: "GreenX Metals",
    currency: "USD",
    currentCashCadM: publishedCashAudM,
    currentCashAsOf: "2026-03-31",
    monthlyNetCashChangeCadM: -MONTHLY_BURN_AUD_M,
    monthlyBurnNote: `~A$${(MONTHLY_BURN_AUD_M * 12).toFixed(0)}M/yr exploration + corporate (amounts in A$; ~${Math.round(publishedCashAudM / MONTHLY_BURN_AUD_M)} mo runway).`,
    minimumLiquidityCadM: 5.0,
    snapshots: [
      {
        asOf: "2025-06-30",
        label: "Jun '25",
        cashCadM: 28.0,
        kind: "actual",
        note: "Strong treasury from legacy asset sales",
      },
      {
        asOf: "2026-03-31",
        label: "Mar '26",
        cashCadM: publishedCashAudM,
        kind: "actual",
        note: "~A$30M cash — May 2026 Tannenberg ET",
      },
    ],
    methodology: [
      "Cash and burn in Australian dollars (ASX: GRX).",
      "Burn ~30% of treasury per year — active Tannenberg program, no production.",
      "Poland arbitration inflows not modeled.",
    ],
  });
}
