export type MineralCategory = "reserves" | "resources";

export type MineralRow = {
  deposit: string;
  category: MineralCategory;
  classification: string;
  tonnesKt?: number | null;
  grade?: number | null;
  gradeUnit?: string | null;
  containedMetal?: number | null;
  containedUnit?: string | null;
  attributablePct?: number | null;
  attributableContained?: number | null;
  notes?: string | null;
};

/** How the issuer reports mineral resources relative to reserves (from NR / AIF). */
export type MineralResourceReporting = {
  /** True if M&I resource ounces/tonnes include P&P reserves (IAMGOLD, B2Gold). False if exclusive (Agnico Eagle). */
  measuredIndicatedIncludesReserves: boolean;
  /** Inferred is always a separate NI 43-101 category when reported. */
  inferredReportedSeparately?: boolean;
  disclosureNote?: string;
};

export type MineralInventoryFile = {
  companyKey: string;
  symbols?: string[];
  matchNames?: string[];
  asOfDate: string;
  source: string;
  sourceUrl?: string;
  commodityFocus: "gold" | "copper-gold";
  resourceReporting?: MineralResourceReporting;
  summary: {
    reserves?: {
      tonnesKt?: number;
      gradeGt?: number;
      containedMoz?: number;
      attributableMoz?: number;
    };
    measuredIndicated?: {
      tonnesKt?: number;
      gradeGt?: number;
      containedMoz?: number;
      attributableMoz?: number;
    };
    inferred?: {
      tonnesKt?: number;
      gradeGt?: number;
      containedMoz?: number;
      attributableMoz?: number;
    };
    /** Copper-gold explorers: contained CuEq lb at resource price deck */
    containedCuEqLb?: number;
    containedCuLb?: number;
    containedAuOz?: number;
    containedAgOz?: number;
    resourceTonnesMt?: number;
    resourceCuEqPct?: number;
    resourceCuPct?: number;
    resourceAuGt?: number;
    resourceAgGt?: number;
  };
  rows: MineralRow[];
  disclaimers?: string[];
};
