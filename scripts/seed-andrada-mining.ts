/**
 * Upsert Andrada Mining (AIM: ATM.L) with catalysts, price history, and full mining page profile.
 * Run: npx tsx scripts/seed-andrada-mining.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

const ANDRADA = {
  symbol: "ATM.L",
  name: "Andrada Mining Limited",
  description:
    "Andrada Mining is a tin, tantalum, and lithium producer at the Uis Mine in Namibia — redeveloping one of the world's largest hard-rock tin mines with polymetallic pegmatite upside and a lithium integration project.",
  website: "https://andradamining.com/",
  industry: "Tin & Critical Minerals Mining",
  stockPrice: 0.085,
  price52WeekHigh: 0.14,
  price52WeekLow: 0.045,
  avgDailyVolume: 1_850_000,
  marketCap: 28_000_000,
  balanceCash: 4_200_000,
  balanceDebt: 1_500_000,
  minorityInterest: 0,
  enterpriseValue: 25_300_000,
};

async function seedPricePoints(companyId: string, basePrice: number, baseVolume: number) {
  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const drift = (90 - i) / 90;
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.18 * drift);
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId, date: d } },
      update: {},
      create: {
        companyId,
        date: d,
        price: Math.max(0.01, Math.round(price * 1000) / 1000),
        volume: Math.max(50_000, Math.floor(baseVolume * (0.4 + Math.random()))),
      },
    });
  }
}

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: ANDRADA.symbol },
    update: ANDRADA,
    create: ANDRADA,
  });

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const catalysts = [
    {
      companyId: company.id,
      title: "Uis jig plant ramp",
      description: "Commissioning and tin output from new modular jig plant at Uis.",
      dateStart: new Date("2025-09-01"),
      dateEnd: new Date("2026-06-30"),
      importance: formatCatalystImpact("Major", [
        "Jig plant targets >100% tin output boost on proximal ore.",
        "Delay keeps growth tied to legacy circuit throughput only.",
      ]),
    },
    {
      companyId: company.id,
      title: "FY2026 results & production update",
      description: "Annual results: contained tin, costs, cash, and FY2027 guidance.",
      dateStart: new Date("2026-07-01"),
      dateEnd: new Date("2026-07-31"),
      importance: formatCatalystImpact("Major", [
        "FY2026 delivered ~1,036 t Sn — guide sets rerating bar.",
        "Cost miss vs LME tin price compresses FCF multiple.",
      ]),
    },
    {
      companyId: company.id,
      title: "Uis lithium feasibility (EIB)",
      description: "EIB-supported feasibility on petalite integration at Uis concentrator.",
      dateStart: new Date("2026-01-01"),
      dateEnd: new Date("2027-06-30"),
      importance: formatCatalystImpact("Major", [
        "Non-dilutive EU funding de-risks Li circuit study.",
        "Slippage leaves equity story tin-only until DFS.",
      ]),
    },
    {
      companyId: company.id,
      title: "V1/V2 / licence resource update",
      description: "JORC update on V1/V2 and regional pegmatites (135 Mt licence target).",
      dateStart: new Date("2026-03-01"),
      dateEnd: new Date("2026-12-31"),
      importance: formatCatalystImpact("Medium", [
        "Higher Sn or Li tonnes move EV/lb on polymetallic inventory.",
        "In-line update rarely moves stock without reserve conversion.",
      ]),
    },
    {
      companyId: company.id,
      title: "Brandberg West drill results",
      description: "Exploration on high-grade tin–tungsten–copper targets, Erongo.",
      dateStart: new Date("2026-04-01"),
      dateEnd: new Date("2027-03-31"),
      importance: formatCatalystImpact("Medium", [
        "High-grade hits add pipeline beyond Uis.",
        "Remote greenfield — limited NAV impact near-term.",
      ]),
    },
    {
      companyId: company.id,
      title: "Growth capex / financing",
      description: "Funding for lithium circuit and tin throughput expansion beyond FCF.",
      dateStart: new Date("2026-09-01"),
      dateEnd: new Date("2027-09-30"),
      importance: formatCatalystImpact("Major", [
        "Terms on next raise matter with jig + Li capex ahead.",
        "Constructive package supports 2.5× tin growth narrative.",
      ]),
    },
  ];

  for (const row of catalysts) {
    await prisma.catalyst.create({ data: row });
  }

  await seedPricePoints(company.id, company.stockPrice ?? 0.085, company.avgDailyVolume ?? 1_850_000);

  console.log("Andrada Mining seeded:", company.id, "→ /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
