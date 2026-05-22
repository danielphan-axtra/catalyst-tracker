"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Label,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OperatingCashFlowPoint } from "@/lib/operating-cashflow";
import {
  CHART_AXIS_LABEL_STYLE,
  CHART_AXIS_TICK_STYLE,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  formatUsdMTick,
  getNiceNumericAxis,
} from "@/lib/chart-axis";

function formatCashM(value: number, prefix: string) {
  const v = Number.isFinite(value) ? value : 0;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return `${sign}${prefix}${abs.toFixed(1)}M`;
}

function currencyLabel(currency: string): string {
  const c = currency.toUpperCase();
  if (c === "GBP") return "GBP";
  if (c === "CAD") return "CAD";
  return "USD";
}

function axisUnitPrefix(currency: string): string {
  const c = currency.toUpperCase();
  if (c === "GBP") return "£";
  if (c === "CAD") return "C$";
  return "$";
}

export function OperatingCashFlowCharts({
  rows,
  companyName,
  assumptionsSource = null,
  currency = "USD",
}: {
  rows: OperatingCashFlowPoint[];
  companyName: string;
  assumptionsSource?: string | null;
  currency?: string;
}) {
  const unit = currencyLabel(currency);
  const prefix = axisUnitPrefix(currency);
  const pointCount = rows.length;
  const maxBarSize = Math.min(72, Math.max(32, Math.floor(420 / Math.max(pointCount, 1))));

  const cashFlowData = rows.map((r) => ({
    periodKey: r.periodKey,
    periodLabel: r.periodLabel,
    ocfUsdM: r.ocfUsdM,
    capexUsdM: r.capexUsdM,
    financingUsdM: r.financingUsdM,
    fcfUsdM: r.fcfUsdM,
  }));

  const cashFlowValues = cashFlowData.flatMap((d) => [
    d.ocfUsdM,
    d.capexUsdM,
    d.financingUsdM,
    d.fcfUsdM,
  ]);
  const cashFlowAxis = getNiceNumericAxis(
    Math.min(0, ...cashFlowValues),
    Math.max(0, ...cashFlowValues),
    { includeZero: true, tickCount: 6 },
  );

  const fcfLineColor = "#16A34A";
  const lineDotProps = (fill: string) => ({
    r: 4,
    fill,
    stroke: "#ffffff",
    strokeWidth: 1.5,
  });

  const cashFlowLegendItems = [
    { label: "Operating cash flow", color: "#56C4CF" },
    { label: "Capex", color: "#8B5CF6" },
    { label: "Financing", color: "#F59E0B" },
    { label: "Free cash flow", color: fcfLineColor },
  ];

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Cash flow analysis</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Annual operating, investing, and financing cash flows for {companyName} ({unit}, simplified model).
        </p>
        {assumptionsSource && (
          <p className="mt-1 text-xs text-neutral-400 line-clamp-2" title={assumptionsSource}>
            Source: {assumptionsSource}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-lg p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-neutral-900">Annual cash flow</h3>
          <div className="text-xs text-neutral-500">OCF / Capex / Financing bars + FCF line</div>
        </div>
        <div className="h-[28rem]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={cashFlowData}
              margin={{ top: 10, right: 12, left: 4, bottom: 24 }}
              stackOffset="sign"
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="periodKey"
                type="category"
                tick={CHART_AXIS_TICK_STYLE}
                tickFormatter={(key) => {
                  const row = cashFlowData.find((d) => d.periodKey === key);
                  return row?.periodLabel ?? key;
                }}
                axisLine={{ stroke: "#a3a3a3" }}
                tickLine={{ stroke: "#a3a3a3" }}
                interval={0}
                padding={{ left: 16, right: 16 }}
              />
              <YAxis
                tick={CHART_AXIS_TICK_STYLE}
                axisLine={{ stroke: "#a3a3a3" }}
                tickLine={{ stroke: "#a3a3a3" }}
                tickFormatter={(v) => formatUsdMTick(Number(v))}
                width={76}
                domain={cashFlowAxis.domain}
                ticks={cashFlowAxis.ticks}
                allowDataOverflow
              >
                <Label value={`${prefix}M`} position="insideTopLeft" offset={4} style={CHART_AXIS_LABEL_STYLE} />
              </YAxis>
              <ReferenceLine y={0} stroke="#00000030" strokeDasharray="4 4" />
              <Tooltip
                formatter={(value: unknown, name: unknown) => {
                  const key = String(name);
                  const label =
                    key === "ocfUsdM"
                      ? "Operating cash flow"
                      : key === "capexUsdM"
                        ? "Capex"
                        : key === "financingUsdM"
                          ? "Financing"
                          : key === "fcfUsdM"
                            ? "Free cash flow (FCF)"
                            : key;
                    return [formatCashM(Number(value), prefix), label];
                }}
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={{ color: "#262626", fontWeight: 600, fontSize: 13 }}
                itemStyle={{ color: "#404040", fontSize: 13 }}
                labelFormatter={(key) => {
                  const row = cashFlowData.find((d) => d.periodKey === key);
                  return row?.periodLabel ?? String(key);
                }}
              />
              <Bar dataKey="ocfUsdM" name="Operating cash flow" fill="#56C4CF" stackId="cf" maxBarSize={maxBarSize} />
              <Bar dataKey="capexUsdM" name="Capex" fill="#8B5CF6" stackId="cf" maxBarSize={maxBarSize} />
              <Bar
                dataKey="financingUsdM"
                name="Financing"
                fill="#F59E0B"
                stackId="cf"
                maxBarSize={maxBarSize}
              />
              <Line
                type="monotone"
                dataKey="fcfUsdM"
                name="Free cash flow"
                stroke={fcfLineColor}
                strokeWidth={3}
                strokeDasharray="6 4"
                dot={lineDotProps(fcfLineColor)}
                activeDot={{ ...lineDotProps(fcfLineColor), r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {cashFlowData.some((d) => Math.abs(d.financingUsdM) > 0.01) && (
          <p className="mt-2 text-center text-xs text-neutral-500">
            Financing includes debt repayment, lease payments, and other financing cash flows from filings.
          </p>
        )}
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-neutral-700">
          {cashFlowLegendItems.map((item) => (
            <div key={item.label} className="inline-flex items-center gap-1.5">
              {item.label === "Free cash flow" ? (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
              ) : (
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              )}
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
