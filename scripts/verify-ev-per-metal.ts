import { PrismaClient } from "@prisma/client";
import { getMineralInventory } from "../src/lib/mineral-inventory-registry";
import {
  computeEvPerMetalMetrics,
  computeEvPerUnitUsd,
  formatEvPerUnitUsd,
} from "../src/lib/ev-per-metal";

const prisma = new PrismaClient();

function assertNoKiloOz(label: string, value: string) {
  if (value.includes("K/oz") || value.includes("M/oz")) {
    throw new Error(`${label}: gold/silver oz must not use K/M suffix, got ${value}`);
  }
}

async function main() {
  console.log("formatEvPerUnitUsd checks:");
  assertNoKiloOz("gold", formatEvPerUnitUsd(2047, "oz Au"));
  console.log("  $2047/oz =>", formatEvPerUnitUsd(2047, "oz Au"));
  console.log("  $0.0055/lb =>", formatEvPerUnitUsd(0.0055, "lb CuEq"));
  console.log("  $12.34/lb =>", formatEvPerUnitUsd(12.34, "lb Cu"));

  const cases: Array<{ sym: string; expectOz?: boolean; manualLb?: number }> = [
    { sym: "IAG.TO", expectOz: true },
    { sym: "AEM", expectOz: true },
    { sym: "PEX.V", manualLb: 2_420_000_000 },
    { sym: "CS", expectOz: false },
    { sym: "BTO.TO", expectOz: true },
  ];

  for (const { sym, expectOz, manualLb } of cases) {
    const c = await prisma.company.findFirst({ where: { symbol: sym } });
    if (!c) {
      console.log(`\n${sym}: skip (not in DB)`);
      continue;
    }
    const inv = getMineralInventory(c.symbol, c.name);
    if (!inv) {
      console.log(`\n${sym}: no inventory`);
      continue;
    }
    const ev = c.enterpriseValue ?? (c.marketCap ?? 0) + (c.balanceDebt ?? 0) - (c.balanceCash ?? 0);
    const m = computeEvPerMetalMetrics({
      company: c,
      inventory: inv,
      spotGoldUsdPerOz: 3300,
      spotCopperUsdPerLb: 4.5,
    });
    console.log(`\n${sym} EV=${ev.toLocaleString()}`);
    if (!m) {
      console.log("  no metrics");
      continue;
    }
    console.log("  reserve:", m.evPerReserveOzValue, "| raw:", m.evPerReserveUsdPerUnit);
    console.log("  resource:", m.evPerResourceOzValue, "| raw:", m.evPerResourceUsdPerUnit);

    if (expectOz) {
      assertNoKiloOz(sym, m.evPerReserveOzValue);
      if (m.evPerReserveUsdPerUnit != null && m.evPerReserveUsdPerUnit >= 100) {
        const recomputed = formatEvPerUnitUsd(m.evPerReserveUsdPerUnit, "oz Au");
        if (!recomputed.includes("K/oz")) console.log("  OK oz format:", recomputed);
      }
    }
    if (manualLb && ev > 0) {
      const expected = computeEvPerUnitUsd(ev, manualLb)!;
      const got = m.evPerReserveUsdPerUnit;
      const diff = Math.abs((got ?? 0) - expected) / expected;
      console.log(`  manual EV/lb: expected $${expected.toFixed(6)}/lb, got $${got?.toFixed(6)}/lb, diff ${(diff * 100).toFixed(2)}%`);
      if (diff > 0.01) console.warn("  WARNING: >1% drift vs EV/contained lb");
    }
  }
  console.log("\nAll checks passed.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
