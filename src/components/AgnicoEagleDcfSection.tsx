import { AgnicoEagleDcfInteractive } from "@/components/AgnicoEagleDcfInteractive";

import { loadAssumptionsFromRepoFile } from "@/lib/endeavour-dcf";



const MINE_LEVEL_FILE = "agnico-eagle-mines-dcf-assumptions.json";

const CONSOLIDATED_FILE = "agnico-eagle-dcf-assumptions.json";



export function AgnicoEagleDcfSection({
  balanceDebtUsd,
  balanceCashUsd,
  spotCommodityPrice,
}: {
  balanceDebtUsd?: number | null;
  balanceCashUsd?: number | null;
  spotCommodityPrice: number;
}) {

  try {

    let assumptions = loadAssumptionsFromRepoFile(CONSOLIDATED_FILE);

    try {

      const mineLevel = loadAssumptionsFromRepoFile(MINE_LEVEL_FILE);

      if (Array.isArray(mineLevel.assets) && mineLevel.assets.length > 0) {

        assumptions = mineLevel;

      }

    } catch {

      // Use consolidated single-bar fallback.

    }



    return (

      <AgnicoEagleDcfInteractive
        assumptions={assumptions}
        initialGoldPriceUsdPerOz={2500}
        discountRatePct={5}
        startYear={2026}
        balanceDebtUsd={balanceDebtUsd}
        balanceCashUsd={balanceCashUsd}
        spotCommodityPrice={spotCommodityPrice}
      />

    );

  } catch {

    return (

      <div className="rounded-xl bg-white p-4 shadow-sm border border-neutral-100 mt-5">

        <h2 className="text-lg font-semibold text-neutral-900">DCF & NAV (simplified)</h2>

        <p className="mt-2 text-sm text-neutral-600">

          Agnico assumptions not found yet. Add{" "}

          <span className="font-mono text-neutral-900">data/{MINE_LEVEL_FILE}</span>.

        </p>

      </div>

    );

  }

}


