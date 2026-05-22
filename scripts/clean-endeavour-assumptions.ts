import * as fs from "fs";
import * as path from "path";

function parseFirstJsonObject(raw: string): any {
  const firstBrace = raw.indexOf("{");
  if (firstBrace === -1) throw new Error("No '{' found in assumptions file.");

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth++;
      continue;
    }

    if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = raw.slice(firstBrace, i + 1);
        return JSON.parse(candidate);
      }
    }
  }

  throw new Error("Could not extract a complete first JSON object from assumptions file.");
}

async function main() {
  const assumptionsPath = path.join(process.cwd(), "data", "endeavour-dcf-assumptions.json");
  const raw = fs.readFileSync(assumptionsPath, "utf-8");

  const json = parseFirstJsonObject(raw);
  fs.writeFileSync(assumptionsPath, JSON.stringify(json, null, 2) + "\n", "utf-8");
  console.log("Cleaned endeavours assumptions JSON (kept first object only).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

