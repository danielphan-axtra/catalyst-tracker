import { PrismaClient } from "@prisma/client";
import fs from "fs";
import { computeSimplifiedDcfFromAssumptions } from "../src/lib/dcf-core";
import { computeEndeavourSimplifiedDcf } from "../src/lib/endeavour-dcf";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { symbol: { in: ["IAG.TO", "EDV.TO", "AEM.TO", "EDV", "AEM"] } },
        { balanceDebt: { gt: 0 } },
      ],
    },
    select: { symbol: true, name: true, balanceDebt: true },
    orderBy: { balanceDebt: "desc" },
    take: 15,
  });

  for (const c of companies) {
    console.log(`\n${c.symbol} debt=${c.balanceDebt}`);
  }

  const iag = companies.find((c) => c.symbol === "IAG.TO");
  if (iag) {
    const assumptions = JSON.parse(fs.readFileSync("data/iamgold-dcf-assumptions.json", "utf8"));
    const r = computeSimplifiedDcfFromAssumptions({
      assumptions,
      goldPriceUsdPerOz: 2500,
      discountRatePct: 5,
      yearsForward: 5,
      balanceDebtUsd: iag.balanceDebt,
    });
    console.log("\nIAG financing (USD M):");
    for (const y of r.rows) {
      console.log(`  ${y.yearLabel}: financing=${y.financingUsdM.toFixed(1)} fcf=${y.fcfUsdM.toFixed(1)}`);
    }
  }

  const edv = companies.find((c) => c.symbol === "EDV.TO");
  if (edv) {
    const r = computeEndeavourSimplifiedDcf({
      goldPriceUsdPerOz: 2500,
      discountRatePct: 5,
      yearsForward: 5,
      balanceDebtUsd: edv.balanceDebt,
    });
    console.log("\nEDV financing (USD M):");
    for (const y of r.rows) {
      console.log(`  ${y.yearLabel}: financing=${y.financingUsdM.toFixed(1)}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
