import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const companies: Array<{
    symbol: string;
    name: string;
    industry: string;
    website: string;
    description: string;
  }> = [
    {
      symbol: "PRU",
      name: "Perseus Mining Limited",
      industry: "Gold",
      website: "https://www.perseusmining.com",
      description: "Perseus Mining is a multi-mine West African gold producer with operations in Ghana, Cote d'Ivoire, and Sudan.",
    },
    {
      symbol: "IAG.TO",
      name: "IAMGOLD Corporation",
      industry: "Gold",
      website: "https://www.iamgold.com",
      description: "IAMGOLD is a Canadian intermediate gold producer focused on operating mines and growth projects in the Americas and West Africa.",
    },
    {
      symbol: "BTO.TO",
      name: "B2Gold Corp.",
      industry: "Gold",
      website: "https://www.b2gold.com",
      description: "B2Gold is an international senior gold producer with operating mines and development assets across multiple jurisdictions.",
    },
    {
      symbol: "AU",
      name: "AngloGold Ashanti plc",
      industry: "Gold",
      website: "https://www.anglogoldashanti.com",
      description: "AngloGold Ashanti is a global gold mining company with a diversified portfolio of operations, projects, and exploration activities.",
    },
    {
      symbol: "GFI",
      name: "Gold Fields Limited",
      industry: "Gold",
      website: "https://www.goldfields.com",
      description: "Gold Fields is a globally diversified gold producer with operations and projects in Africa, Australia, and the Americas.",
    },
    {
      symbol: "RSG",
      name: "Resolute Mining Limited",
      industry: "Gold",
      website: "https://www.rml.com.au",
      description: "Resolute Mining is an African-focused gold miner with producing operations and an active growth pipeline.",
    },
    {
      symbol: "SVM.AX",
      name: "Sovereign Metals Limited",
      industry: "Critical Minerals",
      website: "https://sovereignmetals.com.au/",
      description:
        "Sovereign Metals is developing the Kasiya Rutile-Graphite Project in Malawi, targeting large-scale, low-cost supply of natural rutile and flake graphite.",
    },
  ];

  for (const c of companies) {
    const company = await prisma.company.upsert({
      where: { symbol: c.symbol },
      update: {
        name: c.name,
        industry: c.industry,
        website: c.website,
        description: c.description,
      },
      create: {
        symbol: c.symbol,
        name: c.name,
        industry: c.industry,
        website: c.website,
        description: c.description,
      },
    });
    console.log(`Upserted ${company.symbol} - ${company.name}`);
  }
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

