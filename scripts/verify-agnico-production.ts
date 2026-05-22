/**
 * npx tsx scripts/verify-agnico-production.ts
 */
import { loadAssumptionsFromRepoFile } from "../src/lib/endeavour-dcf";
import { computeSimplifiedDcfFromAssumptions } from "../src/lib/dcf-core";

const assumptions = loadAssumptionsFromRepoFile("agnico-eagle-mines-dcf-assumptions.json");
const result = computeSimplifiedDcfFromAssumptions({
  assumptions,
  goldPriceUsdPerOz: 2500,
  discountRatePct: 5,
});

const y1 = result.rows[0];
console.log("Mines:", assumptions.assets.length);
console.log("Year1 total production (koz):", y1.productionKoz);
console.log("By mine:", y1.mineProductionKozByAsset);
const sum = Object.values(y1.mineProductionKozByAsset ?? {}).reduce((a, b) => a + b, 0);
console.log("Sum check:", sum);
