/**
 * Imports TSXV companies from a CSV file.
 *
 * 1. Put your CSV file at:  scripts/tsxv-upload.csv
 * 2. Run:  npm run db:import-csv
 *
 * Expected columns (names are flexible; case-insensitive):
 *   - Symbol or Ticker (e.g. ABC, AIS)
 *   - Company Name or Name
 *   - Sector or Subsector (optional; e.g. Mining, Gold)
 *   - Market Cap or Market Capitalization (optional; numbers only)
 *
 * If your CSV uses different column names, the script will use the first column
 * that looks like a symbol (2–6 letters/numbers), second as name, etc.
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const UPLOAD_PATH = path.join(process.cwd(), "scripts", "tsxv-upload.csv");

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (inQuotes) {
      current += c;
    } else if (c === ",") {
      out.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  out.push(current.trim());
  return out;
}

function inferSubsector(name: string, sectorCol?: string): string {
  if (sectorCol && sectorCol.length > 0 && sectorCol.length < 50) {
    const s = sectorCol.toLowerCase();
    if (/mining|gold|silver|copper|nickel|uranium|lithium|cobalt|diamond|coal|potash|zinc|lead|rare\s*earth|metals|minerals/.test(s)) {
      return s.replace(/\s+/, " ").trim();
    }
  }
  const n = name.toLowerCase();
  if (/\bgold\b/.test(n)) return "gold";
  if (/\bsilver\b/.test(n)) return "silver";
  if (/\bcopper\b/.test(n)) return "copper";
  if (/\bnickel\b/.test(n)) return "nickel";
  if (/\buranium\b/.test(n)) return "uranium";
  if (/\blithium\b/.test(n)) return "lithium";
  if (/\bcobalt\b/.test(n)) return "cobalt";
  if (/\bdiamond\b/.test(n)) return "diamond";
  if (/\bcoal\b/.test(n)) return "coal";
  if (/\bpotash\b/.test(n)) return "potash";
  if (/\brare earth\b/.test(n) || /\brare earths\b/.test(n)) return "rare earth";
  if (/\bzinc\b/.test(n)) return "zinc";
  if (/\blead\b/.test(n)) return "lead";
  if (/\bmining\b/.test(n) || /\bmines\b/.test(n) || /\bminerals\b/.test(n) || /\bmetals\b/.test(n) || /\bresources\b/.test(n) || /\bexploration\b/.test(n) || /\bore\b/.test(n)) return "mining";
  return "mining";
}

async function main() {
  if (!fs.existsSync(UPLOAD_PATH)) {
    console.error("CSV file not found. Please save your file as:");
    console.error("  scripts/tsxv-upload.csv");
    console.error("Then run: npm run db:import-csv");
    process.exit(1);
  }

  const raw = fs.readFileSync(UPLOAD_PATH, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    console.error("CSV has no data rows (need at least a header row and one data row).");
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const headerLower = header.map((h) => h.toLowerCase());
  const symbolIdx = headerLower.findIndex((h) => /^symbol$|^ticker$/.test(h));
  const nameIdx = headerLower.findIndex((h) => /^company\s*name$|^name$|^company$/.test(h));
  const sectorIdx = headerLower.findIndex((h) => /^sector$|^subsector$|^industry$/.test(h));
  const capIdx = headerLower.findIndex((h) => /^market\s*cap|^market\s*capitalization|^mcap$/.test(h));

  const symCol = symbolIdx >= 0 ? symbolIdx : 0;
  const nameCol = nameIdx >= 0 ? nameIdx : (header.length > 1 ? 1 : 0);
  const sectorCol = sectorIdx >= 0 ? sectorIdx : -1;
  const capCol = capIdx >= 0 ? capIdx : -1;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const symbol = (cells[symCol] || "").trim().toUpperCase().replace(/\s+CN\s+Equity$/i, "");
    const name = (cells[nameCol] || "").trim().replace(/^["']|["']$/g, "");
    const sectorVal = sectorCol >= 0 ? (cells[sectorCol] || "").trim() : undefined;
    const capStr = capCol >= 0 ? (cells[capCol] || "").replace(/,/g, "").replace(/[^\d.]/g, "") : "";
    const marketCap = capStr ? parseInt(capStr, 10) : null;

    if (!symbol || symbol.length < 2 || symbol.length > 10) {
      skipped++;
      continue;
    }
    if (!name || name.length > 300) {
      skipped++;
      continue;
    }

    const industry = inferSubsector(name, sectorVal);
    const existing = await prisma.company.findUnique({ where: { symbol } });
    await prisma.company.upsert({
      where: { symbol },
      update: { name, industry, marketCap: marketCap ?? undefined },
      create: { symbol, name, industry, marketCap: marketCap ?? undefined, description: null },
    });
    if (existing) updated++;
    else created++;
  }

  console.log(`Done: ${created} created, ${updated} updated, ${skipped} skipped.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
