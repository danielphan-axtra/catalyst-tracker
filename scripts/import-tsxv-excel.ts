/**
 * Imports TSXV companies from an Excel file (.xlsx or .xls).
 *
 * 1. Put your Excel file at:  scripts/tsxv-upload.xlsx
 * 2. Run:  npm run db:import-excel
 *    To replace the entire list (delete all companies then import):  npm run db:import-excel -- --replace
 *
 * Expected columns (names are flexible; case-insensitive):
 *   - Symbol or Ticker (e.g. ABC, AIS)
 *   - Company Name or Name
 *   - Sector or Subsector (optional; e.g. Mining, Gold)
 *   - Market Cap or Market Capitalization (optional; numbers only)
 *
 * The script uses the first sheet. If your columns have different names,
 * it will use the first column that looks like a symbol, second as name, etc.
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultPath = path.join(process.cwd(), "scripts", "tsxv-upload.xlsx");
const args = process.argv.slice(2).filter((a) => a !== "--replace");
const REPLACE_LIST = process.argv.includes("--replace");
const UPLOAD_PATH = args[0] ? path.resolve(process.cwd(), args[0]) : defaultPath;

/** Primary metal = main commodity. Infer from name or sector column. */
function inferPrimaryMetal(name: string, sectorCol?: string): string | null {
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
  if (/\bmolybdenum\b/.test(n) || /\bmoly\b/.test(n)) return "molybdenum";
  if (/\bvanadium\b/.test(n)) return "vanadium";
  if (sectorCol && sectorCol.length > 0 && sectorCol.length < 50) {
    const s = sectorCol.toLowerCase();
    const m = s.match(/\b(gold|silver|copper|nickel|uranium|lithium|cobalt|diamond|coal|potash|zinc|lead|rare earth|molybdenum|vanadium)\b/);
    if (m) return m[1].replace(/\s+/, " ");
  }
  return null;
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

function parseMarketCap(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const s = String(val).replace(/,/g, "").replace(/[^\d.]/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isNaN(n) ? null : n;
}

async function main() {
  if (!fs.existsSync(UPLOAD_PATH)) {
    console.error("Excel file not found.");
    console.error("  Default path: scripts/tsxv-upload.xlsx");
    console.error("  Or pass a path: npm run db:import-excel -- path/to/your-file.xlsx");
    process.exit(1);
  }
  console.log("Reading:", UPLOAD_PATH);
  if (REPLACE_LIST) {
    const deleted = await prisma.company.deleteMany({});
    console.log("Replace mode: deleted", deleted.count, "existing companies (and their catalysts, price history, etc.).");
  }

  const workbook = XLSX.readFile(UPLOAD_PATH);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length < 2) {
    console.error("Excel has no data rows (need at least a header row and one data row).");
    process.exit(1);
  }

  const header = (rows[0] as string[]).map((h) => String(h ?? "").trim());
  const headerLower = header.map((h) => h.toLowerCase());

  const symbolIdx = headerLower.findIndex((h) => /^symbol$|^ticker$|^ticker\s*symbol$/.test(h));
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

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const cells = Array.isArray(row) ? row.map((c) => (c != null ? String(c).trim() : "")) : [];
    const symbolRaw = (cells[symCol] ?? "").trim().toUpperCase().replace(/\s+CN\s+Equity$/i, "");
    const symbol = symbolRaw.replace(/^["']|["']$/g, "");
    const name = (cells[nameCol] ?? "").trim().replace(/^["']|["']$/g, "");
    const sectorVal = sectorCol >= 0 ? (cells[sectorCol] ?? "").trim() : undefined;
    const marketCap = parseMarketCap(capCol >= 0 ? cells[capCol] : null);

    if (!symbol || symbol.length < 2 || symbol.length > 10) {
      skipped++;
      continue;
    }
    if (!name || name.length > 300) {
      skipped++;
      continue;
    }

    const primaryMetal = inferPrimaryMetal(name, sectorVal);
    const industry = primaryMetal ?? inferSubsector(name, sectorVal);
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
