/**
 * Upsert Arc Minerals (AIM: ARCM) — catalysts via catalyst engine (future dates + analysisJson).
 * Sources: arcminerals.com RNS (Apr–May 2026).
 * Run: npx tsx scripts/seed-arc-minerals.ts
 */
import { PrismaClient } from "@prisma/client";
import { buildCatalystRecord, daysFromToday } from "./lib/build-catalyst";

const prisma = new PrismaClient();

const ARC = {
  symbol: "ARCM.L",
  name: "Arc Minerals Limited",
  description:
    "Arc Minerals (AIM: ARCM) is advancing copper in Botswana (Virgo, Kalahari Copper Belt) and Zambia (Kabompo West). After the Oct 2025 Anglo JV exit, Apr 2026 financing, and May 2026 Zambia settlement, the equity story is execution: geophysics → drilling → partner optionality.",
  website: "https://www.arcminerals.com/",
  industry: "Copper Exploration",
  stockPrice: 0.0039,
  price52WeekHigh: 0.0155,
  price52WeekLow: 0.0035,
  avgDailyVolume: 17_000_000,
  marketCap: 9_600_000,
  balanceCash: 5_000_000,
  balanceDebt: 0,
  minorityInterest: 0,
  enterpriseValue: 4_600_000,
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
        price: Math.max(0.0015, Math.round(price * 10000) / 10000),
        volume: Math.max(2_000_000, Math.floor(baseVolume * (0.35 + Math.random()))),
      },
    });
  }
}

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: ARC.symbol },
    update: ARC,
    create: ARC,
  });

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const catalystInputs = [
    {
      title: "Virgo geophysics → H2 2026 drill program (Botswana)",
      summary:
        "Post-Apr 2026 £3.0M raise, Arc is running geophysics on Virgo (Zone 5 corridor) ahead of planned H2 2026 drilling — first technical proof after financing.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Positive geophysics + collar release can re-rate a sub-£10M cap if targets look drill-ready.",
        "Slippage into 2027 without collars keeps stock in financing/overhang territory.",
      ],
      dateStart: daysFromToday(14),
      dateEnd: daysFromToday(150),
      analysis: {
        version: 1 as const,
        companyContext:
          "Arc used Apr 2026 proceeds for Botswana exploration and working capital (RNS 24 Apr 2026). Management stated the company is funded for an exploration campaign in the only junior-held licence inside the MMG Zone 5 corridor — shifting narrative from Zambia legal risk to measurable meters in Botswana.",
        sections: [
          {
            title: "Historical baseline",
            paragraphs: [
              "Virgo (PL135/2017 & PL162/2017) saw scout drilling in Jan 2024 confirming target stratigraphy; a May 2024 IP survey helped locate collars. Mar 2026 RNS noted commencement of a geophysical programme — this catalyst is the bridge to the previously guided second-half drilling season.",
            ],
          },
          {
            title: "Expected impact on shares",
            bullets: [
              "Market will treat any concrete drill plan (meters, targets, timeline) as validation that Apr 2026 capital is being deployed into the highest-visibility asset.",
              "Failure to convert geophysics into a scheduled drill program would undermine the ‘fully funded for 2026 exploration’ message from the placing.",
            ],
          },
        ],
        bullCase:
          "Geophysics highlights conductors aligned with KCB-style stratigraphy; timely collar announcement attracts specialist copper investors ahead of first assays.",
        bearCase:
          "Program delayed by contractor availability or permit admin; stock drifts as warrant overhang (0.8p, 3-year) caps rallies.",
        watchItems: [
          "RNS on geophysics interpretation and ranked drill targets.",
          "Collar map / meterage guidance for H2 2026.",
          "Any partnership inbound on Botswana (not required for rerate, but accelerates scale).",
        ],
      },
    },
    {
      title: "Zambia settlement — consent judgments & Kabompo West optionality",
      summary:
        "Follow-through after 27 May 2026 comprehensive settlement ending eight Zambian proceedings; unlocks focus on Kabompo West partnering and field planning.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Full procedural closure removes a long-standing discount on African copper optionality.",
        "Until judgments are filed and licences are operationally unblocked, partner talks may stay slow.",
      ],
      dateStart: daysFromToday(7),
      dateEnd: daysFromToday(120),
      analysis: {
        version: 1 as const,
        companyContext:
          "From Oct 2025 Anglo exit through early 2026, Arc’s Zambia story was dominated by litigation and JV reset. The 27 May 2026 settlement (mutual releases; Handa licence clarity; contingent US$200k payment tied to a third-party JORC condition by 2031) is a structural clean-up — not a drill result — but it changes who will engage on Kabompo West.",
        sections: [
          {
            title: "What changed on 27 May 2026",
            bullets: [
              "Eight sets of proceedings discontinued by consent; Arc to announce when Zambian courts complete filing.",
              "Lunda renounced claims to Handa’s Licence 19906-HQ-LEL; Arc-side entities regain operational clarity on core tenure.",
              "CEO commentary: focus shifts entirely to Botswana + Zambia exploration (Kabompo West framed as major Domes-region footprint).",
            ],
          },
          {
            title: "Valuation read-through",
            paragraphs: [
              "Pre-settlement, many investors treated Zambian copper as ‘option with legal haircut.’ Post-settlement, the marginal buyer cares about partner quality and drill budget — similar to pre-Anglo but without Anglo’s chequebook.",
            ],
          },
        ],
        bullCase:
          "Consent judgments filed without surprise; Arc announces partner discussions or self-funded geophysics on Kabompo West within months.",
        bearCase:
          "Procedural delays in Zambian courts; partner market waits for Virgo drill proof before engaging Zambia again.",
        watchItems: [
          "RNS confirming consent judgments filed.",
          "Any new JV term sheet or strategic review outcome for Kabompo West.",
          "Handa cash (~US$800k noted at Anglo exit) plus group treasury deployment split.",
        ],
      },
    },
    {
      title: "Post-raise capital efficiency & warrant overhang (Apr 2026)",
      summary:
        "Track how Apr 2026 £3.0M placing + creditor subscription (0.4p shares; 1:1 warrants @ 0.8p) translates into exploration outcomes vs G&A.",
      impactCategory: "Medium" as const,
      impactBullets: [
        "Runway extension was material (~£3M gross + ~£1.05M creditor conversion) — quality of spend now drives next raise timing.",
        "Warrant exercise ceiling can limit upside until technical de-risking.",
      ],
      dateStart: daysFromToday(30),
      dateEnd: daysFromToday(365),
      analysis: {
        version: 1 as const,
        companyContext:
          "24 Apr 2026 RNS: 425M placing + 325M subscription shares at 0.4p; enlarged issued capital ~2.46B shares; warrants at 0.8p for 3 years. This financing explicitly funded Botswana work and Zambia legal/diligence — investors should score management on output per pound, not headline cash.",
        sections: [
          {
            title: "Financing terms investors should model",
            bullets: [
              "Gross equity ~£3.0M before expenses; creditor subscription ~£1.046M settled via share issuance (reduces cash payables, increases float).",
              "Warrant overhang: 1 warrant per new share from fundraise + creditor leg — potential supply near 0.8p if stock rerates prematurely.",
              "Admission 30 Apr 2026 enlarged register — liquidity improved but dilution already taken.",
            ],
          },
        ],
        bullCase:
          "Virgo drill results arrive before markets focus on warrant supply; cash balance supports 2027 without discounted raise.",
        bearCase:
          "High G&A or slow field spend; another raise at sub-0.4p before technical catalyst.",
        watchItems: [
          "Interim reports: cash, burn, Botswana vs Zambia allocation.",
          "Warrant exercise notices if price approaches 0.8p.",
        ],
      },
    },
    {
      title: "Replacement strategic partner process (Zambia copper)",
      summary:
        "Arc exploring new JV/strategic options for Zambia after Anglo’s Oct 2025 withdrawal — terms must replace lost staged US$75M Stage 2 spend.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Partner with committed drill dollars can restore ‘funded explorer’ status without equity dilution.",
        "Weak terms (low spend, long earn-in) may be worse than self-funding Virgo-first strategy.",
      ],
      dateStart: daysFromToday(45),
      dateEnd: daysFromToday(300),
      analysis: {
        version: 1 as const,
        companyContext:
          "Anglo earned 60% via US$35M accelerated spend, elected Stage 2 (US$75M over 5 years, min US$10M/yr) then exited Oct 2025 with no 2025 drilling — Arc regained Handa control. Post-May 2026 settlement, a new partner is plausible but must compete with Botswana priority on limited management bandwidth.",
        sections: [
          {
            title: "What a good deal looks like",
            bullets: [
              "Minimum annual exploration spend with Arc carry on admin/G&A (similar to prior Anglo structure but with binding milestones).",
              "Operatorship clarity on Kabompo West geophysics/drilling.",
              "Limited equity issuance by Arc — cash or farm-in preferred by existing holders after Apr 2026 dilution.",
            ],
          },
        ],
        bullCase:
          "Tier-1 copper name signs regional JV; Arc retains meaningful upside (>30%) with near-term drill budget.",
        bearCase:
          "No partner; Zambia dormant while Virgo consumes attention — option value fades.",
        watchItems: [
          "Binding term sheet vs MOU.",
          "Whether partner requires renewed litigation comfort (post-settlement should help).",
        ],
      },
    },
  ];

  for (const input of catalystInputs) {
    await prisma.catalyst.create({ data: buildCatalystRecord(company.id, input) });
  }

  await seedPricePoints(company.id, company.stockPrice ?? 0.0039, company.avgDailyVolume ?? 17_000_000);

  console.log("Arc Minerals seeded:", company.id, "-> /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
