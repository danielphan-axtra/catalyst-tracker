import fs from "node:fs";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parsePages(raw?: string): number[] | null {
  if (!raw) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const nums: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (Number.isFinite(n) && n > 0) nums.push(n);
  }
  return nums.length ? nums : null;
}

async function main() {
  const input = getArg("in");
  if (!input) {
    console.error("Missing --in <pdf path>");
    process.exit(1);
  }

  const out = getArg("out"); // optional
  const pages = parsePages(getArg("pages"));
  const pageStartRaw = getArg("pageStart");
  const pageEndRaw = getArg("pageEnd");

  const pageStart = pageStartRaw ? Number(pageStartRaw) : null;
  const pageEnd = pageEndRaw ? Number(pageEndRaw) : null;

  const inPath = path.resolve(process.cwd(), input);
  const buf = fs.readFileSync(inPath);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf) });
  const doc = await loadingTask.promise;

  let pageNums: number[] = [];
  if (pages) {
    pageNums = pages;
  } else {
    const s = pageStart != null ? pageStart : 1;
    const e = pageEnd != null ? pageEnd : doc.numPages;
    pageNums = Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }

  const kept = pageNums.filter((n) => n >= 1 && n <= doc.numPages);
  kept.sort((a, b) => a - b);

  const parts: string[] = [];
  for (const pageNum of kept) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = (content.items as any[])
      .map((it) => (typeof it?.str === "string" ? it.str : ""))
      .join(" ");

    parts.push(`===== PAGE ${pageNum} =====\n${pageText}\n`);
    console.log(`Extracted page ${pageNum}, chars=${pageText.length}`);
  }

  const text = parts.join("\n");
  if (out) {
    const outPath = path.resolve(process.cwd(), out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, text, "utf8");
    console.log(JSON.stringify({ outPath, pages: kept, chars: text.length }));
  } else {
    console.log(text.slice(0, 6000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

