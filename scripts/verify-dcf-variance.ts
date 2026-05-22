import { loadAssumptionsFromRepoFile } from "../src/lib/endeavour-dcf";
import { computeSimplifiedDcfFromAssumptions } from "../src/lib/dcf-core";

const agnico = loadAssumptionsFromRepoFile("agnico-eagle-mines-dcf-assumptions.json");
const r2500 = computeSimplifiedDcfFromAssumptions({
  assumptions: agnico,
  goldPriceUsdPerOz: 2500,
  discountRatePct: 5,
  startYear: 2026,
});
const r3000 = computeSimplifiedDcfFromAssumptions({
  assumptions: agnico,
  goldPriceUsdPerOz: 3000,
  discountRatePct: 5,
  startYear: 2026,
});
console.log("Agnico production koz by year:", r2500.rows.map((x) => x.productionKoz));
console.log("Agnico OCF Y1 at 2500 vs 3000:", r2500.rows[0].ocfUsdM, r3000.rows[0].ocfUsdM);

const endeavour = loadAssumptionsFromRepoFile("endeavour-dcf-assumptions.json");
const re = computeSimplifiedDcfFromAssumptions({
  assumptions: endeavour,
  goldPriceUsdPerOz: 2500,
  discountRatePct: 5,
  startYear: 2026,
});
console.log("Endeavour production koz:", re.rows.map((x) => x.productionKoz));
