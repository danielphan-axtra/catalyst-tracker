/**
 * Experimental: Runs a simplified DCF/NAV for Endeavour using
 * data/endeavour-dcf-assumptions.json (manual JSON input).
 *
 * Run:
 *   npx tsx scripts/run-endeavour-dcf.ts --gold=2500 --discount=5
 *
 * Notes / simplifications:
 * - Uses `payableGoldProductionKozByYear` with keys like "Year1".."YearN".
 * - Uses `aiscUsdPerOz` as the per-oz cost input.
 * - Approximates Operating Cash Flow (OCF) as: (GoldPrice - AISC) * ounces.
 * - Approximates Investing Cash Flow (ICF) as: -Initial capex in Year 1 only.
 * - Financing Cash Flow (FCF/Financing) is set to 0 (not modeled yet).
 * - NAV here is the discounted sum of (OCF + ICF) over available years.
 */

import * as fs from "fs";
import * as path from "path";

type EndeavourAsset = {
  name: string;
  type?: "production" | "development" | string;
  jurisdiction?: string | null;
  payableGoldProductionKozByYear?: Record<string, number>;
  mineLifeEndYear?: number;
  aiscUsdPerOz?: number;
  capexUsdMByYear?: Record<string, number>;
};

type EndeavourAssumptionsFile = {
  source?: string;
  assets: EndeavourAsset[];
  discountRatePct?: number;
  currency?: string;
};

function parseFirstJsonObject(raw: string): any {
  const firstBrace = raw.indexOf("{");
  if (firstBrace === -1) throw new Error("No '{' found in assumptions file.");

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth++;
      continue;
    }

    if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = raw.slice(firstBrace, i + 1);
        return JSON.parse(candidate);
      }
    }
  }

  throw new Error("Could not extract a complete first JSON object from assumptions file.");
}

function getArgNumber(name: string, defaultValue: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? "";
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

function parseYearKey(k: string): number | null {
  // Expected: "Year1", "Year2", ... but be tolerant.
  const m = k.match(/(?:^|[^0-9])(\d+)(?:[^0-9]|$)/);
  if (!m) return null;
  const y = Number(m[1]);
  return Number.isFinite(y) && y > 0 ? y : null;
}

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "NaN";
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(0)}`;
}

async function main() {
  const goldPrice = getArgNumber("gold", 2500); // USD/oz
  const discountRatePct = getArgNumber("discount", 5); // %

  const assumptionsPath = path.join(process.cwd(), "data", "endeavour-dcf-assumptions.json");
  const raw = fs.readFileSync(assumptionsPath, "utf-8");
  const json = parseFirstJsonObject(raw) as EndeavourAssumptionsFile;

  if (!Array.isArray(json.assets) || json.assets.length === 0) {
    throw new Error("No assets found in endeavours assumptions JSON under `assets[]`.");
  }

  // For now: use the first mine/project only (single-mine testing).
  const asset = json.assets[0];
  const schedule = asset.payableGoldProductionKozByYear ?? {};
  const aiscUsdPerOz = asset.aiscUsdPerOz ?? null;
  const capex = asset.capexUsdMByYear ?? {};

  if (aiscUsdPerOz == null) throw new Error("Missing `aiscUsdPerOz` in the first asset.");

  const parsedYears = Object.entries(schedule)
    .map(([k, v]) => {
      const y = parseYearKey(k);
      return y == null ? null : { year: y, koz: Number(v) };
    })
    .filter(Boolean) as { year: number; koz: number }[];

  if (parsedYears.length === 0) {
    throw new Error("Missing/empty `payableGoldProductionKozByYear` in the first asset.");
  }

  parsedYears.sort((a, b) => a.year - b.year);
  const maxYear = Math.max(...parsedYears.map((x) => x.year));
  const mineLifeYears = Number.isFinite(asset.mineLifeEndYear) && (asset.mineLifeEndYear as number) > 0
    ? Math.min(maxYear, asset.mineLifeEndYear as number)
    : maxYear;

  const byYear = new Map<number, number>(parsedYears.map((x) => [x.year, x.koz]));

  const initialCapexUsdM = Number(capex["Initial"] ?? capex["initial"] ?? 0);
  const initialCapexUsd = initialCapexUsdM * 1_000_000;

  const r = discountRatePct / 100;
  const yearRange = Array.from({ length: mineLifeYears }, (_, i) => i + 1);

  const rows = yearRange.map((year) => {
    const koz = byYear.get(year) ?? 0;
    const ounces = koz * 1000;
    const revenue = goldPrice * ounces;
    const cost = aiscUsdPerOz * ounces;
    const ocf = revenue - cost;

    // Simplification: avoid double counting. We assume sustaining impacts are already included in AISC.
    const icf = year === 1 ? -initialCapexUsd : 0;
    const cff = 0;

    const fcf = ocf + icf + cff;
    const pv = fcf / Math.pow(1 + r, year);

    return { year, koz, ounces, revenue, cost, ocf, icf, cff, fcf, pv };
  });

  const nav = rows.reduce((sum, x) => sum + x.pv, 0);
  const nav5 = rows.slice(0, 5).reduce((sum, x) => sum + x.pv, 0);

  console.log(`Endeavour DCF/NAV (simplified)`);
  console.log(`Asset: ${asset.name}`);
  console.log(`Gold price: $${goldPrice.toFixed(0)}/oz`);
  console.log(`Discount rate: ${discountRatePct.toFixed(2)}%`);
  console.log(`AISC: $${aiscUsdPerOz.toFixed(0)}/oz`);
  console.log(`Initial capex: ${initialCapexUsdM ? formatUsd(initialCapexUsd) : "$0"}`);
  console.log(`Mine life (years modeled): ${mineLifeYears}`);
  if (capex["Sustaining_Total"] != null) {
    console.log(`Sustaining_Total provided (${capex["Sustaining_Total"]} USDm) but not allocated in ICF to avoid double counting (AISC already assumed all-in).`);
  }
  console.log("");

  console.log(`5-year production & cash flows (Year 1..5):`);
  console.log(
    `Year | Production (koz) | OCF | ICF | FCF | PV(Fcf)`.replace(/\s+/g, " ").trim()
  );
  for (const row of rows.slice(0, 5)) {
    console.log(
      `${String(row.year).padStart(4)} | ${row.koz.toFixed(0).padStart(14)} | ${formatUsd(
        row.ocf
      ).padStart(10)} | ${formatUsd(row.icf).padStart(10)} | ${formatUsd(row.fcf).padStart(10)} | ${formatUsd(
        row.pv
      ).padStart(10)}`
    );
  }

  console.log("");
  console.log(`NAV (discounted sum over modeled life): ${formatUsd(nav)}`);
  console.log(`NAV (discounted sum over first 5 years): ${formatUsd(nav5)}`);
  console.log("");
  console.log(`Source: ${json.source ?? "n/a"}`);
}

main().catch((e) => {
  console.error("run-endeavour-dcf failed:");
  console.error(e);
  process.exit(1);
});

