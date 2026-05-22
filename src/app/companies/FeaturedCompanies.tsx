import Link from "next/link";
import { formatCurrency, formatCatalystTiming } from "@/lib/format";
import { normalizeImpactCategory, type ImpactCategory } from "@/lib/impact";
import { getCompanyMarketsForName } from "@/lib/market";

export type FeaturedCompanyRow = {
  id: string;
  symbol: string;
  name: string;
  industry: string;
  marketCap: number | null;
  nextCatalystTiming: string;
  nextCatalystImpact: ImpactCategory | null;
  markets: string[];
  tagline: string;
};

const impactTagClass = (impact: ImpactCategory) => {
  if (impact === "Major") return "bg-red-100 text-red-700";
  if (impact === "Medium") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
};

export function FeaturedCompanies({ rows }: { rows: FeaturedCompanyRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-neutral-900">Featured</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Fully profiled companies with catalysts, market data, cash flow, and cash runway analysis.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/companies/${row.id}`}
            className="group rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/80 to-white p-5 shadow-sm transition-shadow hover:border-violet-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-neutral-900 group-hover:text-violet-900">
                  {row.name}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-neutral-500">{row.symbol}</p>
              </div>
              {row.nextCatalystImpact && (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${impactTagClass(row.nextCatalystImpact)}`}
                >
                  {row.nextCatalystImpact}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-neutral-600">{row.tagline}</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-neutral-500">Industry</dt>
                <dd className="font-medium text-neutral-800">{row.industry}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Market cap</dt>
                <dd className="font-medium text-neutral-800">{formatCurrency(row.marketCap)}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Next catalyst</dt>
                <dd className="font-medium text-neutral-800">{row.nextCatalystTiming}</dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Listing</dt>
                <dd className="font-medium text-neutral-800">
                  {row.markets.length ? row.markets.join(", ") : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs font-medium text-violet-700 group-hover:text-violet-900">
              View company page →
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
