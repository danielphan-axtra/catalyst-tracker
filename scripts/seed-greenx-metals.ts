/**
 * Upsert GreenX Metals (ASX: GRX) — catalyst engine.
 * Run: npx tsx scripts/seed-greenx-metals.ts
 */
import { PrismaClient } from "@prisma/client";
import { buildCatalystRecord, daysFromToday } from "./lib/build-catalyst";

const prisma = new PrismaClient();

const GREENX = {
  symbol: "GRX.AX",
  name: "GreenX Metals Limited",
  description:
    "GreenX (ASX: GRX) is advancing Tannenberg (Germany Kupferschiefer-style Cu-Ag) and Eleonore North (Greenland Au-W-Sb) while pursuing Poland arbitration optionality. May 2026 exploration target: 144–279 Mt @ 0.9–1.4% Cu and 15–21 g/t Ag.",
  website: "https://greenxmetals.com/",
  industry: "Copper-Silver Exploration",
  stockPrice: 0.895,
  price52WeekHigh: 1.07,
  price52WeekLow: 0.68,
  avgDailyVolume: 87_000,
  marketCap: 277_000_000,
  balanceCash: 30_000_000,
  balanceDebt: 0,
  minorityInterest: 0,
  enterpriseValue: 247_000_000,
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
        price: Math.max(0.2, Math.round(price * 1000) / 1000),
        volume: Math.max(20_000, Math.floor(baseVolume * (0.35 + Math.random()))),
      },
    });
  }
}

async function main() {
  const company = await prisma.company.upsert({
    where: { symbol: GREENX.symbol },
    update: GREENX,
    create: GREENX,
  });

  await prisma.catalyst.deleteMany({ where: { companyId: company.id } });

  const inputs = [
    {
      title: "Tannenberg field validation & drill targeting",
      summary:
        "Follow-up after May 2026 exploration target (144–279 Mt @ 0.9–1.4% Cu, 15–21 g/t Ag) — converts archive model into drill collars in Hessen, Germany.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Confirmation drilling can re-rate ~A$277M cap toward Kupferschiefer comparables.",
        "Failure to validate ET with the bit keeps valuation on conceptual optionality.",
      ],
      dateStart: daysFromToday(21),
      dateEnd: daysFromToday(270),
      analysis: {
        version: 1 as const,
        companyContext:
          "GreenX shifted from archive review to active field story in 2025–2026. Tannenberg is the primary equity driver; Eleonore North and Poland legal outcomes are secondary legs.",
        sections: [
          {
            title: "Exploration target context",
            bullets: [
              "ET range: 1.3–3.9 Mt Cu and 69–188 Moz Ag contained (company disclosure, May 2026).",
              "Analogue: Polish Kupferschiefer district scale — market will price probability of similar geometry in Hessen.",
            ],
          },
        ],
        bullCase: "Drill collars + positive first assays; analyst coverage expands.",
        bearCase: "Targets slip to 2027; stock mean-reverts on spend without hits.",
        watchItems: ["Collar announcement", "First assay batch", "Permitting updates in Germany"],
      },
    },
    {
      title: "Eleonore North (Greenland) 2026 program",
      summary:
        "Field/mapping and target ranking at Noa (Au) and Margeries (W/Sb) after retaining 100% ELN via share consideration.",
      impactCategory: "Medium" as const,
      impactBullets: [
        "Critical-minerals angle (W, Sb) plus gold can attract broader investor base.",
        "Remote logistics cap near-term rerate vs Tannenberg.",
      ],
      dateStart: daysFromToday(45),
      dateEnd: daysFromToday(200),
      analysis: {
        version: 1 as const,
        companyContext:
          "GreenX elected to retain Eleonore North with deferred share payment (A$1M escrowed shares). Program planning referenced mid-2026 field start — success diversifies narrative beyond German Cu-Ag.",
        sections: [
          {
            title: "Historical hooks",
            bullets: [
              "Noa: potential reduced intrusion-related gold system analogies (Donlin/Fort Knox style comparisons in company materials).",
              "Margeries: historical high-grade W/Sb estimates cited in releases — need modern verification.",
            ],
          },
        ],
        bullCase: "Surface Au-Sb-W confirmation + drill-ready targets.",
        bearCase: "Program delayed; Greenland remains option value only.",
        watchItems: ["Field season start PR", "Assay/trench results", "Budget split Germany vs Greenland"],
      },
    },
    {
      title: "Poland arbitration / set-aside proceedings",
      summary:
        "Legal process updates on legacy Poland claims — non-core but can move cap on binary outcomes.",
      impactCategory: "Major" as const,
      impactBullets: [
        "Favourable ruling can add lump-sum or royalty optionality not in base NAV.",
        "Adverse/long process drains management attention and G&A.",
      ],
      dateStart: daysFromToday(60),
      dateEnd: daysFromToday(540),
      analysis: {
        version: 1 as const,
        companyContext:
          "GreenX quarterly disclosures reference ongoing set-aside proceedings against Poland. Treasury (~A$30M in tracker) funds Tannenberg, but a positive legal outcome is leveraged upside.",
        sections: [
          {
            title: "Investor framing",
            paragraphs: [
              "Treat as option value: size outcome if disclosed, probability unobservable — position sizing should not rely solely on legal win.",
            ],
          },
        ],
        bullCase: "Settlement or award disclosed with meaningful cash/component.",
        bearCase: "Case extends with costs; no incremental value recognized.",
        watchItems: ["Court milestones in ASX announcements", "Reserved legal spend in accounts"],
      },
    },
  ];

  for (const input of inputs) {
    await prisma.catalyst.create({ data: buildCatalystRecord(company.id, input) });
  }

  await seedPricePoints(company.id, company.stockPrice ?? 0.895, company.avgDailyVolume ?? 87_000);
  console.log("GreenX Metals seeded:", company.id, "-> /companies/" + company.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
