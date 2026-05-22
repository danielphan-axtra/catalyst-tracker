/**
 * Populates the catalyst table for Endeavour Mining with manual example data.
 * Run: npx tsx scripts/seed-endeavour-catalysts.ts
 */

import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

const CATALYSTS = [
  {
    title: "Assafou DFS & development decision",
    description:
      "DFS and board decision for Assafou, Côte d'Ivoire (~329 koz/yr, ~$892/oz AISC, ~$2.5B NPV at $2,500 Au).",
    dateStart: new Date("2026-01-01"),
    dateEnd: new Date("2026-03-31"),
    importance: formatCatalystImpact("Major", [
      "Validates cornerstone mine on path to ~1.5 Moz by 2030.",
      "Weak economics or permits defer financing and re-rating.",
    ]),
  },
  {
    title: "Assafou construction start",
    description: "Construction start after DFS and permits (~2-year build).",
    dateStart: new Date("2026-07-01"),
    dateEnd: new Date("2026-12-31"),
    importance: formatCatalystImpact("Major", [
      "Confirms execution; shifts debate to schedule and capex control.",
      "Slip raises dilution risk after mobilization.",
    ]),
  },
  {
    title: "Exploration: 12–15 Moz resource target",
    description:
      "Brownfield/greenfield resource adds 2026–2030 (Sabodala-Massawa, Ity, Houndé, Assafou satellites).",
    dateStart: new Date("2026-01-01"),
    dateEnd: new Date("2030-12-31"),
    importance: formatCatalystImpact("Medium", [
      "Supports mine life beyond visible reserves.",
      "Miss widens gap vs peers with flat production.",
    ]),
  },
  {
    title: "Shareholder returns (~$1B program)",
    description:
      "Dividends/buybacks FY2026–28 if gold >~$3,000/oz and leverage stays low.",
    dateStart: new Date("2026-01-01"),
    dateEnd: new Date("2028-12-31"),
    importance: formatCatalystImpact("Medium", [
      "Yield supports multiple for income-focused holders.",
      "Cut implies FCF pressure or growth capex priority.",
    ]),
  },
  {
    title: "Assafou first production",
    description: "First gold ~2 years post construction start (~329 koz/yr decade one).",
    dateStart: new Date("2028-07-01"),
    dateEnd: new Date("2028-12-31"),
    importance: formatCatalystImpact("Major", [
      "Adds low-cost ounces toward 1.5 Moz group target.",
      "Ramp miss hits near-term FCF and leverage.",
    ]),
  },
];

async function main() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ symbol: "EDV" }, { name: { contains: "Endeavour" } }],
    },
  });

  if (!company) {
    console.error("Endeavour Mining (EDV) not found in database. Run the EODHD seed first or add the company.");
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
