/**
 * Upsert IDEX Metals (TSXV: IDEX) — catalyst engine.
 * Run: npx tsx scripts/seed-idex-metals.ts
 */
import { PrismaClient } from "@prisma/client";
import { buildCatalystRecord, daysFromToday } from "./lib/build-catalyst";

const prisma = new PrismaClient();

async function main() {
  const idex = await prisma.company.upsert({
    where: { symbol: "IDEX.V" },
    update: {
      name: "IDEX Metals Corp.",
      description:
        "IDEX is focused on the Freeze copper-gold-moly project in Idaho’s emerging copper belt. 2025–2026 drilling at Kismet (KSMT25xxx series) established broad near-surface Cu intervals; the stock now needs repeatability and depth extensions toward a porphyry core.",
      website: "https://www.idexmetals.com/",
      industry: "Precious & Base Metals Exploration",
      stockPrice: 0.45,
      price52WeekHigh: 1.49,
      price52WeekLow: 0.36,
      avgDailyVolume: 125_000,
      marketCap: 24_000_000,
      balanceCash: 9_205_000,
      balanceDebt: 0,
      minorityInterest: 0,
      enterpriseValue: 15_000_000,
    },
    create: {
      symbol: "IDEX.V",
      name: "IDEX Metals Corp.",
      description:
        "IDEX is focused on the Freeze copper-gold-moly project in Idaho’s emerging copper belt. 2025–2026 drilling at Kismet (KSMT25xxx series) established broad near-surface Cu intervals; the stock now needs repeatability and depth extensions toward a porphyry core.",
      website: "https://www.idexmetals.com/",
      industry: "Precious & Base Metals Exploration",
      stockPrice: 0.45,
      price52WeekHigh: 1.49,
      price52WeekLow: 0.36,
      avgDailyVolume: 125_000,
      marketCap: 24_000_000,
      balanceCash: 9_205_000,
      balanceDebt: 0,
      minorityInterest: 0,
      enterpriseValue: 15_000_000,
    },
  });

  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const price = (idex.stockPrice ?? 0.45) * (1 + (Math.random() - 0.5) * 0.02 * ((90 - i) / 90));
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId: idex.id, date: d } },
      update: {},
      create: {
        companyId: idex.id,
        date: d,
        price: Math.round(price * 100) / 100,
        volume: Math.floor(Math.random() * 500_000) + 50_000,
      },
    });
  }

  await prisma.catalyst.deleteMany({ where: { companyId: idex.id } });

  const inputs = [
    {
      title: "Freeze / Kismet assay follow-up (2026 program)",
      summary:
        "Next assays and step-outs after KSMT25002 (101 m @ 1.02% Cu within 420.8 m @ 0.37% Cu from surface) and KSMT25004 (130.93 m @ 0.40% Cu within 344 m @ 0.30% Cu) — tests scale of tourmaline breccia complex.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Repeatable wide intercepts can re-rate a ~C$24M cap toward district-scale comparables.",
        "Single-hole dependence or weak follow-up typically collapses momentum quickly.",
      ],
      dateStart: daysFromToday(21),
      dateEnd: daysFromToday(200),
      analysis: {
        version: 1 as const,
        companyContext:
          "IDEX’s 2025 program (six holes at Kismet per Feb 2026 final results) confirmed Cu in every hole. Historic 1965 hole 4 (41.15 m @ 0.85% Cu from 9.14 m) was replicated at scale. Gold assays were not significant in reported holes — equity is a copper-breccia story with Ag-Mo-W by-product optionality.",
        sections: [
          {
            title: "Historical vs 2025–2026 anchors",
            bullets: [
              "KSMT25002: high-grade core 101 m @ 1.02% Cu inside 420.8 m @ 0.37% Cu from 1.89 m.",
              "KSMT25004: 130.93 m @ 0.40% Cu (0.50% CuEq) within 344.34 m @ 0.30% Cu from 38.71 m.",
              "KSMT25005/06 (Feb 2026): extended mineralization north — market needs tie-lines between fences.",
            ],
          },
          {
            title: "Structural model",
            paragraphs: [
              "Regional interpretation: tilted porphyry systems with mineralization plunging southeast — 2026 drilling should target down-plunge extensions and CM target (USFS CE approved Aug 2025).",
            ],
          },
        ],
        bullCase:
          "Step-outs link Kismet panels into a continuous breccia body; CM target adds second leg.",
        bearCase:
          "Grade tenor fades laterally; IDEX trades back to cash/runway math.",
        watchItems: ["Assay PRs by hole ID", "Updated plan map", "CM target drilling start"],
      },
    },
    {
      title: "Amie silver-gold season (secondary leg)",
      summary:
        "Field work at Amie epithermal targets — meaningful only if results justify sustained budget vs Freeze.",
      impactCategory: "Medium" as const,
      impactBullets: [
        "High-grade Ag-Au can add optionality to Cu-focused valuation.",
        "Without scale, Amie remains secondary to Freeze.",
      ],
      dateStart: daysFromToday(45),
      dateEnd: daysFromToday(180),
      analysis: {
        version: 1 as const,
        companyContext:
          "Freeze is the valuation engine (~C$19M EV vs multi-km Cu soil anomaly at Kismet). Amie diversifies commodity exposure but rarely drives cap alone for IDEX unless discoveries are exceptional.",
        sections: [
          {
            title: "Expected impact",
            bullets: [
              "Positive Amie results may widen investor base (precious metals funds) but core rerate still requires Freeze continuity.",
            ],
          },
        ],
        bullCase: "High-grade Ag-Au structures with clear follow-up drilling.",
        bearCase: "Anomalous but discontinuous; capital stays at Kismet.",
        watchItems: ["Soil/trench results", "Drill collar announcement at Amie"],
      },
    },
    {
      title: "Quarterly treasury & burn (financing read-through)",
      summary:
        "MD&A cash vs planned 2026 meterage — determines timing/structure of next raise for a pre-resource explorer.",
      impactCategory: "Medium" as const,
      impactBullets: [
        "Strong treasury after good markets extends time to next catalyst.",
        "Rising burn without assays forces discounted financing.",
      ],
      dateStart: daysFromToday(60),
      dateEnd: daysFromToday(120),
      analysis: {
        version: 1 as const,
        companyContext:
          "IDEX is pre-NAV; financing terms often dominate 6–12 month returns as much as geology. Post–May 2026 placement: ~C$9.2M treasury (Jul'25 cash + ~C$7.6M net proceeds).",
        sections: [
          {
            title: "What to model",
            bullets: [
              "Months runway at current exploration pace including USFS/contractor costs.",
              "Whether management accelerates spend ahead of assay cycle (positive if results follow, negative if miss).",
            ],
          },
        ],
        bullCase: "Cash covers full 2026 program without raise.",
        bearCase: "Raise at discount before next assay batch.",
        watchItems: ["Cash, G&A, exploration line items", "Warrant/overhang if any new financing"],
      },
    },
    {
      title: "Strategic / equity financing window",
      summary:
        "Potential financing to fund Freeze follow-up and CM drilling — structure matters as much as geology for IDEX.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Tight discount + strategic participant can support post-assay rally.",
        "Heavy warrant packages cap upside even if geology delivers.",
      ],
      dateStart: daysFromToday(90),
      dateEnd: daysFromToday(270),
      analysis: {
        version: 1 as const,
        companyContext:
          "Small-cap explorers often raise into strength after assay news. IDEX holders should pre-model dilution at C$0.30–0.50 range depending on spot and sentiment.",
        sections: [
          {
            title: "Financing quality framework",
            bullets: [
              "Use-of-proceeds tied to specific Freeze meters > general working capital.",
              "Strategic (producer/royalty) vs pure retail placement.",
              "Full warrant terms and hold periods.",
            ],
          },
        ],
        bullCase: "Charter 10–15% discount with insider/strategic participation.",
        bearCase: ">20% discount + warrants; stock fades post-close.",
        watchItems: ["Placement announcement", "Post-close trading volume"],
      },
    },
  ];

  for (const input of inputs) {
    await prisma.catalyst.create({ data: buildCatalystRecord(idex.id, input) });
  }

  console.log("IDEX Metals seeded:", idex.id, "-> /companies/" + idex.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
