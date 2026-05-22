import { EndeavourDcfInteractive } from "@/components/EndeavourDcfInteractive";
import { loadAssumptionsFromRepoFile } from "@/lib/endeavour-dcf";

export function EndeavourDcfSection({
  balanceDebtUsd,
  balanceCashUsd,
  spotCommodityPrice,
}: {
  balanceDebtUsd?: number | null;
  balanceCashUsd?: number | null;
  spotCommodityPrice: number;
}) {
  const assumptions = loadAssumptionsFromRepoFile("endeavour-dcf-assumptions.json");

  return (
    <EndeavourDcfInteractive
      assumptions={assumptions}
      initialGoldPriceUsdPerOz={2500}
      discountRatePct={5}
      startYear={2026}
      chartYears={5}
      balanceDebtUsd={balanceDebtUsd}
      balanceCashUsd={balanceCashUsd}
      spotCommodityPrice={spotCommodityPrice}
    />
  );
}
