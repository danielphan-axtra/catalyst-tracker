import { isCuraleafCompany, isOndoInsurtechCompany } from "@/lib/operating-company-registry";
import { buildCuraleafCashRunwayModel } from "@/lib/curaleaf-cash-runway";
import { buildOndoCashRunwayModel } from "@/lib/ondo-cash-runway";
import { buildGenericExplorerCashRunway } from "@/lib/generic-cash-runway";
import { buildIdexCashRunwayModel } from "@/lib/idex-cash-runway";
import { buildPacificRidgeCashRunwayModel } from "@/lib/pacific-ridge-cash-runway";
import {
  type CashRunwayModel,
  isIdexMetalsCompany,
  isPacificRidgeCompany,
} from "@/lib/cash-runway";
import { getMiningCompanyProfile } from "@/lib/mining-company-config";

export function getCashRunwayModel(
  symbol: string,
  name: string,
  industry: string | null | undefined,
  balanceCashUsd: number | null | undefined,
): CashRunwayModel | null {
  if (isCuraleafCompany(symbol, name)) return buildCuraleafCashRunwayModel(balanceCashUsd);
  if (isOndoInsurtechCompany(symbol, name)) return buildOndoCashRunwayModel(balanceCashUsd);
  if (isIdexMetalsCompany(symbol, name)) return buildIdexCashRunwayModel();
  if (isPacificRidgeCompany(symbol, name)) return buildPacificRidgeCashRunwayModel();

  const profile = getMiningCompanyProfile(symbol, name, industry);
  if (
    profile.useGenericCashRunway &&
    balanceCashUsd != null &&
    balanceCashUsd > 0
  ) {
    return buildGenericExplorerCashRunway({
      companyDisplayName: name,
      symbol,
      balanceCashUsd: balanceCashUsd,
    });
  }
  return null;
}

export function hasCashRunwaySection(
  symbol: string,
  name: string,
  industry: string | null | undefined,
  balanceCashUsd: number | null | undefined,
): boolean {
  if (
    isCuraleafCompany(symbol, name) ||
    isOndoInsurtechCompany(symbol, name) ||
    isIdexMetalsCompany(symbol, name) ||
    isPacificRidgeCompany(symbol, name)
  ) {
    return true;
  }
  const profile = getMiningCompanyProfile(symbol, name, industry);
  return (
    profile.useGenericCashRunway &&
    balanceCashUsd != null &&
    balanceCashUsd > 0
  );
}
