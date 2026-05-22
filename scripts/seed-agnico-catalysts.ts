/**
 * Populates the catalyst table for Agnico Eagle with manual example data.
 * Run: npx tsx scripts/seed-agnico-catalysts.ts
 */

import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

const CATALYSTS = [
  {
    title: "Hope Bay redevelopment decision",
    description:
      "Internal study and board decision on redeveloping Hope Bay, Nunavut (~400–425 koz/yr potential).",
    dateStart: new Date("2026-05-01"),
    dateEnd: new Date("2026-05-31"),
    importance: formatCatalystImpact("Major", [
      "Adds ~400 koz/yr growth if capex and Arctic logistics are fundable.",
      "No-go keeps Hope Bay as option value only.",
    ]),
  },
  {
    title: "Canadian Malartic fill-the-mill update",
    description:
      "Progress filling excess mill capacity via Odyssey shaft and satellite deposits (~400–500 koz/yr).",
    dateStart: new Date("2026-07-01"),
    dateEnd: new Date("2027-12-31"),
    importance: formatCatalystImpact("Major", [
      "Uses sunk mill capacity—high-return ounces without a new plant.",
      "Delays on satellite ore shrink mine-life narrative.",
    ]),
  },
  {
    title: "Detour Lake underground expansion approval",
    description:
      "Board approval for UG expansion and mill work targeting +300–350 koz/yr (~1 Moz/yr complex).",
    dateStart: new Date("2027-01-01"),
    dateEnd: new Date("2027-12-31"),
    importance: formatCatalystImpact("Major", [
      "Largest Canadian gold mine—UG adds material NAV and life.",
      "Capex or schedule slip offsets production uplift.",
    ]),
  },
  {
    title: "Upper Beaver development approval",
    description:
      "Approval for ~200–220 koz/yr UG mine plus copper by-product at Kirkland Lake camp.",
    dateStart: new Date("2027-01-01"),
    dateEnd: new Date("2027-12-31"),
    importance: formatCatalystImpact("Medium", [
      "Feeds regional mills; smaller than Detour/Hope Bay but strategic.",
      "Slip pushes first ounces and camp sequencing.",
    ]),
  },
  {
    title: "Operating-mine exploration & optimization",
    description:
      "Reserve replacement and mill tweaks at LaRonde, Macassa, Meliadine, Detour.",
    dateStart: new Date("2026-01-01"),
    dateEnd: new Date("2028-12-31"),
    importance: formatCatalystImpact("Medium", [
      "Brownfield ounces extend life at low incremental capex.",
      "Isolated misses rarely move consolidated NAV.",
    ]),
  },
];

async function main() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { symbol: "AEM" },
        { symbol: "AEM.TO" },
        { name: { contains: "Agnico" } },
      ],
    },
  });

  if (!company) {
    console.error("Agnico Eagle (AEM) not found in database. Make sure it exists from the EODHD seed.");
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
