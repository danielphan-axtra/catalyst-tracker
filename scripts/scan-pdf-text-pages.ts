import fs from "node:fs";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function snippet(text: string, start: number, len: number) {
  const s = Math.max(0, start - 60);
  const e = Math.min(text.length, start + len + 60);
  return text.slice(s, e).replace(/\s+/g, " ").trim();
}

async function main() {
  const input = getArg("in");
  if (!input) {
    console.error("Missing --in <pdf path>");
    process.exit(1);
  }

  const pattern1 = getArg("p1");
  const pattern2 = getArg("p2");
  const out = getArg("out"); // optional: write concatenated matches

  const inPath = path.resolve(process.cwd(), input);
  const buf = fs.readFileSync(inPath);
  // pdfjs-dist legacy build expects Uint8Array (not Node Buffer)
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buf) });
  const doc = await loadingTask.promise;

  const p1 = pattern1 ? pattern1.toLowerCase() : null;
  const p2 = pattern2 ? pattern2.toLowerCase() : null;

  const matches: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = (content.items as any[])
      .map((it) => (typeof it?.str === "string" ? it.str : ""))
      .join(" ");

    const lower = pageText.toLowerCase();
    const ok1 = p1 ? lower.includes(p1) : true;
    const ok2 = p2 ? lower.includes(p2) : true;
    if (!ok1 || !ok2) continue;

    const idx = p1 ? lower.indexOf(p1) : 0;
    const s = snippet(pageText, Math.max(0, idx), 220);
    const line = `PAGE ${pageNum}: ${s}`;
    console.log(line);
    matches.push(line);
  }

  if (out) {
    const outPath = path.resolve(process.cwd(), out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, matches.join("\n"), "utf8");
    console.log(JSON.stringify({ outPath, matches: matches.length }));
  } else {
    console.log(JSON.stringify({ pagesScanned: doc.numPages, matches: matches.length }));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

