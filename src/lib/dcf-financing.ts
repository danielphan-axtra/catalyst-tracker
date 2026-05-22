/**
 * Corporate financing cash flows for simplified DCF charts (USD millions).
 * Negative = cash outflow (debt repayment, dividends); positive = inflow (draws, equity).
 */

function parseYearIndex(k: string): number | null {
  const m = k.match(/(?:^|[^0-9])(\d+)(?:[^0-9]|$)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function resolveFinancingUsdMForYear(
  yearIndex: number,
  financingUsdMByYear?: Record<string, number> | null
): number {
  if (!financingUsdMByYear) return 0;
  const direct = financingUsdMByYear[`Year${yearIndex}`];
  if (direct != null && Number.isFinite(Number(direct))) return Number(direct);
  for (const [k, v] of Object.entries(financingUsdMByYear)) {
    if (parseYearIndex(k) === yearIndex) return Number(v);
  }
  return 0;
}

/**
 * Estimate scheduled debt service from balance-sheet debt (principal + interest).
 * Based on typical senior-miner profiles: ~7-year term amortization, ~6.5% cash interest.
 */
export function estimateCorporateFinancingUsdMByYear(params: {
  balanceDebtUsd: number | null | undefined;
  modeledYears: number;
  amortizationYears?: number;
  cashInterestRatePct?: number;
  annualDividendUsdM?: number;
}): Record<string, number> {
  const debtUsd = params.balanceDebtUsd ?? 0;
  if (debtUsd <= 0) return {};

  const debtUsdM = debtUsd / 1_000_000;
  const amortYears = params.amortizationYears ?? 7;
  const interestRate = (params.cashInterestRatePct ?? 6.5) / 100;
  const annualPrincipalM = debtUsdM / amortYears;
  const dividendM = params.annualDividendUsdM ?? 0;

  const out: Record<string, number> = {};
  for (let yearIndex = 1; yearIndex <= params.modeledYears; yearIndex++) {
    const principalRemainingM = Math.max(0, debtUsdM - annualPrincipalM * (yearIndex - 1));
    const interestM = principalRemainingM * interestRate;
    const principalM = yearIndex <= amortYears ? annualPrincipalM : 0;
    out[`Year${yearIndex}`] = -(principalM + interestM + dividendM);
  }
  return out;
}

export function mergeFinancingSchedules(
  estimated: Record<string, number>,
  explicit?: Record<string, number> | null
): Record<string, number> {
  return { ...estimated, ...(explicit ?? {}) };
}
