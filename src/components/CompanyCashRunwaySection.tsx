import { getCashRunwayModel } from "@/lib/cash-runway-registry";
import { CashRunwaySection } from "@/components/CashRunwaySection";

export function CompanyCashRunwaySection({
  symbol,
  name,
  industry,
  balanceCash,
}: {
  symbol: string;
  name: string;
  industry?: string | null;
  balanceCash?: number | null;
}) {
  const model = getCashRunwayModel(symbol, name, industry ?? null, balanceCash ?? null);
  if (!model) return null;
  return <CashRunwaySection model={model} />;
}
