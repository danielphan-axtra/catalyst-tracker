/**
 * Upsert Argenta Silver (TSXV: AGAG) — catalyst engine.
 * Run: npx tsx scripts/seed-argenta-silver.ts
 */
import { PrismaClient } from "@prisma/client";
import { buildCatalystRecord, daysFromToday } from "./lib/build-catalyst";

const prisma = new PrismaClient();

const ARGENTA = {
  symbol: "AGAG.V",
  name: "Argenta Silver Corp.",
  description:
    "Argenta owns 100% El Quevar (Salta, Argentina): 45.3 Moz Ag indicated @ 482 g/t (Yaxtché) on <1% of 57,000 ha. Post C$23M Jan 2026 financing, 25,000 m drill program and metallurgy path define the rerate case (EV/oz Ag → risked NAV).",
  website: "https://argentasilver.com/",
  industry: "Silver Exploration",
  stockPrice: 0.55,
  price52WeekHigh: 0.95,
  price52WeekLow: 0.28,
  avgDailyVolume: 420_000,
  marketCap: 48_000_000,
  balanceCash: 22_500_000,
  balanceDebt: 0,
  minorityInterest: 0,
  enterpriseValue: 25_500_000,
};

async function seedPricePoints(companyId: string, basePrice: number, baseVolume: number) {
  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const drift = (90 - i) / 90;
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.2 * drift);
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId, date: d } },
      update: {},
      create: {
        companyId,
        date: d,
        price: Math.max(0.05, Math.round(price * 100) / 100),
        volume: Math.max(50_000, Math.floor(baseVolume * (0.3 + Math.random()))),
      },
    });
  }
}

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: ARGENTA.symbol },
    update: ARGENTA,
    create: ARGENTA,
  });

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const inputs = [
    {
      title: "25,000 m drill assays (Yaxtché + step-outs)",
      summary:
        "Ongoing assays from upsized 25,000 m program after summer hits (e.g. 725 g/t Ag over 3.0 m at Mani-Copan, 800 m+ from Yaxtché edge) — must grow 45.3 Moz @ 482 g/t base with quality ounces.",
      impactCategory: "Major" as const,
      impactBullets: [
        "High-grade step-outs that connect to Yaxtché lower EV/oz Ag at ~C$48M cap.",
        "Isolated spikes without tonnage/continuity leave valuation on legacy resource only.",
      ],
      dateStart: daysFromToday(14),
      dateEnd: daysFromToday(240),
      analysis: {
        version: 1 as const,
        companyContext:
          "Argenta acquired El Quevar after prior operator abandonment; NI 43-101 (Sep 2024) shows pure silver M&I at Yaxtché with district-scale land. Jan 2026 financing (C$23M @ C$0.80) funds accelerated drill + studies — market now prices execution, not acquisition discount.",
        sections: [
          {
            title: "Resource baseline to beat",
            bullets: [
              "Indicated: 2.93 Mt @ 482 g/t Ag = 45.3 Moz (sulphide + oxide).",
              "Inferred: 0.31 Mt @ 417 g/t Ag = 4.1 Moz.",
              "Yaxtché open along strike; <3% of property explored — step-outs must prove continuity, not just grade.",
            ],
          },
          {
            title: "Why assays dominate AGAG",
            paragraphs: [
              "At current cap, each meaningful Moz added at >400 g/t has outsized impact on EV/oz versus producers. Weak wide low-grade intervals do not move the needle.",
            ],
          },
        ],
        bullCase:
          "Step-out fences link Mani-Copan/Argentina targets into Yaxtché geometry; street raises MRE preview.",
        bearCase:
          "Discontinuous high-grade pods; stock fades to cash value despite C$22.5M treasury.",
        watchItems: [
          "Assay PRs with true width and vein orientation",
          "MRE timing guidance",
          "Drill metres vs 25,000 m plan",
        ],
      },
    },
    {
      title: "Metallurgical & geotech de-risking",
      summary:
        "Metallurgy, geotech, and environmental baseline for high-sulphidation epithermal Ag — recovery and capex assumptions drive PEA credibility.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Strong Ag recovery supports underground/heap scenarios and NAV transition.",
        "Poor recovery or high dilution delays study path and compresses EV/oz.",
      ],
      dateStart: daysFromToday(30),
      dateEnd: daysFromToday(300),
      analysis: {
        version: 1 as const,
        companyContext:
          "Pure silver deposits rerate on payable ounces, not headline g/t. Argenta initiated metallurgical studies alongside expanded drilling (Jan/Feb 2026 disclosures) — this catalyst converts drill success into economic ounces.",
        sections: [
          {
            title: "What investors need to see",
            bullets: [
              "Ag recovery by material type (oxide vs sulphide).",
              "Reagent consumption / cyanide or flotation suitability.",
              "Geotech for underground vs open-pit trade-offs at 482 g/t average grade.",
            ],
          },
        ],
        bullCase: ">85% Ag recovery, simple flowsheet; PEA scoping accelerated.",
        bearCase: "Refractory material or high dilution; PEA pushed to 2028+.",
        watchItems: ["Met testwork PR", "Consultant selection for PEA", "Capex hints"],
      },
    },
    {
      title: "Updated mineral resource estimate",
      summary:
        "Potential MRE refresh vs Sep 2024 baseline — focus on ounce growth AND category/grade quality, not tonnage alone.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Accretive MRE (Moz + stable grade) can trigger EV/oz compression and strategic interest.",
        "Tonnes up / grade down is often sold off in high-grade silver names.",
      ],
      dateStart: daysFromToday(120),
      dateEnd: daysFromToday(360),
      analysis: {
        version: 1 as const,
        companyContext:
          "First resource under Argenta ownership sets comparables to peers (e.g. high-grade LatAm Ag developers). Market cap ~C$48M vs ~C$205M referenced in corporate deck at C$0.80 — rerate requires resource growth with mineable geometry.",
        sections: [
          {
            title: "MRE scoring framework",
            bullets: [
              "Contained Moz change vs 45.3 Moz indicated.",
              "Head grade vs 482 g/t — dilution is bearish even if Moz rise.",
              "Measured/Indicated mix for study readiness.",
            ],
          },
        ],
        bullCase: ">50 Moz Ag eq. at >450 g/t in mineable shapes; analysts initiate NAV.",
        bearCase: "Flat Moz, lower grade, delayed study.",
        watchItems: ["Effective date of MRE", "Cut-off grade assumptions", "Pit shell or stope hints"],
      },
    },
    {
      title: "Quevar North / South district exploration",
      summary:
        "Generative work on ~60 km² beyond Yaxtché — binary upside if soil/trench converts to drill targets.",
      impactCategory: "Medium" as const,
      impactBullets: [
        "New discoveries add long-dated optionality beyond MRE.",
        "Early-stage only — limited near-term cap impact without drill conversion.",
      ],
      dateStart: daysFromToday(45),
      dateEnd: daysFromToday(200),
      analysis: {
        version: 1 as const,
        companyContext:
          "El Quevar South phase-1 (2025) re-logged 23,500 m historical core (~32% of Yaxtché metres) to refine targets. Phase-2 drilling was guided from those models — North/South grids test whether Argenta is a one-deposit story or a district.",
        sections: [
          {
            title: "Expected impact",
            paragraphs: [
              "Success here supports ‘district’ premium; failure keeps focus solely on Yaxtché MRE cycle.",
            ],
          },
        ],
        bullCase: "New high-grade Ag soil/trench corridors with drill-ready targets.",
        bearCase: "Anomalies fail to drill; capital concentrates on Yaxtché only.",
        watchItems: ["Soil geochem maps", "Trench assays", "Budget allocation disclosure"],
      },
    },
    {
      title: "C$23M financing deployment & runway",
      summary:
        "Execution on Jan 2026 C$23M raise (28.75M shares @ C$0.80): burn vs 25,000 m program + studies determines next dilution event.",
      impactCategory: "Medium" as const,
      impactBullets: [
        "Fully funded narrative holds if spend maps to assays/MRE.",
        "Fast burn without technical output pulls forward raise.",
      ],
      dateStart: daysFromToday(7),
      dateEnd: daysFromToday(365),
      analysis: {
        version: 1 as const,
        companyContext:
          "Jan 22 2026 close of C$23M bought deal; company guided fully funded for expanded drill + technical studies. Corporate deck cited ~C$22.5M working capital and zero debt — this catalyst is capital efficiency, not discovery.",
        sections: [
          {
            title: "Financing facts",
            bullets: [
              "Gross C$23M; use: drill, metallurgy, camp/roads, working capital.",
              "Acquisition cost ~US$3.5M vs >C$60M historical spend on property — upside is execution on prior sunk capital.",
            ],
          },
        ],
        bullCase: "Program delivers MRE + met data before treasury falls below 12 months burn.",
        bearCase: "Raise again sub-C$0.60 before MRE.",
        watchItems: ["Quarterly cash", "Metres drilled / $", "G&A trend"],
      },
    },
    {
      title: "PEA / development study decision",
      summary:
        "Go/no-go on scoping/PEA after MRE + metallurgy — shifts valuation from EV/oz to risked NAV if economics work.",
      impactCategory: "Major" as const,
      impactBullets: [
        "PEA with robust Ag price deck can re-rate pure-play silver developers sharply.",
        "Deferral keeps stock on drill-treadmill without NAV anchor.",
      ],
      dateStart: daysFromToday(240),
      dateEnd: daysFromToday(450),
      analysis: {
        version: 1 as const,
        companyContext:
          "High-grade Ag deposits often skip straight to PEA after a solid MRE + met. Argenta’s infrastructure (camp, roads) supports faster study timelines than greenfield peers — if metallurgy cooperates.",
        sections: [
          {
            title: "Study decision criteria",
            bullets: [
              "Minimum mineable width and depth after MRE.",
              "Recovery and throughput assumptions.",
              "Argentina jurisdiction / royalty stack in scoping costs.",
            ],
          },
        ],
        bullCase: "PEA shows strong IRR at $30/oz Ag; strategic inbound interest.",
        bearCase: "Study delayed pending more drilling; EV/oz remains only metric.",
        watchItems: ["Consultant mandate", "PEA calendar", "Capex/opex leaks in presentations"],
      },
    },
  ];

  for (const input of inputs) {
    await prisma.catalyst.create({ data: buildCatalystRecord(company.id, input) });
  }

  await seedPricePoints(company.id, company.stockPrice ?? 0.55, company.avgDailyVolume ?? 420_000);
  console.log("Argenta Silver seeded:", company.id, "-> /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
