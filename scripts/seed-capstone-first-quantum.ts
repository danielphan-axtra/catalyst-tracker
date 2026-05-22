/**
 * Seeds Capstone Copper and First Quantum Minerals with profile, catalysts, and sample price history.
 * Run: npx tsx scripts/seed-capstone-first-quantum.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COMPANIES = [
  {
    symbol: "CS",
    name: "Capstone Copper Corp.",
    description:
      "Capstone Copper is a copper-focused miner with operating assets in the Americas and a visible brownfield growth pipeline.",
    website: "https://capstonecopper.com",
    industry: "Copper Mining",
    stockPrice: 9.4,
    price52WeekHigh: 11.2,
    price52WeekLow: 6.4,
    avgDailyVolume: 1900000,
    marketCap: 7600000000,
    balanceCash: 640000000,
    balanceDebt: 1450000000,
    minorityInterest: 0,
    enterpriseValue: 8410000000,
  },
  {
    symbol: "FM",
    name: "First Quantum Minerals Ltd.",
    description:
      "First Quantum Minerals is a diversified global copper producer with large-scale operating mines and development options.",
    website: "https://www.first-quantum.com",
    industry: "Copper Mining",
    stockPrice: 18.6,
    price52WeekHigh: 22.7,
    price52WeekLow: 13.1,
    avgDailyVolume: 3200000,
    marketCap: 15500000000,
    balanceCash: 1330000000,
    balanceDebt: 6200000000,
    minorityInterest: 0,
    enterpriseValue: 20370000000,
  },
];

const CATALYSTS_BY_SYMBOL: Record<
  string,
  Array<{
    title: string;
    description: string;
    dateStart: Date;
    dateEnd: Date | null;
    importance: string;
  }>
> = {
  CS: [
    {
      title: "Mantoverde-Santo Domingo integration update",
      description:
        "Operational and engineering update on district integration timelines, throughput ramp, and blended cost profile.",
      dateStart: new Date("2026-05-01"),
      dateEnd: new Date("2026-09-30"),
      importance:
        "Very high impact. Integration success is a core driver of medium-term copper growth and unit cost improvement assumptions.",
    },
    {
      title: "Quarterly production and cost guidance update",
      description:
        "Quarterly release covering copper production, unit costs, and variance versus annual guidance across key assets.",
      dateStart: new Date("2026-04-15"),
      dateEnd: null,
      importance:
        "High impact. Guidance delivery and cost trajectory are key near-term valuation drivers for copper producers.",
    },
    {
      title: "Project capital allocation update",
      description:
        "Management update on sustaining and growth capex prioritization across Chile and Mexico operations.",
      dateStart: new Date("2026-07-01"),
      dateEnd: new Date("2026-11-30"),
      importance:
        "Moderate-high impact. Capital discipline affects free cash flow conversion and leverage trajectory.",
    },
    {
      title: "Reserve and resource update",
      description:
        "Annual reserve/resource update focused on copper inventory, mine life, and conversion at district assets.",
      dateStart: new Date("2026-11-01"),
      dateEnd: new Date("2027-03-31"),
      importance:
        "High impact. Reserve growth and mine-life extension support long-term NAV and growth confidence.",
    },
    {
      title: "Exploration and debottlenecking results",
      description:
        "Operating site updates on exploration additions and debottlenecking initiatives affecting near-term throughput.",
      dateStart: new Date("2026-08-01"),
      dateEnd: new Date("2027-02-28"),
      importance:
        "Moderate impact. Incremental throughput and grade improvements can enhance near-term copper output and margins.",
    },
  ],
  FM: [
    {
      title: "Kansanshi S3 and Sentinel operating update",
      description:
        "Update on ramp-up, recoveries, and throughput consistency across core Zambian operations and expansion circuits.",
      dateStart: new Date("2026-05-01"),
      dateEnd: new Date("2026-10-31"),
      importance:
        "Very high impact. Execution at large Zambian assets is central to production growth and margin normalization.",
    },
    {
      title: "Quarterly production and cost guidance update",
      description:
        "Quarterly operational release with copper production, cash cost, and sustaining cost performance versus plan.",
      dateStart: new Date("2026-04-15"),
      dateEnd: null,
      importance:
        "High impact. Meeting production and cost guidance is critical for debt paydown and valuation re-rating.",
    },
    {
      title: "Balance sheet and debt management update",
      description:
        "Management commentary on refinancing, debt reduction pacing, and liquidity management priorities.",
      dateStart: new Date("2026-06-01"),
      dateEnd: new Date("2026-12-31"),
      importance:
        "High impact. Leverage trajectory remains a major driver of equity risk premium and investor positioning.",
    },
    {
      title: "Zambia fiscal and regulatory developments",
      description:
        "Potential policy updates impacting royalties, taxation, or operating frameworks in Zambia.",
      dateStart: new Date("2026-07-01"),
      dateEnd: new Date("2027-03-31"),
      importance:
        "Moderate-high impact. Fiscal/regulatory changes can materially affect project economics and long-term value.",
    },
    {
      title: "Annual reserve and mine plan update",
      description:
        "Updated reserves, mine life assumptions, and development sequencing across operating and growth assets.",
      dateStart: new Date("2026-11-01"),
      dateEnd: new Date("2027-03-31"),
      importance:
        "High impact. Reserve quality and mine-plan visibility are key inputs to long-dated copper NAV assumptions.",
    },
  ],
};

async function seedPricePoints(companyId: string, basePrice: number, baseVolume: number) {
  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const drift = (90 - i) / 90;
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.1 * drift);
    const volume = Math.max(10000, Math.floor(baseVolume * (0.55 + Math.random())));

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
  for (const c of COMPANIES) {
    const company = await prisma.company.upsert({
      where: { symbol: c.symbol },
      update: c,
      create: c,
    });

    await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

    const catalysts = CATALYSTS_BY_SYMBOL[c.symbol] ?? [];
    for (const catalyst of catalysts) {
      await prisma.catalyst.create({
        data: {
          companyId: company.id,
          title: catalyst.title,
          description: catalyst.description,
          dateStart: catalyst.dateStart,
          dateEnd: catalyst.dateEnd,
          importance: catalyst.importance,
        },
      });
    }

    await seedPricePoints(company.id, company.stockPrice ?? c.stockPrice, company.avgDailyVolume ?? c.avgDailyVolume);

    console.log(`Seeded ${company.name} (${company.symbol}) with ${catalysts.length} catalysts.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });

