/**
 * Upsert Amarc Resources (TSXV: AHR) — catalyst engine.
 * Run: npx tsx scripts/seed-amarc-resources.ts
 */
import { PrismaClient } from "@prisma/client";
import { buildCatalystRecord, daysFromToday } from "./lib/build-catalyst";

const prisma = new PrismaClient();

const AMARC = {
  symbol: "AHR.V",
  name: "Amarc Resources Ltd.",
  description:
    "Amarc advances JOY (AuRORA Cu-Au-Ag with Freeport), DUKE, and IKE in BC. Freeport completed Stage 1 (C$35M) and elected Stage 2 (C$75M / 5yr, min C$10M/yr sole-funded) while Amarc manages JOY drilling — corporate value hinges on assay continuity and partner-funded spend.",
  website: "https://amarcresources.com/",
  industry: "Copper-Gold Exploration",
  stockPrice: 1.01,
  price52WeekHigh: 1.56,
  price52WeekLow: 0.47,
  avgDailyVolume: 230_000,
  marketCap: 223_000_000,
  balanceCash: 4_000_000,
  balanceDebt: 0,
  minorityInterest: 0,
  enterpriseValue: 219_000_000,
};

async function seedPricePoints(companyId: string, basePrice: number, baseVolume: number) {
  const baseDate = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    const drift = (90 - i) / 90;
    const price = basePrice * (1 + (Math.random() - 0.5) * 0.22 * drift);
    await prisma.pricePoint.upsert({
      where: { companyId_date: { companyId, date: d } },
      update: {},
      create: {
        companyId,
        date: d,
        price: Math.max(0.03, Math.round(price * 1000) / 1000),
        volume: Math.max(60_000, Math.floor(baseVolume * (0.35 + Math.random()))),
      },
    });
  }
}

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: AMARC.symbol },
    update: AMARC,
    create: AMARC,
  });

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const inputs = [
    {
      title: "JOY / AuRORA assay cycle (2026 field season)",
      summary:
        "2026 JOY program (~C$15M preliminary budget, Freeport-funded via AML) tests whether Jan 2025 discovery continuity holds: JP24057 (82 m @ 1.08% CuEq incl. 42 m @ 1.97% CuEq) and ~600 m mineralized width on sections 7800N/7900N.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Repeatable step-out grade/width is the primary rerating lever for AHR’s ~C$220M+ market cap.",
        "Isolated high-grade intervals without lateral continuity usually produce only short-lived spikes.",
      ],
      dateStart: daysFromToday(10),
      dateEnd: daysFromToday(280),
      analysis: {
        version: 1 as const,
        companyContext:
          "Amarc discovered AuRORA in a previously undrilled NWG area of the 495 km² JOY district (Jan 2025). Freeport funds JOY through Aurora Minerals Ltd (60/40); Amarc is primary contractor. May 2026 guidance: ~C$15M 2026 budget, mobilization from June — equity investors are buying district scale, not single holes.",
        sections: [
          {
            title: "Historical anchors to benchmark new assays",
            bullets: [
              "Discovery hole JP24057: near-surface Au-rich porphyry Cu-Au-Ag with strong continuity on 7800N.",
              "Jan 2025 step-outs on 7900N showed similar characteristics; market expects expansion, not re-proof of one section.",
              "JOY sits in Toodoggone-Kemess camp — comparisons to Kemess/Sentinel-style logistics and grade profiles matter for NAV narratives.",
            ],
          },
          {
            title: "How this moves AHR specifically",
            paragraphs: [
              "Because Freeport pays JOY drill bills in Stage 2, Amarc’s corporate burn is less sensitive to assay timing than a self-funded junior — but share price still reacts to whether AuRORA can support a multi-hundred-Mt conceptual story.",
            ],
          },
        ],
        bullCase:
          "Multiple step-out fences extend high Au-Cu grades at shallow depth; analysts begin scoping district resource potential.",
        bearCase:
          "Grade drops off outside discovery panels; story reverts to ‘interesting discovery, unclear scale.’",
        watchItems: [
          "Assay releases by section (7800N, 7900N, new fences).",
          "True width, CuEq methodology consistency vs Jan 2025 releases.",
          "Rig count / meterage vs ~C$15M budget.",
        ],
      },
    },
    {
      title: "Freeport Stage 2 spend cadence (C$75M program)",
      summary:
        "Monitor Freeport’s minimum C$10M/year sole-funding under Stage 2 — if spend slips, JOY could revert to 60:40 pro-rata and raise Amarc’s cash burden.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Continued sole-funding preserves exploration velocity without Amarc equity issuance.",
        "Pro-rata trigger would be a negative funding-structure catalyst for minority holders.",
      ],
      dateStart: daysFromToday(30),
      dateEnd: daysFromToday(540),
      analysis: {
        version: 1 as const,
        companyContext:
          "Sep 2025: Freeport elected Stage 2 after C$35M Stage 1 (60% in AML). Stage 2: additional C$75M within 5 years, ≥C$10M/year, else fund pro-rata 60:40. 2025 program was >C$12M (100% Freeport). This structure is the core reason Amarc’s corporate runway differs from typical explorers.",
        sections: [
          {
            title: "Investor checklist",
            bullets: [
              "Does quarterly activity report show Freeport-funded JOY spend near guided run-rate?",
              "Any disclosure of pro-rata discussions or reduced program scope.",
              "Handa/AML cash (~US$800k noted at Anglo exit context) plus Amarc balance sheet vs G&A.",
            ],
          },
        ],
        bullCase: "Freeport accelerates spend toward 70% earn-in; markets price strategic interest.",
        bearCase: "Spend slows; Amarc must contribute 40% pro-rata or program shrinks.",
        watchItems: ["Annual/minimum spend confirmation", "AML management fee revenue to Amarc"],
      },
    },
    {
      title: "DUKE target maturation (Boliden earn-in path)",
      summary:
        "Geophysics/drill prioritization at DUKE where Boliden can earn 60% via C$30M over 4 years, then optional +10% for C$60M more.",
      impactCategory: "Medium" as const,
      impactBullets: [
        "Second district success reduces single-asset dependence on JOY/AuRORA.",
        "Without drill conversion, DUKE stays narrative-only.",
      ],
      dateStart: daysFromToday(60),
      dateEnd: daysFromToday(360),
      analysis: {
        version: 1 as const,
        companyContext:
          "Amarc operates DUKE during Boliden’s initial earn-in. JOY dominates headlines, but DUKE is part of the ‘three district’ HDI-origin story — markets will reward proof that Amarc is not a one-project company.",
        sections: [
          {
            title: "What success looks like",
            bullets: [
              "Ranked drill targets with Boliden co-funding visibility.",
              "First intercepts with porphyry-style continuity (even modest) to justify Boliden spend.",
            ],
          },
        ],
        bullCase: "DUKE drill hits while JOY assays flow — portfolio rerating.",
        bearCase: "DUKE idle; all attention on JOY binary outcomes.",
        watchItems: ["Boliden participation in DUKE programs", "RNS on new geophysical anomalies"],
      },
    },
    {
      title: "IKE technical / resource pathway",
      summary:
        "IKE (Empress and regional targets) technical work and selective drilling to support longer-dated development optionality beyond JOY news flow.",
      impactCategory: "Medium" as const,
      impactBullets: [
        "IKE progress supports ‘three district’ premium if JOY data disappoints short term.",
        "Limited spend here is expected — low near-term price sensitivity.",
      ],
      dateStart: daysFromToday(45),
      dateEnd: daysFromToday(300),
      analysis: {
        version: 1 as const,
        companyContext:
          "IKE is the southern BC leg of Amarc’s portfolio with prior self-funded Empress drilling (2024). Near-term equity driver remains JOY, but IKE provides strategic depth for longer-hold investors.",
        sections: [
          {
            title: "Expected impact",
            paragraphs: [
              "Material IKE news can act as a secondary rerating leg when JOY is in quiet periods between assay batches.",
            ],
          },
        ],
        bullCase: "Resource or high-grade intercepts re-activate IKE narrative.",
        bearCase: "No meaningful IKE news; valuation purely JOY-beta.",
        watchItems: ["JORC/scoping updates", "Drill permits and collar releases"],
      },
    },
  ];

  for (const input of inputs) {
    await prisma.catalyst.create({ data: buildCatalystRecord(company.id, input) });
  }

  await seedPricePoints(company.id, company.stockPrice ?? 1.01, company.avgDailyVolume ?? 230_000);
  console.log("Amarc Resources seeded:", company.id, "-> /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
