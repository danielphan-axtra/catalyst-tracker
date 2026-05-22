/**
 * Experimental: Extract simplified DCF/NAV inputs using Claude API (no manual Claude PDF upload).
 *
 * What it does:
 * - Uses web/PDF search to discover likely PDFs (guidance / investor presentations / technical reports).
 * - Downloads and extracts text from PDFs.
 * - Asks Claude to output a strict JSON object matching our DCF assumption schema.
 * - Writes JSON to `data/{outFileName}`.
 *
 * Run:
 *   npx tsx scripts/extract-dcf-assumptions-llm.ts --companyName="Agnico Eagle Mines Ltd" --symbol=AEM --out=agnico-eagle-dcf-assumptions.json
 *
 * Notes:
 * - Best-effort extraction. Some documents don’t have clean tables; you may need to re-run or adjust prompt.
 * - You can override the PDF input with:
 *     CATALYST_LLM_PDF_URL="https://..." (reuse your env var)
 */

import * as fs from "fs";
import * as path from "path";
import pdfParseModule from "pdf-parse";

const PDFParse: any = (pdfParseModule as any)?.PDFParse;

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

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
    if (!res.ok) return "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 20 * 1024 * 1024) return "";

    // Prefer pdfjs-dist extraction.
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
      return text.slice(0, maxChars);
    } catch {
      // Fall back to pdf-parse.
    }

    if (!PDFParse) return "";
    const parser = new PDFParse({ data: buf, verbosity: 0 });
    await parser.load();
    const rawText = await parser.getText();
    await parser.destroy?.();
    const text = String(rawText ?? "").replace(/\s+/g, " ").trim();
    return text.slice(0, maxChars);
  } catch {
    clearTimeout(t);
    return "";
  }
}

async function searchPdfLinks(query: string, maxLinks = 6): Promise<string[]> {
  // Simple DDG HTML result parsing (works without an API key).
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
      const link = decoded.match(/[?&]uddg=([^&]+)/i) ? decodeURIComponent(decoded.split("uddg=")[1] ?? "") : decoded;
      if (!/^https?:\/\//i.test(link)) continue;
      if (!link.toLowerCase().includes(".pdf")) continue;
      if (seen.has(link)) continue;
      seen.add(link);
      out.push(link);
      if (out.length >= maxLinks) break;
    }
    return out;
  } catch {
    clearTimeout(t);
    return [];
  }
}

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  return trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractFirstJsonObject(text: string): any {
  const unfenced = stripJsonFences(text);
  // Try full parse first.
  try {
    return JSON.parse(unfenced);
  } catch {
    // Fall back: locate first {...} via brace depth.
  }

  const firstBrace = unfenced.indexOf("{");
  if (firstBrace === -1) throw new Error("Claude output contained no JSON object.");
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < unfenced.length; i++) {
    const ch = unfenced[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = unfenced.slice(firstBrace, i + 1);
        return JSON.parse(candidate);
      }
    }
  }
  throw new Error("Could not extract JSON object from Claude output.");
}

async function callClaudeForAssumptions(params: { companyName: string; symbol: string; sourceText: string }) {
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not set.");

  const { companyName, symbol, sourceText } = params;
  const prompt = `You are extracting structured inputs for a simplified gold DCF/NAV model.

Extract forward guidance inputs for ${companyName} (${symbol}).

Return ONLY a single valid JSON object (no markdown, no commentary).

Schema:
{
  "source": "string (document title and/or URL if available)",
  "assets": [
    {
      "name": "string",
      "type": "production",
      "jurisdiction": null,
      "payableGoldProductionKozByYear": { "Year1": number, "Year2": number, "Year3": number, "Year4": number, "Year5": number },
      "aiscUsdPerOz": number,
      "aiscUsdPerOzByYear": null,
      "capexUsdMByYear": { "Year1": number, "Year2": number, "Year3": number, "Year4": number, "Year5": number } 
        OR { "Initial": number, "Sustaining_Total": number },
      "sustainingCapexUsdMByYear": null,
      "mineLifeEndYear": null,
      "notes": "string describing units/currency assumptions and what you used"
    }
  ]
}

Rules:
- Year1..Year5 must be the next 5 chronological years shown in the guidance schedule.
- Use numeric values only (no '$', no commas).
- If AISC is given as a range, use the midpoint and note it.
- If currency is not USD, still output the numeric values you find and state the currency in notes.
- IMPORTANT: Prefer mine-level assets (each operating mine as separate asset), not a single consolidated company asset.
- IMPORTANT: If source text contains multi-year production by mine, use those values directly.
- IMPORTANT: Avoid flat per-mine production series unless the source explicitly indicates flat production.
- If only one-year mine guidance is disclosed, estimate Year2..Year5 by following qualitative guidance in the text
  (ramp-up/ramp-down/steady-state) and clearly state the assumption in notes.
`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
      max_tokens: 1800,
      temperature: 0.1,
      system: "You are a precise extraction assistant. Output must be valid JSON only.",
      messages: [{ role: "user", content: `${prompt}\n\nSource text (truncated):\n"""\n${sourceText.slice(0, 220000)}\n"""` }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic request failed: ${res.status} ${res.statusText}\n${errText}`);
  }

  const data = (await res.json()) as any;
  const contentBlocks: any[] = Array.isArray(data?.content) ? data.content : [];
  const textOut: string =
    contentBlocks.find((b) => b?.type === "text")?.text ??
    (typeof data?.content === "string" ? data.content : "");

  if (!textOut) throw new Error("Claude returned empty output.");
  return extractFirstJsonObject(textOut);
}

function getArgValue(flag: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!found) return null;
  return found.split("=").slice(1).join("=");
}

async function main() {
  const companyName = getArgValue("--companyName") ?? "";
  const symbol = getArgValue("--symbol") ?? "";
  const outFile = getArgValue("--out") ?? "";
  const maxPdfs = Number(getArgValue("--maxPdfs") ?? "4");

  if (!companyName || !symbol || !outFile) {
    console.log(`Missing required args.
Example:
  npx tsx scripts/extract-dcf-assumptions-llm.ts --companyName="Agnico Eagle Mines Ltd" --symbol=AEM --out=agnico-eagle-dcf-assumptions.json
`);
    process.exit(1);
  }

  const forcedPdfUrl = (process.env.CATALYST_LLM_PDF_URL ?? "").trim();

  const includeTokens = (getArgValue("--includeTokens") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const excludeTokens = (getArgValue("--excludeTokens") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // Reasonable defaults: prefer Agnico docs, avoid common “wrong company” hits.
  const defaultIncludes = [companyName.toLowerCase(), "agnico", "agnicoeagle", symbol.toLowerCase()].filter(Boolean);
  const effectiveInclude = includeTokens.length ? includeTokens : defaultIncludes;
  const effectiveExclude = excludeTokens.length ? excludeTokens : ["artemis", "artemisgold"];

  const pdfUrls: string[] = [];
  if (forcedPdfUrl) {
    pdfUrls.push(forcedPdfUrl);
  } else {
    const queries = [
      `${companyName} investor presentation pdf AISC capex production next 5 years`,
      `${companyName} guidance pdf AISC capex payable production`,
      `${companyName} NI 43-101 technical report pdf`,
      `sedar ${companyName} 43-101 pdf`,
    ];

    for (const q of queries) {
      const links = await searchPdfLinks(q, maxPdfs);
      for (const l of links) {
        const lLower = l.toLowerCase();
        if (effectiveExclude.some((t) => t && lLower.includes(t))) continue;
        if (effectiveInclude.length && !effectiveInclude.some((t) => t && lLower.includes(t))) continue;
        if (!pdfUrls.includes(l)) pdfUrls.push(l);
        if (pdfUrls.length >= maxPdfs) break;
      }
      if (pdfUrls.length >= maxPdfs) break;
      await sleep(300);
    }
  }

  if (pdfUrls.length === 0) throw new Error("No PDF URLs found. Try again or set CATALYST_LLM_PDF_URL to a specific PDF URL.");

  console.log(`Found ${pdfUrls.length} candidate PDFs for ${companyName}.`);

  let combinedText = "";
  for (let i = 0; i < pdfUrls.length; i++) {
    const url = pdfUrls[i];
    console.log(`  [${i + 1}/${pdfUrls.length}] fetching PDF text...`);
    const pdfText = await fetchPdfText(url);
    if (!pdfText) continue;
    combinedText += `\n\n--- PDF ${i + 1}: ${url} ---\n` + pdfText;
    await sleep(500);
  }

  // Some PDFs are scanned or have limited extractable text; don't fail too early.
  const minChars = 200;
  if (!combinedText || combinedText.length < minChars) {
    throw new Error(`Extracted very little text from PDFs (chars=${combinedText?.length ?? 0}); extraction likely failed.`);
  }

  const resultJson = await callClaudeForAssumptions({
    companyName,
    symbol,
    sourceText: combinedText,
  });

  const outPath = path.join(process.cwd(), "data", outFile);
  fs.writeFileSync(outPath, JSON.stringify(resultJson, null, 2) + "\n", "utf-8");
  console.log(`Wrote assumptions JSON: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

