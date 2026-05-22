"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Bar,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CHART_AXIS_TICK_STYLE,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
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

type Point = { date: string; price: number; volume: number };

const RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "Max"] as const;
type RangeKey = (typeof RANGES)[number];

function filterDataByRange(data: Point[], range: RangeKey): Point[] {
  if (data.length === 0) return [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  switch (range) {
    case "1D":
      return data.filter((p) => p.date === today).length > 0
        ? data.filter((p) => p.date === today)
        : data.slice(-1);
    case "5D":
      return data.slice(-5);
    case "1M": {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
      const cutStr = cutoff.toISOString().slice(0, 10);
      const result = data.filter((p) => p.date >= cutStr);
      return result.length > 0 ? result : data.slice(-30);
    }
    case "6M": {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 6);
      const cutStr = cutoff.toISOString().slice(0, 10);
      const result = data.filter((p) => p.date >= cutStr);
      return result.length > 0 ? result : data.slice(-60);
    }
    case "YTD": {
      const y = now.getFullYear();
      const cutStr = `${y}-01-01`;
      const result = data.filter((p) => p.date >= cutStr);
      return result.length > 0 ? result : data.slice(-60);
    }
    case "1Y": {
      const cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      const cutStr = cutoff.toISOString().slice(0, 10);
      const result = data.filter((p) => p.date >= cutStr);
      return result.length > 0 ? result : data.slice(-120);
    }
    case "5Y": {
      const cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() - 5);
      const cutStr = cutoff.toISOString().slice(0, 10);
      const result = data.filter((p) => p.date >= cutStr);
      return result.length > 0 ? result : [...data];
    }
    case "Max":
    default:
      return [...data];
  }
}

function toTs(date: string): number {
  return toChartTs(date);
}

export function StockChart({
  symbol,
  data,
  stockPrice,
  fillHeight,
}: {
  symbol: string;
  data: Point[];
  stockPrice?: number | null;
  fillHeight?: boolean;
}) {
  const [range, setRange] = useState<RangeKey>("Max");

  const filteredData = useMemo(() => filterDataByRange(data, range), [data, range]);
  const chartData = useMemo(
    () => filteredData.map((point) => ({ ...point, ts: toTs(point.date) })),
    [filteredData]
  );
  const { xDomain, xAxisTicks, tickFormat } = useMemo(() => {
    if (chartData.length === 0) {
      return { xDomain: [0, 1] as [number, number], xAxisTicks: [] as number[], tickFormat: "day" as const };
    }
    const minTs = chartData[0].ts;
    const maxTs = chartData[chartData.length - 1].ts;
    const count =
      range === "1D" ? 5 : range === "5D" ? 6 : tickCountForSpan(minTs, maxTs);
    return {
      xDomain: getTimeDomain(minTs, maxTs),
      xAxisTicks: getEvenTimeAxisTicks(minTs, maxTs, count),
      tickFormat: pickTimeTickFormat(minTs, maxTs),
    };
  }, [chartData, range]);
  const hasVolume = chartData.some((d) => d.volume > 0);
  const hasData = chartData.length > 0;

  const { periodReturn, firstPrice, lastPrice } = useMemo(() => {
    if (chartData.length === 0)
      return { periodReturn: null, firstPrice: null, lastPrice: stockPrice ?? null };
    const first = chartData[0].price;
    const last = chartData[chartData.length - 1].price;
    const periodReturn = first > 0 ? ((last - first) / first) * 100 : null;
    return { periodReturn, firstPrice: first, lastPrice: last };
  }, [chartData, stockPrice]);

  const displayPrice = stockPrice ?? lastPrice ?? null;
  const isPositive = periodReturn != null && periodReturn >= 0;

  const priceYAxis = useMemo(() => {
    if (chartData.length === 0) return null;
    const prices = chartData.map((d) => d.price);
    return getNiceNumericAxis(Math.min(...prices), Math.max(...prices), { tickCount: 6 });
  }, [chartData]);

  return (
    <div className={`rounded-xl bg-white p-4 shadow-sm ${fillHeight ? "flex min-h-0 flex-1 flex-col" : ""}`}>
      {/* Header: live price + % return (Google Finance style) */}
      <div className="mb-1 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-semibold tracking-tight text-black">
          {displayPrice != null ? `$${displayPrice.toFixed(2)}` : "—"}
        </span>
        {periodReturn != null && (
          <span
            className={`text-sm font-medium ${isPositive ? "text-emerald-600" : "text-red-600"}`}
          >
            {isPositive ? "+" : ""}
            {periodReturn.toFixed(2)}%
          </span>
        )}
        <span className="text-xs text-black/50">{symbol}</span>
      </div>

      {/* Timeframe pills */}
      <div className="mb-3 flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`px-2 py-1 text-xs font-medium transition-colors ${
              range === r ? "bg-black/20 text-black rounded font-semibold" : "text-black/60 hover:text-black"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className={fillHeight ? "min-h-[320px] flex-1" : "h-72"}>
        {hasData ? (
          <ResponsiveContainer width="100%" height={fillHeight ? 340 : 288}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7961A9" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#7961A9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={xDomain}
                ticks={xAxisTicks}
                tick={CHART_AXIS_TICK_STYLE}
                tickFormatter={(v) => formatTimeAxisTick(Number(v), tickFormat)}
                minTickGap={36}
                axisLine={{ stroke: "#a3a3a3" }}
                tickLine={{ stroke: "#a3a3a3" }}
              />
              <YAxis
                yAxisId="price"
                orientation="right"
                tick={CHART_AXIS_TICK_STYLE}
                tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                domain={priceYAxis?.domain ?? ["auto", "auto"]}
                ticks={priceYAxis?.ticks}
                allowDataOverflow
                axisLine={{ stroke: "#a3a3a3" }}
                tickLine={{ stroke: "#a3a3a3" }}
                width={56}
              />
              {hasVolume && (
                <YAxis
                  yAxisId="volume"
                  orientation="left"
                  hide
                  domain={[0, (max: number) => Math.max(max * 1.2, 1)]}
                />
              )}
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={{ color: "#262626", fontWeight: 600, fontSize: 13 }}
                itemStyle={{ color: "#404040", fontSize: 13 }}
                labelFormatter={(v) => new Date(Number(v)).toLocaleDateString()}
                formatter={(value: number, name: string) => [
                  name === "price" ? `$${Number(value).toFixed(2)}` : Number(value).toLocaleString(),
                  name === "price" ? "Price" : "Volume",
                ]}
              />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="#7961A9"
                strokeWidth={2}
                fill="url(#priceGradient)"
              />
              {hasVolume && (
                <Bar
                  yAxisId="volume"
                  dataKey="volume"
                  fill="#56C4CF"
                  opacity={0.35}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded border border-black/5 bg-black/[0.02] text-sm text-black/50">
            No price history for this range.
          </div>
        )}
      </div>
    </div>
  );
}
