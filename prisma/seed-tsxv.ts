/**
 * Seeds the database with TSXV companies from scripts/tsxv-companies.json.
 * Run: npm run fetch-tsxv  then  npm run db:seed-tsxv
 * To replace the entire list first: npm run db:seed-tsxv -- --replace
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const REPLACE_LIST = process.argv.includes("--replace");

async function main() {
  const jsonPath = path.join(process.cwd(), "scripts", "tsxv-companies.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("Run first: npm run fetch-tsxv");
    process.exit(1);
  }
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const companies: { name: string; symbol: string; marketCap: number | null; subsector?: string; industry?: string }[] =
    JSON.parse(raw);

  if (REPLACE_LIST) {
    const deleted = await prisma.company.deleteMany({});
    console.log("Replace mode: deleted", deleted.count, "existing companies.");
  }

  console.log(`Seeding ${companies.length} TSXV mining companies...`);
  let created = 0;
  let updated = 0;
  for (const c of companies) {
    // Support both old (subsector) and new (industry) field names
    const industry = c.industry ?? c.subsector ?? "Mining";
    const existing = await prisma.company.findUnique({ where: { symbol: c.symbol } });
    await prisma.company.upsert({
      where: { symbol: c.symbol },
      update: {
        name: c.name,
        industry,
        marketCap: c.marketCap ?? undefined,
      },
      create: {
        symbol: c.symbol,
        name: c.name,
        industry,
        marketCap: c.marketCap ?? undefined,
        description: null,
      },
    });
    if (existing) updated++;
    else created++;
  }
  console.log(`Done: ${created} created, ${updated} updated.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
