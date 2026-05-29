import { isCuraleafCompany, isOndoInsurtechCompany } from "@/lib/operating-company-registry";
import { buildCuraleafCashRunwayModel } from "@/lib/curaleaf-cash-runway";
import { buildOndoCashRunwayModel } from "@/lib/ondo-cash-runway";
import { buildGenericExplorerCashRunway } from "@/lib/generic-cash-runway";
import { buildIdexCashRunwayModel } from "@/lib/idex-cash-runway";
import { buildPacificRidgeCashRunwayModel } from "@/lib/pacific-ridge-cash-runway";
import { buildAndradaCashRunwayModel } from "@/lib/andrada-cash-runway";
import { buildCelsiusCashRunwayModel } from "@/lib/celsius-cash-runway";
import { buildArgentaCashRunwayModel } from "@/lib/argenta-cash-runway";
import { buildAmarcCashRunwayModel } from "@/lib/amarc-cash-runway";
import { buildArcCashRunwayModel } from "@/lib/arc-cash-runway";
import { buildGreenxCashRunwayModel } from "@/lib/greenx-cash-runway";
import {
  type CashRunwayModel,
  isIdexMetalsCompany,
  isPacificRidgeCompany,
  isAndradaMiningCompany,
  isCelsiusResourcesCompany,
  isArgentaSilverCompany,
  isAmarcResourcesCompany,
  isArcMineralsCompany,
  isGreenxMetalsCompany,
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
  if (isIdexMetalsCompany(symbol, name)) return buildIdexCashRunwayModel(balanceCashUsd);
  if (isAmarcResourcesCompany(symbol, name)) return buildAmarcCashRunwayModel(balanceCashUsd);
  if (isArcMineralsCompany(symbol, name)) return buildArcCashRunwayModel(balanceCashUsd);
  if (isGreenxMetalsCompany(symbol, name)) return buildGreenxCashRunwayModel(balanceCashUsd);
  if (isPacificRidgeCompany(symbol, name)) return buildPacificRidgeCashRunwayModel(balanceCashUsd);
  if (isAndradaMiningCompany(symbol, name)) {
    return buildAndradaCashRunwayModel(balanceCashUsd);
  }
  if (isCelsiusResourcesCompany(symbol, name)) {
    return buildCelsiusCashRunwayModel(balanceCashUsd);
  }
  if (isArgentaSilverCompany(symbol, name)) {
    return buildArgentaCashRunwayModel(balanceCashUsd);
  }

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
    isAmarcResourcesCompany(symbol, name) ||
    isArcMineralsCompany(symbol, name) ||
    isGreenxMetalsCompany(symbol, name) ||
    isPacificRidgeCompany(symbol, name) ||
    isAndradaMiningCompany(symbol, name) ||
    isCelsiusResourcesCompany(symbol, name) ||
    isArgentaSilverCompany(symbol, name)
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
