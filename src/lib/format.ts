export function formatCurrency(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "—";
  const d = decimals;
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(d)}B`;
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(d)}M`;
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(d)}K`;
  return `$${value.toFixed(d)}`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value == null) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string {
  if (!start && !end) return "—";
  if (!end || (start && new Date(start).getTime() === new Date(end).getTime())) {
    return formatDate(start);
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Analyst-friendly catalyst timing: "Q1 2026", "H2 2026", "Feb 2028", "2026–2028", etc. */
export function formatCatalystTiming(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined
): string {
  if (!start && !end) return "—";
  const startDate = start ? (typeof start === "string" ? new Date(start) : start) : null;
  const endDate = end ? (typeof end === "string" ? new Date(end) : end) : null;
  if (!startDate && !endDate) return "—";
  const s = startDate ?? endDate!;
  const e = endDate ?? startDate!;
  const sy = s.getFullYear();
  const sm = s.getMonth();
  const ey = e.getFullYear();
  const em = e.getMonth();
  const sameYear = sy === ey;
  const sameMonth = sameYear && sm === em;
  const q = (m: number) => Math.floor(m / 3) + 1;
  const sameQuarter = sameYear && q(sm) === q(em);
  const sameHalf = sameYear && Math.floor(sm / 6) === Math.floor(em / 6);

  if (sameMonth) return s.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  if (sameQuarter) return `Q${q(sm)} ${sy}`;
  if (sameHalf) return `${sm < 6 ? "H1" : "H2"} ${sy}`;
  if (sameYear) return `${sy}`;
  return `${sy}–${ey}`;
}
