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

/** JORC/NI 43-101 exploration target (conceptual — not a mineral resource). */
export type ExplorationTargetSummary = {
  tonnesMtMin: number;
  tonnesMtMax: number;
  cuPctMin: number;
  cuPctMax: number;
  agGtMin?: number;
  agGtMax?: number;
  /** Contained copper in Mt (metal), issuer-stated range. */
  containedCuMtMin: number;
  containedCuMtMax: number;
  containedAgMozMin?: number;
  containedAgMozMax?: number;
};

export type MineralInventoryFile = {
  companyKey: string;
  symbols?: string[];
  matchNames?: string[];
  asOfDate: string;
  source: string;
  sourceUrl?: string;
  commodityFocus: "gold" | "copper-gold" | "tin" | "silver";
  resourceReporting?: MineralResourceReporting;
  /** Conceptual ET when no MRE/reserves exist (e.g. GreenX Tannenberg May 2026). */
  explorationTarget?: ExplorationTargetSummary;
  summary: {
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
    /** Tin: contained metal in metric tonnes and lb (for EV/lb). */
    containedSnT?: number;
    containedSnLb?: number;
    reserves?: {
      tonnesKt?: number;
      gradeGt?: number;
      containedMoz?: number;
      attributableMoz?: number;
      containedSnT?: number;
      containedSnLb?: number;
      containedCuLb?: number;
    };
    measuredIndicated?: {
      tonnesKt?: number;
      gradeGt?: number;
      containedMoz?: number;
      attributableMoz?: number;
      containedSnT?: number;
      containedSnLb?: number;
      containedCuLb?: number;
    };
    inferred?: {
      tonnesKt?: number;
      gradeGt?: number;
      containedMoz?: number;
      attributableMoz?: number;
      containedSnT?: number;
      containedSnLb?: number;
    };
  };
  rows: MineralRow[];
  disclaimers?: string[];
};
