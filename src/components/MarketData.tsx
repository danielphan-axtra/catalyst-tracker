import type { Company } from "@prisma/client";
import type { EvPerMetalMetrics } from "@/lib/ev-per-metal";
import { formatCurrency, formatNumber } from "@/lib/format";

export function MarketData({
  company,
  pNavRatio,
  evPerMetal,
  hideMiningValuationMetrics = false,
}: {
  company: Company;
  pNavRatio?: number | null;
  evPerMetal?: EvPerMetalMetrics | null;
  hideMiningValuationMetrics?: boolean;
}) {
  const low = company.price52WeekLow != null ? `$${company.price52WeekLow.toFixed(2)}` : "—";
  const high = company.price52WeekHigh != null ? `$${company.price52WeekHigh.toFixed(2)}` : "—";
  const week52Range = `${low} - ${high}`;

  const peStr =
    company.peRatio != null && !Number.isNaN(company.peRatio) ? company.peRatio.toFixed(2) : "—";
  const divYieldStr =
    company.dividendYield != null && !Number.isNaN(company.dividendYield)
      ? `${(company.dividendYield * 100).toFixed(2)}%`
      : "—";

  const items = [
    { label: "Price", value: company.stockPrice != null ? `$${company.stockPrice.toFixed(2)}` : "—" },
    { label: "52 week range", value: week52Range },
    { label: "P/E ratio", value: peStr },
    { label: "Dividend yield", value: divYieldStr },
    { label: "Avg daily volume", value: formatNumber(company.avgDailyVolume, 0) },
    { label: "Market cap", value: formatCurrency(company.marketCap, 0) },
    { label: "Cash", value: formatCurrency(company.balanceCash, 0) },
    { label: "Debt", value: formatCurrency((company.balanceDebt ?? 0) + (company.minorityInterest ?? 0), 0) },
    { label: "Enterprise value", value: formatCurrency(company.enterpriseValue, 0) },
    ...(hideMiningValuationMetrics
      ? []
      : [
          {
            label: "P/NAV (spot)",
            value: pNavRatio != null && Number.isFinite(pNavRatio) ? `${pNavRatio.toFixed(2)}x` : "—",
          },
          ...(evPerMetal
            ? [
                { label: evPerMetal.evPerReserveOzLabel, value: evPerMetal.evPerReserveOzValue },
                { label: evPerMetal.evPerResourceOzLabel, value: evPerMetal.evPerResourceOzValue },
              ]
            : []),
        ]),
  ];

  return (
    <div className="flex flex-col rounded-xl bg-white p-4">
      <h2 className="text-lg font-semibold text-neutral-900">Market data</h2>
      <dl className="mt-3 flex flex-col">
        {items.map(({ label, value }) => (
          <div
            key={label}
            className="grid min-h-[2.25rem] grid-cols-2 items-end gap-x-4 border-b border-neutral-100 last:border-b-0 py-2"
          >
            <dt className="text-sm font-medium text-neutral-500">{label}</dt>
            <dd className="text-right text-sm font-medium tabular-nums text-neutral-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
