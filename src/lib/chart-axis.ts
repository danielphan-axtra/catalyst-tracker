/**
 * “Nice” numeric axes for Recharts (McKinsey-style round tick intervals).
 */

export type NiceAxisConfig = {
  domain: [number, number];
  ticks: number[];
};

function niceStep(roughStep: number): number {
  if (!Number.isFinite(roughStep) || roughStep <= 0) return 1;
  const exp = Math.floor(Math.log10(roughStep));
  const base = Math.pow(10, exp);
  const frac = roughStep / base;
  if (frac <= 1) return base;
  if (frac <= 2) return 2 * base;
  if (frac <= 5) return 5 * base;
  return 10 * base;
}

function roundDown(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function roundUp(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

/**
 * Builds a padded domain and evenly spaced ticks on round-number intervals.
 */
export function getNiceNumericAxis(
  dataMin: number,
  dataMax: number,
  options?: {
    tickCount?: number;
    /** Force 0 into the domain (cash-flow charts). */
    includeZero?: boolean;
    /** Y-axis starts at 0; only the top is padded (production, volume). */
    floorAtZero?: boolean;
    padRatio?: number;
  },
): NiceAxisConfig {
  const tickCount = Math.max(4, options?.tickCount ?? 5);
  const padRatio = options?.padRatio ?? 0.08;
  const includeZero = options?.includeZero ?? false;
  const floorAtZero = options?.floorAtZero ?? false;

  let min = dataMin;
  let max = dataMax;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { domain: [0, 1], ticks: [0, 0.5, 1] };
  }

  if (floorAtZero) {
    min = 0;
    max = Math.max(0, max);
    if (max === 0) {
      return { domain: [0, 1], ticks: [0, 0.5, 1] };
    }
    const pad = max * padRatio;
    max += pad;
    const roughStep = max / Math.max(1, tickCount - 1);
    const step = niceStep(roughStep);
    const niceMax = roundUp(max, step);
    const ticks: number[] = [0];
    for (let t = step; t <= niceMax + step * 0.001; t += step) {
      ticks.push(Number(t.toFixed(12)));
    }
    return { domain: [0, niceMax], ticks };
  }

  if (min === max) {
    const pad = Math.max(Math.abs(min) * 0.1, 1);
    min -= pad;
    max += pad;
  }

  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  const span = max - min;
  const pad = span * padRatio;
  min -= pad;
  max += pad;

  const roughStep = (max - min) / Math.max(1, tickCount - 1);
  const step = niceStep(roughStep);
  let niceMin = roundDown(min, step);
  const niceMax = roundUp(max, step);

  const ticks: number[] = [];
  for (let t = niceMin; t <= niceMax + step * 0.001; t += step) {
    ticks.push(Number(t.toFixed(12)));
  }

  if (includeZero && niceMin > 0 && !ticks.includes(0)) {
    ticks.unshift(0);
    niceMin = 0;
  }

  return { domain: [niceMin, niceMax], ticks };
}

/** Format axis tick for USD millions (cash flow). */
export function formatUsdMTick(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}B`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Format generic numeric ticks (production koz, prices). */
export function formatCountTick(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatPriceTick(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Shared Recharts tick / label styling. */
export const CHART_AXIS_TICK_STYLE = { fontSize: 12, fill: "#404040", fontWeight: 500 };
export const CHART_AXIS_LABEL_STYLE = { fill: "#262626", fontSize: 12, fontWeight: 600 };
export const CHART_GRID_STROKE = "#d4d4d4";
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#ffffff",
  border: "1px solid #d4d4d4",
  borderRadius: 8,
  fontSize: 13,
  color: "#262626",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};
