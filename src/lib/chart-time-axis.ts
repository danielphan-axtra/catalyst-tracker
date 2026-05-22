/** Shared helpers for Recharts (and custom) axes where x is calendar time. */

export type TimeTickFormat = "day" | "month" | "monthYear" | "year";

export function toChartTs(isoDate: string): number {
  return new Date(`${isoDate}T12:00:00Z`).getTime();
}

export function pickTimeTickFormat(minTs: number, maxTs: number): TimeTickFormat {
  const spanMs = Math.max(0, maxTs - minTs);
  const spanDays = spanMs / (24 * 60 * 60 * 1000);
  if (spanDays <= 45) return "day";
  if (spanDays <= 400) return "month";
  if (spanDays <= 3 * 365) return "monthYear";
  return "year";
}

export function formatTimeAxisTick(ts: number, format: TimeTickFormat): string {
  const d = new Date(ts);
  switch (format) {
    case "day":
      return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" });
    case "month":
      return d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    case "monthYear":
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" });
    case "year":
      return d.toLocaleDateString("en-US", { year: "numeric", timeZone: "UTC" });
  }
}

/**
 * Evenly spaced tick positions in time (not by data index).
 * Endpoints are always included.
 */
export function getEvenTimeAxisTicks(minTs: number, maxTs: number, tickCount = 6): number[] {
  if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) return [];
  if (minTs >= maxTs) return [minTs];

  const n = Math.max(2, tickCount);
  const ticks: number[] = [];
  for (let i = 0; i < n; i += 1) {
    ticks.push(minTs + ((maxTs - minTs) * i) / (n - 1));
  }
  return ticks;
}

/** Slight padding so first/last points and bands are not clipped. */
export function getTimeDomain(
  minTs: number,
  maxTs: number,
  padRatio = 0.03
): [number, number] {
  const span = Math.max(maxTs - minTs, 1);
  const pad = span * padRatio;
  return [minTs - pad * 0.25, maxTs + pad * 0.75];
}

export function tickCountForSpan(minTs: number, maxTs: number): number {
  const spanDays = (maxTs - minTs) / (24 * 60 * 60 * 1000);
  if (spanDays <= 7) return 5;
  if (spanDays <= 60) return 6;
  if (spanDays <= 365) return 7;
  if (spanDays <= 3 * 365) return 8;
  return 6;
}

/** Parse calendar year from labels like "2026" or "FY2028". */
export function parseYearFromLabel(label: string): number {
  const m = String(label).match(/(20\d{2})/);
  return m ? parseInt(m[1], 10) : 0;
}

export function getYearAxisConfig(years: number[]) {
  const valid = years.filter((y) => y > 0);
  if (valid.length === 0) return null;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  return {
    domain: [min - 0.35, max + 0.35] as [number, number],
    ticks: getEvenTimeAxisTicks(min, max, Math.max(2, Math.min(valid.length, 6))),
    tickFormatter: (v: number) => String(Math.round(v)),
  };
}

/** Mid-calendar-year timestamp for annual DCF / production period labels. */
export function calendarYearToTs(year: number): number {
  return toChartTs(`${year}-06-30`);
}

/** X-axis category label for one model year (mid-year anchor). */
export function formatDcfPeriodCategoryLabel(calendarYear: number): string {
  return new Date(calendarYearToTs(calendarYear)).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export type DcfPeriodAxisConfig = {
  domain: [number, number];
  ticks: number[];
  tickFormat: TimeTickFormat;
  tickFormatter: (ts: number) => string;
  formatTooltipLabel: (ts: number) => string;
};

/**
 * Time-based x-axis for annual cash flow / production charts (one point per calendar year).
 */
export function getDcfPeriodAxisConfig(calendarYears: number[]): DcfPeriodAxisConfig | null {
  const valid = [...new Set(calendarYears.filter((y) => y > 0))].sort((a, b) => a - b);
  if (valid.length === 0) return null;

  const timestamps = valid.map(calendarYearToTs);
  const minTs = timestamps[0];
  const maxTs = timestamps[timestamps.length - 1];
  const tickFormat = pickTimeTickFormat(minTs, maxTs);

  return {
    domain: getTimeDomain(minTs, maxTs, 0.06),
    ticks: timestamps,
    tickFormat,
    tickFormatter: (ts: number) => formatTimeAxisTick(ts, tickFormat),
    formatTooltipLabel: (ts: number) => {
      const d = new Date(ts);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    },
  };
}

/** Infer model start year from row labels or explicit override. */
export function inferDcfStartYear(
  rows: Array<{ yearLabel: string; yearIndex?: number }>,
  explicitStartYear?: number,
): number {
  if (Number.isFinite(explicitStartYear ?? NaN)) return explicitStartYear as number;
  const fromLabel = parseYearFromLabel(rows[0]?.yearLabel ?? "");
  if (fromLabel > 0) return fromLabel;
  const idx = rows[0]?.yearIndex;
  if (Number.isFinite(idx ?? NaN) && (idx as number) > 0) {
    return new Date().getFullYear() + ((idx as number) - 1);
  }
  return new Date().getFullYear();
}
