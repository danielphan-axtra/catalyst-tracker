import {
  buildCatalystImpactInsight,
  type CatalystImpactInsight,
} from "@/lib/catalyst-impact-analysis";

export function impactCategoryTagClass(category: CatalystImpactInsight["category"]): string {
  switch (category) {
    case "Major":
      return "bg-red-100 text-red-800";
    case "Medium":
      return "bg-amber-100 text-amber-800";
    case "Incremental":
      return "bg-sky-100 text-sky-800";
  }
}

export function CatalystImpactInsightView({
  impactText,
  title,
  description,
  companyName,
  companySymbol,
}: {
  impactText?: string | null;
  title?: string | null;
  description?: string | null;
  companyName?: string | null;
  companySymbol?: string | null;
}) {
  const insight = buildCatalystImpactInsight({
    impactText,
    title,
    description,
    companyName,
    companySymbol,
  });

  if (!insight) return null;

  return (
    <div className="space-y-2">
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${impactCategoryTagClass(insight.category)}`}
      >
        {insight.category}
      </span>
      <ul className="list-disc space-y-1.5 pl-4 text-sm leading-snug text-neutral-800">
        {insight.bullets.map((bullet) => (
          <li key={bullet.slice(0, 48)}>{bullet}</li>
        ))}
      </ul>
    </div>
  );
}
