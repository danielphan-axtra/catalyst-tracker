import type { ImpactCategory } from "@/lib/impact";

const MAX_BULLET_LEN = 120;

export function truncateBullet(text: string, max = MAX_BULLET_LEN): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

/** Store impact for DB: category line + up to two concise bullets. */
export function formatCatalystImpact(
  category: ImpactCategory,
  bullets: string[],
): string {
  const lines = [
    category,
    ...bullets.slice(0, 2).map((b) => `• ${truncateBullet(b)}`),
  ];
  return lines.join("\n");
}
