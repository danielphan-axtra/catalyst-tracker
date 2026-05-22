import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companies = [
    {
      symbol: "EXM",
      name: "Excellon Resources Inc.",
      description:
        "Excellon is focused on advancing precious metals projects in Mexico and Canada, with an emphasis on silver and associated metals.",
      industry: "Silver Mining",
      stockPrice: 0.24,
      price52WeekHigh: 0.42,
      price52WeekLow: 0.15,
      avgDailyVolume: 125000,
      marketCap: 28_000_000,
      balanceCash: 3_500_000,
      balanceDebt: 0,
      minorityInterest: 0,
      enterpriseValue: 24_500_000,
    },
    {
      symbol: "NGD",
      name: "New Gold Inc.",
      description:
        "New Gold is an intermediate gold mining company with a portfolio of producing and development assets in Canada and Australia.",
      industry: "Gold Mining",
      stockPrice: 2.15,
      price52WeekHigh: 2.89,
      price52WeekLow: 1.42,
      avgDailyVolume: 1_200_000,
      marketCap: 1_450_000_000,
      balanceCash: 180_000_000,
      balanceDebt: 450_000_000,
      minorityInterest: 0,
      enterpriseValue: 1_720_000_000,
    },
    {
      symbol: "NCU",
      name: "Nevada Copper Corp.",
      description:
        "Nevada Copper owns the Pumpkin Hollow project in Nevada, a copper development with significant scale and infrastructure.",
      industry: "Copper Mining",
      stockPrice: 0.08,
      price52WeekHigh: 0.22,
      price52WeekLow: 0.04,
      avgDailyVolume: 800_000,
      marketCap: 85_000_000,
      balanceCash: 12_000_000,
      balanceDebt: 180_000_000,
      minorityInterest: 0,
      enterpriseValue: 253_000_000,
    },
    {
      symbol: "FPX",
      name: "FPX Nickel Corp.",
      description:
        "FPX Nickel is developing the Baptiste nickel project in British Columbia, a large-scale, low-cost nickel deposit.",
      industry: "Nickel Mining",
      stockPrice: 0.35,
      price52WeekHigh: 0.58,
      price52WeekLow: 0.22,
      avgDailyVolume: 340_000,
      marketCap: 120_000_000,
      balanceCash: 18_000_000,
      balanceDebt: 0,
      minorityInterest: 0,
      enterpriseValue: 102_000_000,
    },
    {
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
  ];

  for (const c of companies) {
    const company = await prisma.company.upsert({
      where: { symbol: c.symbol },
      update: {},
      create: c,
    });

    const baseDate = new Date();
    for (let i = 89; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() - i);
      const price = (company.stockPrice ?? 0.2) * (1 + (Math.random() - 0.5) * 0.02 * (90 - i) / 90);
      await prisma.pricePoint.upsert({
        where: {
          companyId_date: { companyId: company.id, date: d },
        },
        update: {},
        create: {
          companyId: company.id,
          date: d,
          price: Math.round(price * 100) / 100,
          volume: Math.floor(Math.random() * 500000) + 50000,
        },
      });
    }
  }

  const exm = await prisma.company.findUnique({ where: { symbol: "EXM" } });
  const ngd = await prisma.company.findUnique({ where: { symbol: "NGD" } });
  const ncu = await prisma.company.findUnique({ where: { symbol: "NCU" } });
  const fpx = await prisma.company.findUnique({ where: { symbol: "FPX" } });
  const idex = await prisma.company.findUnique({ where: { symbol: "IDEX.V" } });

  await prisma.catalyst.deleteMany({
    where: { companyId: { in: [exm!.id, ngd!.id, ncu!.id, fpx!.id, idex!.id] } },
  });

  const catalystData = [
    {
      companyId: exm!.id,
      title: "Drill Results",
      description: "Phase 2 drill results from the Platosa mine expansion program, targeting high-grade silver zones.",
      dateStart: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      dateEnd: null,
      importance: "High impact: strong results could re-rate the stock 30–50% given current low valuation and leverage to silver.",
    },
    {
      companyId: exm!.id,
      title: "Quarterly Results",
      description: "Q1 production and financial results, including cash position and guidance update.",
      dateStart: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      dateEnd: null,
      importance: "Moderate: in line with guidance is neutral; beat could support 10–15% upside.",
    },
    {
      companyId: ngd!.id,
      title: "Feasibility Study Completion",
      description: "Updated feasibility study for the Rainy River expansion, including revised capex and production profile.",
      dateStart: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      importance: "Very high: a positive study could drive 20–40% re-rating; any cost overruns would pressure the share price.",
    },
    {
      companyId: ncu!.id,
      title: "Financing Update",
      description: "Update on project financing and partnership discussions for Pumpkin Hollow development.",
      dateStart: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dateEnd: null,
      importance: "Critical: securing funding is essential for the project; success could double the share price, delay could lead to significant dilution or restructuring.",
    },
    {
      companyId: fpx!.id,
      title: "PFS / Resource Update",
      description: "Pre-feasibility study and updated resource estimate for the Baptiste nickel project.",
      dateStart: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      dateEnd: null,
      importance: "High: a robust PFS could establish Baptiste as a tier-1 development asset and support 40–60% upside in a strong nickel environment.",
    },
    {
      companyId: idex!.id,
      title: "Freeze project — drill / assay news flow",
      description:
        "Exploration and drilling updates from the Freeze copper-gold porphyry prospect in Washington and Adams counties, Idaho.",
      dateStart: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 140 * 24 * 60 * 60 * 1000),
      importance:
        "High for a single-asset explorer: strong copper-gold intercepts could re-rate the stock sharply; weak or narrow zones may pressure sentiment.",
    },
    {
      companyId: idex!.id,
      title: "Amie — silver-gold field season",
      description:
        "Surface work, targeting, and potential drill planning on the Amie silver-gold epithermal prospect in Owyhee County.",
      dateStart: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
      importance:
        "Moderate to high: new high-grade silver-gold hits could attract attention; delays are common in seasonal field programs.",
    },
    {
      companyId: idex!.id,
      title: "Quarterly financials & MD&A",
      description:
        "Interim financial statements, liquidity, and exploration spend outlook (typical catalyst for treasury runway narrative).",
      dateStart: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      dateEnd: null,
      importance:
        "Moderate: cash runway vs. burn drives financing risk; in-line reports are often neutral unless guidance changes materially.",
    },
    {
      companyId: idex!.id,
      title: "Corporate / financing update",
      description:
        "Potential equity or strategic financing to fund multi-project exploration across the Idaho portfolio.",
      dateStart: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      dateEnd: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      importance:
        "Critical for pre-revenue explorers: structure and pricing of any financing can dilute or support the story; strategic capital could be a positive re-rating event.",
    },
  ];

  for (const c of catalystData) {
    await prisma.catalyst.create({ data: c });
  }

  console.log("Seed complete: companies, price history, and catalysts created.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
