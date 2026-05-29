import { PrismaClient } from "@prisma/client";
import { getCashRunwayModel } from "../src/lib/cash-runway-registry";

const prisma = new PrismaClient();

async function main() {
  const symbols = ["IDEX.V", "PEX.V", "AHR.V", "ARCM.L", "GRX.AX", "AGAG.V", "ATM.L", "CLA.AX"];
  console.log("symbol | anchor cash | monthly burn | months to depletion");
  for (const sym of symbols) {
    const c = await prisma.company.findFirst({ where: { symbol: sym } });
    if (!c) {
      console.log(`${sym} — not in DB`);
      continue;
    }
    const m = getCashRunwayModel(c.symbol, c.name, c.industry, c.balanceCash);
    if (!m) {
      console.log(`${sym} — no runway model`);
      continue;
    }
    console.log(
      `${sym.padEnd(8)} | ${m.currency} ${m.forecastStartCashCadM.toFixed(2)}M | ${m.monthlyBurnCadM.toFixed(2)}M/mo | ${m.monthsToDepletion?.toFixed(1) ?? "n/a"} mo`,
    );
  }
  const stale = getCashRunwayModel("IDEX.V", "IDEX Metals", null, 5_000_000);
  console.log("\nIDEX with stale C$5M DB:", stale?.forecastStartCashCadM.toFixed(2), "M");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
