/**
 * Rewrites Catalyst.importance with Major/Medium/Incremental + expert bullet insights.
 * Run: npx tsx scripts/enrich-catalyst-impacts.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  buildCatalystImpactInsight,
  formatImpactInsightPlain,
  hasStructuredCatalystImpact,
} from "../src/lib/catalyst-impact-analysis";

const prisma = new PrismaClient();

function formatForDb(insight: NonNullable<ReturnType<typeof buildCatalystImpactInsight>>): string {
  const lines = [insight.category, ...insight.bullets.map((b) => `• ${b}`)];
  return lines.join("\n");
}

async function main() {
  const miningOnly = process.argv.includes("--all") ? false : true;

  const catalysts = await prisma.catalyst.findMany({
    where: miningOnly
      ? {
          company: {
            OR: [
              { industry: { contains: "gold", mode: "insensitive" } },
              { industry: { contains: "mining", mode: "insensitive" } },
              { industry: { contains: "metal", mode: "insensitive" } },
              { name: { contains: "Mining", mode: "insensitive" } },
              { name: { contains: "Gold", mode: "insensitive" } },
              { symbol: { in: ["AEM", "AEM.TO", "EDV", "EDV.TO", "HBM", "HBM.TO", "SVM", "SVM.AX"] } },
            ],
          },
        }
      : undefined,
    include: { company: { select: { name: true, symbol: true, industry: true } } },
  });

  let updated = 0;
  let skipped = 0;
  for (const c of catalysts) {
    if (hasStructuredCatalystImpact(c.importance)) {
      skipped++;
      continue;
    }
    const insight = buildCatalystImpactInsight({
      impactText: c.importance,
      title: c.title,
      description: c.description,
      companyName: c.company.name,
      companySymbol: c.company.symbol,
    });
    if (!insight) continue;

    const next = formatForDb(insight);
    if (next === c.importance?.trim()) continue;

    await prisma.catalyst.update({
      where: { id: c.id },
      data: { importance: next },
    });
    updated++;
    console.log(`[${c.company.symbol}] ${c.title}`);
    console.log(formatImpactInsightPlain(insight));
    console.log("---");
  }

  console.log(`Updated ${updated}, skipped ${skipped} (already formatted) of ${catalysts.length} catalysts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
