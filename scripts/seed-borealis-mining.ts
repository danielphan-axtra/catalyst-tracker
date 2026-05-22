/**
 * Seeds Borealis Mining company profile, catalysts, and sample price history.
 * Run: npx tsx scripts/seed-borealis-mining.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BOREALIS = {
  symbol: "BOR",
  name: "Borealis Mining",
  description:
    "Borealis Mining is a U.S.-focused gold producer/developer with a heap-leach operating base and staged satellite zone growth.",
  website: "https://www.borealismining.com",
  industry: "Gold Mining",
  stockPrice: 2.15,
  price52WeekHigh: 2.86,
  price52WeekLow: 1.22,
  avgDailyVolume: 485000,
  marketCap: 197000000,
  balanceCash: 21000000,
  balanceDebt: 0,
  minorityInterest: 0,
  enterpriseValue: 176000000,
};

const CATALYSTS = [
  {
    title: "Updated Technical Report and Mine Plan",
    description:
      "Updated technical report detailing reserve conversion, mine sequencing, and revised annual production guidance for core Borealis operations.",
    dateStart: new Date("2026-06-01"),
    dateEnd: new Date("2026-08-31"),
    importance:
      "Very high impact. Updated reserve life and production profile are primary valuation drivers for intermediate gold producers.",
  },
  {
    title: "Satellite Zones Expansion Decision",
    description:
      "Board decision on phased expansion of nearby satellite zones and associated processing throughput optimization.",
    dateStart: new Date("2026-07-01"),
    dateEnd: new Date("2026-11-30"),
    importance:
      "High impact. Expansion timing determines medium-term production growth and capital intensity assumptions in NAV models.",
  },
  {
    title: "Quarterly Production and Cost Guidance Reset",
    description:
      "Quarterly operating update with ore grades, recovery, and all-in sustaining cost guidance revisions relative to plan.",
    dateStart: new Date("2026-05-01"),
    dateEnd: null,
    importance:
      "High impact. Variance versus production and cost guidance can quickly re-rate shares given operating leverage to gold prices.",
  },
  {
    title: "Exploration Drilling Results (Near-Mine)",
    description:
      "Results from near-mine drilling designed to add feed flexibility and extend mine life around existing infrastructure.",
    dateStart: new Date("2026-09-01"),
    dateEnd: new Date("2027-03-31"),
    importance:
      "Moderate-high impact. Resource growth near existing infrastructure can improve mine life visibility and capital efficiency.",
  },
  {
    title: "Financing and Capital Allocation Update",
    description:
      "Update on funding strategy for growth capex, debt profile, and potential shareholder return framework.",
    dateStart: new Date("2026-10-01"),
    dateEnd: new Date("2027-02-28"),
    importance:
      "Moderate impact. Funding structure and balance sheet discipline influence dilution risk and equity valuation support.",
  },
];

async function seedPricePoints(companyId: string, basePrice: number, baseVolume: number) {
  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const drift = (90 - i) / 90;
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.12 * drift);
    const volume = Math.max(10000, Math.floor(baseVolume * (0.5 + Math.random())));

    await prisma.pricePoint.upsert({
      where: {
        companyId_date: { companyId, date: d },
      },
      update: {
        price: Math.round(price * 100) / 100,
        volume,
      },
      create: {
        companyId,
        date: d,
        price: Math.round(price * 100) / 100,
        volume,
      },
    });
  }
}

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: BOREALIS.symbol },
    update: BOREALIS,
    create: BOREALIS,
  });

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

  await seedPricePoints(company.id, company.stockPrice ?? 2.15, company.avgDailyVolume ?? 485000);

  console.log(`Seeded Borealis Mining (${company.symbol}) with ${CATALYSTS.length} catalysts.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

