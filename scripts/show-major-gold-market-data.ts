import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.company.findMany({
    where: { symbol: { in: ["PRU", "IAG.TO", "BTO.TO", "AU", "GFI", "RSG"] } },
    select: {
      symbol: true,
      stockPrice: true,
      marketCap: true,
      balanceCash: true,
      balanceDebt: true,
      enterpriseValue: true,
      peRatio: true,
      dividendYield: true,
      price52WeekHigh: true,
      price52WeekLow: true,
      avgDailyVolume: true,
    },
    orderBy: { symbol: "asc" },
  });
  console.log(JSON.stringify(rows, null, 2));
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

