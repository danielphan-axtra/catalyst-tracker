import * as path from "path";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getArgValue(flag: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!found) return null;
  return found.split("=").slice(1).join("=");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
    return out;
  } catch {
    clearTimeout(t);
    return [];
  }
}

async function main() {
  const query = getArgValue("--query") ?? "";
  const maxLinks = Number(getArgValue("--maxLinks") ?? "10");
  if (!query) {
    console.log('Usage: npx tsx scripts/debug-pdf-links.ts --query="Agnico Eagle investor presentation pdf" --maxLinks=10');
    process.exit(1);
  }
  const links = await searchPdfLinks(query, maxLinks);
  console.log(`Query: ${query}`);
  console.log(`Found ${links.length} links`);
  for (const l of links) console.log(`- ${l}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

