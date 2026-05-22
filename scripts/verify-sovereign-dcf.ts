/**
 * npx tsx scripts/verify-sovereign-dcf.ts
 */
import { loadAssumptionsFromRepoFile } from "../src/lib/endeavour-dcf";
import { computeSimplifiedDcfFromAssumptions } from "../src/lib/dcf-core";

const assumptions = loadAssumptionsFromRepoFile("sovereign-metals-kasiya-dcf-assumptions.json");
const result = computeSimplifiedDcfFromAssumptions({
  assumptions,
  goldPriceUsdPerOz: 1459,
  discountRatePct: 8,
  startYear: 2029,
});

console.log("DFS reference NPV8 (pre-tax):", assumptions.dfsPreTaxNpv8UsdM, "USD M");
console.log("Model NAV (25yr, 8%, DFS prices):", result.navUsdM.toFixed(0), "USD M");
console.log("First 10 years production (kt total):");
for (const r of result.rows.slice(0, 10)) {
  console.log(
    `  ${r.yearLabel}: prod ${r.productionKoz} kt, OCF ${r.ocfUsdM.toFixed(0)}M, capex ${r.capexUsdM.toFixed(0)}M, FCF ${r.fcfUsdM.toFixed(0)}M`,
  );
}
