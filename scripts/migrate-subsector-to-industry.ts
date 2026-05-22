/**
 * Migration script to rename subsector to industry and populate from EODHD.
 * Run: npm run db:migrate-industry
 * 
 * This script:
 * 1. Adds industry column (if not exists)
 * 2. Fetches industry from EODHD for each company
 * 3. Falls back to subsector value if EODHD doesn't have industry
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}
loadEnv();

const prisma = new PrismaClient();
const EODHD_BASE = "https://eodhd.com/api";

function getApiKey(): string {
  const key = process.env.EODHD_API_KEY;
  if (!key) throw new Error("EODHD_API_KEY is not set in .env");
  return key;
}

function toEodhdSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.endsWith(".V") || s.endsWith(".TO")) return s.replace(".TO", ".V");
  return `${s}.V`;
}

async function fetchIndustryFromEodhd(symbol: string): Promise<string | null> {
  const key = getApiKey();
  const eodSym = toEodhdSymbol(symbol);

  try {
    const url = `${EODHD_BASE}/fundamentals/${eodSym}?api_token=${encodeURIComponent(key)}&fmt=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;

    const general = data.General ?? data.general ?? {};
    const industry = (general.Industry ?? general.industry ?? null) as string | null;
    return industry && industry.trim() ? industry.trim() : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("Step 1: Copying subsector to industry for all companies...");
  const companies = await prisma.company.findMany({
    select: { id: true, symbol: true, subsector: true, industry: true },
  });

  // First, copy subsector to industry if industry is null
  let copied = 0;
  for (const company of companies) {
    if (!company.industry && company.subsector) {
      await prisma.company.update({
        where: { id: company.id },
        data: { industry: company.subsector },
      });
      copied++;
    }
  }
  console.log(`  Copied subsector to industry for ${copied} companies.`);

  console.log(`\nStep 2: Fetching industry from EODHD for ${companies.length} companies...`);
  console.log("Note: This may take a while due to API rate limits (20 calls/day free tier).");

  let updated = 0;
  let skipped = 0;
  let apiCalls = 0;

  for (const company of companies) {
    // Skip if we already have industry from EODHD (different from subsector)
    if (company.industry && company.subsector && company.industry !== company.subsector) {
      console.log(`  ${company.symbol}: Already has EODHD industry "${company.industry}"`);
      continue;
    }

    apiCalls++;
    if (apiCalls > 19) {
      console.log(`\n⚠️  Reached API limit (20 calls/day). Stopping.`);
      console.log(`Updated ${updated} companies. ${companies.length - updated - skipped} remaining.`);
      console.log(`Run this script again tomorrow to continue.`);
      break;
    }

    console.log(`  Fetching industry for ${company.symbol}... (${apiCalls}/20)`);
    const industry = await fetchIndustryFromEodhd(company.symbol);

    const industryValue = industry || company.subsector || company.industry || "Mining";

    await prisma.company.update({
      where: { id: company.id },
      data: { industry: industryValue },
    });

    if (industry) {
      console.log(`    ✓ Set to "${industry}"`);
      updated++;
    } else {
      console.log(`    → Using fallback "${company.subsector || company.industry || 'Mining'}"`);
      skipped++;
    }

    // Small delay to be respectful to API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\nDone! Updated ${updated} companies with EODHD industry data.`);
  console.log(`${skipped} companies used fallback from subsector.`);
  console.log(`\nNext: Make industry required in schema and remove subsector field.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
