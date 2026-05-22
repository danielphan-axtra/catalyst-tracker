/**
 * Experimental: For each company, fetches IR / presentation-style pages,
 * sends the combined text to an LLM, and writes back structured catalysts.
 *
 * Run: npx tsx scripts/populate-catalysts-from-presentations.ts
 *
 * Requirements:
 * - Set ANTHROPIC_API_KEY in your .env
 * - This script is rate‑limited and best run on a small subset (e.g. top 20)
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import pdfParseModule from "pdf-parse";

const PDFParse: any = (pdfParseModule as any)?.PDFParse;

function loadEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  // Helpful diagnostics on Windows / tsx execution contexts
  if (process.env.DEBUG_ENV === "1") {
    console.log(`cwd=${process.cwd()}`);
    console.log(`envPath=${envPath}`);
    console.log(`envExists=${fs.existsSync(envPath)}`);
  }
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
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function baseOrigin(url: string): string {
  try {
    const u = new URL(url);
    return u.origin;
  } catch {
    return url;
  }
}

async function fetchHtml(url: string, timeoutMs = 18000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) return "";
    return await res.text();
  } catch {
    clearTimeout(t);
    return "";
  }
}

async function fetchPageText(url: string, maxChars = 90000): Promise<string> {
  const html = await fetchHtml(url);
  if (!html) return "";
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
}

async function fetchPdfText(url: string, maxChars = 140000): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!res.ok) {
      if (process.env.DEBUG_ENV === "1") {
        console.log(`PDF fetch failed ${res.status} ${res.statusText} url=${url}`);
      }
      return "";
    }
    const buf = Buffer.from(await res.arrayBuffer());
    // Skip huge PDFs to avoid long runtimes / token waste
    if (buf.length > 20 * 1024 * 1024) {
      if (process.env.DEBUG_ENV === "1") {
        console.log(`PDF too large bytes=${buf.length} url=${url}`);
      }
      return "";
    }
    // Prefer pdfjs-dist extraction (more reliable across PDFs)
    try {
      const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      let out = "";
      const maxPages = 30;
      const numPages = Math.min(doc.numPages || 0, maxPages);
      for (let p = 1; p <= numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const strings = (content?.items ?? []).map((it: any) => it?.str ?? "").filter(Boolean);
        out += strings.join(" ") + "\n";
        if (out.length > maxChars) break;
      }
      const text = out.replace(/\s+/g, " ").trim();
      if (process.env.DEBUG_ENV === "1") {
        console.log(`PDF(pdfjs) bytes=${buf.length} textChars=${text.length} url=${url}`);
      }
      return text.slice(0, maxChars);
    } catch (e) {
      // Fall back to pdf-parse if pdfjs fails
      if (process.env.DEBUG_ENV === "1") {
        console.log(`PDF(pdfjs) failed, falling back url=${url}`);
        console.log(e);
      }
    }

    if (!PDFParse) return "";
    const parser = new PDFParse({ data: buf, verbosity: 0 });
    await parser.load();
    const rawText = await parser.getText();
    await parser.destroy?.();
    const text = String(rawText ?? "")
      .replace(/\s+/g, " ")
      .trim();
    if (process.env.DEBUG_ENV === "1") {
      console.log(`PDF(pdf-parse) bytes=${buf.length} textChars=${text.length} url=${url}`);
    }
    return text.slice(0, maxChars);
  } catch (e) {
    clearTimeout(t);
    if (process.env.DEBUG_ENV === "1") {
      console.log(`PDF fetch/parse threw url=${url}`);
      console.log(e);
    }
    return "";
  }
}

async function searchPdfLinks(query: string, maxLinks = 8): Promise<string[]> {
  const q = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${q}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { "User-Agent": UA }, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return [];
    const html = await res.text();
    const out: string[] = [];
    const seen = new Set<string>();
    const hrefRe = /href="([^"]+)"/gi;
    let m: RegExpExecArray | null;
    while ((m = hrefRe.exec(html)) !== null) {
      const raw = (m[1] || "").trim();
      if (!raw) continue;
      const decoded = raw.replace(/&amp;/g, "&");
      let link = decoded;
      // DDG often uses redirect links; try to pull the real URL.
      const uddg = decoded.match(/[?&]uddg=([^&]+)/i);
      if (uddg) {
        try {
          link = decodeURIComponent(uddg[1]);
        } catch {
          link = decoded;
        }
      }
      if (!/^https?:\/\//i.test(link)) continue;
      if (!link.toLowerCase().includes(".pdf")) continue;
      if (seen.has(link)) continue;
      seen.add(link);
      out.push(link);
      if (out.length >= maxLinks) break;
    }
    if (process.env.DEBUG_ENV === "1") {
      console.log(`DDG pdf links for query: ${query} -> ${out.length}`);
      if (out[0]) console.log(`  first: ${out[0]}`);
    }
    return out;
  } catch {
    clearTimeout(t);
    return [];
  }
}

const PRESENTATION_HINTS =
  /presentation|results|earnings|investor\s*day|quarterly|q[1-4]\s*20\d{2}|deck/i;

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
  "/events",
  "/presentations",
  "/investors/presentations",
  "/investors/reports",
  "/investor-relations/presentations",
  "/investor-relations/reports",
  "/investor-relations/financial-results",
  "/investors/financial-reports",
];

function extractLikelyPresentationLinks(html: string, origin: string): { pdfs: string[]; pages: string[] } {
  const seen = new Set<string>();
  const pdfs: string[] = [];
  const pages: string[] = [];
  const regex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const href = (m[1] || "").trim();
    const anchorText = (m[2] || "").trim();
    const candidate = `${href} ${anchorText}`;
    if (!PRESENTATION_HINTS.test(candidate)) continue;
    try {
      const url = new URL(href, origin);
      if (!url.protocol.startsWith("http")) continue;
      if (seen.has(url.href)) continue;
      seen.add(url.href);
      const isPdf = url.pathname.toLowerCase().endsWith(".pdf") || url.search.toLowerCase().includes(".pdf");
      if (isPdf) pdfs.push(url.href);
      else pages.push(url.href);
    } catch {
      continue;
    }
    if (pdfs.length + pages.length >= 6) break;
  }
  return { pdfs: pdfs.slice(0, 2), pages: pages.slice(0, 3) };
}

type LlmCatalyst = {
  title: string;
  description: string;
  timing: string;
  importance: string;
};

function parseTimingToDates(timing: string): { dateStart: Date | null; dateEnd: Date | null } {
  const t = (timing || "").trim();
  if (!t) return { dateStart: null, dateEnd: null };

  // Normalize dashes
  const norm = t.replace(/\u2013|\u2014/g, "-");

  // 2026-2028 / 2026–2028
  const yrRange = norm.match(/\b(20\d{2})\s*-\s*(20\d{2})\b/);
  if (yrRange) {
    const y1 = Number(yrRange[1]);
    const y2 = Number(yrRange[2]);
    if (y1 > 1900 && y2 >= y1) return { dateStart: new Date(y1, 0, 1), dateEnd: new Date(y2, 11, 31) };
  }

  // Single year: 2027 / ~2027 / Expected approval ~2027
  const yearOnly = norm.match(/\b(20\d{2})\b/);
  const hasQuarter = /\bQ[1-4]\b/i.test(norm);
  const hasHalf = /\bH[12]\b/i.test(norm);

  if (hasQuarter) {
    const m = norm.match(/\bQ([1-4])\b.*?\b(20\d{2})\b/i);
    if (m) {
      const q = Number(m[1]);
      const y = Number(m[2]);
      const startMonth = (q - 1) * 3;
      return { dateStart: new Date(y, startMonth, 1), dateEnd: new Date(y, startMonth + 3, 0) };
    }
  }

  if (hasHalf) {
    const m = norm.match(/\bH([12])\b.*?\b(20\d{2})\b/i);
    if (m) {
      const h = Number(m[1]);
      const y = Number(m[2]);
      const startMonth = h === 1 ? 0 : 6;
      return { dateStart: new Date(y, startMonth, 1), dateEnd: new Date(y, startMonth + 6, 0) };
    }
  }

  // Month Year: May 2026
  const monthMap: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };
  const my = norm.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t)?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(20\d{2})\b/i);
  if (my) {
    const mKey = my[1].toLowerCase();
    const y = Number(my[2]);
    const month = monthMap[mKey] ?? monthMap[mKey.slice(0, 3)];
    if (typeof month === "number") {
      return { dateStart: new Date(y, month, 1), dateEnd: new Date(y, month + 1, 0) };
    }
  }

  if (yearOnly) {
    const y = Number(yearOnly[1]);
    return { dateStart: new Date(y, 0, 1), dateEnd: new Date(y, 11, 31) };
  }

  return { dateStart: null, dateEnd: null };
}

async function callLlmForCatalysts(
  companyName: string,
  symbol: string,
  text: string
): Promise<LlmCatalyst[] | null> {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) {
    console.warn("ANTHROPIC_API_KEY not set; skipping LLM catalyst extraction.");
    return null;
  }

  const prompt = `You are an equity research analyst focused on Metals & Mining.

From the following investor materials for ${companyName} (${symbol}), extract the key upcoming company-specific catalysts.

Return ONLY a JSON array (no markdown, no extra text). Each item must have:
{"title": string, "description": string, "timing": string, "importance": string}

- timing should be concise analyst-friendly timing like: "Q2 2026", "H2 2027", "2026–2028", "May 2026", or a specific month/year.
- 3–6 catalysts is typical; skip trivial items.

Source text (truncated):
"""${text.slice(0, 120000)}"""`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 1400,
      temperature: 0.2,
      system: "You are a precise equity research assistant. Output must be valid JSON only.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.warn(`Anthropic request failed: ${res.status} ${res.statusText}${errText ? `\n${errText}` : ""}`);
    return null;
  }

  const data = (await res.json()) as any;
  const contentBlocks: any[] = Array.isArray(data?.content) ? data.content : [];
  const textOut: string =
    contentBlocks.find((b) => b?.type === "text")?.text ??
    (typeof data?.content === "string" ? data.content : "");
  if (!textOut) return null;

  try {
    // Claude may wrap JSON in ```json fences; strip and then parse.
    const trimmed = textOut.trim();
    const unfenced = trimmed
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    // If still not valid JSON, try to extract the first JSON array substring.
    const arrayStart = unfenced.indexOf("[");
    const arrayEnd = unfenced.lastIndexOf("]");
    const candidate =
      arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart
        ? unfenced.slice(arrayStart, arrayEnd + 1)
        : unfenced;

    const parsed = JSON.parse(candidate);
    const arr: any[] = Array.isArray(parsed) ? parsed : parsed?.catalysts ?? [];
    return arr
      .filter((c) => c && typeof c.title === "string")
      .map((c) => ({
        title: String(c.title).trim(),
        description: String(c.description ?? "").trim(),
        timing: String(c.timing ?? "").trim(),
        importance: String(c.importance ?? "").trim(),
      }));
  } catch {
    if (process.env.DEBUG_ENV === "1") {
      console.log("LLM raw output (first 1200 chars):");
      console.log(textOut.slice(0, 1200));
    }
    return null;
  }
}

async function main() {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  console.log(`ANTHROPIC_API_KEY detected: ${hasKey ? "yes" : "no"}`);

  const take = Number(process.env.CATALYST_LLM_TAKE ?? "2") || 2;
  console.log(`CATALYST_LLM_TAKE=${take}`);
  const symbolFilter = (process.env.CATALYST_LLM_SYMBOL ?? "").trim().toUpperCase();
  if (symbolFilter) console.log(`CATALYST_LLM_SYMBOL=${symbolFilter}`);

  const companies = await prisma.company.findMany({
    select: { id: true, symbol: true, name: true, website: true },
    where: {
      website: { not: null },
      ...(symbolFilter ? { symbol: { contains: symbolFilter } } : {}),
    },
    orderBy: { marketCap: "desc" },
    take,
  });

  console.log(`Processing ${companies.length} companies with LLM-based catalyst extraction...\n`);

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i];
    const origin = c.website && c.website.startsWith("http") ? baseOrigin(c.website) : null;
    if (!origin) {
      console.log(`  [${i + 1}/${companies.length}] ${c.symbol} – no website, skip`);
      continue;
    }

    console.log(`  [${i + 1}/${companies.length}] ${c.symbol} – fetching presentation text...`);

    let combinedText = await fetchPageText(c.website);
    await sleep(500);

    const seenLinks = new Set<string>();
    let pdfCount = 0;
    let pageCount = 0;

    for (const p of INVESTOR_PATHS) {
      const irUrl = origin + (p.startsWith("/") ? p : `/${p}`);
      await sleep(350);
      const irHtml = await fetchHtml(irUrl);
      if (irHtml.length < 800) continue;

      // Include the page’s own text
      combinedText += "\n\n" + (await fetchPageText(irUrl));

      const links = extractLikelyPresentationLinks(irHtml, origin);

      for (const pdfUrl of links.pdfs) {
        if (pdfCount >= 2) break;
        if (seenLinks.has(pdfUrl)) continue;
        seenLinks.add(pdfUrl);
        pdfCount++;
        await sleep(900);
        const pdfText = await fetchPdfText(pdfUrl);
        if (pdfText.length > 1200) combinedText += "\n\n" + pdfText;
      }

      for (const link of links.pages) {
        if (pageCount >= 3) break;
        if (seenLinks.has(link)) continue;
        seenLinks.add(link);
        pageCount++;
        await sleep(700);
        const t = await fetchPageText(link);
        if (t.length > 500) combinedText += "\n\n" + t;
      }

      if (pdfCount >= 2 && pageCount >= 3) break;
    }

    // If we couldn't reach meaningful IR content, try a web search for an investor presentation PDF.
    if (combinedText.length < 1200 || pdfCount === 0) {
      const domain = (() => {
        try {
          return new URL(origin).hostname;
        } catch {
          return "";
        }
      })();
      const q1 = `site:${domain} investor presentation pdf`;
      const q2 = `"${c.name.replace(/"/g, "")}" investor presentation pdf`;
      const ddgPdfs = [
        ...(await searchPdfLinks(q1)),
        ...(await searchPdfLinks(q2)),
      ];
      for (const pdfUrl of ddgPdfs) {
        if (pdfCount >= 2) break;
        if (seenLinks.has(pdfUrl)) continue;
        seenLinks.add(pdfUrl);
        await sleep(900);
        const pdfText = await fetchPdfText(pdfUrl);
        if (pdfText.length > 1200) {
          pdfCount++;
          combinedText += "\n\n" + pdfText;
        }
      }
    }

    // Optional override: force a specific PDF URL (useful for debugging one company)
    const forcedPdfUrl = (process.env.CATALYST_LLM_PDF_URL ?? "").trim();
    if (forcedPdfUrl) {
      console.log(`    using CATALYST_LLM_PDF_URL=${forcedPdfUrl}`);
      const forcedText = await fetchPdfText(forcedPdfUrl);
      if (forcedText.length > 1200) {
        combinedText += "\n\n" + forcedText;
      } else {
        console.log(`    forced PDF extracted little text (${forcedText.length}), continuing...`);
      }
    }

    if (!combinedText || combinedText.length < 500) {
      console.log(`    little text found, skipping ${c.symbol}`);
      continue;
    }

    if (process.env.DEBUG_ENV === "1") {
      console.log(`    combinedTextChars=${combinedText.length}`);
    }

    await sleep(1200);
    const llmCatalysts = await callLlmForCatalysts(c.name, c.symbol, combinedText);
    if (!llmCatalysts || llmCatalysts.length === 0) {
      console.log(`    no catalysts extracted for ${c.symbol}`);
      continue;
    }

    console.log(`    extracted ${llmCatalysts.length} catalysts, writing to DB...`);

    await prisma.catalyst.deleteMany({ where: { companyId: c.id } });

    for (const cat of llmCatalysts) {
      const { dateStart, dateEnd } = parseTimingToDates(cat.timing);
      await prisma.catalyst.create({
        data: {
          companyId: c.id,
          title: cat.title,
          description: cat.description || "Upcoming catalyst identified from investor materials.",
          dateStart,
          dateEnd,
          importance: cat.importance || "",
        },
      });
    }
  }

  console.log("\nDone LLM catalyst extraction.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

