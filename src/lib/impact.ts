import { Prisma } from "@prisma/client";
import {
  buildCatalystImpactInsight,
  formatImpactInsightPlain,
} from "@/lib/catalyst-impact-analysis";

export type ImpactCategory = "Major" | "Medium" | "Incremental";

const MAJOR_KEYWORDS = ["major", "high", "transformational", "step-change", "significant"];
const MEDIUM_KEYWORDS = ["medium", "moderate", "material"];
const INCREMENTAL_KEYWORDS = ["incremental", "low", "minor"];

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function normalizeImpactCategory(value: string | null | undefined): ImpactCategory | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const firstLine = normalized.split(/\n/)[0]?.trim() ?? normalized;
  if (/^(major|high)\s*[:.]?\s*$/.test(firstLine)) return "Major";
  if (/^(medium|moderate)\s*[:.]?\s*$/.test(firstLine)) return "Medium";
  if (/^(incremental|low|minor)\s*[:.]?\s*$/.test(firstLine)) return "Incremental";

  if (/very high|transformational|step-change|thesis-defining|cornerstone asset/.test(normalized)) {
    return "Major";
  }
  if (/moderate[\s–-]*high|medium[\s–-]*high|moderate impact|medium impact|steady\b/.test(normalized)) {
    return "Medium";
  }
  if (/incremental|minor impact|low impact/.test(normalized)) return "Incremental";
  if (/\bhigh impact\b/.test(normalized) && !/moderate|medium/.test(normalized)) return "Major";

  if (includesAny(normalized, INCREMENTAL_KEYWORDS)) return "Incremental";
  if (includesAny(normalized, MEDIUM_KEYWORDS)) return "Medium";
  if (includesAny(normalized, ["major", "transformational", "step-change"])) return "Major";
  if (includesAny(normalized, ["high"])) return "Major";
  return null;
}

export function impactSortRank(category: ImpactCategory | null | undefined): number {
  if (category === "Major") return 3;
  if (category === "Medium") return 2;
  if (category === "Incremental") return 1;
  return 0;
}

export function normalizeImpactDescription(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;
  const category = normalizeImpactCategory(text);
  if (!category) return text;

  const withoutPrefix = text
    .replace(/^(major|high|medium|moderate|incremental|low|minor)\s*[:\-–]\s*/i, "")
    .trim();
  return withoutPrefix ? `${category}: ${withoutPrefix}` : category;
}

export function getImpactNarrative(params: {
  impactText: string | null | undefined;
  title?: string | null;
  description?: string | null;
  companyName?: string | null;
  companySymbol?: string | null;
}): string | null {
  const insight = buildCatalystImpactInsight(params);
  if (insight) return formatImpactInsightPlain(insight);

  const { impactText, title, description } = params;
  if (!impactText?.trim()) return null;
  const text = impactText.trim();
  const category = normalizeImpactCategory(text);
  if (!category) return text;
  const withoutPrefix = text
    .replace(/^(major|high|medium|moderate|incremental|low|minor)\s*[:\-–]\s*/i, "")
    .trim();
  if (withoutPrefix && withoutPrefix.toLowerCase() !== category.toLowerCase()) {
    return `${category}: ${withoutPrefix}`;
  }
  return category;
}

export function getImpactCategoryWhere(category: ImpactCategory): Prisma.CatalystWhereInput {
  const keywords =
    category === "Major"
      ? MAJOR_KEYWORDS
      : category === "Medium"
        ? MEDIUM_KEYWORDS
        : INCREMENTAL_KEYWORDS;

  return {
    OR: keywords.map((keyword) => ({
      importance: { contains: keyword, mode: "insensitive" },
    })),
  };
}
