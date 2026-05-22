/**
 * Finds each company's website (FMP profile, then search fallback) and extracts
 * self-disclosed upcoming events/catalysts from their site (homepage + investor pages).
 *
 * Run: npm run db:populate-catalysts
 * Optional: npm run db:populate-catalysts -- --replace  (clear existing catalysts first)
 * Requires FMP_API_KEY in .env.
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
const FMP_BASE = "https://financialmodelingprep.com/api/v3";

const REPLACE_CATALYSTS = process.argv.includes("--replace");

function getApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) throw new Error("FMP_API_KEY is not set in .env");
  return key;
}

function toFmpSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.endsWith(".TO") || s.endsWith(".V")) return s;
  return `${s}.TO`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** 1) FMP company profile for website. Tries .TO then raw symbol. */
async function getWebsiteFromFmp(symbol: string): Promise<string | null> {
  const key = getApiKey();
  for (const sym of [toFmpSymbol(symbol), symbol.trim().toUpperCase()]) {
    try {
      const url = `${FMP_BASE}/profile/${sym}?apikey=${encodeURIComponent(key)}`;
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const arr = await res.json();
      const p = Array.isArray(arr) ? arr[0] : arr;
      const site = p?.website ?? p?.url ?? p?.companyUrl ?? null;
      if (typeof site === "string" && site.startsWith("http")) return site;
    } catch {
      continue;
    }
  }
  return null;
}

/** 2) Search fallback: DuckDuckGo HTML for "{companyName} TSXV official website", return first result URL. */
async function getWebsiteFromSearch(companyName: string): Promise<string | null> {
  const query = encodeURIComponent(`"${companyName.replace(/"/g, "")}" TSXV website`);
  const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const skipHosts = ["duckduckgo", "wikipedia", "linkedin", "facebook", "twitter", "youtube", "instagram", "yahoo", "bing", "google."];
    const tryLink = (href: string): string | null => {
      if (!href || href.length < 10) return null;
      if (href.startsWith("//")) href = "https:" + href;
      if (!href.startsWith("http")) return null;
      try {
        const u = new URL(href);
        const host = u.hostname.toLowerCase();
        if (skipHosts.some((s) => host.includes(s))) return null;
        return href;
      } catch {
        return null;
      }
    };
    let linkRegex = /<a\s+[^>]*class="[^"]*result__url[^"]*"[^>]*href="([^"]+)"/gi;
    let matches = [...html.matchAll(linkRegex)];
    for (const m of matches) {
      const out = tryLink((m[1] || "").trim());
      if (out) return out;
    }
    linkRegex = /<a\s+[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi;
    matches = [...html.matchAll(linkRegex)];
    for (const m of matches) {
      const out = tryLink((m[1] || "").trim());
      if (out) return out;
    }
    return null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

/** Resolve base URL (origin) for relative paths. */
function baseUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
}

/** Fetch URL and return plain text (strip HTML). */
async function fetchPageText(url: string, maxChars = 60000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return "";
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();
    return text.slice(0, maxChars);
  } catch {
    clearTimeout(t);
    return "";
  }
}

/** Investor / milestone paths to try (same origin). */
const INVESTOR_PATHS = ["/investors", "/ir", "/investor-relations", "/news", "/milestones", "/key-dates", "/catalysts", "/corporate-calendar", "/investor-relations/"];

/** Section headings that often introduce self-disclosed catalysts. */
const CATALYST_HEADINGS = [
  "upcoming catalysts",
  "key catalysts",
  "key milestones",
  "important dates",
  "milestones",
  "corporate calendar",
  "investor calendar",
  "next steps",
  "key dates",
  "upcoming milestones",
  "catalyst",
  "important events",
  "anticipated milestones",
  "development timeline",
];

/** Catalyst keywords (mining milestones). */
const CATALYST_KEYWORDS = [
  "drill results",
  "drilling results",
  "resource estimate",
  "maiden resource",
  "NI 43-101",
  "43-101",
  "PEA",
  "preliminary economic assessment",
  "PFS",
  "pre-feasibility",
  "feasibility study",
  "DFS",
  "definitive feasibility",
  "first production",
  "commissioning",
  "construction",
  "permitting",
  "exploration results",
  "assay results",
  "resource update",
  "production",
];

const DATE_PATTERN =
  /\b(Q[1-4]\s*'?\d{2}|Q[1-4]\s+20\d{2}|H[12]\s*'?\d{2}|H[12]\s+20\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}|20\d{2})\b/gi;

type Snippet = { title: string; description: string; dateStr: string | null };

/** Extract snippets from text under catalyst-style headings. */
function extractFromHeadings(text: string): Snippet[] {
  const results: Snippet[] = [];
  const lower = text.toLowerCase();
  for (const heading of CATALYST_HEADINGS) {
    const idx = lower.indexOf(heading);
    if (idx === -1) continue;
    const after = text.slice(idx, idx + 1200);
    const dateMatches = [...after.matchAll(DATE_PATTERN)];
    if (dateMatches.length === 0) continue;
    const firstDate = dateMatches[0][0];
    const snippetStart = Math.max(0, dateMatches[0].index! - 60);
    const snippetEnd = Math.min(after.length, (dateMatches[0].index ?? 0) + 180);
    let desc = after.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim().slice(0, 250);
    const title = heading.charAt(0).toUpperCase() + heading.slice(1);
    if (desc.length < 30) continue;
    results.push({ title: title.length > 60 ? title.slice(0, 57) + "..." : title, description: desc, dateStr: firstDate });
    if (results.length >= 2) break;
  }
  return results.slice(0, 2);
}

/** Fallback: keyword + date in text. */
function extractFromKeywords(text: string): Snippet[] {
  const results: Snippet[] = [];
  const lower = text.toLowerCase();
  const seen = new Set<string>();
  for (const keyword of CATALYST_KEYWORDS) {
    if (results.length >= 2) break;
    const idx = lower.indexOf(keyword);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + 150);
    let snippet = text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 220);
    const dateMatch = snippet.match(DATE_PATTERN);
    const dateStr = dateMatch ? dateMatch[0].trim() : null;
    const key = `${keyword}-${(dateStr ?? "").toLowerCase()}-${snippet.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const title = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    results.push({
      title: title.length > 50 ? title.slice(0, 47) + "..." : title,
      description: snippet || "Disclosed on company website.",
      dateStr,
    });
  }
  return results.slice(0, 2);
}

function parseDateStr(dateStr: string | null): { dateStart: Date | null; dateEnd: Date | null } {
  if (!dateStr) return { dateStart: null, dateEnd: null };
  const d = dateStr.trim();
  const yearMatch = d.match(/20\d{2}/);
  const year = yearMatch ? parseInt(yearMatch[0], 10) : new Date().getFullYear();
  let month = 0;
  if (/Q1/i.test(d)) month = 0;
  else if (/Q2/i.test(d)) month = 3;
  else if (/Q3/i.test(d)) month = 6;
  else if (/Q4/i.test(d)) month = 9;
  else if (/H1/i.test(d)) month = 0;
  else if (/H2/i.test(d)) month = 6;
  else if (/jan/i.test(d)) month = 0;
  else if (/feb/i.test(d)) month = 1;
  else if (/mar/i.test(d)) month = 2;
  else if (/apr/i.test(d)) month = 3;
  else if (/may/i.test(d)) month = 4;
  else if (/jun/i.test(d)) month = 5;
  else if (/jul/i.test(d)) month = 6;
  else if (/aug/i.test(d)) month = 7;
  else if (/sep/i.test(d)) month = 8;
  else if (/oct/i.test(d)) month = 9;
  else if (/nov/i.test(d)) month = 10;
  else if (/dec/i.test(d)) month = 11;
  try {
    const dateStart = new Date(year, month, 1);
    const dateEnd = new Date(year, month + 2, 0);
    return { dateStart, dateEnd };
  } catch {
    return { dateStart: null, dateEnd: null };
  }
}

async function main() {
  if (REPLACE_CATALYSTS) {
    const deleted = await prisma.catalyst.deleteMany({});
    console.log("Replace mode: deleted", deleted.count, "existing catalysts.");
  }

  const companies = await prisma.company.findMany({
    select: { id: true, symbol: true, name: true },
    orderBy: { name: "asc" },
  });

  console.log(`Processing ${companies.length} companies: find website, then extract self-disclosed catalysts...`);
  let withWebsite = 0;
  let fromSearch = 0;
  let catalystsCreated = 0;
  let skipped = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    if ((i + 1) % 30 === 0) console.log(`  ${i + 1}/${companies.length} ...`);

    const existingCount = await prisma.catalyst.count({ where: { companyId: c.id } });
    if (existingCount >= 2) {
      skipped++;
      continue;
    }

    await sleep(300);
    let website: string | null = await getWebsiteFromFmp(c.symbol);
    if (!website) {
      await sleep(800);
      website = await getWebsiteFromSearch(c.name);
      if (website) fromSearch++;
    }
    if (!website) continue;
    withWebsite++;

    let combinedText = "";
    await sleep(600);
    combinedText += await fetchPageText(website);
    const base = baseUrl(website);
    for (const p of INVESTOR_PATHS) {
      await sleep(400);
      const extra = await fetchPageText(base + p);
      if (extra.length > 500) combinedText += "\n\n " + extra;
    }

    if (combinedText.length < 200) continue;

    let snippets: Snippet[] = extractFromHeadings(combinedText);
    if (snippets.length < 2) {
      const fromKw = extractFromKeywords(combinedText);
      for (const s of fromKw) {
        if (snippets.length >= 2) break;
        if (!snippets.some((x) => x.title === s.title && x.description.slice(0, 50) === s.description.slice(0, 50))) {
          snippets.push(s);
        }
      }
    }
    snippets = snippets.slice(0, 2);

    for (const s of snippets) {
      const { dateStart, dateEnd } = parseDateStr(s.dateStr);
      await prisma.catalyst.create({
        data: {
          companyId: c.id,
          title: s.title,
          description: s.description,
          dateStart,
          dateEnd,
        },
      });
      catalystsCreated++;
    }
  }

  console.log(`Done. Companies with website: ${withWebsite} (${fromSearch} via search), catalysts created: ${catalystsCreated}, skipped: ${skipped}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
