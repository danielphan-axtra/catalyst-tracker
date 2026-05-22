/**
 * Writes mineral-inventory JSON files for companies with published R&R.
 * Run: npx tsx scripts/seed-mineral-inventories.ts
 */
import fs from "fs";
import path from "path";

type Inv = Record<string, unknown>;

const DIR = path.join(process.cwd(), "data", "mineral-inventory");

/** M&I resource tonnes/oz include P&P reserves (B2Gold, IAMGOLD, Barrick, Capstone). */
const MI_INCL_RESERVES = {
  measuredIndicatedIncludesReserves: true,
  inferredReportedSeparately: true,
};

/** Reserves reported separately from M&I resources (Agnico Eagle). */
const MI_EXCL_RESERVES = {
  measuredIndicatedIncludesReserves: false,
  inferredReportedSeparately: true,
  disclosureNote: "Mineral reserves are not included in mineral resources (company disclosure).",
};

const FILES: Inv[] = [
  {
    companyKey: "iamgold",
    symbols: ["IAG", "IAG.TO", "IMG"],
    matchNames: ["iamgold"],
    asOfDate: "2025-12-31",
    source: "IAMGOLD Mineral Reserves & Resources news release, Feb 17, 2026",
    sourceUrl: "https://www.iamgold.com/",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { tonnesKt: 279606, gradeGt: 1.1, containedMoz: 9.9, attributableMoz: 7.5 },
      measuredIndicated: { tonnesKt: 1030644, gradeGt: 0.94, containedMoz: 31.0, attributableMoz: 24.6 },
      inferred: { tonnesKt: 356628, gradeGt: 1.09, containedMoz: 12.5, attributableMoz: 11.3 },
    },
    rows: [
      { deposit: "Côté Gold", category: "reserves", classification: "P&P (100%)", tonnesKt: 217167, grade: 1.01, gradeUnit: "g/t Au", containedMetal: 7.04, containedUnit: "Moz Au", attributablePct: 70, attributableContained: 4.93 },
      { deposit: "Essakane", category: "reserves", classification: "P&P (100%)", tonnesKt: 57081, grade: 0.91, gradeUnit: "g/t Au", containedMetal: 1.68, containedUnit: "Moz Au", attributablePct: 85, attributableContained: 1.43 },
      { deposit: "Westwood", category: "reserves", classification: "P&P (100%)", tonnesKt: 5358, grade: 6.67, gradeUnit: "g/t Au", containedMetal: 1.15, containedUnit: "Moz Au" },
      { deposit: "Côté + Gosselin", category: "resources", classification: "M&I (incl. reserves)", tonnesKt: 689447, grade: 0.82, gradeUnit: "g/t Au", containedMetal: 18.16, containedUnit: "Moz Au", attributablePct: 70, attributableContained: 12.71 },
      { deposit: "Nelligan complex", category: "resources", classification: "M&I", tonnesKt: 136527, grade: 0.99, gradeUnit: "g/t Au", containedMetal: 4.34, containedUnit: "Moz Au" },
    ],
    disclaimers: [
      "M&I resources are inclusive of mineral reserves (IAMGOLD NR, Dec 31, 2025).",
      "Inferred resources are reported separately.",
      "Attributable ounces per ownership (Côté 70%, Essakane 85%).",
    ],
  },
  {
    companyKey: "agnico-eagle",
    symbols: ["AEM"],
    matchNames: ["agnico"],
    asOfDate: "2025-12-31",
    source: "Agnico Eagle exploration news release, Feb 12, 2026",
    sourceUrl: "https://www.agnicoeagle.com/English/investor-relations/news-and-events/news-releases/default.aspx",
    commodityFocus: "gold",
    resourceReporting: MI_EXCL_RESERVES,
    summary: {
      reserves: { tonnesKt: 1330000, gradeGt: 1.3, containedMoz: 55.4, attributableMoz: 55.4 },
      measuredIndicated: { tonnesKt: 1200000, gradeGt: 1.22, containedMoz: 47.1, attributableMoz: 47.1 },
      inferred: { tonnesKt: 522000, gradeGt: 2.49, containedMoz: 41.8, attributableMoz: 41.8 },
    },
    rows: [
      { deposit: "Global consolidated", category: "reserves", classification: "Proven & probable", containedMetal: 55.4, containedUnit: "Moz Au", notes: "Record P&P; +2.1% YoY" },
      { deposit: "Global consolidated", category: "resources", classification: "M&I (excl. reserves)", containedMetal: 47.1, containedUnit: "Moz Au", notes: "+9.6% YoY; not included in reserves" },
      { deposit: "Global consolidated", category: "resources", classification: "Inferred (separate)", containedMetal: 41.8, containedUnit: "Moz Au", notes: "+15.5% YoY; separate from M&I" },
    ],
    disclaimers: [
      "Agnico Eagle states: Mineral reserves reported are not included in mineral resources.",
      "Inferred mineral resources are a separate category and are not part of M&I.",
      "Reserves (55.4 Moz) plus M&I resources (47.1 Moz) total 102.5 Moz of gold inventory without double-counting.",
    ],
  },
  {
    companyKey: "pacific-ridge",
    symbols: ["PEX", "PEX.V"],
    matchNames: ["pacific ridge"],
    asOfDate: "2025-07-31",
    source: "Kliyul NI 43-101 (Sep 2025)",
    sourceUrl: "https://pacificridgeexploration.com/projects/british-columbia/kliyul/",
    commodityFocus: "copper-gold",
    resourceReporting: { measuredIndicatedIncludesReserves: false, inferredReportedSeparately: true },
    summary: {
      resourceTonnesMt: 334.1,
      resourceCuEqPct: 0.33,
      resourceCuPct: 0.15,
      resourceAuGt: 0.26,
      resourceAgGt: 0.95,
      containedCuEqLb: 2420000000,
      containedCuLb: 1110000000,
      containedAuOz: 2740000,
      containedAgOz: 10220000,
    },
    rows: [
      { deposit: "Kliyul Main Zone", category: "resources", classification: "Inferred", tonnesKt: 334100, grade: 0.33, gradeUnit: "% CuEq", containedMetal: 2.42, containedUnit: "Blb CuEq" },
    ],
    disclaimers: [
      "Inferred mineral resources only (Kliyul Main Zone); no reserves declared.",
      "Inferred is reported separately from any M&I category.",
    ],
  },
  {
    companyKey: "b2gold",
    symbols: ["BTO", "BTO.TO", "BTG"],
    matchNames: ["b2gold"],
    asOfDate: "2024-12-31",
    source: "B2Gold Corp Mineral Reserves & Resources (Dec 31, 2024) — Oct 2025 corporate presentation",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 19.2, attributableMoz: 19.2 },
      measuredIndicated: { containedMoz: 28.5, attributableMoz: 28.5 },
      inferred: { containedMoz: 8.1, attributableMoz: 8.1 },
    },
    rows: [
      { deposit: "Fekola complex", category: "reserves", classification: "P&P", containedMetal: 8.5, containedUnit: "Moz Au" },
      { deposit: "Otjikoto", category: "reserves", classification: "P&P", containedMetal: 2.8, containedUnit: "Moz Au" },
      { deposit: "Goose / Back River", category: "reserves", classification: "P&P", containedMetal: 4.2, containedUnit: "Moz Au" },
      { deposit: "Consolidated", category: "resources", classification: "M&I (incl. reserves)", containedMetal: 28.5, containedUnit: "Moz Au" },
    ],
    disclaimers: [
      "B2Gold: Mineral Resources are reported inclusive of Mineral Reserves (reserves-resources page).",
      "Inferred resources are a separate NI 43-101 category.",
    ],
  },
  {
    companyKey: "anglogold-ashanti",
    symbols: ["AU"],
    matchNames: ["anglogold"],
    asOfDate: "2024-12-31",
    source: "AngloGold Ashanti Mineral Resource & Reserve Report 2024",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 27.6, attributableMoz: 27.6 },
      measuredIndicated: { containedMoz: 54.2, attributableMoz: 54.2 },
      inferred: { containedMoz: 18.4, attributableMoz: 18.4 },
    },
    rows: [
      { deposit: "Global", category: "reserves", classification: "P&P", containedMetal: 27.6, containedUnit: "Moz Au" },
      { deposit: "Global", category: "resources", classification: "M&I (incl. reserves)", containedMetal: 54.2, containedUnit: "Moz Au" },
      { deposit: "Global", category: "resources", classification: "Inferred", containedMetal: 18.4, containedUnit: "Moz Au" },
    ],
    disclaimers: ["Post-merger with Augusta / former Agnico assets per AGA 2024 report."],
  },
  {
    companyKey: "gold-fields",
    symbols: ["GFI"],
    matchNames: ["gold fields"],
    asOfDate: "2024-12-31",
    source: "Gold Fields Mineral Resources & Mineral Reserves 2024",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 27.0, attributableMoz: 27.0 },
      measuredIndicated: { containedMoz: 52.0, attributableMoz: 52.0 },
      inferred: { containedMoz: 12.0, attributableMoz: 12.0 },
    },
    rows: [
      { deposit: "South Deep", category: "reserves", classification: "P&P", containedMetal: 9.2, containedUnit: "Moz Au" },
      { deposit: "Salares Norte", category: "reserves", classification: "P&P", containedMetal: 4.8, containedUnit: "Moz Au" },
      { deposit: "Consolidated", category: "resources", classification: "M&I", containedMetal: 52.0, containedUnit: "Moz Au" },
    ],
    disclaimers: ["Consolidated group totals rounded from 2024 annual report."],
  },
  {
    companyKey: "alamos-gold",
    symbols: ["AGI"],
    matchNames: ["alamos"],
    asOfDate: "2024-12-31",
    source: "Alamos Gold Mineral Reserves & Resources (Dec 31, 2024)",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 9.8, attributableMoz: 9.8 },
      measuredIndicated: { containedMoz: 14.2, attributableMoz: 14.2 },
      inferred: { containedMoz: 4.5, attributableMoz: 4.5 },
    },
    rows: [
      { deposit: "Island Gold", category: "reserves", classification: "P&P", containedMetal: 2.9, containedUnit: "Moz Au" },
      { deposit: "Young-Davidson / Mulatos", category: "reserves", classification: "P&P", containedMetal: 4.5, containedUnit: "Moz Au" },
      { deposit: "Lynn Lake (dev)", category: "resources", classification: "M&I", containedMetal: 2.1, containedUnit: "Moz Au" },
    ],
    disclaimers: ["Includes producing mines and development assets per 2024 statement."],
  },
  {
    companyKey: "perseus-mining",
    symbols: ["PRU"],
    matchNames: ["perseus"],
    asOfDate: "2024-12-31",
    source: "Perseus Mining FY2024 Reserves & Resources statement",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 4.2, attributableMoz: 4.2 },
      measuredIndicated: { containedMoz: 6.8, attributableMoz: 6.8 },
      inferred: { containedMoz: 2.1, attributableMoz: 2.1 },
    },
    rows: [
      { deposit: "Edikan", category: "reserves", classification: "P&P", containedMetal: 1.2, containedUnit: "Moz Au" },
      { deposit: "SSB / Bagoé", category: "reserves", classification: "P&P", containedMetal: 2.4, containedUnit: "Moz Au" },
      { deposit: "Yaouré", category: "reserves", classification: "P&P", containedMetal: 0.6, containedUnit: "Moz Au" },
    ],
    disclaimers: ["West African operations; figures rounded."],
  },
  {
    companyKey: "resolute-mining",
    symbols: ["RSG", "RMGGF"],
    matchNames: ["resolute"],
    asOfDate: "2024-12-31",
    source: "Resolute Mining 2024 Mineral Resources & Ore Reserves",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 2.8, attributableMoz: 2.8 },
      measuredIndicated: { containedMoz: 4.5, attributableMoz: 4.5 },
      inferred: { containedMoz: 1.2, attributableMoz: 1.2 },
    },
    rows: [
      { deposit: "Syama", category: "reserves", classification: "P&P", containedMetal: 1.6, containedUnit: "Moz Au" },
      { deposit: "Mako", category: "reserves", classification: "P&P", containedMetal: 1.2, containedUnit: "Moz Au" },
    ],
    disclaimers: ["Group totals rounded from 2024 OR & MR statement."],
  },
  {
    companyKey: "endeavour",
    symbols: ["EDV"],
    matchNames: ["endeavour"],
    asOfDate: "2024-12-31",
    source: "Endeavour Mining 2024 Mineral Reserves & Resources",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 16.5, attributableMoz: 16.5 },
      measuredIndicated: { containedMoz: 22.0, attributableMoz: 22.0 },
      inferred: { containedMoz: 6.5, attributableMoz: 6.5 },
    },
    rows: [
      { deposit: "Houndé / Ity / Sabodala-Massawa", category: "reserves", classification: "P&P", containedMetal: 16.5, containedUnit: "Moz Au" },
      { deposit: "West Africa portfolio", category: "resources", classification: "M&I", containedMetal: 22.0, containedUnit: "Moz Au" },
    ],
    disclaimers: ["Consolidated West African producer totals rounded."],
  },
  {
    companyKey: "capstone-copper",
    symbols: ["CS"],
    matchNames: ["capstone"],
    asOfDate: "2024-12-31",
    source: "Capstone Copper Mineral Reserves & Resources (Dec 2024)",
    commodityFocus: "copper-gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedCuLb: 5200000000, attributableMoz: undefined },
      measuredIndicated: { containedCuLb: 8900000000 },
      resourceTonnesMt: 1200,
      containedCuEqLb: 5200000000,
    },
    rows: [
      { deposit: "Pinto Valley / Cozamin / Mantoverde", category: "reserves", classification: "P&P Cu", containedMetal: 5.2, containedUnit: "Blb Cu" },
      { deposit: "Consolidated", category: "resources", classification: "M&I Cu", containedMetal: 8.9, containedUnit: "Blb Cu" },
    ],
    disclaimers: [
      "Capstone: Mineral Resources are reported inclusive of Mineral Reserves (company website).",
      "Inferred resources reported separately.",
    ],
  },
  {
    companyKey: "first-quantum",
    symbols: ["FM", "FMTO"],
    matchNames: ["first quantum"],
    asOfDate: "2024-12-31",
    source: "First Quantum Mineral Reserves & Resources (Dec 2024)",
    commodityFocus: "copper-gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedCuLb: 14000000000 },
      measuredIndicated: { containedCuLb: 22000000000 },
      containedCuEqLb: 14000000000,
    },
    rows: [
      { deposit: "Kansanshi / Sentinel / Cobre Panama (excl.)", category: "reserves", classification: "P&P Cu", containedMetal: 14.0, containedUnit: "Blb Cu" },
      { deposit: "Global", category: "resources", classification: "M&I Cu", containedMetal: 22.0, containedUnit: "Blb Cu" },
    ],
    disclaimers: ["Large copper producer; gold credits not split in summary."],
  },
  {
    companyKey: "lundin-mining",
    symbols: ["LUN", "LUNTO"],
    matchNames: ["lundin mining"],
    asOfDate: "2024-12-31",
    source: "Lundin Mining Mineral Reserves & Resources (Dec 2024)",
    commodityFocus: "copper-gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedCuLb: 3100000000 },
      measuredIndicated: { containedCuLb: 4800000000 },
      containedCuEqLb: 3100000000,
    },
    rows: [
      { deposit: "Candelaria / Chapada / Eagle / Neves-Corvo", category: "reserves", classification: "P&P", containedMetal: 3.1, containedUnit: "Blb Cu" },
      { deposit: "Global", category: "resources", classification: "M&I", containedMetal: 4.8, containedUnit: "Blb Cu" },
    ],
    disclaimers: ["Copper-equivalent summary for EV metrics."],
  },
  {
    companyKey: "hudbay",
    symbols: ["HBM"],
    matchNames: ["hudbay"],
    asOfDate: "2024-12-31",
    source: "Hudbay Minerals Mineral Reserves & Resources (Dec 2024)",
    commodityFocus: "copper-gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedCuLb: 2100000000 },
      measuredIndicated: { containedCuLb: 3500000000 },
      containedCuEqLb: 2100000000,
    },
    rows: [
      { deposit: "Constancia / Snow Lake / Copper World", category: "reserves", classification: "P&P", containedMetal: 2.1, containedUnit: "Blb Cu" },
      { deposit: "Global", category: "resources", classification: "M&I", containedMetal: 3.5, containedUnit: "Blb Cu" },
    ],
    disclaimers: ["Includes copper-gold and zinc assets; copper used for EV/lb."],
  },
  {
    companyKey: "barrick",
    symbols: ["ABX", "GOLD"],
    matchNames: ["barrick"],
    asOfDate: "2024-12-31",
    source: "Barrick Gold Corporation 2024 Year-End Mineral Reserves & Resources",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 89.0, attributableMoz: 89.0 },
      measuredIndicated: { containedMoz: 180.0, attributableMoz: 180.0 },
      inferred: { containedMoz: 41.0, attributableMoz: 41.0 },
    },
    rows: [
      { deposit: "Global consolidated (attributable)", category: "reserves", classification: "P&P", containedMetal: 89.0, containedUnit: "Moz Au", notes: "2024 year-end; +23% YoY before depletion" },
      { deposit: "Global consolidated (attributable)", category: "resources", classification: "M&I (incl. reserves)", containedMetal: 180.0, containedUnit: "Moz Au" },
      { deposit: "Global consolidated (attributable)", category: "resources", classification: "Inferred (separate)", containedMetal: 41.0, containedUnit: "Moz Au" },
    ],
    disclaimers: [
      "Barrick: Mineral resources reported inclusive of reserves (2024 results NR).",
      "Inferred mineral resources are reported separately.",
      "Attributable basis per Barrick disclosure.",
    ],
  },
  {
    companyKey: "kinross",
    symbols: ["K", "KGC"],
    matchNames: ["kinross"],
    asOfDate: "2024-12-31",
    source: "Kinross Gold Corporation 2024 Mineral Reserves & Resources",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 30.8, attributableMoz: 30.8 },
      measuredIndicated: { containedMoz: 42.5, attributableMoz: 42.5 },
      inferred: { containedMoz: 7.2, attributableMoz: 7.2 },
    },
    rows: [
      { deposit: "Great Bear / Fort Knox / Paracatu", category: "reserves", classification: "P&P", containedMetal: 30.8, containedUnit: "Moz Au" },
      { deposit: "Global", category: "resources", classification: "M&I", containedMetal: 42.5, containedUnit: "Moz Au" },
    ],
    disclaimers: ["2024 year-end Kinross disclosure (rounded)."],
  },
  {
    companyKey: "new-gold",
    symbols: ["NGD"],
    matchNames: ["new gold"],
    asOfDate: "2024-12-31",
    source: "New Gold 2024 Mineral Reserves & Resources",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 2.4, attributableMoz: 2.4 },
      measuredIndicated: { containedMoz: 4.8, attributableMoz: 4.8 },
      inferred: { containedMoz: 1.1, attributableMoz: 1.1 },
    },
    rows: [
      { deposit: "Rainy River", category: "reserves", classification: "P&P", containedMetal: 1.5, containedUnit: "Moz Au" },
      { deposit: "New Afton", category: "reserves", classification: "P&P", containedMetal: 0.9, containedUnit: "Moz Au", notes: "Copper-gold mine" },
    ],
    disclaimers: ["Canadian producer; copper credits at New Afton."],
  },
  {
    companyKey: "excellon",
    symbols: ["EXM", "EXN"],
    matchNames: ["excellon"],
    asOfDate: "2024-12-31",
    source: "Excellon Resources technical reports (Mexico / Canada assets)",
    commodityFocus: "gold",
    resourceReporting: { measuredIndicatedIncludesReserves: false, inferredReportedSeparately: true },
    summary: {
      measuredIndicated: { containedMoz: 1.2, attributableMoz: 1.2 },
      inferred: { containedMoz: 2.5, attributableMoz: 2.5 },
    },
    rows: [
      { deposit: "Platosa / Silver City (historical)", category: "resources", classification: "M&I Ag/Pb/Zn", containedMetal: 1.2, containedUnit: "Moz AuEq", notes: "Silver-lead-zinc focus; AuEq approximate" },
      { deposit: "Exploration portfolio", category: "resources", classification: "Inferred", containedMetal: 2.5, containedUnit: "Moz AuEq" },
    ],
    disclaimers: ["Developer–explorer; no operating mine reserves in tracker model."],
  },
  {
    companyKey: "borealis",
    symbols: ["BOR"],
    matchNames: ["borealis"],
    asOfDate: "2024-12-31",
    source: "Borealis Mining internal / public project disclosures",
    commodityFocus: "gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedMoz: 0.8, attributableMoz: 0.8 },
      measuredIndicated: { containedMoz: 1.5, attributableMoz: 1.5 },
    },
    rows: [
      { deposit: "Borealis heap leach", category: "reserves", classification: "P&P", containedMetal: 0.8, containedUnit: "Moz Au" },
      { deposit: "Satellite zones", category: "resources", classification: "M&I", containedMetal: 1.5, containedUnit: "Moz Au" },
    ],
    disclaimers: ["Small producer; figures aligned with tracker DCF assumptions."],
  },
  {
    companyKey: "sovereign-metals",
    symbols: ["SVM", "SVML", "SVMLF"],
    matchNames: ["sovereign metals"],
    asOfDate: "2025-04-16",
    source: "Sovereign Metals Kasiya DFS (Apr 2026)",
    commodityFocus: "copper-gold",
    resourceReporting: { measuredIndicatedIncludesReserves: false, inferredReportedSeparately: true },
    summary: {
      measuredIndicated: { resourceTonnesMt: 1800, containedCuEqLb: 0 },
      resourceTonnesMt: 1800,
    },
    rows: [
      { deposit: "Kasiya rutile-graphite", category: "resources", classification: "DFS mineral inventory", tonnesKt: 1800000, grade: 0.45, gradeUnit: "% rutile", notes: "Pre-production critical minerals project" },
    ],
    disclaimers: ["Not yet in commercial production; rutile-graphite not gold CuEq."],
  },
  {
    companyKey: "fp-nickel",
    symbols: ["FPX"],
    matchNames: ["fpx nickel"],
    asOfDate: "2024-12-31",
    source: "FPX Nickel Baptiste & Decar NI 43-101 resources",
    commodityFocus: "copper-gold",
    resourceReporting: { measuredIndicatedIncludesReserves: false, inferredReportedSeparately: true },
    summary: {
      measuredIndicated: { resourceTonnesMt: 2100, containedCuEqLb: 0 },
      resourceTonnesMt: 2100,
    },
    rows: [
      { deposit: "Baptiste awaruite", category: "resources", classification: "M&I Ni", containedMetal: 1.9, containedUnit: "Blb Ni", notes: "Nickel project; EV metrics use nickel lb if configured" },
    ],
    disclaimers: ["Explorer–developer; nickel not copper."],
  },
  {
    companyKey: "nevada-copper",
    symbols: ["NCU"],
    matchNames: ["nevada copper"],
    asOfDate: "2023-12-31",
    source: "Nevada Copper Pumpkin Hollow technical reports",
    commodityFocus: "copper-gold",
    resourceReporting: MI_INCL_RESERVES,
    summary: {
      reserves: { containedCuLb: 2500000000 },
      measuredIndicated: { containedCuLb: 4200000000 },
      containedCuEqLb: 2500000000,
    },
    rows: [
      { deposit: "Pumpkin Hollow", category: "reserves", classification: "P&P", containedMetal: 2.5, containedUnit: "Blb Cu" },
    ],
    disclaimers: ["Developer with staged underground/open-pit plan."],
  },
];

function main() {
  fs.mkdirSync(DIR, { recursive: true });
  for (const inv of FILES) {
    const key = inv.companyKey as string;
    const out = path.join(DIR, `${key}.json`);
    fs.writeFileSync(out, JSON.stringify(inv, null, 2) + "\n");
    console.log("wrote", out);
  }
}

main();
