/**
 * Fetches TSXV-listed companies from Revenue Watch / NRGI (extractive: oil & mining).
 * Run: npm run fetch-tsxv
 * Output: scripts/tsxv-companies.json
 *
 * Page structure: table with columns Company Name, Market Cap, US Listed, Ticker (e.g. "AIS CN Equity").
 */

import https from "https";
import * as fs from "fs";
import * as path from "path";

const TSXV_LIST_URL = "https://data.revenuewatch.org/listings/tsx-venture/";

function fetchWithInsecureAgent(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const req = https.get(url, { agent }, (res) => {
      let body = "";
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(body);
        else reject(new Error(`HTTP ${res.statusCode}`));
      });
    });
    req.on("error", reject);
  });
}

/** Primary metal = main commodity (gold, copper, etc.). Order matters: check specific metals first. */
function inferPrimaryMetal(name: string): string | null {
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
  if (/\bmining\b/.test(n) || /\bmines\b/.test(n) || /\bminerals\b/.test(n) || /\bmetals\b/.test(n) || /\bresources\b/.test(n) || /\bexploration\b/.test(n) || /\bore\b/.test(n)) return "other";
  return null;
}

function inferSubsector(name: string): string {
  const metal = inferPrimaryMetal(name);
  if (metal && metal !== "other") return metal;
  const n = name.toLowerCase();
  if (/\bmining\b/.test(n) || /\bmines\b/.test(n) || /\bminerals\b/.test(n) || /\bmetals\b/.test(n) || /\bresources\b/.test(n) || /\bexploration\b/.test(n) || /\bore\b/.test(n)) return "mining";
  return "other";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&amp;/g, "&").trim();
}

type CompanyRow = { name: string; symbol: string; marketCap: number | null; industry: string };

/** Parse HTML table: rows of <tr>...</tr>, cells <td>...</td>. Columns: Name, Market Cap, US Listed, Ticker. */
function parseTable(html: string): CompanyRow[] {
  const companies: CompanyRow[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];
    const cellMatches = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    const cells = cellMatches.map((m) => stripHtml(m[1]));
    if (cells.length < 4) continue;
    const name = cells[0].trim();
    if (!name || name.length > 200) continue;
    if (/^(company\s+name|name|market\s+cap|ticker|us\s+listed)$/i.test(name)) continue;
    const marketCapStr = cells[1].replace(/,/g, "").replace(/[^\d]/g, "");
    const ticker = (cells[3] || "").trim();
    const symbolMatch = ticker.match(/([A-Z0-9\/\-\.]{2,6})\s+CN\s+Equity/i);
    const symbol = symbolMatch ? symbolMatch[1].trim() : "";
    if (!symbol || symbol.length < 2) continue;
    const marketCap = marketCapStr ? parseInt(marketCapStr, 10) : null;
    const industry = inferSubsector(name);
    companies.push({ name, symbol, marketCap: marketCap || null, industry });
  }
  return companies;
}

/** Fallback: regex on plain text for "number No/Yes SYMBOL CN Equity" and name from previous line. */
function parsePlainText(text: string): CompanyRow[] {
  const companies: CompanyRow[] = [];
  const rowRegex = /([\d,]+|---)\s*(?:Yes|No)([A-Z0-9\/\-\.]{2,6})\s+CN\s+Equity/gi;
  let lastEnd = 0;
  let match;
  while ((match = rowRegex.exec(text)) !== null) {
    const marketCapStr = match[1];
    const symbol = (match[2] || "").trim();
    const nameBlock = text.slice(lastEnd, match.index).trim();
    lastEnd = match.index + match[0].length;
    const lines = nameBlock.split(/\n/).filter((l) => l.trim().length > 0);
    const name = lines.length ? lines[lines.length - 1].trim().replace(/\s*\*\s*$/, "").replace(/&amp;/g, "&") : "";
    if (!symbol || symbol.length < 2) continue;
    if (name.length > 1 && name.length < 200) {
      const marketCap = marketCapStr && marketCapStr !== "---" ? parseInt(marketCapStr.replace(/,/g, ""), 10) : null;
      const subsector = inferSubsector(name);
      companies.push({ name, symbol, marketCap, subsector });
    }
  }
  return companies;
}

async function main() {
  const scriptsDir = path.join(process.cwd(), "scripts");
  console.log("Fetching TSXV list from", TSXV_LIST_URL);
  let html: string;
  try {
    html = await fetchWithInsecureAgent(TSXV_LIST_URL);
  } catch (e) {
    console.error("Fetch failed:", (e as Error).message);
    throw e;
  }

  if (html.length < 500) {
    fs.writeFileSync(path.join(scriptsDir, "fetch-debug.txt"), html, "utf-8");
    console.error("Response too short. Saved to scripts/fetch-debug.txt");
    process.exit(1);
  }

  let companies = parseTable(html);
  if (companies.length === 0) {
    const text = html.replace(/<[^>]+>/g, "\n").replace(/\r\n/g, "\n").replace(/&amp;/g, "&");
    companies = parsePlainText(text);
  }
  if (companies.length === 0) {
    const debugSnippet = html.slice(0, 15000);
    fs.writeFileSync(path.join(scriptsDir, "fetch-debug.html"), debugSnippet, "utf-8");
    console.error("Parsed 0 companies. First 15k chars saved to scripts/fetch-debug.html for inspection.");
    process.exit(1);
  }

  const valid = companies.filter((c) => c.symbol.length >= 2);
  const miningOnly = valid.filter((c) => c.industry !== "other");
  console.log(`Parsed ${valid.length} TSXV companies, ${miningOnly.length} mining-related.`);

  const outPath = path.join(scriptsDir, "tsxv-companies.json");
  fs.writeFileSync(outPath, JSON.stringify(miningOnly, null, 2), "utf-8");
  console.log("Wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
