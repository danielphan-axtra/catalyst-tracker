import fs from "fs";
import path from "path";
import {
  loadAssumptionsFromRepoFile,
  type DcfAssumptionsFile,
} from "@/lib/endeavour-dcf";

export type GenericDcfConfig = {
  assumptionsFileName: string;
  companyName: string;
  startYear?: number;
  initialGoldPriceUsdPerOz?: number;
  discountRatePct?: number;
  /** Calendar years shown on cash flow / production charts (default 5). */
  chartYears?: number;
  commodityName?: string;
  commodityPriceUnit?: string;
  productionUnitLabel?: string;
  productionValueSuffix?: string;
  costUnitLabel?: string;
  costSeriesLabel?: string;
  /** Pre-production project with published feasibility study (DFS/PFS). */
  feasibilityStudy?: boolean;
};

const SYMBOL_DCF_MAP: Array<{ keys: string[]; names?: string[]; config: GenericDcfConfig }> = [
  { keys: ["PRU"], names: ["perseus"], config: { assumptionsFileName: "perseus-mining-dcf-assumptions.json", companyName: "Perseus Mining" } },
  { keys: ["IAG", "IMG"], names: ["iamgold"], config: { assumptionsFileName: "iamgold-dcf-assumptions.json", companyName: "IAMGOLD" } },
  { keys: ["BTG", "BTO"], names: ["b2gold"], config: { assumptionsFileName: "b2gold-dcf-assumptions.json", companyName: "B2Gold" } },
  { keys: ["AU"], names: ["anglogold"], config: { assumptionsFileName: "anglogold-dcf-assumptions.json", companyName: "AngloGold Ashanti" } },
  { keys: ["GFI"], names: ["gold fields"], config: { assumptionsFileName: "gold-fields-dcf-assumptions.json", companyName: "Gold Fields" } },
  { keys: ["AGI"], names: ["alamos"], config: { assumptionsFileName: "alamos-gold-dcf-assumptions.json", companyName: "Alamos Gold" } },
  {
    keys: ["SVM", "SVML", "SVMLF"],
    names: ["sovereign metals"],
    config: {
      assumptionsFileName: "sovereign-metals-kasiya-dcf-assumptions.json",
      companyName: "Sovereign Metals",
      feasibilityStudy: true,
      startYear: 2029,
      initialGoldPriceUsdPerOz: 1459,
      discountRatePct: 8,
      chartYears: 10,
      commodityName: "Rutile + graphite (DFS)",
      commodityPriceUnit: "USD/t blended",
      productionUnitLabel: "kt",
      productionValueSuffix: " kt",
      costUnitLabel: "$/t",
      costSeriesLabel: "Operating cost (FOB)",
    },
  },
  { keys: ["RSG", "RMGGF"], names: ["resolute"], config: { assumptionsFileName: "resolute-mining-dcf-assumptions.json", companyName: "Resolute Mining" } },
  {
    keys: ["EXM", "EXN"],
    names: ["excellon"],
    config: {
      assumptionsFileName: "excellon-resources-dcf-assumptions.json",
      companyName: "Excellon Resources",
      initialGoldPriceUsdPerOz: 2500,
      commodityName: "Gold",
      commodityPriceUnit: "USD/oz",
      productionUnitLabel: "Koz",
      productionValueSuffix: " koz",
      costUnitLabel: "$/oz",
      costSeriesLabel: "AISC",
    },
  },
  {
    keys: ["HBM"],
    names: ["hudbay"],
    config: {
      assumptionsFileName: "hudbay-minerals-dcf-assumptions.json",
      companyName: "Hudbay Minerals",
      initialGoldPriceUsdPerOz: 4.3,
      commodityName: "Copper",
      commodityPriceUnit: "USD/lb",
      productionUnitLabel: "Klb",
      productionValueSuffix: " klb",
      costUnitLabel: "$/lb",
      costSeriesLabel: "AISC",
    },
  },
  {
    keys: ["CS"],
    names: ["capstone"],
    config: {
      assumptionsFileName: "capstone-copper-dcf-assumptions.json",
      companyName: "Capstone Copper",
      initialGoldPriceUsdPerOz: 4.3,
      commodityName: "Copper",
      commodityPriceUnit: "USD/lb",
      productionUnitLabel: "Klb",
      productionValueSuffix: " klb",
      costUnitLabel: "$/lb",
      costSeriesLabel: "AISC",
    },
  },
  {
    keys: ["FM", "FMTO"],
    names: ["first quantum"],
    config: {
      assumptionsFileName: "first-quantum-copper-dcf-assumptions.json",
      companyName: "First Quantum Minerals",
      initialGoldPriceUsdPerOz: 4.3,
      commodityName: "Copper",
      commodityPriceUnit: "USD/lb",
      productionUnitLabel: "Klb",
      productionValueSuffix: " klb",
      costUnitLabel: "$/lb",
      costSeriesLabel: "AISC",
    },
  },
  {
    keys: ["LUN", "LUNTO"],
    names: ["lundin mining"],
    config: {
      assumptionsFileName: "lundin-mining-copper-dcf-assumptions.json",
      companyName: "Lundin Mining",
      initialGoldPriceUsdPerOz: 4.3,
      commodityName: "Copper",
      commodityPriceUnit: "USD/lb",
      productionUnitLabel: "Klb",
      productionValueSuffix: " klb",
      costUnitLabel: "$/lb",
      costSeriesLabel: "AISC",
    },
  },
  { keys: ["ABX", "GOLD"], names: ["barrick"], config: { assumptionsFileName: "barrick-dcf-assumptions.json", companyName: "Barrick Gold" } },
  { keys: ["K", "KGC"], names: ["kinross"], config: { assumptionsFileName: "kinross-dcf-assumptions.json", companyName: "Kinross Gold" } },
  {
    keys: ["NGD"],
    names: ["new gold"],
    config: { assumptionsFileName: "new-gold-dcf-assumptions.json", companyName: "New Gold Inc." },
  },
  {
    keys: ["BOR"],
    names: ["borealis"],
    config: {
      assumptionsFileName: "borealis-mining-dcf-assumptions.json",
      companyName: "Borealis Mining",
      initialGoldPriceUsdPerOz: 2500,
      commodityName: "Gold",
      commodityPriceUnit: "USD/oz",
      productionUnitLabel: "Koz",
      productionValueSuffix: " koz",
      costUnitLabel: "$/oz",
      costSeriesLabel: "AISC",
    },
  },
  {
    keys: ["ATM", "ATMT"],
    names: ["andrada"],
    config: {
      assumptionsFileName: "andrada-mining-dcf-assumptions.json",
      companyName: "Andrada Mining",
      initialGoldPriceUsdPerOz: 14.97,
      commodityName: "Tin",
      commodityPriceUnit: "USD/lb",
      productionUnitLabel: "t",
      productionValueSuffix: " t",
      costUnitLabel: "$/lb",
      costSeriesLabel: "Cash cost",
    },
  },
  {
    keys: ["CLA"],
    names: ["celsius"],
    config: {
      assumptionsFileName: "celsius-resources-mcb-dcf-assumptions.json",
      companyName: "Celsius Resources",
      feasibilityStudy: true,
      startYear: 2026,
      initialGoldPriceUsdPerOz: 4.3,
      discountRatePct: 8,
      chartYears: 10,
      commodityName: "Copper",
      commodityPriceUnit: "USD/lb",
      productionUnitLabel: "Klb",
      productionValueSuffix: " klb",
      costUnitLabel: "$/lb",
      costSeriesLabel: "C1 cash cost",
    },
  },
];

const NON_MINING_SYMBOLS = new Set([
  "CNQ",
  "WCP",
  "GILD",
  "PHYS",
  "PSLV",
  "ROG",
]);

export function getGenericDcfConfig(symbol: string, name: string): GenericDcfConfig | null {
  const sBase = symbol.toUpperCase().replace(/\.(TO|V|AX|L)$/i, "");
  const n = name.toLowerCase();
  for (const entry of SYMBOL_DCF_MAP) {
    if (entry.keys.includes(sBase)) return entry.config;
    if (entry.names?.some((frag) => n.includes(frag))) return entry.config;
  }
  return null;
}

export function isEndeavourCompany(symbol: string, name: string): boolean {
  const s = symbol.toUpperCase().replace(/\.(TO|V|AX|L)$/i, "");
  return s === "EDV" || name.toLowerCase().includes("endeavour");
}

export function isAgnicoCompany(symbol: string, name: string): boolean {
  const s = symbol.toUpperCase().replace(/\.(TO|V|AX|L)$/i, "");
  const n = name.toLowerCase();
  return s === "AEM" || n.includes("agnico");
}

export function yearOneProduction(asset: DcfAssumptionsFile["assets"][0]): number {
  const map = asset.payableGoldProductionKozByYear;
  if (!map) return 0;
  const y1 = map.Year1 ?? map["Year 1"] ?? 0;
  return Number(y1) || 0;
}

export function assumptionsHaveCurrentProduction(assumptions: DcfAssumptionsFile): boolean {
  return assumptions.assets.some(
    (a) => a.type === "production" && yearOneProduction(a) > 0,
  );
}

export function loadDcfAssumptionsSafe(fileName: string): DcfAssumptionsFile | null {
  try {
    const filePath = path.join(process.cwd(), "data", fileName);
    if (!fs.existsSync(filePath)) return null;
    return loadAssumptionsFromRepoFile(fileName);
  } catch {
    return null;
  }
}

export function isMiningSector(industry: string | null | undefined): boolean {
  if (!industry) return false;
  const i = industry.toLowerCase();
  return (
    i.includes("gold") ||
    i.includes("copper") ||
    i.includes("silver") ||
    i.includes("mining") ||
    i.includes("metal") ||
    i.includes("nickel") ||
    i.includes("mineral")
  );
}

export function isExplorerDeveloperCompany(
  symbol: string,
  name: string,
  industry: string | null | undefined,
  dcfConfig: GenericDcfConfig | null,
): boolean {
  if (NON_MINING_SYMBOLS.has(symbol.toUpperCase().replace(/\.(TO|V|AX|L)$/i, ""))) return false;
  if (!isMiningSector(industry)) return false;
  if (isEndeavourCompany(symbol, name) || isAgnicoCompany(symbol, name)) return false;

  if (dcfConfig) {
    const assumptions = loadDcfAssumptionsSafe(dcfConfig.assumptionsFileName);
    if (assumptions && assumptionsHaveCurrentProduction(assumptions)) return false;
    if (assumptions) return true;
  }

  const n = name.toLowerCase();
  const i = (industry ?? "").toLowerCase();
  return (
    i.includes("exploration") ||
    n.includes("exploration") ||
    n.includes("resources") ||
    symbol.toUpperCase().endsWith(".V")
  );
}

export type MiningCompanyProfile = {
  dcfConfig: GenericDcfConfig | null;
  showProducingDcf: boolean;
  showFeasibilityDcf: boolean;
  showEndeavourDcf: boolean;
  showAgnicoDcf: boolean;
  showCashRunway: boolean;
  useGenericCashRunway: boolean;
};

export function getMiningCompanyProfile(
  symbol: string,
  name: string,
  industry: string | null | undefined,
): MiningCompanyProfile {
  const dcfConfig = getGenericDcfConfig(symbol, name);
  const showEndeavourDcf = isEndeavourCompany(symbol, name);
  const showAgnicoDcf = isAgnicoCompany(symbol, name);

  let showProducingDcf = false;
  let showFeasibilityDcf = false;
  if (dcfConfig && !showEndeavourDcf && !showAgnicoDcf) {
    const assumptions = loadDcfAssumptionsSafe(dcfConfig.assumptionsFileName);
    if (assumptions) {
      showProducingDcf = assumptionsHaveCurrentProduction(assumptions);
      showFeasibilityDcf = Boolean(dcfConfig.feasibilityStudy);
    }
  }

  const explorer = isExplorerDeveloperCompany(symbol, name, industry, dcfConfig);
  const useGenericCashRunway =
    explorer &&
    !showProducingDcf &&
    !showEndeavourDcf &&
    !showAgnicoDcf;

  return {
    dcfConfig,
    showProducingDcf,
    showFeasibilityDcf,
    showEndeavourDcf,
    showAgnicoDcf,
    showCashRunway: useGenericCashRunway || false,
    useGenericCashRunway,
  };
}
