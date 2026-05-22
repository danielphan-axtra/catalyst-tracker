const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function main() {
  const url = "https://agnicoeagle.com/English/investor-relations/investor-resources/downloads/default.aspx";
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  console.log("status", res.status);
  const html = await res.text();
  console.log("len", html.length);

  const re = /https?:\/\/[^"']+?\.pdf[^"']*/gi;
  const matches = html.match(re) ?? [];
  const uniq = [...new Set(matches)];
  console.log("pdf count", uniq.length);
  console.log(uniq.slice(0, 25).join("\\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

