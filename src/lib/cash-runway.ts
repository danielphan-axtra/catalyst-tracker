export type CashSnapshotKind = "actual" | "proforma";

export type CashSnapshot = {
  asOf: string;
  label: string;
  cashCadM: number;
  kind: CashSnapshotKind;
  note?: string;
};

export type CashRunwayChartPoint = {
  asOf: string;
  label: string;
  cashCadM: number;
  barCashCadM: number | null;
  lineCashCadM: number;
  isForecast: boolean;
};

export type CashRunwayFinancingEvent = {
  date: string;
  grossCadM: number;
  feesCadM: number;
  netCadM: number;
  label: string;
};

export type CashRunwayCurrency = "CAD" | "USD" | "GBP";

export type CashRunwayModel = {
  companyDisplayName: string;
  currency: CashRunwayCurrency;
  /** Latest published / balance-sheet cash (anchor for forward path). */
  currentCashCadM: number;
  currentCashAsOf: string;
  /** Forward forecast begins on this date (≥ today, ≥ latest snapshot). */
  forecastStartDate: string;
  forecastStartCashCadM: number;
  /** Signed monthly change: + generation, − burn (aligned with cash flow FCF/12 when provided). */
  monthlyNetCashChangeCadM: number;
  /** Display-only positive burn rate (0 if generating cash). */
  monthlyBurnCadM: number;
  monthlyBurnNote: string;
  minimumLiquidityCadM: number;
  requiresFinancing: boolean;
  selfFunding: boolean;
  snapshots: CashSnapshot[];
  financingEvent: CashRunwayFinancingEvent | null;
  monthsToMinimumLiquidity: number | null;
  monthsToDepletion: number | null;
  financingWindowStart: string | null;
  financingWindowEnd: string | null;
  financingWindowStartLabel: string | null;
  financingWindowEndLabel: string | null;
  cashDepletionDate: string | null;
  chartPoints: CashRunwayChartPoint[];
  methodology: string[];
};

export type CashRunwayBuildInput = {
  companyDisplayName: string;
  currency?: CashRunwayCurrency;
  currentCashCadM: number;
  currentCashAsOf: string;
  /**
   * Signed monthly net cash change (FCF/12). Negative = burn, positive = generation.
   * When omitted, derived from monthlyBurnCadM as pure burn.
   */
  monthlyNetCashChangeCadM?: number;
  /** Positive burn only (used when monthlyNetCashChangeCadM not set). */
  monthlyBurnCadM?: number;
  monthlyBurnNote: string;
  minimumLiquidityCadM?: number;
  snapshots: CashSnapshot[];
  financingEvent?: CashRunwayFinancingEvent | null;
  methodology: string[];
  /** When true, runway matches positive FCF on cash flow chart (no financing window). */
  selfFunding?: boolean;
};

function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseTs(iso: string): number {
  return new Date(iso + "T12:00:00Z").getTime();
}

function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

function monthsBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + "T12:00:00Z");
  const end = new Date(endIso + "T12:00:00Z");
  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    (end.getUTCDate() - start.getUTCDate()) / 30
  );
}

function monthLabel(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function maxIsoDate(...dates: string[]): string {
  return dates.reduce((best, d) => (parseTs(d) > parseTs(best) ? d : best));
}

function nearestChartLabel(chartPoints: CashRunwayChartPoint[], isoDate: string): string {
  const target = parseTs(isoDate);
  let best = chartPoints[0];
  let bestDiff = Infinity;
  for (const p of chartPoints) {
    const diff = Math.abs(parseTs(p.asOf) - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p;
    }
  }
  return best?.label ?? isoDate;
}

function rollForwardCash(
  cashM: number,
  fromIso: string,
  toIso: string,
  monthlyChangeM: number,
): number {
  if (parseTs(toIso) <= parseTs(fromIso)) return cashM;
  const months = monthsBetween(fromIso, toIso);
  return cashM + months * monthlyChangeM;
}

function resolveForwardAnchor(
  input: CashRunwayBuildInput,
  monthlyChangeM: number,
  today: string,
): { forecastStart: string; forecastStartCash: number } {
  const snapshotDates = input.snapshots.map((s) => s.asOf);
  const latestSnapshotIso = snapshotDates.length
    ? maxIsoDate(...snapshotDates)
    : input.currentCashAsOf;

  const latestPublishedIso = maxIsoDate(input.currentCashAsOf, latestSnapshotIso);
  const latestSnapshot =
    [...input.snapshots].sort((a, b) => parseTs(b.asOf) - parseTs(a.asOf))[0] ?? null;
  const publishedCash =
    parseTs(input.currentCashAsOf) >= parseTs(latestSnapshot?.asOf ?? "")
      ? input.currentCashCadM
      : (latestSnapshot?.cashCadM ?? input.currentCashCadM);

  const forecastStart = maxIsoDate(today, latestPublishedIso);
  const forecastStartCash = rollForwardCash(
    publishedCash,
    latestPublishedIso,
    forecastStart,
    monthlyChangeM,
  );

  return { forecastStart, forecastStartCash };
}

function buildChartPoints(params: {
  snapshots: CashSnapshot[];
  forecastStart: string;
  forecastStartCash: number;
  monthlyChangeM: number;
  horizonMonths: number;
  today: string;
}): CashRunwayChartPoint[] {
  const { snapshots, forecastStart, forecastStartCash, monthlyChangeM, horizonMonths, today } =
    params;
  const forecastStartTs = parseTs(forecastStart);

  const historical = snapshots
    .filter((s) => parseTs(s.asOf) < forecastStartTs)
    .sort((a, b) => parseTs(a.asOf) - parseTs(b.asOf))
    .map((s) => ({
      asOf: s.asOf,
      label: s.label,
      cashCadM: s.cashCadM,
      barCashCadM: s.cashCadM,
      lineCashCadM: s.cashCadM,
      isForecast: false,
    }));

  const anchorLabel =
    forecastStart === today
      ? "Today (est.)"
      : parseTs(forecastStart) > parseTs(today)
        ? monthLabel(forecastStart)
        : "Latest (rolled forward)";

  const points: CashRunwayChartPoint[] = [
    ...historical,
    {
      asOf: forecastStart,
      label: anchorLabel,
      cashCadM: forecastStartCash,
      barCashCadM: forecastStartCash,
      lineCashCadM: forecastStartCash,
      isForecast: parseTs(forecastStart) >= parseTs(today),
    },
  ];

  let cashM = forecastStartCash;
  for (let m = 1; m <= horizonMonths; m++) {
    const asOf = addMonths(forecastStart, m);
    cashM = cashM + monthlyChangeM;
    if (monthlyChangeM < 0 && cashM <= 0) {
      cashM = 0;
    }
    points.push({
      asOf,
      label: monthLabel(asOf),
      cashCadM: cashM,
      barCashCadM: null,
      lineCashCadM: cashM,
      isForecast: true,
    });
    if (monthlyChangeM < 0 && cashM <= 0) break;
  }

  return points;
}

export function buildCashRunwayModel(input: CashRunwayBuildInput): CashRunwayModel {
  const today = todayIsoUtc();
  const minimumLiquidityCadM = input.minimumLiquidityCadM ?? 2.0;

  const monthlyNetCashChangeCadM =
    input.monthlyNetCashChangeCadM ??
    -(input.monthlyBurnCadM ?? 0);

  const monthlyBurnCadM = monthlyNetCashChangeCadM < 0 ? Math.abs(monthlyNetCashChangeCadM) : 0;

  const selfFunding =
    input.selfFunding ?? monthlyNetCashChangeCadM > 0.001;

  const requiresFinancing = !selfFunding && monthlyNetCashChangeCadM < -0.001;

  const { forecastStart, forecastStartCash } = resolveForwardAnchor(
    input,
    monthlyNetCashChangeCadM,
    today,
  );

  let monthsToMinimumLiquidity: number | null = null;
  let monthsToDepletion: number | null = null;
  let financingWindowStart: string | null = null;
  let financingWindowEnd: string | null = null;
  let cashDepletionDate: string | null = null;

  if (requiresFinancing) {
    const burnM = Math.abs(monthlyNetCashChangeCadM);
    monthsToMinimumLiquidity = (forecastStartCash - minimumLiquidityCadM) / burnM;
    monthsToDepletion = forecastStartCash / burnM;

    let winStart = addMonths(
      forecastStart,
      Math.max(0, Math.floor(monthsToMinimumLiquidity - 3)),
    );
    let winEnd = addMonths(forecastStart, Math.max(1, Math.ceil(monthsToMinimumLiquidity)));

    if (parseTs(winEnd) < parseTs(today)) {
      winStart = today;
      winEnd = addMonths(today, Math.min(6, Math.max(2, Math.ceil(monthsToMinimumLiquidity))));
    } else if (parseTs(winStart) < parseTs(today)) {
      winStart = today;
    }

    financingWindowStart = winStart;
    financingWindowEnd = winEnd;
    cashDepletionDate = addMonths(forecastStart, Math.ceil(monthsToDepletion));
  } else if (monthlyNetCashChangeCadM > 0) {
    monthsToMinimumLiquidity = null;
    monthsToDepletion = null;
  } else {
    monthsToMinimumLiquidity = 0;
    monthsToDepletion = 0;
    cashDepletionDate = forecastStart;
  }

  const horizonMonths = requiresFinancing
    ? Math.min(36, Math.ceil((monthsToDepletion ?? 12) + 2))
    : monthlyNetCashChangeCadM > 0
      ? 18
      : 12;

  const chartPoints = buildChartPoints({
    snapshots: input.snapshots,
    forecastStart,
    forecastStartCash,
    monthlyChangeM: monthlyNetCashChangeCadM,
    horizonMonths,
    today,
  });

  const forwardMethodology = [
    `Forward forecast anchors ${forecastStart === today ? "today" : forecastStart} at ${forecastStartCash.toFixed(2)}M (latest published cash rolled forward from filings where needed).`,
    selfFunding
      ? "Projected free cash flow is positive—no estimated financing window (consistent with cash flow chart)."
      : `Forward path uses constant ${monthlyBurnCadM.toFixed(2)}M/month net cash use from the same assumptions as the cash flow analysis.`,
    "Financing window dates are always forward-looking from today; historical periods are not shown as funding needs.",
  ];

  return {
    companyDisplayName: input.companyDisplayName,
    currency: input.currency ?? "CAD",
    currentCashCadM: forecastStartCash,
    currentCashAsOf: forecastStart,
    forecastStartDate: forecastStart,
    forecastStartCashCadM: forecastStartCash,
    monthlyNetCashChangeCadM,
    monthlyBurnCadM,
    monthlyBurnNote: input.monthlyBurnNote,
    minimumLiquidityCadM,
    requiresFinancing,
    selfFunding,
    snapshots: input.snapshots,
    financingEvent: input.financingEvent ?? null,
    monthsToMinimumLiquidity,
    monthsToDepletion,
    financingWindowStart,
    financingWindowEnd,
    financingWindowStartLabel: financingWindowStart
      ? nearestChartLabel(chartPoints, financingWindowStart)
      : null,
    financingWindowEndLabel: financingWindowEnd
      ? nearestChartLabel(chartPoints, financingWindowEnd)
      : null,
    cashDepletionDate,
    chartPoints,
    methodology: [...input.methodology, ...forwardMethodology],
  };
}

export function isIdexMetalsCompany(symbol: string, name: string): boolean {
  const s = symbol.toUpperCase().replace(/\./g, "");
  const n = name.toLowerCase();
  return s === "IDEX" || s === "IDEXV" || n.includes("idex metals");
}

export function isPacificRidgeCompany(symbol: string, name: string): boolean {
  const s = symbol.toUpperCase().replace(/\./g, "");
  const n = name.toLowerCase();
  return s === "PEX" || s === "PEXV" || n.includes("pacific ridge");
}

/** @deprecated Use hasCashRunwaySection from cash-runway-registry */
export function hasCashRunwaySection(symbol: string, name: string): boolean {
  return isIdexMetalsCompany(symbol, name) || isPacificRidgeCompany(symbol, name);
}
