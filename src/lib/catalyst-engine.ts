import { startOfDay } from "date-fns";
import type { Catalyst } from "@prisma/client";
import { formatCatalystImpact } from "@/lib/catalyst-copy";
import type {
  CatalystAnalysisPayload,
  CatalystAnalysisSection,
  CatalystSeedInput,
  ResolvedCatalystView,
} from "@/lib/catalyst-analysis-types";

export type { CatalystAnalysisPayload, CatalystAnalysisSection, CatalystSeedInput };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfTodayUtc(): Date {
  return startOfDay(new Date());
}

/** Catalyst is upcoming if its window end (or start) is today or later. */
export function isUpcomingCatalyst(
  catalyst: Pick<Catalyst, "dateStart" | "dateEnd">,
  today: Date = startOfTodayUtc(),
): boolean {
  const start = catalyst.dateStart ? startOfDay(new Date(catalyst.dateStart)) : null;
  const end = catalyst.dateEnd ? startOfDay(new Date(catalyst.dateEnd)) : start;
  if (!start && !end) return false;
  const windowEnd = end ?? start!;
  return windowEnd.getTime() >= today.getTime();
}

export function filterUpcomingCatalysts<T extends Catalyst>(catalysts: T[], today?: Date): T[] {
  const t = today ?? startOfTodayUtc();
  return catalysts.filter((c) => isUpcomingCatalyst(c, t));
}

export function assertFutureCatalystWindow(input: {
  dateStart: Date;
  dateEnd?: Date | null;
  title?: string;
}): { dateStart: Date; dateEnd: Date | null } {
  const today = startOfTodayUtc();
  const start = startOfDay(input.dateStart);
  const endRaw = input.dateEnd ? startOfDay(input.dateEnd) : null;

  if (start.getTime() < today.getTime()) {
    const label = input.title ? ` (${input.title})` : "";
    throw new Error(
      `Catalyst dateStart${label} must be today or later; got ${start.toISOString().slice(0, 10)}`,
    );
  }

  if (endRaw && endRaw.getTime() < today.getTime()) {
    const label = input.title ? ` (${input.title})` : "";
    throw new Error(
      `Catalyst dateEnd${label} must be today or later; got ${endRaw.toISOString().slice(0, 10)}`,
    );
  }

  if (endRaw && endRaw.getTime() < start.getTime()) {
    throw new Error(`Catalyst dateEnd must be on or after dateStart for "${input.title ?? "catalyst"}"`);
  }

  return { dateStart: input.dateStart, dateEnd: input.dateEnd ?? null };
}

export function serializeCatalystAnalysis(payload: CatalystAnalysisPayload): string {
  return JSON.stringify({ ...payload, version: 1 as const });
}

export function parseCatalystAnalysis(
  analysisJson: string | null | undefined,
): CatalystAnalysisPayload | null {
  if (!analysisJson?.trim()) return null;
  try {
    const raw = JSON.parse(analysisJson) as CatalystAnalysisPayload;
    if (!raw || raw.version !== 1 || !Array.isArray(raw.sections)) return null;
    return raw;
  } catch {
    return null;
  }
}

/** Build Prisma-ready catalyst row with validated future dates and rich analysis JSON. */
export function buildCatalystRecord(
  companyId: string,
  input: CatalystSeedInput,
): {
  companyId: string;
  title: string;
  description: string;
  dateStart: Date;
  dateEnd: Date | null;
  importance: string;
  analysisJson: string;
} {
  const dates = assertFutureCatalystWindow({
    dateStart: input.dateStart,
    dateEnd: input.dateEnd,
    title: input.title,
  });

  const legacyDetails: string[] = [];
  if (input.analysis.companyContext) {
    legacyDetails.push(input.analysis.companyContext);
  }
  for (const section of input.analysis.sections) {
    if (section.paragraphs?.[0]) legacyDetails.push(section.paragraphs[0]);
    else if (section.bullets?.[0]) legacyDetails.push(section.bullets[0]);
  }
  if (input.analysis.bullCase) legacyDetails.push(`Bull: ${input.analysis.bullCase}`);
  if (input.analysis.bearCase) legacyDetails.push(`Bear: ${input.analysis.bearCase}`);

  return {
    companyId,
    title: input.title,
    description: input.summary,
    dateStart: dates.dateStart,
    dateEnd: dates.dateEnd,
    importance: formatCatalystImpact(input.impactCategory, input.impactBullets, legacyDetails.slice(0, 4)),
    analysisJson: serializeCatalystAnalysis(input.analysis),
  };
}

function fallbackAnalysisFromCatalyst(catalyst: Catalyst): CatalystAnalysisPayload {
  const sections: CatalystAnalysisSection[] = [];

  if (catalyst.description?.trim()) {
    sections.push({
      title: "Summary",
      paragraphs: [catalyst.description.trim()],
    });
  }

  const legacyDetails = (catalyst.importance ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("» "))
    .map((l) => l.replace(/^»\s+/, ""));

  if (legacyDetails.length > 0) {
    sections.push({
      title: "Investor analysis",
      bullets: legacyDetails,
    });
  }

  if (sections.length === 0) {
    sections.push({
      title: "Details",
      paragraphs: ["Detailed analysis for this catalyst is being updated."],
    });
  }

  return { version: 1, sections };
}

export function resolveCatalystView(catalyst: Catalyst): ResolvedCatalystView {
  const parsed = parseCatalystAnalysis(
    (catalyst as Catalyst & { analysisJson?: string | null }).analysisJson,
  );
  const analysis = parsed ?? fallbackAnalysisFromCatalyst(catalyst);

  return {
    summary: catalyst.description,
    impactText: catalyst.importance ?? "",
    analysis,
    hasRichAnalysis: parsed !== null,
  };
}

/** Shift a date forward by whole months (for repair scripts only). */
export function addMonthsToDate(isoOrDate: Date, months: number): Date {
  const d = new Date(isoOrDate);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

export function daysFromToday(days: number): Date {
  const d = startOfTodayUtc();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
