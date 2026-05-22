/**
 * Upsert IDEX Metals (TSXV: IDEX) with sample catalysts and price history.
 * Run: npx tsx scripts/seed-idex-metals.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

async function main() {
  const idex = await prisma.company.upsert({
    where: { symbol: "IDEX.V" },
    update: {
      name: "IDEX Metals Corp.",
      description:
        "IDEX Metals is a mineral exploration company focused on precious and base metals in Idaho, United States, including the Freeze copper-gold porphyry prospect, Amie silver-gold, and other district-scale land positions.",
      website: "https://www.idexmetals.com/",
      industry: "Precious & Base Metals Exploration",
      stockPrice: 0.45,
      price52WeekHigh: 1.49,
      price52WeekLow: 0.36,
      avgDailyVolume: 125_000,
      marketCap: 24_000_000,
      balanceCash: 5_000_000,
      balanceDebt: 0,
      minorityInterest: 0,
      enterpriseValue: 19_000_000,
    },
    create: {
      symbol: "IDEX.V",
      name: "IDEX Metals Corp.",
      description:
        "IDEX Metals is a mineral exploration company focused on precious and base metals in Idaho, United States, including the Freeze copper-gold porphyry prospect, Amie silver-gold, and other district-scale land positions.",
      website: "https://www.idexmetals.com/",
      industry: "Precious & Base Metals Exploration",
      stockPrice: 0.45,
      price52WeekHigh: 1.49,
      price52WeekLow: 0.36,
      avgDailyVolume: 125_000,
      marketCap: 24_000_000,
      balanceCash: 5_000_000,
      balanceDebt: 0,
      minorityInterest: 0,
      enterpriseValue: 19_000_000,
    },
  });

  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const price = (idex.stockPrice ?? 0.45) * (1 + (Math.random() - 0.5) * 0.02 * ((90 - i) / 90));
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId: idex.id, date: d } },
      update: {},
      create: {
        companyId: idex.id,
        date: d,
        price: Math.round(price * 100) / 100,
        volume: Math.floor(Math.random() * 500_000) + 50_000,
      },
    });
  }

  await prisma.catalyst.deleteMany({ where: { companyId: idex.id } });

  const catalystRows = [
    {
      companyId: idex.id,
      title: "Freeze drill & assay news",
      description: "Drill/assay flow from Freeze copper-gold porphyry, Idaho.",
      dateStart: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 140 * 24 * 60 * 60 * 1000),
      importance: formatCatalystImpact("Major", [
        "Strong Cu-Au intercepts can re-rate single-asset explorer.",
        "Weak/narrow zones fade quickly.",
      ]),
    },
    {
      companyId: idex.id,
      title: "Amie silver-gold field season",
      description: "Targeting and drilling at Amie epithermal prospect, Owyhee County.",
      dateStart: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      importance: formatCatalystImpact("Medium", [
        "High-grade Ag-Au hits attract attention.",
        "Seasonal delays are common—limited NAV impact alone.",
      ]),
    },
    {
      companyId: idex.id,
      title: "Quarterly financials & MD&A",
      description: "Interim FS: cash, burn, and exploration budget.",
      dateStart: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Treasury vs ~C$0.29M/mo burn sets financing timing.",
        "In-line quarter usually neutral.",
      ]),
    },
    {
      companyId: idex.id,
      title: "Equity or strategic financing",
      description: "Potential raise to fund Idaho exploration portfolio.",
      dateStart: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      importance: formatCatalystImpact("Major", [
        "Pricing/structure can dilute or extend runway materially.",
        "Strategic capital could re-rate if tied to Freeze.",
      ]),
    },
  ];

  for (const row of catalystRows) {
    await prisma.catalyst.create({ data: row });
  }

  console.log("IDEX Metals seeded:", idex.id, "→ /companies/" + idex.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
