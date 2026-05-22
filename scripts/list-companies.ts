import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: {
      symbol: true,
      name: true,
      industry: true,
      balanceCash: true,
      balanceDebt: true,
      marketCap: true,
      enterpriseValue: true,
    },
    orderBy: { name: "asc" },
  });
  fs.writeFileSync("scripts/companies-snapshot.json", JSON.stringify(companies, null, 2));
  console.log(`Wrote ${companies.length} companies`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
