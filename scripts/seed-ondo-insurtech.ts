/**
 * Upsert Ondo InsurTech (LSE: ONDO) with catalysts, price history, and operating-company page profile.
 * Run: npx tsx scripts/seed-ondo-insurtech.ts
 */
import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: "ONDO.L" },
    update: {
      name: "Ondo InsurTech Plc",
      description:
        "Ondo InsurTech is a UK-listed insurtech company providing LeakBot, a connected-home water leak detection and claims-prevention platform deployed with insurers in the UK, Nordics, and United States.",
      website: "https://www.ondoplc.com/",
      industry: "Insurtech",
      stockPrice: 0.15,
      price52WeekHigh: 0.28,
      price52WeekLow: 0.08,
      avgDailyVolume: 850_000,
      marketCap: 22_000_000,
      balanceCash: 4_000_000,
      balanceDebt: 1_260_000,
      minorityInterest: 0,
      enterpriseValue: 19_260_000,
      peRatio: null,
      dividendYield: 0,
    },
    create: {
      symbol: "ONDO.L",
      name: "Ondo InsurTech Plc",
      description:
        "Ondo InsurTech is a UK-listed insurtech company providing LeakBot, a connected-home water leak detection and claims-prevention platform deployed with insurers in the UK, Nordics, and United States.",
      website: "https://www.ondoplc.com/",
      industry: "Insurtech",
      stockPrice: 0.15,
      price52WeekHigh: 0.28,
      price52WeekLow: 0.08,
      avgDailyVolume: 850_000,
      marketCap: 22_000_000,
      balanceCash: 4_000_000,
      balanceDebt: 1_260_000,
      minorityInterest: 0,
      enterpriseValue: 19_260_000,
      peRatio: null,
      dividendYield: 0,
    },
  });

  const baseDate = new Date();
  const basePrice = company.stockPrice ?? 0.15;
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.04 * ((90 - i) / 90));
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId: company.id, date: d } },
      update: {},
      create: {
        companyId: company.id,
        date: d,
        price: Math.round(price * 1000) / 1000,
        volume: Math.floor(Math.random() * 1_200_000) + 100_000,
      },
    });
  }

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const catalysts = [
    {
      companyId: company.id,
      title: "FY2025 results & ARR update",
      description: "FY to 31 Mar 2025: revenue, contracted ARR, cash; US rollout outlook.",
      dateStart: new Date("2025-07-01"),
      dateEnd: new Date("2025-07-31"),
      importance: formatCatalystImpact("Major", [
        "£5.9M contracted ARR and £4.0M cash set funding narrative.",
        "US attach beat re-rates; guide cut raises dilution risk.",
      ]),
    },
    {
      companyId: company.id,
      title: "US insurer rollout milestones",
      description: "US partner deploy pace: attach rates, installs, claims metrics.",
      dateStart: new Date("2025-09-01"),
      dateEnd: new Date("2026-06-30"),
      importance: formatCatalystImpact("Major", [
        "~58% revenue US-weighted—faster rollouts lift year-2 margins.",
        "Slippage extends losses and pressures warrant/equity needs.",
      ]),
    },
    {
      companyId: company.id,
      title: "UK & Nordics partner expansions",
      description: "New insurer integrations and household penetration in Europe.",
      dateStart: new Date("2025-10-01"),
      dateEnd: new Date("2026-12-31"),
      importance: formatCatalystImpact("Medium", [
        "Diversifies vs US execution risk.",
        "Incremental EU wins rarely move stock without US acceleration.",
      ]),
    },
    {
      companyId: company.id,
      title: "LeakBot manufacturing capacity",
      description: "UK factory batches: component supply, timing, unit cost vs deploy schedule.",
      dateStart: new Date("2025-11-01"),
      dateEnd: new Date("2026-08-31"),
      importance: formatCatalystImpact("Medium", [
        "Hardware bottlenecks delay revenue recognition.",
        "Cost spikes hit GM while year-one US units are dilutive.",
      ]),
    },
    {
      companyId: company.id,
      title: "Warrant exercise / equity raise",
      description: "Warrant liquidity or supplemental equity ahead of breakeven.",
      dateStart: new Date("2026-01-01"),
      dateEnd: new Date("2026-09-30"),
      importance: formatCatalystImpact("Major", [
        "£6.2M FY25 PBT loss—capital access is critical.",
        "Warrant uptake extends runway; discounted raise dilutes LSE holders.",
      ]),
    },
    {
      companyId: company.id,
      title: "HomeServe debt repayment",
      description: "Paydown of HomeServe-related debt (£1.26M post year-end) and legacy simplification.",
      dateStart: new Date("2025-08-01"),
      dateEnd: new Date("2026-03-31"),
      importance: formatCatalystImpact("Medium", [
        "Lower debt service improves net burn.",
        "Failure to clear legacy liabilities keeps financing overhang.",
      ]),
    },
  ];

  for (const row of catalysts) {
    await prisma.catalyst.create({ data: row });
  }

  console.log("Ondo InsurTech seeded:", company.id, "→ /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
