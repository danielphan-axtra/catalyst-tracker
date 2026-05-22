import fs from "node:fs";
import path from "node:path";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

async function main() {
  const input = getArg("in");
  const output = getArg("out");

  if (!input || !output) {
    throw new Error(
      "Usage: tsx scripts/extract-pdf-text.ts --in=path/to/file.pdf --out=path/to/out.txt",
    );
  }

  const inPath = path.resolve(process.cwd(), input);
  const outPath = path.resolve(process.cwd(), output);

  const buf = fs.readFileSync(inPath);
  const loadingTask = pdfjs.getDocument({ data: buf });
  const doc = await loadingTask.promise;

  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = (content.items as any[])
      .map((it) => (typeof it?.str === "string" ? it.str : ""))
      .join(" ");
    parts.push(pageText);
  }

  const text = parts.join("\n\n");
  const pages = doc.numPages;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, text, "utf8");

  console.log(
    JSON.stringify(
      {
        inPath,
        outPath,
        pages: pages ?? null,
        chars: text.length,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

