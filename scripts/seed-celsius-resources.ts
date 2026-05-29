/**
 * Upsert Celsius Resources (ASX: CLA) — MCB copper-gold developer with full mining page profile.
 * Run: npx tsx scripts/seed-celsius-resources.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

const CELSIUS = {
  symbol: "CLA.AX",
  name: "Celsius Resources Limited",
  description:
    "Celsius Resources is developing the flagship MCB copper-gold project in the Philippines (40% working interest) — maiden DFS completed Jan 2026 with 130.2 Mt reserves, first production targeted 2028, plus Sagay and Botilao exploration assets and Namibia Opuwo divestment.",
  website: "https://celsiusresources.com/",
  industry: "Copper-Gold Development",
  stockPrice: 0.008,
  price52WeekHigh: 0.016,
  price52WeekLow: 0.004,
  avgDailyVolume: 12_500_000,
  marketCap: 35_000_000,
  balanceCash: 2_100_000,
  balanceDebt: 8_500_000,
  minorityInterest: 0,
  enterpriseValue: 41_400_000,
};

async function seedPricePoints(companyId: string, basePrice: number, baseVolume: number) {
  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const drift = (90 - i) / 90;
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.25 * drift);
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId, date: d } },
      update: {},
      create: {
        companyId,
        date: d,
        price: Math.max(0.001, Math.round(price * 1000) / 1000),
        volume: Math.max(100_000, Math.floor(baseVolume * (0.3 + Math.random()))),
      },
    });
  }
}

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: CELSIUS.symbol },
    update: CELSIUS,
    create: CELSIUS,
  });

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const catalysts = [
    {
      companyId: company.id,
      title: "MCB FID & project financing",
      description: "Final investment decision and structured funding for MCB (Grant Samuel process).",
      dateStart: new Date("2026-04-01"),
      dateEnd: new Date("2026-12-31"),
      importance: formatCatalystImpact("Major", [
        "FID unlocks US$276M capex and 2028 first production.",
        "Delay or adverse MMCI outcome stalls construction timeline.",
      ]),
    },
    {
      companyId: company.id,
      title: "MMCI arbitration / governance",
      description: "Emergency arbitration with Sodor/PMR over MMCI control and offtake.",
      dateStart: new Date("2026-01-01"),
      dateEnd: new Date("2026-09-30"),
      importance: formatCatalystImpact("Major", [
        "40% WI worthless if Celsius loses project control.",
        "Resolution clears path for financing and early works.",
      ]),
    },
    {
      companyId: company.id,
      title: "Opuwo (Namibia) sale completion",
      description: "Binding SPA for Opuwo cobalt-copper — proceeds to fund MCB.",
      dateStart: new Date("2026-03-01"),
      dateEnd: new Date("2026-06-30"),
      importance: formatCatalystImpact("Major", [
        "Non-dilutive MCB funding if sale closes on terms.",
        "Slippage extends reliance on bridge debt and equity.",
      ]),
    },
    {
      companyId: company.id,
      title: "MCB early works construction",
      description: "Site establishment and underground development post-FID.",
      dateStart: new Date("2026-07-01"),
      dateEnd: new Date("2028-06-30"),
      importance: formatCatalystImpact("Major", [
        "On-schedule works support 2028 first Cu-Au.",
        "Contractor or permit slip pushes first cash flow.",
      ]),
    },
    {
      companyId: company.id,
      title: "Copper-gold offtake agreements",
      description: "Binding offtake / concentrate sales tied to project finance.",
      dateStart: new Date("2026-02-01"),
      dateEnd: new Date("2026-08-31"),
      importance: formatCatalystImpact("Medium", [
        "Bankable offtake underpins DFS economics.",
        "Weak terms vs $4.30/lb Cu deck compress IRR.",
      ]),
    },
    {
      companyId: company.id,
      title: "Sagay / Botilao exploration",
      description: "Regional Philippines drilling and resource growth.",
      dateStart: new Date("2026-04-01"),
      dateEnd: new Date("2027-12-31"),
      importance: formatCatalystImpact("Medium", [
        "312 Mt Sagay resource adds pipeline optionality.",
        "MCB remains primary equity driver near-term.",
      ]),
    },
    {
      companyId: company.id,
      title: "Quarterly activities & cash",
      description: "ASX quarterly: exploration spend, bridge loan, group cash.",
      dateStart: new Date("2026-05-01"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "~A$2.1M cash — burn rate sets dilution timing.",
        "Fourth bridge drawdown signals financing progress.",
      ]),
    },
  ];

  for (const row of catalysts) {
    await prisma.catalyst.create({ data: row });
  }

  await seedPricePoints(company.id, company.stockPrice ?? 0.008, company.avgDailyVolume ?? 12_500_000);

  console.log("Celsius Resources seeded:", company.id, "→ /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
