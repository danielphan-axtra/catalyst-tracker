const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function getArgValue(flag: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (!found) return null;
  return found.split("=").slice(1).join("=");
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const url = getArgValue("--url");
  if (!url) {
    console.log('Usage: npx tsx scripts/debug-fetch-url-text.ts --url="https://..."');
    process.exit(1);
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);
  const res = await fetch(url, {
    signal: controller.signal,
    headers: { "User-Agent": UA },
    redirect: "follow",
  }).catch((e) => {
    console.error("fetch error", e);
    process.exit(1);
  });
  clearTimeout(t);
  if (!res) return;

  console.log("status", res.status);
  const html = await res.text();
  console.log("html len", html.length);
  const text = stripHtml(html);
  console.log("text len", text.length);
  console.log(text.slice(0, 400));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

