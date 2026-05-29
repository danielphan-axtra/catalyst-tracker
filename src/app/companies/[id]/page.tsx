import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensurePriceData } from "@/lib/stock-data";
import { CompanyOverview } from "@/components/CompanyOverview";
import { StockChart } from "@/components/StockChart";
import { MarketData } from "@/components/MarketData";
import { CatalystsSection } from "@/components/CatalystsSection";
import { EndeavourDcfSection } from "@/components/EndeavourDcfSection";
import { AgnicoEagleDcfSection } from "@/components/AgnicoEagleDcfSection";
import { GenericMiningDcfSection } from "@/components/GenericMiningDcfSection";
import { CompanyCashRunwaySection } from "@/components/CompanyCashRunwaySection";
import { loadAssumptionsFromRepoFile } from "@/lib/endeavour-dcf";
import { computeSimplifiedDcfFromAssumptions } from "@/lib/dcf-core";
import {
  fetchCommoditySpotQuotes,
  fetchCopperSpotUsdPerLb,
  fetchGoldSpotUsdPerOz,
  resolveSpotCommodityPriceUsd,
} from "@/lib/copper-spot";
import { getAssumptionBaselinePriceUsd } from "@/lib/dcf-price-scenario";
import { computeSpotNavSummary } from "@/lib/spot-nav";
import { formatCurrency } from "@/lib/format";
import { getMineralInventory } from "@/lib/mineral-inventory-registry";
import { computeEvPerMetalMetrics } from "@/lib/ev-per-metal";
import { ResourcesReservesSection } from "@/components/ResourcesReservesSection";
import { getCompanyPageProfile } from "@/lib/company-page-profile";
import { getMiningCompanyProfile } from "@/lib/mining-company-config";
import { OperatingCashFlowSection } from "@/components/OperatingCashFlowSection";

export const dynamic = "force-dynamic";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let company = await prisma.company.findUnique({
    where: { id },
    include: {
      catalysts: { orderBy: { dateStart: "asc" } },
      pricePoints: { orderBy: { date: "asc" }, take: 90 },
    },
  });

  if (!company) notFound();
  const pageProfile = getCompanyPageProfile(
    company.symbol,
    company.name,
    company.industry,
    company.balanceCash,
  );
  const miningProfile = getMiningCompanyProfile(company.symbol, company.name, company.industry);
  const genericDcfConfig = miningProfile.dcfConfig;

  await ensurePriceData(company.id, company.symbol);
  company = await prisma.company.findUnique({
    where: { id },
    include: {
      catalysts: { orderBy: { dateStart: "asc" } },
      pricePoints: { orderBy: { date: "asc" }, take: 90 },
    },
  });
  if (!company) notFound();

  const isLundin =
    ["LUN", "LUNTO"].includes(company.symbol.toUpperCase().replace(/\./g, "")) ||
    company.name.toLowerCase().includes("lundin mining");

  const showDcfCharts = pageProfile.showMiningDcf;
  const needsSpotQuotes =
    showDcfCharts || pageProfile.showEndeavourDcf || pageProfile.showAgnicoDcf;

  let spotQuotes: Awaited<ReturnType<typeof fetchCommoditySpotQuotes>> | null = null;
  if (needsSpotQuotes) {
    try {
      spotQuotes = await fetchCommoditySpotQuotes();
    } catch {
      spotQuotes = { goldUsdPerOz: 2500, copperUsdPerLb: 4.3, tinUsdPerLb: 14.97, silverUsdPerOz: 32 };
    }
  }

  let genericSpotNavSummary: ReturnType<typeof computeSpotNavSummary> | null = null;
  let genericSpotCommodityPrice: number | null = null;

  if (showDcfCharts && genericDcfConfig?.assumptionsFileName && spotQuotes) {
    try {
      const assumptions = loadAssumptionsFromRepoFile(genericDcfConfig.assumptionsFileName);
      const assumptionBaseline = getAssumptionBaselinePriceUsd(
        assumptions,
        genericDcfConfig.initialGoldPriceUsdPerOz ?? 2500,
      );
      const spotCommodityPrice = resolveSpotCommodityPriceUsd({
        commodityName: genericDcfConfig.commodityName,
        commodityPriceUnit: genericDcfConfig.commodityPriceUnit,
        initialPriceUsd: genericDcfConfig.initialGoldPriceUsdPerOz,
        assumptionBaselinePriceUsd: assumptionBaseline,
        quotes: spotQuotes,
      });
      genericSpotCommodityPrice = spotCommodityPrice;
      genericSpotNavSummary = computeSpotNavSummary({
        assumptions,
        spotCommodityPrice,
        discountRatePct: genericDcfConfig.discountRatePct ?? 5,
        yearsForward: genericDcfConfig.chartYears ?? 5,
        startYear: genericDcfConfig.startYear ?? 2026,
        company,
      });
    } catch {
      genericSpotNavSummary = null;
      genericSpotCommodityPrice = null;
    }
  }

  const mineralInventory = getMineralInventory(company.symbol, company.name);
  let evPerMetal = null;
  if (mineralInventory) {
    try {
      const quotes =
        spotQuotes ??
        (await fetchCommoditySpotQuotes());
      evPerMetal = computeEvPerMetalMetrics({
        company,
        inventory: mineralInventory,
        spotGoldUsdPerOz: quotes.goldUsdPerOz,
        spotCopperUsdPerLb: quotes.copperUsdPerLb,
        spotSilverUsdPerOz: quotes.silverUsdPerOz,
      });
    } catch {
      evPerMetal = null;
    }
  }

  const showCashRunway = pageProfile.showCashRunway;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-3 lg:items-stretch">
        <div className="flex min-h-0 flex-col lg:col-span-2">
          <CompanyOverview company={company} />
          <div className="mt-10 min-h-0 flex-1">
            <StockChart
              symbol={company.symbol}
              data={company.pricePoints.map((p) => ({
                date: p.date.toISOString().slice(0, 10),
                price: p.price,
                volume: p.volume ?? 0,
              }))}
              stockPrice={company.stockPrice}
              fillHeight
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 lg:min-h-0">
          <MarketData
            company={company}
            pNavRatio={
              pageProfile.hideMiningValuationMetrics ? null : genericSpotNavSummary?.pNavRatio ?? null
            }
            evPerMetal={pageProfile.hideMiningValuationMetrics ? null : evPerMetal}
            hideMiningValuationMetrics={pageProfile.hideMiningValuationMetrics}
          />
          {company.description && (
            <div className="rounded-xl bg-white p-4">
              <h2 className="text-lg font-semibold text-black mb-2">About</h2>
              <p className="text-sm text-black/70 leading-relaxed">{company.description}</p>
            </div>
          )}
        </div>
      </div>
      {mineralInventory && (
        <div className="mt-10">
          <ResourcesReservesSection inventory={mineralInventory} />
        </div>
      )}
      <div className="mt-10">
        <CatalystsSection
          catalysts={company.catalysts}
          companyName={company.name}
          companySymbol={company.symbol}
        />
      </div>
      {pageProfile.showOperatingCashFlow && pageProfile.operatingCashFlowFileName && (
        <div className="mt-10">
          <OperatingCashFlowSection
            assumptionsFileName={pageProfile.operatingCashFlowFileName}
            companyName={company.name}
          />
        </div>
      )}
      {showCashRunway && (
        <div className="mt-10">
          <CompanyCashRunwaySection
            symbol={company.symbol}
            name={company.name}
            industry={company.industry}
            balanceCash={company.balanceCash}
          />
        </div>
      )}
      {pageProfile.showEndeavourDcf && spotQuotes && (
        <div className="mt-10">
          <EndeavourDcfSection
            balanceDebtUsd={company.balanceDebt}
            balanceCashUsd={company.balanceCash}
            spotCommodityPrice={spotQuotes.goldUsdPerOz}
          />
        </div>
      )}
      {pageProfile.showAgnicoDcf && spotQuotes && (
        <div className="mt-10">
          <AgnicoEagleDcfSection
            balanceDebtUsd={company.balanceDebt}
            balanceCashUsd={company.balanceCash}
            spotCommodityPrice={spotQuotes.goldUsdPerOz}
          />
        </div>
      )}
      {showDcfCharts && genericDcfConfig && (
        <div className="mt-10">
          {pageProfile.showFeasibilityDcf && genericSpotNavSummary && (
            <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/40 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">Feasibility study valuation</h3>
              <p className="mt-1 text-xs text-neutral-600">
                Based on published DFS assumptions; model NAV uses simplified cash flows (not a full replica of
                Practara&apos;s DFS model).
              </p>
              <div className="mt-3 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  Model NAV ({genericDcfConfig.discountRatePct ?? 5}%):{" "}
                  <span className="font-medium text-neutral-900">
                    {formatCurrency(genericSpotNavSummary.mineNavUsdM * 1_000_000, 0)}
                  </span>
                </div>
                <div>
                  Equity NAV:{" "}
                  <span className="font-medium text-neutral-900">
                    {formatCurrency(genericSpotNavSummary.equitySpotNavUsdM * 1_000_000, 0)}
                  </span>
                </div>
                <div>
                  Market cap:{" "}
                  <span className="font-medium text-neutral-900">
                    {formatCurrency(genericSpotNavSummary.marketCapUsdM * 1_000_000, 0)}
                  </span>
                </div>
                <div>
                  P/NAV:{" "}
                  <span className="font-medium text-neutral-900">
                    {Number.isFinite(genericSpotNavSummary.pNavRatio)
                      ? `${genericSpotNavSummary.pNavRatio.toFixed(2)}x`
                      : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
          {isLundin && genericSpotNavSummary && (
            <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-neutral-900">Spot NAV (Lundin Mining)</h3>
                <div className="text-xs text-neutral-500">
                  Copper spot proxy:{" "}
                  <span className="font-mono">${genericSpotNavSummary.spotCommodityPrice.toFixed(2)}/lb</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-neutral-700 md:grid-cols-2">
                <div>
                  Mine NAV (sum):{" "}
                  <span className="font-medium text-neutral-900">
                    {formatCurrency(genericSpotNavSummary.mineNavUsdM * 1_000_000, 0)}
                  </span>
                </div>
                <div>
                  Balance sheet cash:{" "}
                  <span className="font-medium text-neutral-900">
                    {formatCurrency(genericSpotNavSummary.balanceCashUsdM * 1_000_000, 0)}
                  </span>
                </div>
                <div>
                  Balance sheet debt:{" "}
                  <span className="font-medium text-neutral-900">
                    {formatCurrency(genericSpotNavSummary.balanceDebtUsdM * 1_000_000, 0)}
                  </span>
                </div>
                <div>
                  Equity NAV at spot:{" "}
                  <span className="font-medium text-neutral-900">
                    {formatCurrency(genericSpotNavSummary.equitySpotNavUsdM * 1_000_000, 0)}
                  </span>
                </div>
                <div>
                  Market cap:{" "}
                  <span className="font-medium text-neutral-900">
                    {formatCurrency(genericSpotNavSummary.marketCapUsdM * 1_000_000, 0)}
                  </span>
                </div>
                <div>
                  P/NAV (spot):{" "}
                  <span className="font-medium text-neutral-900">
                    {Number.isFinite(genericSpotNavSummary.pNavRatio)
                      ? `${genericSpotNavSummary.pNavRatio.toFixed(2)}x`
                      : "—"}
                  </span>
                </div>
              </div>
              <div className="mt-3 border-t border-neutral-100 pt-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Mine-level NAV at spot
                </div>
                <div className="grid gap-1 text-sm text-neutral-700 md:grid-cols-2">
                  {genericSpotNavSummary.mineNavByAsset.map((mine) => (
                    <div key={mine.name} className="flex items-center justify-between gap-3">
                      <span className="truncate">{mine.name}</span>
                      <span className="font-medium text-neutral-900">
                        {formatCurrency(mine.navUsdM * 1_000_000, 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <GenericMiningDcfSection
            assumptionsFileName={genericDcfConfig.assumptionsFileName}
            companyName={genericDcfConfig.companyName}
            startYear={genericDcfConfig.startYear ?? 2026}
            initialGoldPriceUsdPerOz={genericDcfConfig.initialGoldPriceUsdPerOz}
            discountRatePct={genericDcfConfig.discountRatePct ?? 5}
            chartYears={genericDcfConfig.chartYears ?? 5}
            commodityName={genericDcfConfig.commodityName}
            commodityPriceUnit={genericDcfConfig.commodityPriceUnit}
            spotCommodityPrice={genericSpotCommodityPrice}
            productionUnitLabel={genericDcfConfig.productionUnitLabel}
            productionValueSuffix={genericDcfConfig.productionValueSuffix}
            costUnitLabel={genericDcfConfig.costUnitLabel}
            costSeriesLabel={genericDcfConfig.costSeriesLabel}
            balanceDebtUsd={company.balanceDebt}
            balanceCashUsd={company.balanceCash}
          />
        </div>
      )}
    </div>
  );
}
