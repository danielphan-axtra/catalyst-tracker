import { OperatingCashFlowCharts } from "@/components/OperatingCashFlowCharts";
import {
  buildOperatingCashFlowPoints,
  loadOperatingCashFlowFromRepoFile,
} from "@/lib/operating-cashflow";

export function OperatingCashFlowSection({
  assumptionsFileName,
  companyName,
}: {
  assumptionsFileName: string;
  companyName: string;
}) {
  try {
    const file = loadOperatingCashFlowFromRepoFile(assumptionsFileName);
    const rows = buildOperatingCashFlowPoints(file, file.chartYears);
    return (
      <OperatingCashFlowCharts
        rows={rows}
        companyName={companyName}
        assumptionsSource={file.source}
        currency={file.currency ?? "USD"}
      />
    );
  } catch {
    return (
      <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-neutral-900">Cash flow analysis</h2>
        <p className="mt-2 text-sm text-neutral-600">
          {companyName} cash flow assumptions not found. Add{" "}
          <span className="font-mono text-neutral-900">data/{assumptionsFileName}</span>.
        </p>
      </div>
    );
  }
}
