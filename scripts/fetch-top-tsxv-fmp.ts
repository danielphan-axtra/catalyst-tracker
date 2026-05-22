/**
 * Fetches top 10 TSXV companies by market cap from FMP (if available).
 * FMP stock screener requires a paid plan - free tier uses curated list.
 *
 * Run: npx tsx scripts/fetch-top-tsxv-fmp.ts
 * Output: scripts/top-10-tsxv.json
 */

import * as fs from "fs";
import * as path from "path";

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const FMP_STABLE = "https://financialmodelingprep.com/stable";
const key = process.env.FMP_API_KEY;

async function fetchTopTSXV(): Promise<void> {
  if (key) {
    const url = `${FMP_STABLE}/company-screener?exchange=TSXV&limit=100&apikey=${key}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const sorted = [...data].sort((a: { mktCap?: number }, b: { mktCap?: number }) => (b.mktCap ?? 0) - (a.mktCap ?? 0));
        const top10 = sorted.slice(0, 10);
        const output = top10.map((c: Record<string, unknown>) => ({
          symbol: String(c.symbol ?? "").replace(/\.TO$|\.V$/i, ""),
          name: c.companyName ?? c.company ?? "",
          marketCap: typeof c.mktCap === "number" ? c.mktCap : null,
          industry: c.industry ?? null,
        }));
        const outPath = path.join(process.cwd(), "scripts", "top-10-tsxv.json");
        fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
        console.log("Fetched top 10 TSXV from FMP, wrote to", outPath);
        top10.forEach((c: Record<string, unknown>, i: number) => {
          const cap = typeof c.mktCap === "number" ? `$${(c.mktCap / 1e6).toFixed(0)}M` : "N/A";
          console.log(`  ${i + 1}. ${c.symbol} - ${c.companyName} (${cap})`);
        });
        return;
      }
    }
  }

  // Fallback: use curated list (FMP stock screener requires paid plan)
  console.log("Using curated top 10 TSXV metals & mining companies (FMP screener requires paid plan).");
  const curatedPath = path.join(process.cwd(), "scripts", "top-10-tsxv.json");
  if (!fs.existsSync(curatedPath)) {
    const curated = [
      { symbol: "NXE", name: "NexGen Energy Ltd", marketCap: null },
      { symbol: "DML", name: "Denison Mines Corp", marketCap: null },
      { symbol: "PMET", name: "Patriot Battery Metals Inc", marketCap: null },
      { symbol: "FCU", name: "Fission Uranium Corp", marketCap: null },
      { symbol: "ISO", name: "IsoEnergy Ltd", marketCap: null },
      { symbol: "CRE", name: "Critical Elements Lithium Corp", marketCap: null },
      { symbol: "GXU", name: "GoviEx Uranium Inc", marketCap: null },
      { symbol: "FUU", name: "Fission 3.0 Corp", marketCap: null },
      { symbol: "LUR", name: "Labrador Uranium Inc", marketCap: null },
      { symbol: "BSK", name: "Blue Sky Uranium Corp", marketCap: null },
    ];
    fs.writeFileSync(curatedPath, JSON.stringify(curated, null, 2), "utf-8");
    console.log("Created", curatedPath);
  }
}

fetchTopTSXV().catch((e) => {
  console.error(e);
  process.exit(1);
});
