"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { formatCurrency } from "@/lib/format";
import type { ImpactCategory } from "@/lib/impact";
import { impactSortRank } from "@/lib/impact";

export type SortKey =
  | "name"
  | "marketCap"
  | "pNav"
  | "evMetric"
  | "nextCatalystTiming"
  | "nextCatalystImpact"
  | "industry"
  | "markets";

type Row = {
  id: string;
  symbol: string;
  name: string;
  industry: string;
  markets: string[];
  marketCap: number | null;
  pNavDisplay: string;
  pNavRatio: number | null;
  evMetricDisplay: string;
  evMetricSort: number | null;
  nextCatalystTiming: string;
  nextCatalystImpact: ImpactCategory | null;
};

export function CompaniesTable({ rows }: { rows: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { data: session } = useSession();
  const hasPaidAccess = !!session?.user?.hasPaidAccess;

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      if (sortKey === "marketCap") {
        const aVal = a.marketCap ?? -Infinity;
        const bVal = b.marketCap ?? -Infinity;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (sortKey === "nextCatalystImpact") {
        const aVal = impactSortRank(a.nextCatalystImpact);
        const bVal = impactSortRank(b.nextCatalystImpact);
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (sortKey === "pNav") {
        const aVal = a.pNavRatio ?? -Infinity;
        const bVal = b.pNavRatio ?? -Infinity;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (sortKey === "evMetric") {
        const aVal = a.evMetricSort ?? -Infinity;
        const bVal = b.evMetricSort ?? -Infinity;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aVal = String(a[sortKey] ?? "");
      const bVal = String(b[sortKey] ?? "");
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const Th = ({ label, sortKey: sk }: { label: string; sortKey: SortKey }) => (
    <th className="text-left py-5">
      <button
        type="button"
        onClick={() => toggle(sk)}
        className="font-semibold text-neutral-900 hover:text-neutral-600 transition-colors flex items-center gap-1"
      >
        {label}
        <span className="text-neutral-500">{sortKey === sk ? (sortDir === "asc" ? "↑" : "↓") : ""}</span>
      </button>
    </th>
  );

  /** Metal colour for industry: Gold, Copper, Silver get themed colours; else black */
  const getIndustryColor = (industry: string): string => {
    const key = industry.toLowerCase();
    if (key.includes("gold")) return "#B8860B";
    if (key.includes("copper")) return "#B87333";
    if (key.includes("silver")) return "#C0C0C0";
    return "#171717";
  };

  const impactTagClass = (impact: ImpactCategory) => {
    if (impact === "Major") return "bg-red-100 text-red-700";
    if (impact === "Medium") return "bg-amber-100 text-amber-700";
    return "bg-sky-100 text-sky-700";
  };

  return (
    <div className="overflow-x-auto bg-white">
      <table className="min-w-full divide-y divide-neutral-200">
        <thead>
          <tr className="border-b border-neutral-200">
            <Th label="Company" sortKey="name" />
            <Th label="Industry" sortKey="industry" />
            <Th label="Market" sortKey="markets" />
            <Th label="Market cap" sortKey="marketCap" />
            <Th label="P/NAV" sortKey="pNav" />
            <Th label="EV/lb · EV/oz" sortKey="evMetric" />
            <Th label="Upcoming catalyst" sortKey="nextCatalystTiming" />
            <Th label="Impact" sortKey="nextCatalystImpact" />
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {sorted.map((row) => (
            <tr key={row.id} className="hover:bg-neutral-50/50 transition-colors">
              <td className="py-4 pl-4 pr-2">
                <Link
                  href={`/companies/${row.id}`}
                  className="font-medium text-neutral-900 hover:underline"
                >
                  {row.name}
                </Link>
              </td>
              <td className="py-4 px-2 capitalize font-medium" style={{ color: getIndustryColor(row.industry) }}>
                {row.industry}
              </td>
              <td className="py-4 px-2 text-black/80">
                {row.markets.length ? (
                  <div className="flex flex-wrap gap-1">
                    {row.markets.map((market) => (
                      <span
                        key={`${row.id}-${market}`}
                        className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-700"
                      >
                        {market}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-black/40">—</span>
                )}
              </td>
              <td className="py-4 px-2 text-black/80 tabular-nums">{formatCurrency(row.marketCap)}</td>
              <td className="py-4 px-2 text-black/80 tabular-nums">{row.pNavDisplay}</td>
              <td className="py-4 px-2 text-black/80 tabular-nums whitespace-nowrap">
                {row.evMetricDisplay}
              </td>
              <td className="py-4 px-2 text-black/80">{row.nextCatalystTiming}</td>
              <td className="py-4 px-2">
                {row.nextCatalystImpact ? (
                  hasPaidAccess ? (
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${impactTagClass(row.nextCatalystImpact)}`}
                    >
                      {row.nextCatalystImpact}
                    </span>
                  ) : (
                    <Link
                      href="/pricing"
                      className="rounded bg-black/10 px-2 py-1 text-xs font-medium text-[#7961A9] hover:bg-black/15"
                    >
                      Upgrade to view
                    </Link>
                  )
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
