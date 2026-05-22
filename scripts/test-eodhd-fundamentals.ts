/**
 * Test script to see what EODHD fundamentals API actually returns.
 * Run: tsx scripts/test-eodhd-fundamentals.ts
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
      if (m) {
        const value = m[2].trim().replace(/^["']|["']$/g, "");
        process.env[m[1]] = value;
      }
    }
  }
}
loadEnv();

const EODHD_BASE = "https://eodhd.com/api";
const key = process.env.EODHD_API_KEY;

if (!key) {
  console.error("EODHD_API_KEY not set");
  process.exit(1);
}

async function test() {
  // Test with one of the seeded companies
  const symbol = "AAG.V";
  const url = `${EODHD_BASE}/fundamentals/${symbol}?api_token=${encodeURIComponent(key)}&fmt=json`;
  
  console.log(`Fetching fundamentals for ${symbol}...`);
  console.log(`URL: ${url.replace(key, "***")}`);
  
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.error(text);
    return;
  }
  
  const data = await res.json();
  
  console.log("\n=== Full Response Structure ===");
  console.log("Top-level keys:", Object.keys(data));
  
  if (data.General) {
    console.log("\n=== General Section ===");
    console.log("Keys:", Object.keys(data.General));
    console.log("\nSample values:");
    const general = data.General;
    console.log("  Name:", general.Name);
    console.log("  Industry:", general.Industry);
    console.log("  MarketCapitalization:", general.MarketCapitalization);
    console.log("  marketCapitalization:", general.marketCapitalization);
    console.log("  MarketCap:", general.MarketCap);
    console.log("  SharesOutstanding:", general.SharesOutstanding);
    console.log("  SharesOutstanding:", general.SharesOutstanding);
  }
  
  if (data.Valuation) {
    console.log("\n=== Valuation Section ===");
    console.log("Keys:", Object.keys(data.Valuation));
    console.log("\nSample values:");
    const valuation = data.Valuation;
    console.log("  MarketCapitalization:", valuation.MarketCapitalization);
    console.log("  EnterpriseValue:", valuation.EnterpriseValue);
  }
  
  if (data.Highlights) {
    console.log("\n=== Highlights Section ===");
    console.log("Keys:", Object.keys(data.Highlights));
    const highlights = data.Highlights;
    console.log("  MarketCapitalization:", highlights.MarketCapitalization);
  }
  
  // Save full response to file for inspection
  const outputPath = path.join(process.cwd(), "scripts", "eodhd-response-sample.json");
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`\nFull response saved to: ${outputPath}`);
}

test().catch(console.error);
