"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

type CompanySearchProps = {
  initialSearch: string;
  initialMarketCap: string;
  initialCommodity: string;
  initialCatalystTiming: string;
  initialImpact: string;
  industries: string[];
  hasPaidAccess: boolean;
};

export function CompanySearch({
  initialSearch,
  initialMarketCap,
  initialCommodity,
  initialCatalystTiming,
  initialImpact,
  industries,
  hasPaidAccess,
}: CompanySearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const marketCapRef = useRef<HTMLSelectElement>(null);
  const commodityRef = useRef<HTMLSelectElement>(null);
  const catalystTimingRef = useRef<HTMLSelectElement>(null);
  const impactRef = useRef<HTMLSelectElement>(null);
  const marketCapLabel =
    initialMarketCap === "small"
      ? "Smallcap (< $100M)"
      : initialMarketCap === "mid"
        ? "Midcap ($100M - $2B)"
        : initialMarketCap === "large"
          ? "Large Cap (> $2B)"
          : "";
  const catalystTimingLabel =
    initialCatalystTiming === "lt12m"
      ? "Less than 12 months"
      : initialCatalystTiming === "12to36m"
        ? "Medium-term (12-36 months)"
        : initialCatalystTiming === "gt36m"
          ? "Long-term (Beyond 36 months)"
          : "";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = (inputRef.current?.value ?? "").trim();
    const marketCap = marketCapRef.current?.value ?? "";
    const commodity = commodityRef.current?.value ?? "";
    const catalystTiming = catalystTimingRef.current?.value ?? "";
    const impact = impactRef.current?.value ?? "";
    const params = new URLSearchParams(searchParams.toString());
    if (q) {
      params.set("search", q);
      params.delete("page");
    } else {
      params.delete("search");
      params.delete("page");
    }
    if (marketCap) params.set("marketCap", marketCap);
    else params.delete("marketCap");

    if (commodity) params.set("commodity", commodity);
    else params.delete("commodity");

    if (catalystTiming) params.set("catalystTiming", catalystTiming);
    else params.delete("catalystTiming");

    if (hasPaidAccess && impact) params.set("impact", impact);
    else params.delete("impact");

    params.delete("page");
    router.push(`/companies${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function removeFilter(key: "search" | "marketCap" | "commodity" | "catalystTiming" | "impact") {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(`/companies${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <input
          ref={inputRef}
          type="search"
          name="search"
          defaultValue={initialSearch}
          placeholder="Search by company name or symbol..."
          className="flex-1 rounded-none border border-neutral-300 px-3 py-2 text-neutral-900 placeholder:text-neutral-500 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          aria-label="Search companies"
        />
        <select
          ref={marketCapRef}
          defaultValue={initialMarketCap}
          className="rounded-none border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          aria-label="Filter by market cap"
        >
          <option value="">Market Cap (All)</option>
          <option value="small">Smallcap (&lt; $100M)</option>
          <option value="mid">Midcap ($100M - $2B)</option>
          <option value="large">Large Cap (&gt; $2B)</option>
        </select>
        <select
          ref={commodityRef}
          defaultValue={initialCommodity}
          className="rounded-none border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          aria-label="Filter by commodity"
        >
          <option value="">Commodity (All)</option>
          {industries.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </select>
        <select
          ref={catalystTimingRef}
          defaultValue={initialCatalystTiming}
          className="rounded-none border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
          aria-label="Filter by catalyst timing"
        >
          <option value="">Catalyst Timing (All)</option>
          <option value="lt12m">Less than 12 months</option>
          <option value="12to36m">Medium-term (12-36 months)</option>
          <option value="gt36m">Long-term (Beyond 36 months)</option>
        </select>
        {hasPaidAccess ? (
          <select
            ref={impactRef}
            defaultValue={initialImpact}
            className="rounded-none border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            aria-label="Filter by impact"
          >
            <option value="">Impact (All)</option>
            <option value="Major">Major</option>
            <option value="Medium">Medium</option>
            <option value="Incremental">Incremental</option>
          </select>
        ) : (
          <div className="rounded-none border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600">
            Impact filter is for Pro subscribers.
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          className="rounded-none border border-neutral-900 bg-neutral-900 px-4 py-2 font-medium text-white hover:bg-neutral-800 transition-colors"
        >
          Search
        </button>
        {(initialSearch || initialMarketCap || initialCommodity || initialCatalystTiming || initialImpact) && (
          <a
            href="/companies"
            className="rounded-none border border-neutral-300 px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            Clear
          </a>
        )}
      </div>
      {(initialSearch || initialMarketCap || initialCommodity || initialCatalystTiming || initialImpact) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {initialSearch && (
            <button
              type="button"
              onClick={() => removeFilter("search")}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              aria-label={`Remove search filter ${initialSearch}`}
            >
              Search: {initialSearch} ×
            </button>
          )}
          {initialMarketCap && marketCapLabel && (
            <button
              type="button"
              onClick={() => removeFilter("marketCap")}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              aria-label={`Remove market cap filter ${marketCapLabel}`}
            >
              Market Cap: {marketCapLabel} ×
            </button>
          )}
          {initialCommodity && (
            <button
              type="button"
              onClick={() => removeFilter("commodity")}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              aria-label={`Remove commodity filter ${initialCommodity}`}
            >
              Commodity: {initialCommodity} ×
            </button>
          )}
          {initialCatalystTiming && catalystTimingLabel && (
            <button
              type="button"
              onClick={() => removeFilter("catalystTiming")}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              aria-label={`Remove catalyst timing filter ${catalystTimingLabel}`}
            >
              Catalyst Timing: {catalystTimingLabel} ×
            </button>
          )}
          {hasPaidAccess && initialImpact && (
            <button
              type="button"
              onClick={() => removeFilter("impact")}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              aria-label={`Remove impact filter ${initialImpact}`}
            >
              Impact: {initialImpact} ×
            </button>
          )}
        </div>
      )}
    </form>
  );
}
