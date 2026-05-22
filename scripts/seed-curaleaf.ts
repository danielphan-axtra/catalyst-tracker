/**
 * Upsert Curaleaf Holdings (CURA) with catalysts, price history, and cannabis page profile.
 * Run: npx tsx scripts/seed-curaleaf.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: "CURA" },
    update: {
      name: "Curaleaf Holdings, Inc.",
      description:
        "Curaleaf is one of the largest multi-state cannabis operators in the United States, with retail, wholesale, and branded product operations across numerous state markets.",
      website: "https://www.curaleaf.com/",
      industry: "Cannabis",
      stockPrice: 4.85,
      price52WeekHigh: 6.2,
      price52WeekLow: 2.95,
      avgDailyVolume: 3_200_000,
      marketCap: 3_350_000_000,
      balanceCash: 129_000_000,
      balanceDebt: 1_850_000_000,
      minorityInterest: 0,
      enterpriseValue: 5_070_000_000,
      peRatio: null,
      dividendYield: 0,
    },
    create: {
      symbol: "CURA",
      name: "Curaleaf Holdings, Inc.",
      description:
        "Curaleaf is one of the largest multi-state cannabis operators in the United States, with retail, wholesale, and branded product operations across numerous state markets.",
      website: "https://www.curaleaf.com/",
      industry: "Cannabis",
      stockPrice: 4.85,
      price52WeekHigh: 6.2,
      price52WeekLow: 2.95,
      avgDailyVolume: 3_200_000,
      marketCap: 3_350_000_000,
      balanceCash: 129_000_000,
      balanceDebt: 1_850_000_000,
      minorityInterest: 0,
      enterpriseValue: 5_070_000_000,
      peRatio: null,
      dividendYield: 0,
    },
  });

  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const price = (company.stockPrice ?? 4.85) * (1 + (Math.random() - 0.5) * 0.015 * ((90 - i) / 90));
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId: company.id, date: d } },
      update: {},
      create: {
        companyId: company.id,
        date: d,
        price: Math.round(price * 100) / 100,
        volume: Math.floor(Math.random() * 4_000_000) + 500_000,
      },
    });
  }

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const catalysts = [
    {
      companyId: company.id,
      title: "Q2 2025 earnings & guidance",
      description: "Revenue, adj. EBITDA, OCF, and 2025 outlook for core U.S. markets.",
      dateStart: new Date("2025-08-01"),
      dateEnd: new Date("2025-08-31"),
      importance: formatCatalystImpact("Major", [
        "EBITDA/FCF guidance sets the MSO multiple.",
        "Margin beat vs guide re-rates; cuts signal prolonged price war.",
      ]),
    },
    {
      companyId: company.id,
      title: "Florida adult-use path",
      description: "Legislative or ballot steps toward adult-use in Florida.",
      dateStart: new Date("2026-01-01"),
      dateEnd: new Date("2026-12-31"),
      importance: formatCatalystImpact("Major", [
        "Adult-use unlocks TAM on existing FL footprint.",
        "Delays leave growth tied to medical pricing only.",
      ]),
    },
    {
      companyId: company.id,
      title: "New York wholesale & retail ramp",
      description: "NY cultivation, wholesale partners, and store openings.",
      dateStart: new Date("2025-06-01"),
      dateEnd: new Date("2026-06-30"),
      importance: formatCatalystImpact("Medium", [
        "Store/wholesale pace shifts revenue mix.",
        "NY taxes and competition cap early margins.",
      ]),
    },
    {
      companyId: company.id,
      title: "Europe divestiture / capital recycling",
      description: "Exit or sale of European ops to fund U.S. core or debt paydown.",
      dateStart: new Date("2025-09-01"),
      dateEnd: new Date("2026-03-31"),
      importance: formatCatalystImpact("Medium", [
        "Proceeds improve focus and liquidity.",
        "Slippage extends integration cost and balance-sheet drag.",
      ]),
    },
    {
      companyId: company.id,
      title: "Debt refinance / maturity management",
      description: "Refi, exchange, or paydown of near/medium-term notes.",
      dateStart: new Date("2025-10-01"),
      dateEnd: new Date("2026-09-30"),
      importance: formatCatalystImpact("Major", [
        "~$1.8B+ debt—refi terms are central to equity value.",
        "Cheap extension vs dilutive raise drives rerating.",
      ]),
    },
    {
      companyId: company.id,
      title: "State license tuck-in M&A",
      description: "Bolt-on licenses in priority states where returns clear hurdles.",
      dateStart: new Date("2026-02-01"),
      dateEnd: new Date("2026-12-31"),
      importance: formatCatalystImpact("Medium", [
        "Accretive tuck-ins add EBITDA without greenfield risk.",
        "Overpaying for licenses in crowded states destroys value.",
      ]),
    },
  ];

  for (const row of catalysts) {
    await prisma.catalyst.create({ data: row });
  }

  console.log("Curaleaf seeded:", company.id, "→ /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
