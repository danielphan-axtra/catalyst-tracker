import * as fs from "fs";
import * as path from "path";
import {
  computeSimplifiedDcfFromAssumptions,
  type DcfAssumptionsFile,
  type DcfAsset,
  type DcfPoint,
  type DcfResult,
} from "@/lib/dcf-core";

export type EndeavourAsset = DcfAsset;
export type EndeavourAssumptionsFile = DcfAssumptionsFile;
export type EndeavourDcfPoint = DcfPoint;
export type EndeavourDcfResult = DcfResult;

function parseFirstJsonObject(raw: string): any {
  const firstBrace = raw.indexOf("{");
  if (firstBrace === -1) throw new Error("No '{' found in assumptions file.");

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth++;
      continue;
    }

    if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = raw.slice(firstBrace, i + 1);
        return JSON.parse(candidate);
      }
    }
  }

  throw new Error("Could not extract a complete first JSON object from assumptions file.");
}

export function loadAssumptionsFromRepoFile(assumptionsFileName: string): EndeavourAssumptionsFile {
  const assumptionsPath = path.join(process.cwd(), "data", assumptionsFileName);
  const raw = fs.readFileSync(assumptionsPath, "utf-8");
  return parseFirstJsonObject(raw) as EndeavourAssumptionsFile;
}

export function computeSimplifiedDcfFromAssumptionsFile(params: {
  assumptionsFileName: string;
  goldPriceUsdPerOz: number;
  discountRatePct: number;
  yearsForward?: number; // default: 5
  startYear?: number;
  balanceDebtUsd?: number | null;
  balanceCashUsd?: number | null;
}): EndeavourDcfResult {
  const assumptions = loadAssumptionsFromRepoFile(params.assumptionsFileName);
  return computeSimplifiedDcfFromAssumptions({
    assumptions,
    goldPriceUsdPerOz: params.goldPriceUsdPerOz,
    discountRatePct: params.discountRatePct,
    yearsForward: params.yearsForward,
    startYear: params.startYear,
    balanceDebtUsd: params.balanceDebtUsd,
    balanceCashUsd: params.balanceCashUsd,
  });
}

export function computeEndeavourSimplifiedDcf(params: {
  goldPriceUsdPerOz: number;
  discountRatePct: number;
  yearsForward?: number; // default: 5
  startYear?: number;
  balanceDebtUsd?: number | null;
  balanceCashUsd?: number | null;
}): EndeavourDcfResult {
  return computeSimplifiedDcfFromAssumptionsFile({
    assumptionsFileName: "endeavour-dcf-assumptions.json",
    ...params,
  });
}

