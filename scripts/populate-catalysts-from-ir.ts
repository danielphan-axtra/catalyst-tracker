/**
 * For each company (e.g. top 20), visits their website and investor relations section,
 * finds report/presentation-style pages (quarterly results, investor presentations),
 * and extracts key upcoming catalysts into the DB.
 *
 * Run: npm run db:populate-catalysts-ir
 * Uses company.website from DB (set by EODHD seed). Optional: FMP_API_KEY for missing websites.
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
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getFmpKey(): string | null {
  return process.env.FMP_API_KEY ?? null;
}

function toFmpSymbol(symbol: string): string {
  const s = symbol.trim().toUpperCase();
  if (s.endsWith(".TO") || s.endsWith(".V")) return s;
  return `${s}.TO`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function getWebsiteFromFmp(symbol: string): Promise<string | null> {
  const key = getFmpKey();
  if (!key) return null;
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

const SKIP_HOSTS = ["duckduckgo", "wikipedia", "linkedin", "facebook", "twitter", "youtube", "instagram", "yahoo", "bing", "google."];
function tryLink(href: string, baseOrigin: string): string | null {
  if (!href || href.length < 5) return null;
  try {
    const url = new URL(href, baseOrigin);
    if (!url.protocol.startsWith("http")) return null;
    const host = url.hostname.toLowerCase();
    if (SKIP_HOSTS.some((s) => host.includes(s))) return null;
    if (url.pathname.toLowerCase().endsWith(".pdf")) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function getWebsiteFromSearch(companyName: string): Promise<string | null> {
  const query = encodeURIComponent(`"${companyName.replace(/"/g, "")}" investor relations mining`);
  const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(searchUrl, { signal: controller.signal, headers: { "User-Agent": UA }, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const linkRegex = /<a\s+[^>]*class="[^"]*result__url[^"]*"[^>]*href="([^"]+)"/gi;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      const out = tryLink((m[1] || "").trim(), "https://duckduckgo.com");
      if (out) return out;
    }
    const fallback = /<a\s+[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi;
    while ((m = fallback.exec(html)) !== null) {
      const out = tryLink((m[1] || "").trim(), "https://duckduckgo.com");
      if (out) return out;
    }
    return null;
  } catch {
    clearTimeout(t);
    return null;
  }
}

function baseOrigin(url: string): string {
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return url;
  }
}

async function fetchPageText(url: string, maxChars = 80000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 18000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": UA }, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return "";
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
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

function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 18000);
  return fetch(url, { signal: controller.signal, headers: { "User-Agent": UA }, redirect: "follow" })
    .then((r) => (r.ok ? r.text() : ""))
    .then((html) => {
      clearTimeout(t);
      return html;
    })
    .catch(() => {
      clearTimeout(t);
      return "";
    });
}

const INVESTOR_PATHS = [
  "/investors",
  "/ir",
  "/investor-relations",
  "/investors/",
  "/ir/",
  "/investor-relations/",
  "/news",
  "/news/",
  "/media",
  "/key-dates",
  "/corporate-calendar",
  "/events",
  "/investors/presentations",
  "/investors/reports",
  "/investor-relations/presentations",
  "/investor-relations/reports",
  "/investor-relations/financial-results",
  "/investors/financial-reports",
];

const REPORT_LINK_KEYWORDS = /quarterly|presentation|results|earnings|investor\s*day|annual\s*report|financial\s*results|q[1-4]\s*20\d{2}|investor\s*presentation/i;

function extractReportLinks(html: string, baseOrigin: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = (m[1] || "").trim();
    if (!REPORT_LINK_KEYWORDS.test(href) && !REPORT_LINK_KEYWORDS.test(html.slice(m.index, m.index + 200))) continue;
    const full = tryLink(href, baseOrigin);
    if (full && !seen.has(full)) {
      seen.add(full);
      out.push(full);
    }
  }
  return out.slice(0, 5);
}

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
  "upcoming events",
  "forward-looking",
  "2025",
  "2026",
];

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
  "quarterly results",
  "earnings",
  "financial results",
];

const DATE_PATTERN =
  /\b(Q[1-4]\s*'?\d{2}|Q[1-4]\s+20\d{2}|H[12]\s*'?\d{2}|H[12]\s+20\d{2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+20\d{2}|20\d{2})\b/gi;

type Snippet = { title: string; description: string; dateStr: string | null };

function extractFromHeadings(text: string): Snippet[] {
  const results: Snippet[] = [];
  const lower = text.toLowerCase();
  for (const heading of CATALYST_HEADINGS) {
    const idx = lower.indexOf(heading);
    if (idx === -1) continue;
    const after = text.slice(idx, idx + 1500);
    const dateMatches = [...after.matchAll(DATE_PATTERN)];
    if (dateMatches.length === 0) continue;
    const firstDate = dateMatches[0][0];
    const snippetStart = Math.max(0, dateMatches[0].index! - 80);
    const snippetEnd = Math.min(after.length, (dateMatches[0].index ?? 0) + 220);
    let desc = after.slice(snippetStart, snippetEnd).replace(/\s+/g, " ").trim().slice(0, 280);
    const title = heading.charAt(0).toUpperCase() + heading.slice(1).replace(/^\d{4}$/, "Upcoming milestones");
    if (desc.length < 25) continue;
    results.push({ title: title.length > 60 ? title.slice(0, 57) + "..." : title, description: desc, dateStr: firstDate });
  }
  return results.slice(0, 5);
}

function extractFromKeywords(text: string): Snippet[] {
  const results: Snippet[] = [];
  const lower = text.toLowerCase();
  const seen = new Set<string>();
  for (const keyword of CATALYST_KEYWORDS) {
    if (results.length >= 5) break;
    const idx = lower.indexOf(keyword);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 70);
    const end = Math.min(text.length, idx + 180);
    let snippet = text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 250);
    const dateMatch = snippet.match(DATE_PATTERN);
    const dateStr = dateMatch ? dateMatch[0].trim() : null;
    const key = `${keyword}-${(dateStr ?? "").toLowerCase()}-${snippet.slice(0, 50)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const title = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    results.push({
      title: title.length > 50 ? title.slice(0, 47) + "..." : title,
      description: snippet || "Disclosed in investor materials.",
      dateStr,
    });
  }
  return results.slice(0, 5);
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
  const companies = await prisma.company.findMany({
    select: { id: true, symbol: true, name: true, website: true },
    orderBy: { name: "asc" },
  });

  console.log(`Processing ${companies.length} companies: IR/reports → extract catalysts...\n`);

  let catalystsCreated = 0;
  let companiesUpdated = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    let website: string | null = c.website && c.website.startsWith("http") ? c.website : null;
    if (!website && getFmpKey()) {
      await sleep(350);
      website = await getWebsiteFromFmp(c.symbol);
    }
    if (!website) {
      await sleep(800);
      website = await getWebsiteFromSearch(c.name);
    }
    if (!website) {
      console.log(`  [${i + 1}/${companies.length}] ${c.symbol} – no website, skip`);
      continue;
    }

    const origin = baseOrigin(website);
    let combinedText = await fetchPageText(website);
    await sleep(500);

    for (const p of INVESTOR_PATHS) {
      await sleep(400);
      const irUrl = origin + (p.startsWith("/") ? p : "/" + p);
      const irHtml = await fetchPageHtml(irUrl);
      if (irHtml.length > 500) {
        const irText = irHtml
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 60000);
        combinedText += "\n\n " + irText;
        const reportLinks = extractReportLinks(irHtml, origin);
        for (const link of reportLinks) {
          await sleep(500);
          const reportText = await fetchPageText(link);
          if (reportText.length > 300) combinedText += "\n\n " + reportText;
        }
      }
    }

    if (combinedText.length < 300) {
      console.log(`  [${i + 1}/${companies.length}] ${c.symbol} – little content, skip`);
      continue;
    }

    let snippets: Snippet[] = extractFromHeadings(combinedText);
    if (snippets.length < 2) {
      const fromKw = extractFromKeywords(combinedText);
      const seen = new Set(snippets.map((s) => s.title + "|" + s.description.slice(0, 60)));
      for (const s of fromKw) {
        const k = s.title + "|" + s.description.slice(0, 60);
        if (!seen.has(k)) {
          seen.add(k);
          snippets.push(s);
        }
      }
    }
    snippets = snippets.slice(0, 5);

    await prisma.catalyst.deleteMany({ where: { companyId: c.id } });

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

    if (snippets.length > 0) {
      companiesUpdated++;
      console.log(`  [${i + 1}/${companies.length}] ${c.symbol} – ${snippets.length} catalysts`);
    }
  }

  console.log(`\nDone. Companies updated: ${companiesUpdated}, catalysts created: ${catalystsCreated}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
