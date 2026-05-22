import { getMiningCompanyProfile } from "@/lib/mining-company-config";
import { hasCashRunwaySection } from "@/lib/cash-runway-registry";
import { matchOperatingCompany } from "@/lib/operating-company-registry";

export { isCuraleafCompany, isOndoInsurtechCompany, isOperatingCompany } from "@/lib/operating-company-registry";

export type CompanyPageProfile = {
  showEndeavourDcf: boolean;
  showAgnicoDcf: boolean;
  showMiningDcf: boolean;
  showFeasibilityDcf: boolean;
  showOperatingCashFlow: boolean;
  operatingCashFlowFileName: string | null;
  showCashRunway: boolean;
  hideMiningValuationMetrics: boolean;
};

export function getCompanyPageProfile(
  symbol: string,
  name: string,
  industry: string | null | undefined,
  balanceCash: number | null | undefined,
): CompanyPageProfile {
  const operating = matchOperatingCompany(symbol, name);
  if (operating) {
    return {
      showEndeavourDcf: false,
      showAgnicoDcf: false,
      showMiningDcf: false,
      showFeasibilityDcf: false,
      showOperatingCashFlow: true,
      operatingCashFlowFileName: operating.operatingCashFlowFileName,
      showCashRunway: true,
      hideMiningValuationMetrics: true,
    };
  }

  const mining = getMiningCompanyProfile(symbol, name, industry);
  const showMiningDcf = mining.showProducingDcf || mining.showFeasibilityDcf;

  return {
    showEndeavourDcf: mining.showEndeavourDcf,
    showAgnicoDcf: mining.showAgnicoDcf,
    showMiningDcf,
    showFeasibilityDcf: mining.showFeasibilityDcf,
    showOperatingCashFlow: false,
    operatingCashFlowFileName: null,
    showCashRunway: hasCashRunwaySection(symbol, name, industry, balanceCash),
    hideMiningValuationMetrics: false,
  };
}
