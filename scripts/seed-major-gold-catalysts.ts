import { PrismaClient } from "@prisma/client";
import { formatCatalystImpact } from "./lib/catalyst-seed-format";

const prisma = new PrismaClient();

function d(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

async function findCompanyBySymbols(symbols: string[]) {
  return prisma.company.findFirst({
    where: { symbol: { in: symbols } },
  });
}

async function main() {
  const mapping = [
    { key: "Perseus Mining", symbols: ["PRU", "PRU.TO", "PRU.AX"] },
    { key: "IAMGOLD", symbols: ["IAG.TO", "IAG"] },
    { key: "B2Gold", symbols: ["BTO.TO", "BTG", "BTO"] },
    { key: "AngloGold Ashanti", symbols: ["AU"] },
    { key: "Gold Fields", symbols: ["GFI"] },
    { key: "Resolute Mining", symbols: ["RSG", "RSG.L", "RSG.AX"] },
  ];

  const companies: Record<string, { id: string; symbol: string; name: string }> = {};
  for (const m of mapping) {
    const c = await findCompanyBySymbols(m.symbols);
    if (!c) {
      console.warn(`Skipping ${m.key}: company not found in DB (${m.symbols.join(", ")})`);
      continue;
    }
    companies[m.key] = { id: c.id, symbol: c.symbol, name: c.name };
  }

  const targetIds = Object.values(companies).map((c) => c.id);
  if (targetIds.length === 0) {
    console.log("No matching companies found; nothing to seed.");
    return;
  }

  await prisma.catalyst.deleteMany({ where: { companyId: { in: targetIds } } });

  const rows: Array<{
    companyKey: string;
    title: string;
    description: string;
    dateStart: Date | null;
    dateEnd: Date | null;
    importance: string;
  }> = [
    {
      companyKey: "Perseus Mining",
      title: "Mar 2026 quarter webinar",
      description: "Expected Q3 FY26 production, AISC, and cash-flow update.",
      dateStart: d("2026-04-30"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Validates FY26 guidance vs prior quarter cadence.",
        "Miss on costs or ounces pressures multiple.",
      ]),
    },
    {
      companyKey: "Perseus Mining",
      title: "Jun 2026 quarter webinar",
      description: "Expected June-quarter ops and outlook update.",
      dateStart: d("2026-07-28"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Mid-year check on production trajectory.",
        "Guidance revision can move medium-term NAV.",
      ]),
    },
    {
      companyKey: "Perseus Mining",
      title: "FY26 annual results",
      description: "Expected full-year results and capital-allocation update.",
      dateStart: d("2026-08-28"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Sets margin and FCF capacity for dividends/buybacks.",
        "Weak year-end costs weigh on rerating.",
      ]),
    },
    {
      companyKey: "IAMGOLD",
      title: "Q1 2026 earnings call",
      description: "Expected Q1 results: production, costs, Côte Gold contribution.",
      dateStart: d("2026-05-06"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Near-term EPS and production revision catalyst.",
        "Côte underperformance hits consolidated NAV.",
      ]),
    },
    {
      companyKey: "IAMGOLD",
      title: "Côte Gold ramp milestone",
      description: "Throughput and cost update on Côte ramp through H1 2026.",
      dateStart: d("2026-06-15"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "NAV highly sensitive to ramp reliability and AISC.",
        "Stable nameplate throughput unlocks FCF narrative.",
      ]),
    },
    {
      companyKey: "IAMGOLD",
      title: "Q2 2026 earnings call",
      description: "Expected H1 operating and financial update.",
      dateStart: d("2026-08-07"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Validates full-year guide and FCF conversion.",
        "Cost blowout at Côte or legacy assets pressures stock.",
      ]),
    },
    {
      companyKey: "B2Gold",
      title: "Q1 2026 results & guidance",
      description: "Quarterly ops: mine-level oz, AISC, and FY26 outlook.",
      dateStart: d("2026-05-06"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Primary near-term production and margin reset.",
        "Guide cut on Goose or Fekola hits growth multiple.",
      ]),
    },
    {
      companyKey: "B2Gold",
      title: "Goose mine 2026 ramp",
      description: "Commissioning vs ~250 koz 2026 target at Goose, Canada.",
      dateStart: d("2026-01-01"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Goose is central to 2026 growth and rerating.",
        "Ramp delays defer ounces and stretch capex.",
      ]),
    },
    {
      companyKey: "B2Gold",
      title: "Fekola Regional ramp",
      description: "Regional pits/feeder ore to lift Fekola output from 2026.",
      dateStart: d("2026-06-15"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Adds medium-term ounces and unit-cost leverage.",
        "Permit or sequencing slip limits uplift.",
      ]),
    },
    {
      companyKey: "AngloGold Ashanti",
      title: "Q1 2026 earnings release",
      description: "Official calendar Q1 2026 results date.",
      dateStart: d("2026-05-08"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Core earnings catalyst for guide and cash outlook.",
        "Cost or production miss vs peers pressures AU.",
      ]),
    },
    {
      companyKey: "AngloGold Ashanti",
      title: "Mining Forum Europe 2026",
      description: "Investor conference: asset quality and mine-plan messaging.",
      dateStart: d("2026-04-13"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Can shift narrative on growth and portfolio quality.",
        "Rarely changes numbers without new project data.",
      ]),
    },
    {
      companyKey: "AngloGold Ashanti",
      title: "Q2 2026 earnings release",
      description: "Expected H1 2026 results per reporting cadence.",
      dateStart: d("2026-08-10"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Mid-year validation of production and cost delivery.",
        "Weak H1 often triggers guide cuts into H2.",
      ]),
    },
    {
      companyKey: "Gold Fields",
      title: "H1 2026 results",
      description: "Expected interim results: production, costs, FCF.",
      dateStart: d("2026-08-21"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Sets confidence in FY26 guide and dividend capacity.",
        "South Deep or Salares Norte slip hits sentiment.",
      ]),
    },
    {
      companyKey: "Gold Fields",
      title: "Denver Gold conference update",
      description: "Expected H2 conference-cycle strategy and ops update.",
      dateStart: d("2026-09-15"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Refreshes project assumptions for sell-side models.",
        "Limited impact unless new capex/schedule disclosed.",
      ]),
    },
    {
      companyKey: "Gold Fields",
      title: "Capital markets day",
      description: "Expected strategic and capital-allocation update.",
      dateStart: d("2026-11-12"),
      dateEnd: null,
      importance: formatCatalystImpact("Major", [
        "Frames total-return and growth capex narrative.",
        "Disciplined allocation supports multiple; over-spend hurts.",
      ]),
    },
    {
      companyKey: "Resolute Mining",
      title: "Mar 2026 quarter report",
      description: "Expected quarterly activities and production update.",
      dateStart: d("2026-04-28"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Near-term ops checkpoint vs guidance.",
        "Syama or Mako miss moves stock tactically.",
      ]),
    },
    {
      companyKey: "Resolute Mining",
      title: "Jun 2026 quarter report",
      description: "Expected June-quarter ops; possible FY guide commentary.",
      dateStart: d("2026-07-29"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Assesses cost trend and execution momentum.",
        "Full-year guide change is the main equity driver.",
      ]),
    },
    {
      companyKey: "Resolute Mining",
      title: "H2 2026 investor presentation",
      description: "Expected corporate/conference update with refreshed messaging.",
      dateStart: d("2026-09-22"),
      dateEnd: null,
      importance: formatCatalystImpact("Medium", [
        "Outlook upgrade can rerate if delivery improves.",
        "Status-quo deck usually low impact.",
      ]),
    },
  ];

  let inserted = 0;
  for (const row of rows) {
    const company = companies[row.companyKey];
    if (!company) continue;
    await prisma.catalyst.create({
      data: {
        companyId: company.id,
        title: row.title,
        description: row.description,
        dateStart: row.dateStart,
        dateEnd: row.dateEnd,
        importance: row.importance,
      },
    });
    inserted += 1;
  }

  console.log(`Seeded ${inserted} catalysts across ${targetIds.length} companies.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
