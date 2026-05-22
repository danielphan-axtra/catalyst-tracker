/**
 * Upsert Pacific Ridge Exploration (TSXV: PEX) with sample catalysts and price history.
 * Run: npx tsx scripts/seed-pacific-ridge.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: "PEX.V" },
    update: {
      name: "Pacific Ridge Exploration Ltd.",
      description:
        "Pacific Ridge Exploration is a Canadian exploration company focused on district-scale copper-gold projects in British Columbia, including Kliyul, RDP, and Chuchi.",
      website: "https://www.pacificridgeexploration.com/",
      industry: "Copper-Gold Exploration",
      stockPrice: 0.15,
      price52WeekHigh: 0.31,
      price52WeekLow: 0.08,
      avgDailyVolume: 210_000,
      marketCap: 15_400_000,
      balanceCash: 2_194_173,
      balanceDebt: 0,
      minorityInterest: 0,
      enterpriseValue: 13_200_000,
    },
    create: {
      symbol: "PEX.V",
      name: "Pacific Ridge Exploration Ltd.",
      description:
        "Pacific Ridge Exploration is a Canadian exploration company focused on district-scale copper-gold projects in British Columbia, including Kliyul, RDP, and Chuchi.",
      website: "https://www.pacificridgeexploration.com/",
      industry: "Copper-Gold Exploration",
      stockPrice: 0.15,
      price52WeekHigh: 0.31,
      price52WeekLow: 0.08,
      avgDailyVolume: 210_000,
      marketCap: 15_400_000,
      balanceCash: 2_194_173,
      balanceDebt: 0,
      minorityInterest: 0,
      enterpriseValue: 13_200_000,
    },
  });

  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const price = (company.stockPrice ?? 0.15) * (1 + (Math.random() - 0.5) * 0.03 * ((90 - i) / 90));
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId: company.id, date: d } },
      update: {},
      create: {
        companyId: company.id,
        date: d,
        price: Math.round(price * 100) / 100,
        volume: Math.floor(Math.random() * 350_000) + 40_000,
      },
    });
  }

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const catalysts = [
    {
      companyId: company.id,
      title: "Kliyul drill program start",
      description: "Mobilization and drilling at Kliyul Cu-Au porphyry, BC.",
      dateStart: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      importance: formatCatalystImpact("Major", [
        "Visible meterage supports sentiment pre-assays.",
        "Operational delay weighs on momentum.",
      ]),
    },
    {
      companyId: company.id,
      title: "Kliyul assay results",
      description: "Initial and follow-up assays from current season.",
      dateStart: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      importance: formatCatalystImpact("Major", [
        "Grade × width drives discovery re-rating.",
        "Weak continuity pressures valuation.",
      ]),
    },
    {
      companyId: company.id,
      title: "RDP / Chuchi exploration update",
      description: "Geophysics, mapping, and drill prioritization on secondary BC assets.",
      dateStart: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Pipeline depth; Kliyul still drives primary value.",
        "Positive update adds optionality only.",
      ]),
    },
    {
      companyId: company.id,
      title: "Quarterly financials & treasury",
      description: "Interim FS and MD&A: cash ~C$2.2M, burn outlook.",
      dateStart: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "~C$0.43M/mo burn—sets timing of next raise.",
        "In-line quarter usually neutral.",
      ]),
    },
    {
      companyId: company.id,
      title: "Follow-on financing",
      description: "Equity raise to fund Kliyul/RDP beyond current treasury.",
      dateStart: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
      importance: formatCatalystImpact("Major", [
        "With ~C$2.2M cash, pricing/timing of raise moves the stock.",
        "Hard terms signal weak sponsor demand.",
      ]),
    },
  ];

  for (const row of catalysts) {
    await prisma.catalyst.create({ data: row });
  }

  console.log("Pacific Ridge seeded:", company.id, "-> /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
