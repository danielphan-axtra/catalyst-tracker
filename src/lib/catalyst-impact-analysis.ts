import { truncateBullet } from "@/lib/catalyst-copy";
import {
  normalizeImpactCategory,
  type ImpactCategory,
} from "@/lib/impact";

export type CatalystImpactInsight = {
  category: ImpactCategory;
  bullets: string[];
};

type CatalystContext = {
  title: string;
  description: string;
  impactText: string;
  combined: string;
  companyName: string;
  companySymbol: string;
};

/** Pull explicit bullets already stored in importance (lines starting with • or -). */
function parseStoredBullets(impactText: string): string[] | null {
  const lines = impactText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets = lines
    .filter((l) => /^[•\-–]\s+/.test(l) || /^\d+\.\s+/.test(l))
    .map((l) => l.replace(/^[•\-–]\s+/, "").replace(/^\d+\.\s+/, "").trim())
    .filter((l) => l.length >= 12 && l.length <= 140);
  if (bullets.length >= 1 && bullets.length <= 3) {
    return bullets.slice(0, 2).map((b) => truncateBullet(b));
  }
  return null;
}

function includes(ctx: string, keys: string[]): boolean {
  return keys.some((k) => ctx.includes(k));
}

const MINING_CONTEXT_KEYS = [
  "gold",
  "silver",
  "copper",
  "zinc",
  "nickel",
  "lithium",
  "uranium",
  "mine",
  "mining",
  "moz",
  "koz",
  "aisc",
  "ore",
  "mill",
  "pit",
  "underground",
  "dfs",
  "pfs",
  "pea",
  "mineral",
  "deposit",
  "tailings",
  "metallurgy",
  "exploration",
  "drill",
  "feasibility",
  "smelter",
  "concentrate",
  "graphite",
  "rutile",
  "graphite",
  "capex",
  "npv",
  "offtake",
  "concentrator",
];

const NON_MINING_KEYS = [
  "fda",
  "drug",
  "indication",
  "therapy",
  "oncology",
  "clinical trial",
  "pharma",
  "biotech",
  "hepatitis",
  "rheumatoid",
  "hiv treatment",
  "car t",
];

function hasMiningContext(text: string): boolean {
  return includes(text, MINING_CONTEXT_KEYS);
}

function isNonMiningCatalyst(text: string): boolean {
  return includes(text, NON_MINING_KEYS);
}

function extractMetric(
  text: string,
  pattern: RegExp,
): string | null {
  const m = text.match(pattern);
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

function inferCategoryFromPatterns(combined: string): ImpactCategory | null {
  if (
    includes(combined, [
      "conference",
      "webcast",
      "investor day",
      "presentation",
      "site visit",
      "quarterly update",
      "earnings",
      "agm",
      "annual meeting",
    ])
  ) {
    return "Incremental";
  }

  if (
    includes(combined, [
      "dfs",
      "definitive feasibility",
      "feasibility study completion",
      "construction start",
      "first production",
      "commercial production",
      "permit approval",
      "development approval",
      "merger",
      "acquisition",
      "takeover",
      "bankable feasibility",
      "redevelopment decision",
      "redevelopment approval",
      "underground expansion approval",
    ])
  ) {
    return "Major";
  }

  if (
    includes(combined, [
      "pfs",
      "pre-feasibility",
      "pea",
      "preliminary economic",
      "resource update",
      "reserve update",
      "maiden resource",
      "drill results",
      "assay",
      "financing",
      "offtake",
      "guidance",
      "study update",
      "permitting milestone",
      "construction decision",
      "fill-the-mill",
      "mill strategy",
      "shareholder return",
      "buyback",
      "dividend",
      "exploration resource",
    ])
  ) {
    return "Medium";
  }

  return null;
}

export function hasStructuredCatalystImpact(impactText: string | null | undefined): boolean {
  const text = (impactText ?? "").trim();
  if (!text) return false;
  return normalizeImpactCategory(text) !== null && parseStoredBullets(text) !== null;
}

function inferCategory(ctx: CatalystContext): ImpactCategory {
  const fromField = normalizeImpactCategory(ctx.impactText);
  if (fromField && parseStoredBullets(ctx.impactText)) return fromField;

  const fromPatterns = inferCategoryFromPatterns(ctx.combined);
  if (fromPatterns) return fromPatterns;

  if (fromField) return fromField;

  if (
    includes(ctx.combined, [
      "dfs",
      "definitive feasibility",
      "feasibility study completion",
      "construction start",
      "first production",
      "commercial production",
      "permit approval",
      "development approval",
      "merger",
      "acquisition",
      "takeover",
      "bankable feasibility",
    ])
  ) {
    return "Major";
  }

  if (
    includes(ctx.combined, [
      "pfs",
      "pre-feasibility",
      "pea",
      "preliminary economic",
      "resource update",
      "reserve update",
      "maiden resource",
      "drill results",
      "assay",
      "financing",
      "offtake",
      "guidance",
      "study update",
      "permitting milestone",
      "construction decision",
    ])
  ) {
    return "Medium";
  }

  return "Medium";
}

function projectHint(ctx: CatalystContext): string | null {
  const m =
    ctx.title.match(
      /(?:at|for|on)\s+([A-Z][A-Za-z0-9\s\-']{2,40}?)(?:\s+(?:project|mine|complex|deposit|study|dfs|pfs)|$|,)/,
    ) ?? ctx.description.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\s+(?:project|mine|complex|deposit)/);
  if (m?.[1]) return m[1].trim();
  return null;
}

function productionHint(ctx: CatalystContext): string | null {
  return (
    extractMetric(ctx.combined, /\d[\d,.]*\s*(?:–|-|to)\s*\d[\d,.]*\s*koz/gi) ??
    extractMetric(ctx.combined, /\d[\d,.]*\s*moz/gi) ??
    extractMetric(ctx.combined, /\d[\d,.]*\s*koz\s*\/?\s*yr/gi) ??
    extractMetric(ctx.combined, /~\s*\d[\d,.]*\s*koz/gi)
  );
}

function costHint(ctx: CatalystContext): string | null {
  return (
    extractMetric(ctx.combined, /\$[\d,.]+\s*\/?\s*oz/gi) ??
    extractMetric(ctx.combined, /aisc[^$]{0,20}\$[\d,.]+/gi)
  );
}

function npvHint(ctx: CatalystContext): string | null {
  return extractMetric(ctx.combined, /\$[\d,.]+\s*b(?:illion)?\s*npv/gi) ?? extractMetric(ctx.combined, /npv[^$]{0,15}\$[\d,.]+/gi);
}

function buildNonMiningBullets(ctx: CatalystContext, category: ImpactCategory): string[] {
  const stored = parseStoredBullets(ctx.impactText);
  if (stored) return stored;

  if (category === "Major") {
    return [
      "Outcome moves the multiple on execution or policy clarity.",
      "Miss vs guidance usually forces estimate cuts and dilution fear.",
    ];
  }
  if (category === "Incremental") {
    return ["Sentiment and positioning only unless numbers surprise."];
  }
  return [
    "Adjusts near-term estimates; rarely changes the core thesis alone.",
  ];
}

function buildBullets(ctx: CatalystContext, category: ImpactCategory): string[] {
  const stored = parseStoredBullets(ctx.impactText);
  if (stored) return stored;

  if (isNonMiningCatalyst(ctx.combined) && !hasMiningContext(ctx.combined)) {
    return buildNonMiningBullets(ctx, category);
  }

  const project = projectHint(ctx);
  const prod = productionHint(ctx);
  const aisc = costHint(ctx);
  const npv = npvHint(ctx);
  const proj = project ? `${project}` : "the project";

  const issuer = ctx.companyName || ctx.companySymbol || "the issuer";
  const isProducer = includes(ctx.combined, [
    "operating mine",
    "flagship",
    "consolidated output",
    "fcf",
    "aisc guidance",
    "fill-the-mill",
    "mill capacity",
    "kirkland lake",
    "detour lake",
    "canadian malartic",
  ]) || (!!ctx.companySymbol && ["AEM", "EDV", "HBM"].some((s) => ctx.companySymbol.includes(s)));

  if (includes(ctx.combined, ["redevelopment", "redevelopment decision", "redevelopment approval"])) {
    return [
      `Go/no-go on ${proj} adds ${prod ?? "~400 koz/yr"}; needs fundable capex and Nunavut logistics.`,
      `Deferral leaves ${proj} as option value until economics beat existing assets.`,
    ];
  }

  if (includes(ctx.combined, ["fill-the-mill", "mill strategy", "excess mill", "satellite deposit"])) {
    return [
      `Satellite ore into ${proj ?? "Malartic"} mill adds ${prod ?? "~400–500 koz/yr"} with no new plant.`,
      `Shaft or grade delays revert story to base-mine depletion.`,
    ];
  }

  if (includes(ctx.combined, ["underground expansion approval", "underground expansion", "second shaft", "shaft commissioning"])) {
    return [
      `UG approval at ${proj ?? "Detour"} adds ${prod ?? "~300–350 koz/yr"} and extends mine life.`,
      `Capex overrun or slow shaft work erodes NAV uplift in models.`,
    ];
  }

  if (
    hasMiningContext(ctx.combined) &&
    includes(ctx.combined, ["development approval", "project approval"]) &&
    isProducer
  ) {
    return [
      `Approval funds ${proj} off existing camp infrastructure${prod ? ` (${prod})` : ""}.`,
      `Permit or contractor slippage pushes first ounces and guidance.`,
    ];
  }

  if (includes(ctx.combined, ["dfs", "definitive feasibility", "bankable feasibility"])) {
    const econ = [npv, aisc, prod].filter(Boolean).join("; ");
    return [
      `DFS on ${proj} locks mine economics${econ ? ` (${econ})` : ""} and enables financing.`,
      `Weak capex, recovery, or permits in DFS compress the multiple.`,
    ];
  }

  if (includes(ctx.combined, ["construction start", "construction commencement", "break ground"])) {
    return [
      `Start at ${proj} confirms lender/board sign-off; focus shifts to schedule and capex.`,
      `Delay after mobilization is dilution-negative vs a delayed study.`,
    ];
  }

  if (includes(ctx.combined, ["first production", "first gold", "commercial production", "commissioning"])) {
    return [
      `First pour at ${proj} proves build and metallurgy${prod ? ` (${prod})` : ""}.`,
      `Ramp miss hits near-term FCF and leverage.`,
    ];
  }

  if (
    hasMiningContext(ctx.combined) &&
    includes(ctx.combined, ["permit", "environmental assessment", "eis", "licence", "license"]) &&
    !includes(ctx.combined, ["fda", "clinical"])
  ) {
    return [
      `${proj} permit removes hard stop before construction/FID.`,
      `Appeals or conditions delay spend and can force a raise.`,
    ];
  }

  if (includes(ctx.combined, ["financing", "credit facility", "stream", "royalty", "project finance", "bond"])) {
    return [
      `Terms on ${proj} finance (rate, streams) flow to NAV/oz.`,
      `Failed or expensive package signals lender skepticism.`,
    ];
  }

  if (includes(ctx.combined, ["merger", "acquisition", "takeover", "bid"])) {
    return [
      `Deal reprices reserves, jurisdiction, and synergy credibility.`,
      `Break risk leaves shares between bid levels.`,
    ];
  }

  if (includes(ctx.combined, ["drill", "assay", "intercept", "step-out", "resource estimate", "reserve estimate"])) {
    return [
      `${proj} assays move tonnes/grade in NAV${prod ? ` (${prod})` : ""}; check true width and recovery.`,
      `Narrow holes = sentiment only unless resource step-change.`,
    ];
  }

  if (includes(ctx.combined, ["pfs", "pre-feasibility", "pea", "preliminary economic", "scoping"])) {
    return [
      `PFS/PEA on ${proj} frames capex and IRR pre-DFS${npv ? ` (${npv})` : ""}.`,
      `Aggressive price/capex assumptions stall partner interest.`,
    ];
  }

  if (includes(ctx.combined, ["guidance", "production outlook", "cost guidance", "aisc guidance"])) {
    return [
      `Guidance reset hits EPS/FCF${aisc ? ` (${aisc})` : ""}${prod ? ` on ${prod}` : ""}.`,
      `Miss hurts producers owned for yield more than explorers.`,
    ];
  }

  if (includes(ctx.combined, ["offtake", "mou", "marketing agreement", "smelter", "concentrate"])) {
    return [
      `Binding offtake on ${proj} improves bankability and revenue floor.`,
      `MOUs alone rarely re-rate without volume and payability.`,
    ];
  }

  if (includes(ctx.combined, ["study update", "optimization", "expansion", "mill expansion"])) {
    return [
      `${proj} expansion can add life and cut unit costs${prod ? ` (${prod})` : ""}.`,
      `Capex creep in study can wipe IRR gains.`,
    ];
  }

  if (
    includes(ctx.combined, [
      "exploration resource",
      "resource growth",
      "reserve replacement",
      "12–15moz",
      "12-15moz",
      "moz target",
    ])
  ) {
    return [
      `${prod ?? "12–15 Moz"} resource target supports 2030 output at ${issuer}.`,
      `Grade/tonnes matter more than headline intercept length.`,
    ];
  }

  if (includes(ctx.combined, ["exploration", "greenfield", "target generation", "regional program"])) {
    return [
      `Brownfield near mills beats remote greenfield for NAV impact.`,
      `Weak season rarely breaks thesis; slows momentum.`,
    ];
  }

  if (includes(ctx.combined, ["dividend", "buyback", "shareholder return", "capital return"])) {
    return [
      `Higher payout signals durable FCF at current prices.`,
      `Cut signals margin squeeze or growth capex crowding yield.`,
    ];
  }

  if (includes(ctx.combined, ["conference", "webcast", "investor day", "presentation", "site tour"])) {
    return ["Positioning and credibility; limited NAV impact alone."];
  }

  if (includes(ctx.combined, ["quarterly", "q1", "q2", "q3", "q4", "earnings", "results release"])) {
    return ["Watch vs guidance on output, costs, and net debt—not headline beat."];
  }

  if (category === "Major") {
    const detail = [prod, aisc, npv].filter(Boolean).join("; ");
    return [
      `Thesis-defining for ${issuer}${detail ? ` (${detail})` : ""}: win reprices NAV; loss cuts estimates.`,
      `Execution risk (permits, capex, metallurgy) as important as headline economics.`,
    ];
  }

  if (category === "Incremental") {
    return [`Process milestone; limited standalone NAV move.`];
  }

  return [
    `Near-term sentiment${prod ? ` (${prod})` : ""}${aisc ? `; ${aisc}` : ""}; needs reserve/permit/funding follow-through.`,
    `Binary: extends mine life/margins modestly, or fades if isolated.`,
  ].slice(0, 2);
}

export function buildCatalystImpactInsight(params: {
  impactText?: string | null;
  title?: string | null;
  description?: string | null;
  companyName?: string | null;
  companySymbol?: string | null;
}): CatalystImpactInsight | null {
  const title = (params.title ?? "").trim();
  const description = (params.description ?? "").trim();
  const impactText = (params.impactText ?? "").trim();
  if (!title && !description && !impactText) return null;

  const ctx: CatalystContext = {
    title: title || "Catalyst",
    description,
    impactText,
    combined: `${title} ${description} ${impactText}`.toLowerCase(),
    companyName: (params.companyName ?? "").trim(),
    companySymbol: (params.companySymbol ?? "").trim(),
  };

  const category = inferCategory(ctx);
  const bullets = buildBullets(ctx, category).map((b) => truncateBullet(b));
  return { category, bullets: bullets.slice(0, 2) };
}

/** Legacy single-string format for blur previews and search. */
export function formatImpactInsightPlain(insight: CatalystImpactInsight): string {
  return `${insight.category}: ${insight.bullets.join(" ")}`;
}
