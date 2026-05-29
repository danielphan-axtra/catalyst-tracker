import type { ImpactCategory } from "@/lib/impact";

export type CatalystAnalysisSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

/** Rich expandable content stored in Catalyst.analysisJson */
export type CatalystAnalysisPayload = {
  version: 1;
  /** How company/project history frames this specific catalyst */
  companyContext?: string;
  sections: CatalystAnalysisSection[];
  bullCase?: string;
  bearCase?: string;
  watchItems?: string[];
};

export type CatalystSeedInput = {
  title: string;
  /** Short summary shown in table (1–2 sentences) */
  summary: string;
  impactCategory: ImpactCategory;
  impactBullets: string[];
  analysis: CatalystAnalysisPayload;
  /** Inclusive start of expected window (must be today or later) */
  dateStart: Date;
  /** Inclusive end; defaults to dateStart if omitted */
  dateEnd?: Date | null;
};

export type ResolvedCatalystView = {
  summary: string;
  impactText: string;
  analysis: CatalystAnalysisPayload;
  hasRichAnalysis: boolean;
};
