"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CashRunwayModel } from "@/lib/cash-runway";
import {
  CHART_AXIS_LABEL_STYLE,
  CHART_AXIS_TICK_STYLE,
  CHART_GRID_STROKE,
  formatUsdMTick,
  getNiceNumericAxis,
} from "@/lib/chart-axis";
import {
  formatTimeAxisTick,
  getEvenTimeAxisTicks,
  getTimeDomain,
  pickTimeTickFormat,
  tickCountForSpan,
  toChartTs,
} from "@/lib/chart-time-axis";

function formatCashM(value: number, prefix: string) {
  return `${prefix}${value.toFixed(2)}M`;
}

type TooltipPayload = {
  payload?: {
    asOf?: string;
    ts?: number;
    barCashCadM?: number | null;
    lineCashCadM?: number;
    isForecast?: boolean;
  };
};

function ChartTooltip({
  active,
  payload,
  currencyPrefix,
  currencyCode,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  currencyPrefix: string;
  currencyCode: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const cash = row.barCashCadM ?? row.lineCashCadM;
  if (cash == null || row.ts == null) return null;
  const label = new Date(row.ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-neutral-900">{label}</p>
      <p className="text-neutral-600">
        Cash: <span className="font-mono font-medium text-neutral-900">{formatCashM(cash, currencyPrefix)}</span>{" "}
        <span className="text-xs">{currencyCode}</span>
      </p>
      {row.isForecast && (
        <p className="mt-1 text-xs text-amber-700">Forward projection from anchor date</p>
      )}
    </div>
  );
}

export function CashRunwayChart({
  model,
  currencyPrefix = "C$",
}: {
  model: CashRunwayModel;
  currencyPrefix?: string;
}) {
  const currencyCode = model.currency;
  const data = useMemo(
    () =>
      model.chartPoints.map((p) => ({
        ...p,
        ts: toChartTs(p.asOf),
      })),
    [model.chartPoints]
  );

  const { xDomain, xTicks, tickFormat } = useMemo(() => {
    const minTs = data[0]?.ts ?? 0;
    const maxTs = data[data.length - 1]?.ts ?? minTs;
    return {
      xDomain: getTimeDomain(minTs, maxTs),
      xTicks: getEvenTimeAxisTicks(minTs, maxTs, tickCountForSpan(minTs, maxTs)),
      tickFormat: pickTimeTickFormat(minTs, maxTs),
    };
  }, [data]);

  const cashYAxis = useMemo(() => {
    const values = model.chartPoints.map((p) => p.cashCadM);
    const max = Math.max(...values, model.minimumLiquidityCadM, 1);
    return getNiceNumericAxis(0, max, { tickCount: 5, includeZero: true });
  }, [model.chartPoints, model.minimumLiquidityCadM]);

  const showFinancingWindow =
    model.requiresFinancing &&
    model.financingWindowStart &&
    model.financingWindowEnd;
  const financingX1 = showFinancingWindow ? toChartTs(model.financingWindowStart!) : 0;
  const financingX2 = showFinancingWindow ? toChartTs(model.financingWindowEnd!) : 0;

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={xDomain}
            ticks={xTicks}
            tick={CHART_AXIS_TICK_STYLE}
            tickFormatter={(v) => formatTimeAxisTick(Number(v), tickFormat)}
            minTickGap={32}
            axisLine={{ stroke: "#a3a3a3" }}
            tickLine={{ stroke: "#a3a3a3" }}
          />
          <YAxis
            tick={CHART_AXIS_TICK_STYLE}
            tickFormatter={(v) => formatUsdMTick(Number(v))}
            domain={cashYAxis.domain}
            ticks={cashYAxis.ticks}
            allowDataOverflow
            label={{
              value: `Cash (${currencyPrefix}M)`,
              angle: -90,
              position: "insideLeft",
              style: CHART_AXIS_LABEL_STYLE,
            }}
          />
          <Tooltip
            content={
              <ChartTooltip currencyPrefix={currencyPrefix} currencyCode={currencyCode} />
            }
          />
          {showFinancingWindow && (
            <ReferenceArea
              x1={financingX1}
              x2={financingX2}
              fill="#f59e0b"
              fillOpacity={0.12}
              strokeOpacity={0}
              ifOverflow="extendDomain"
            />
          )}
          <ReferenceLine
            y={model.minimumLiquidityCadM}
            stroke="#dc2626"
            strokeDasharray="6 4"
            label={{
              value: `Min. liquidity ${currencyPrefix}${model.minimumLiquidityCadM.toFixed(1)}M`,
              position: "insideTopRight",
              fill: "#dc2626",
              fontSize: 12,
              fontWeight: 600,
            }}
          />
          <Bar
            dataKey="barCashCadM"
            name="Reported / pro-forma cash"
            fill="#7961A9"
            maxBarSize={48}
          />
          <Line
            type="monotone"
            dataKey="lineCashCadM"
            name="Cash path & runway"
            stroke="#0d9488"
            strokeWidth={2.5}
            dot={{ r: 2, fill: "#0d9488", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
