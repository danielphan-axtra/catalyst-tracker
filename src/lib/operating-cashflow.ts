import * as fs from "fs";
import * as path from "path";

export type OperatingCashFlowYear = {
  calendarYear: number;
  label?: string;
  revenueUsdM: number;
  ocfUsdM: number;
  capexUsdM: number;
  financingUsdM: number;
};

export type OperatingCashFlowFile = {
  source: string;
  currency?: string;
  startYear?: number;
  chartYears?: number;
  years: OperatingCashFlowYear[];
};

export type OperatingCashFlowPoint = {
  yearIndex: number;
  yearLabel: string;
  calendarYear: number;
  periodKey: string;
  periodLabel: string;
  revenueUsdM: number;
  ocfUsdM: number;
  capexUsdM: number;
  financingUsdM: number;
  fcfUsdM: number;
};

export function loadOperatingCashFlowFromRepoFile(fileName: string): OperatingCashFlowFile {
  const filePath = path.join(process.cwd(), "data", fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as OperatingCashFlowFile;
}

export function buildOperatingCashFlowPoints(
  file: OperatingCashFlowFile,
  chartYears?: number,
): OperatingCashFlowPoint[] {
  const limit = chartYears ?? file.chartYears ?? file.years.length;
  return file.years.slice(0, limit).map((y, index) => {
    const calendarYear = y.calendarYear;
    const yearLabel = y.label ?? `FY${String(calendarYear).slice(-2)}`;
    return {
      yearIndex: index + 1,
      yearLabel,
      calendarYear,
      periodKey: String(calendarYear),
      periodLabel: yearLabel,
      revenueUsdM: y.revenueUsdM,
      ocfUsdM: y.ocfUsdM,
      capexUsdM: y.capexUsdM,
      financingUsdM: y.financingUsdM,
      fcfUsdM: y.ocfUsdM + y.capexUsdM + y.financingUsdM,
    };
  });
}
