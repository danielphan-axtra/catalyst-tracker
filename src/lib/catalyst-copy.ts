import type { ImpactCategory } from "@/lib/impact";

const MAX_BULLET_LEN = 120;
const MAX_DETAIL_LEN = 500;

export function truncateBullet(text: string, max = MAX_BULLET_LEN): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Store impact for DB: category line + up to two concise bullets. */
export function formatCatalystImpact(
  category: ImpactCategory,
  bullets: string[],
  details: string[] = [],
): string {
  const lines = [
    category,
    ...bullets.slice(0, 2).map((b) => `• ${truncateBullet(b)}`),
  ];
  if (details.length > 0) {
    lines.push("Details:");
    lines.push(...details.slice(0, 4).map((d) => `» ${truncateBullet(d, MAX_DETAIL_LEN)}`));
  }
  return lines.join("\n");
}

export function parseCatalystDetailLines(impactText: string | null | undefined): string[] {
  const text = (impactText ?? "").trim();
  if (!text) return [];
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("» "))
    .map((line) => line.replace(/^»\s+/, "").trim())
    .filter(Boolean);
}
