/**
 * Prefer modelled post-financing / filing cash when DB balanceCash is stale
 * (e.g. still showing pre-raise treasury after a placement).
 */
export function resolveTreasuryCashM(
  balanceFromDb: number | null | undefined,
  modelCashM: number,
  /** Reject DB if below this fraction of the model anchor (default 90%). */
  minDbVsModelRatio = 0.9,
): number {
  if (modelCashM <= 0) {
    return balanceFromDb != null && balanceFromDb > 0 ? balanceFromDb / 1_000_000 : 0;
  }
  const dbM = balanceFromDb != null && balanceFromDb > 0 ? balanceFromDb / 1_000_000 : null;
  if (dbM == null) return modelCashM;
  if (dbM < modelCashM * minDbVsModelRatio) return modelCashM;
  return dbM;
}
