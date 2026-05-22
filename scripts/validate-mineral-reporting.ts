/**
 * Sanity-check mineral inventory reporting basis vs. ounce totals.
 * Run: npx tsx scripts/validate-mineral-reporting.ts
 */
import fs from "fs";
import path from "path";
import type { MineralInventoryFile } from "../src/lib/mineral-inventory-types";

const DIR = path.join(process.cwd(), "data", "mineral-inventory");

function main() {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));
  let issues = 0;

  for (const file of files) {
    const inv = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8")) as MineralInventoryFile;
    const rr = inv.resourceReporting;
    const r = inv.summary.reserves?.containedMoz ?? inv.summary.reserves?.attributableMoz;
    const mi = inv.summary.measuredIndicated?.containedMoz ?? inv.summary.measuredIndicated?.attributableMoz;

    if (r != null && mi != null && rr) {
      if (rr.measuredIndicatedIncludesReserves && mi < r) {
        console.warn(
          `WARN ${inv.companyKey}: M&I (${mi} Moz) < reserves (${r} Moz) but marked inclusive — verify disclosure`,
        );
        issues++;
      }
      if (!rr.measuredIndicatedIncludesReserves && mi > r) {
        console.log(
          `OK ${inv.companyKey}: M&I (${mi}) < reserves (${r}) — exclusive reporting (e.g. Agnico)`,
        );
      }
    }

    if (!rr) {
      console.warn(`WARN ${inv.companyKey}: missing resourceReporting block`);
      issues++;
    }
  }

  console.log(issues ? `\n${issues} issue(s) need review.` : "\nAll files have resourceReporting metadata.");
}

main();
