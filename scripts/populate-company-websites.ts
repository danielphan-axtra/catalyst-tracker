/**
 * Finds and saves each company's website (FMP profile first, then search fallback).
 * Run: npm run db:populate-websites
 * Optional: npm run db:populate-websites -- --limit 200   (only first 200 companies)
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

const limitArg = process.argv.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg ? parseInt(limitArg.split("=")[1] ?? limitArg.split(" ")[1] ?? "0", 10) : undefined;

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

const SKIP_HOSTS = ["duckduckgo", "wikipedia", "linkedin", "facebook", "twitter", "youtube", "instagram", "yahoo", "bing.", "google.", "microsoft.", "msn."];

function tryLink(href: string): string | null {
  if (!href || href.length < 12) return null;
  if (href.startsWith("//")) href = "https:" + href;
  if (!href.startsWith("http")) return null;
  try {
    const u = new URL(href);
    const host = u.hostname.toLowerCase();
    if (SKIP_HOSTS.some((s) => host.includes(s))) return null;
    if (host.endsWith(".gov") || host.endsWith(".edu")) return null;
    return href;
  } catch {
    return null;
  }
}

/** Extract first usable result URL from HTML (generic href search). */
function extractFirstResult(html: string): string | null {
  const candidates: string[] = [];
  const regex = /<a\s+[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const href = (m[1] || "").trim();
    const out = tryLink(href);
    if (out) candidates.push(out);
  }
  return candidates[0] ?? null;
}

/** DuckDuckGo HTML search. */
async function getWebsiteFromDuckDuckGo(companyName: string, queryVariant: string): Promise<string | null> {
  const query = encodeURIComponent(queryVariant);
  const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const out = extractFirstResult(html);
    return out;
  } catch {
    clearTimeout(t);
    return null;
  }
}

/** Bing search (fallback). */
async function getWebsiteFromBing(companyName: string): Promise<string | null> {
  const query = encodeURIComponent(`${companyName} TSXV mining company`);
  const searchUrl = `https://www.bing.com/search?q=${query}&count=10`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const html = await res.text();
    const out = extractFirstResult(html);
    return out;
  } catch {
    clearTimeout(t);
    return null;
  }
}

/** Try multiple search queries and sources. */
async function getWebsiteFromSearch(companyName: string): Promise<string | null> {
  const cleanName = companyName.replace(/"/g, "").trim();
  const queries = [
    `"${cleanName}" TSXV website`,
    `${cleanName} TSXV mining`,
    `${cleanName} mining company Canada`,
  ];
  for (const q of queries) {
    const url = await getWebsiteFromDuckDuckGo(cleanName, q);
    if (url) return url;
    await sleep(500);
  }
  const bingUrl = await getWebsiteFromBing(cleanName);
  return bingUrl;
}

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, symbol: true, name: true, website: true },
    orderBy: { name: "asc" },
    take: LIMIT,
  });

  console.log(`Finding websites for ${companies.length} companies (FMP first, then search)...`);
  let updated = 0;
  let fromFmp = 0;
  let fromSearch = 0;
  let notFound = 0;

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${companies.length} ...`);

    await sleep(350);
    let url: string | null = await getWebsiteFromFmp(c.symbol);
    if (url) fromFmp++;
    if (!url) {
      await sleep(900);
      url = await getWebsiteFromSearch(c.name);
      if (url) fromSearch++;
    }
    if (!url) {
      notFound++;
      continue;
    }

    await prisma.company.update({
      where: { id: c.id },
      data: { website: url },
    });
    updated++;
  }

  console.log(`Done. Updated: ${updated} (FMP: ${fromFmp}, search: ${fromSearch}), not found: ${notFound}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
