/**
 * Populates the catalyst table for Hudbay Minerals with manual example data.
 * Run: npx tsx scripts/seed-hudbay-catalysts.ts
 */

import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

const CATALYSTS = [
  {
    title: "Constancia operating update",
    description:
      "Throughput, grade, recovery, and unit-cost update at flagship Peru copper mine.",
    dateStart: new Date("2026-05-01"),
    dateEnd: new Date("2026-08-31"),
    importance: formatCatalystImpact("Major", [
      "Constancia drives group FCF—miss cuts copper EPS and multiple.",
      "Beat supports dividend and Copper World funding capacity.",
    ]),
  },
  {
    title: "Copper World permitting & development",
    description: "Arizona Copper World permits, engineering, and timeline visibility.",
    dateStart: new Date("2026-06-01"),
    dateEnd: new Date("2027-12-31"),
    importance: formatCatalystImpact("Major", [
      "De-risks medium-term copper growth in NAV.",
      "Permit delay compresses long-dated valuation.",
    ]),
  },
  {
    title: "Snow Lake operations update",
    description: "Mine sequencing, mill reliability, and output at Snow Lake.",
    dateStart: new Date("2026-07-01"),
    dateEnd: new Date("2027-06-30"),
    importance: formatCatalystImpact("Medium", [
      "Supports confidence in consolidated guidance.",
      "Weak quarter is secondary to Constancia but hurts sentiment.",
    ]),
  },
  {
    title: "Annual reserves & resources",
    description: "Group reserve/resource statement—mine life and grade trends.",
    dateStart: new Date("2026-12-01"),
    dateEnd: new Date("2027-03-31"),
    importance: formatCatalystImpact("Medium", [
      "Reserve replacement moves long-term NAV/oz.",
      "Net depletion without replacement pressures multiple.",
    ]),
  },
  {
    title: "Capital allocation update",
    description: "Growth capex pacing, funding mix, and balance-sheet priorities.",
    dateStart: new Date("2026-09-01"),
    dateEnd: new Date("2027-03-31"),
    importance: formatCatalystImpact("Medium", [
      "Signals dilution vs debt risk for Copper World.",
      "Disciplined plan supports re-rating.",
    ]),
  },
];

async function main() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ symbol: "HBM" }, { symbol: "HBM.TO" }, { name: { contains: "Hudbay" } }],
    },
  });

  if (!company) {
    console.error("Hudbay Minerals (HBM) not found in database. Add the company first.");
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
