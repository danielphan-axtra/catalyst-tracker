import { prisma } from "@/lib/prisma";
import { CompaniesTable } from "./CompaniesTable";
import { CompanySearch } from "./CompanySearch";
import { formatCatalystTiming } from "@/lib/format";
import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { getImpactCategoryWhere, normalizeImpactCategory } from "@/lib/impact";
import { getCompanyMarketsForName, normalizeCompanyNameForListings } from "@/lib/market";
import { FEATURED_COMPANY_SYMBOLS } from "@/lib/featured-companies";
import { FeaturedCompanies, type FeaturedCompanyRow } from "./FeaturedCompanies";
import { computeValuationsForCompanies } from "@/lib/company-list-valuation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    marketCap?: string;
    commodity?: string;
    catalystTiming?: string;
    impact?: string;
  }>;
}) {
  const { page: pageParam, search: searchParam, marketCap, commodity, catalystTiming, impact } = await searchParams;
  const session = await getServerSession(authOptions);
  const hasPaidAccess = !!session?.user?.hasPaidAccess;
  const page = Math.max(1, parseInt(String(pageParam ?? "1"), 10) || 1);
  const search = typeof searchParam === "string" ? searchParam.trim() : "";
  const marketCapFilter = typeof marketCap === "string" ? marketCap : "";
  const commodityFilter = typeof commodity === "string" ? commodity.trim() : "";
  const catalystTimingFilter = typeof catalystTiming === "string" ? catalystTiming : "";
  const impactFilter = hasPaidAccess && typeof impact === "string" ? impact : "";
  const impactCategoryFilter = normalizeImpactCategory(impactFilter);
  const skip = (page - 1) * PAGE_SIZE;
  const now = new Date();
  const twelveMonthsOut = new Date(now);
  twelveMonthsOut.setMonth(twelveMonthsOut.getMonth() + 12);
  const thirtySixMonthsOut = new Date(now);
  thirtySixMonthsOut.setMonth(thirtySixMonthsOut.getMonth() + 36);

  const whereAnd: Prisma.CompanyWhereInput[] = [];
  const upcomingCatalystWhere: Prisma.CatalystWhereInput = {
    OR: [{ dateEnd: { gte: now } }, { dateStart: { gte: now } }, { dateStart: null }],
  };

  if (search) {
    whereAnd.push({
      OR: [{ name: { contains: search } }, { symbol: { contains: search } }],
    });
  }

  if (marketCapFilter === "small") {
    whereAnd.push({ marketCap: { not: null, lt: 100_000_000 } });
  } else if (marketCapFilter === "mid") {
    whereAnd.push({ marketCap: { not: null, gte: 100_000_000, lte: 2_000_000_000 } });
  } else if (marketCapFilter === "large") {
    whereAnd.push({ marketCap: { not: null, gt: 2_000_000_000 } });
  }

  if (commodityFilter) {
    whereAnd.push({ industry: commodityFilter });
  }

  if (catalystTimingFilter === "lt12m") {
    whereAnd.push({
      catalysts: {
        some: { dateStart: { not: null, gte: now, lt: twelveMonthsOut } },
      },
    });
  } else if (catalystTimingFilter === "12to36m") {
    whereAnd.push({
      catalysts: {
        some: { dateStart: { not: null, gte: twelveMonthsOut, lte: thirtySixMonthsOut } },
      },
    });
  } else if (catalystTimingFilter === "gt36m") {
    whereAnd.push({
      catalysts: {
        some: { dateStart: { not: null, gt: thirtySixMonthsOut } },
      },
    });
  }

  if (impactCategoryFilter) {
    whereAnd.push({
      catalysts: {
        some: {
          AND: [
            upcomingCatalystWhere,
            getImpactCategoryWhere(impactCategoryFilter),
          ],
        },
      },
    });
  }

  const where = whereAnd.length ? { AND: whereAnd } : undefined;
  const hasListFilters =
    !!search ||
    !!marketCapFilter ||
    !!commodityFilter ||
    !!catalystTimingFilter ||
    !!impactCategoryFilter;

  const [companies, total, industries, allCompanySymbols, featuredRaw] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        catalysts: {
          where: upcomingCatalystWhere,
          orderBy: { dateStart: "asc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.company.count({ where }),
    prisma.company.findMany({
      select: { industry: true },
      distinct: ["industry"],
      where: { industry: { not: "" } },
      orderBy: { industry: "asc" },
    }),
    prisma.company.findMany({
      select: { name: true, symbol: true },
    }),
    hasListFilters
      ? Promise.resolve([])
      : prisma.company.findMany({
          where: {
            OR: [
              { symbol: { in: [...FEATURED_COMPANY_SYMBOLS] } },
              { name: { contains: "Ondo InsurTech" } },
              { name: { contains: "Curaleaf" } },
            ],
          },
          include: {
            catalysts: {
              where: upcomingCatalystWhere,
              orderBy: { dateStart: "asc" },
              take: 1,
            },
          },
          orderBy: { name: "asc" },
        }),
  ]);

  const symbolsByNormalizedName = allCompanySymbols.reduce((acc, company) => {
    const key = normalizeCompanyNameForListings(company.name);
    const symbols = acc.get(key) ?? [];
    symbols.push(company.symbol);
    acc.set(key, symbols);
    return acc;
  }, new Map<string, string[]>());

  const valuationById = await computeValuationsForCompanies(companies);

  const rows = companies.map((c) => {
    const v = valuationById.get(c.id);
    return {
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      industry: c.industry,
      website: c.website ?? null,
      markets: getCompanyMarketsForName(
        c.name,
        symbolsByNormalizedName.get(normalizeCompanyNameForListings(c.name)) ?? [c.symbol]
      ),
      marketCap: c.marketCap,
      pNavDisplay: v?.pNavDisplay ?? "—",
      pNavRatio: v?.pNavRatio ?? null,
      evMetricDisplay: v?.evMetricDisplay ?? "—",
      evMetricSort: v?.evMetricSort ?? null,
      nextCatalystTiming: c.catalysts[0]
        ? formatCatalystTiming(c.catalysts[0].dateStart, c.catalysts[0].dateEnd)
        : "—",
      nextCatalystImpact: normalizeImpactCategory(c.catalysts[0]?.importance),
    };
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (marketCapFilter) params.set("marketCap", marketCapFilter);
  if (commodityFilter) params.set("commodity", commodityFilter);
  if (catalystTimingFilter) params.set("catalystTiming", catalystTimingFilter);
  if (impactCategoryFilter) params.set("impact", impactCategoryFilter);
  const baseQuery = params.toString();
  const industriesForFilter = industries.map((entry) => entry.industry).filter(Boolean);

  const featuredTaglines: Record<string, string> = {
    "IDEX.V": "Idaho copper-gold exploration · cash runway & catalysts",
    "PEX.V": "BC copper-gold (Kliyul, RDP) · cash runway & catalysts",
    CURA: "US cannabis MSO · cash flow & runway",
    "ONDO.L": "LeakBot insurtech (LSE) · cash flow & runway",
  };

  const featuredOrder = new Map<string, number>(
    FEATURED_COMPANY_SYMBOLS.map((s, i) => [s, i]),
  );
  const featuredUnique = [...new Map(featuredRaw.map((c) => [c.id, c])).values()];
  const featuredRows: FeaturedCompanyRow[] = featuredUnique
    .sort((a, b) => (featuredOrder.get(a.symbol) ?? 99) - (featuredOrder.get(b.symbol) ?? 99))
    .map((c) => ({
    id: c.id,
    symbol: c.symbol,
    name: c.name,
    industry: c.industry,
    marketCap: c.marketCap,
    nextCatalystTiming: c.catalysts[0]
      ? formatCatalystTiming(c.catalysts[0].dateStart, c.catalysts[0].dateEnd)
      : "—",
    nextCatalystImpact: normalizeImpactCategory(c.catalysts[0]?.importance),
    markets: getCompanyMarketsForName(
      c.name,
      symbolsByNormalizedName.get(normalizeCompanyNameForListings(c.name)) ?? [c.symbol]
    ),
    tagline: featuredTaglines[c.symbol] ?? "Full company profile",
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Companies</h1>
        <p className="mt-2 text-neutral-600">
          Mining, metals, and featured operating companies. {total.toLocaleString()} companies. Sort by name,
          industry, market cap, or next catalyst.
        </p>
      </div>
      <Suspense fallback={null}>
        <CompanySearch
          initialSearch={search}
          initialMarketCap={marketCapFilter}
          initialCommodity={commodityFilter}
          initialCatalystTiming={catalystTimingFilter}
          initialImpact={impactCategoryFilter ?? ""}
          industries={industriesForFilter}
          hasPaidAccess={hasPaidAccess}
        />
      </Suspense>
      {!hasListFilters && featuredRows.length > 0 && <FeaturedCompanies rows={featuredRows} />}
      <CompaniesTable rows={rows} />
      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4">
          <div className="text-sm text-neutral-500">
            Page {page} of {totalPages} · {total.toLocaleString()} total
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={
                  page === 2
                    ? baseQuery
                      ? `/companies?${baseQuery}`
                      : "/companies"
                    : `/companies?${baseQuery ? `${baseQuery}&` : ""}page=${page - 1}`
                }
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/companies?${baseQuery ? `${baseQuery}&` : ""}page=${page + 1}`}
                className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
