import { PrismaClient } from "@prisma/client";
import { getMiningCompanyProfile } from "../src/lib/mining-company-config";
import { getMineralInventory } from "../src/lib/mineral-inventory-registry";
import { hasCashRunwaySection } from "../src/lib/cash-runway-registry";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ orderBy: { symbol: "asc" } });
  console.log("symbol | DCF | Endeavour | Agnico | Runway | Mineral");
  for (const c of companies) {
    const p = getMiningCompanyProfile(c.symbol, c.name, c.industry);
    const inv = getMineralInventory(c.symbol, c.name);
    const rw = hasCashRunwaySection(c.symbol, c.name, c.industry, c.balanceCash);
    const flags = [
      p.showProducingDcf ? "DCF" : "",
      p.showEndeavourDcf ? "EDV" : "",
      p.showAgnicoDcf ? "AEM" : "",
      rw ? "RW" : "",
      inv ? "R&R" : "",
    ]
      .filter(Boolean)
      .join(",");
    if (flags) console.log(`${c.symbol.padEnd(8)} | ${flags}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
