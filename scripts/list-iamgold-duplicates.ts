import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.company.findMany({
    where: {
      OR: [
        { name: { contains: "IAMGOLD" } },
        { name: { contains: "Iamgold" } },
        { symbol: { contains: "IAG" } },
      ],
    },
    select: {
      id: true,
      symbol: true,
      name: true,
      marketCap: true,
      balanceCash: true,
      balanceDebt: true,
      industry: true,
      updatedAt: true,
      _count: { select: { catalysts: true, pricePoints: true } },
    },
    orderBy: { name: "asc" },
  });
  console.log(JSON.stringify(rows, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
