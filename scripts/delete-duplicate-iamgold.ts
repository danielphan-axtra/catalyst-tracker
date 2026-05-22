/**
 * Removes stale IAMGOLD duplicate (legacy IMG symbol). Keeps IAG.TO record.
 * Run: npx tsx scripts/delete-duplicate-iamgold.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const KEEP_SYMBOL = "IAG.TO";
const DELETE_SYMBOLS = ["IMG"];

async function main() {
  const keep = await prisma.company.findUnique({ where: { symbol: KEEP_SYMBOL } });
  if (!keep) {
    console.error(`Keep record ${KEEP_SYMBOL} not found. Run db:seed-idex or refresh market data first.`);
    process.exit(1);
  }

  for (const sym of DELETE_SYMBOLS) {
    const dup = await prisma.company.findUnique({ where: { symbol: sym } });
    if (!dup) {
      console.log(`No duplicate found for symbol ${sym}`);
      continue;
    }
    await prisma.company.delete({ where: { id: dup.id } });
    console.log(`Deleted duplicate: ${dup.name} (${dup.symbol}) id=${dup.id}`);
  }

  console.log(`Kept: ${keep.name} (${keep.symbol}) id=${keep.id} -> /companies/${keep.id}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
