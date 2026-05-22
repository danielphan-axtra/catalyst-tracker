/**
 * Populates upcoming catalysts for Sovereign Metals (SVM.AX).
 * Run: npx tsx scripts/seed-sovereign-catalysts.ts
 */

import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

const CATALYSTS = [
  {
    title: "Kasiya project financing",
    description: "Debt/equity syndication after DFS for Kasiya rutile-graphite project.",
    dateStart: new Date("2026-07-01"),
    dateEnd: new Date("2026-12-31"),
    importance: formatCatalystImpact("Major", [
      "Cost of capital and dilution set equity value pre-FID.",
      "Failed syndication stalls development.",
    ]),
  },
  {
    title: "Rutile & graphite offtake (MOU → binding)",
    description: "Convert MOUs to binding rutile/graphite offtake for Kasiya.",
    dateStart: new Date("2026-06-01"),
    dateEnd: new Date("2027-03-31"),
    importance: formatCatalystImpact("Medium", [
      "Binding volume/pricing improves bankability.",
      "Non-binding MOUs alone do not re-rate.",
    ]),
  },
  {
    title: "Malawi environmental & permits",
    description: "Environmental and social permits required before full construction.",
    dateStart: new Date("2026-05-01"),
    dateEnd: new Date("2027-06-30"),
    importance: formatCatalystImpact("Major", [
      "Permit is critical path to first production.",
      "Delay shifts NPV and financing timeline.",
    ]),
  },
  {
    title: "Final investment decision (FID)",
    description: "Board FID after finance, permits, and offtake maturity.",
    dateStart: new Date("2027-01-01"),
    dateEnd: new Date("2027-12-31"),
    importance: formatCatalystImpact("Major", [
      "Transitions story from study to execution—major re-rating event.",
      "FID slip keeps stock in derisking limbo.",
    ]),
  },
  {
    title: "EPC awards & construction ramp",
    description: "Major EPC contracts and site works post-FID.",
    dateStart: new Date("2027-07-01"),
    dateEnd: new Date("2028-12-31"),
    importance: formatCatalystImpact("Medium", [
      "Contract sums and early schedule set capex credibility.",
      "Overruns here hit IRR and equity.",
    ]),
  },
  {
    title: "Commissioning & first product",
    description: "Commissioning updates as plants approach first rutile/graphite output.",
    dateStart: new Date("2028-07-01"),
    dateEnd: new Date("2029-12-31"),
    importance: formatCatalystImpact("Medium", [
      "Final step before commercial cash flow.",
      "Ramp issues delay revenue recognition.",
    ]),
  },
];

async function main() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { symbol: "SVM.AX" },
        { symbol: "SVML" },
        { symbol: "SVMLF" },
        { name: { contains: "Sovereign Metals" } },
      ],
    },
  });

  if (!company) {
    console.error("Sovereign Metals not found in database. Run scripts/add-major-gold-companies.ts first.");
    process.exit(1);
  }

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  for (const c of CATALYSTS) {
    await prisma.catalyst.create({
      data: {
        companyId: company.id,
        title: c.title,
        description: c.description,
        dateStart: c.dateStart,
        dateEnd: c.dateEnd,
        importance: c.importance,
      },
    });
  }

  console.log(`Seeded ${CATALYSTS.length} catalysts for ${company.name} (${company.symbol}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
