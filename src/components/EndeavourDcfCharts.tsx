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

import type { EndeavourDcfPoint } from "@/lib/endeavour-dcf";
import {
  CHART_AXIS_LABEL_STYLE,
  CHART_AXIS_TICK_STYLE,
  CHART_GRID_STROKE,
  CHART_TOOLTIP_STYLE,
  formatCountTick,
  formatPriceTick,
  formatUsdMTick,
  getNiceNumericAxis,
} from "@/lib/chart-axis";
import {
  formatDcfPeriodCategoryLabel,
  inferDcfStartYear,
  parseYearFromLabel,
} from "@/lib/chart-time-axis";

function formatUsdM(value: number) {
  const v = Number.isFinite(value) ? value : 0;
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);
  return `${sign}$${abs.toFixed(1)}M`;
}

export function EndeavourDcfCharts({
  rows,
  navUsdM,
  nav5UsdM,
  goldPriceUsdPerOz,
  discountRatePct,
  goldPriceInput,
  commodityName = "Gold",
  commodityPriceUnit = "USD/oz",
  spotCommodityPrice = null,
  impliedNavAtSpotUsdM = null,
  productionUnitLabel = "Koz",
  productionValueSuffix = " koz",
  costUnitLabel = "$/oz",
  costSeriesLabel = "AISC",
  dfsPreTaxNpv8UsdM = null,
  priceInputMin = 500,
  priceInputStep = 25,
  startYear,
  assumptionsSource = null,
}: {
  rows: EndeavourDcfPoint[];
  navUsdM: number;
  nav5UsdM: number;
  goldPriceUsdPerOz: number;
  discountRatePct: number;
  goldPriceInput?: {
    value: number;
    onChange: (v: number) => void;
  };
  commodityName?: string;
  commodityPriceUnit?: string;
  spotCommodityPrice?: number | null;
  impliedNavAtSpotUsdM?: number | null;
  productionUnitLabel?: string;
  productionValueSuffix?: string;
  costUnitLabel?: string;
  costSeriesLabel?: string;
  dfsPreTaxNpv8UsdM?: number | null;
  priceInputMin?: number;
  priceInputStep?: number;
  /** First calendar year on the x-axis (e.g. 2026). Inferred from row labels when omitted. */
  startYear?: number;
  assumptionsSource?: string | null;
}) {
  const modelStartYear = inferDcfStartYear(rows, startYear);
  const pointCount = rows.length;
  const maxBarSize = Math.min(52, Math.max(28, Math.floor(300 / Math.max(pointCount, 1))));

  const cashFlowData = rows.map((r) => {
    const ocfUsdM = r.ocfUsdM;
    const capexUsdM = r.capexUsdM;
    const financingUsdM = r.financingUsdM;
    // Trust the chart axis components rather than the precomputed field
    // to keep FCF exactly consistent with what the user sees in OCF/Capex/Financing.
    const fcfUsdM = ocfUsdM + capexUsdM + financingUsdM;
    const calendarYear =
      parseYearFromLabel(r.yearLabel) > 0
        ? parseYearFromLabel(r.yearLabel)
        : modelStartYear + r.yearIndex - 1;
    return {
      yearLabel: r.yearLabel,
      calendarYear,
      periodKey: String(calendarYear),
      periodLabel: formatDcfPeriodCategoryLabel(calendarYear),
      ocfUsdM,
      capexUsdM,
      financingUsdM,
      fcfUsdM,
    };
  });

  const mineNames = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.mineProductionKozByAsset ?? {})).filter(Boolean))
  );
  const productionData = rows.map((r) => {
    const byMine = r.mineProductionKozByAsset ?? {};
    const calendarYear =
      parseYearFromLabel(r.yearLabel) > 0
        ? parseYearFromLabel(r.yearLabel)
        : modelStartYear + r.yearIndex - 1;
    return {
      yearLabel: r.yearLabel,
      calendarYear,
      periodKey: String(calendarYear),
      periodLabel: formatDcfPeriodCategoryLabel(calendarYear),
      productionKoz: r.productionKoz,
      aiscUsdPerOz: r.aiscUsdPerOz,
      ...Object.fromEntries(mineNames.map((name) => [name, byMine[name] ?? 0])),
    };
  });

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

  const productionTotals = productionData.map((d) => d.productionKoz);
  const aiscValues = productionData.map((d) => d.aiscUsdPerOz);
  const productionAxis = getNiceNumericAxis(
    0,
    Math.max(...productionTotals, 0),
    { tickCount: 6, floorAtZero: true },
  );
  const aiscAxis =
    aiscValues.length > 0
      ? getNiceNumericAxis(Math.min(...aiscValues), Math.max(...aiscValues), { tickCount: 5 })
      : getNiceNumericAxis(0, 3000, { tickCount: 5 });
  const palette = ["#7961A9", "#56C4CF", "#8B5CF6", "#F59E0B", "#10B981", "#0EA5E9", "#EF4444"];
  const fcfLineColor = "#16A34A";
  const aiscLineColor = "#7961A9";
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
  const productionLegendItems =
    mineNames.length > 0
      ? mineNames.map((mineName, index) => ({
          label: mineName,
          color: palette[index % palette.length],
        }))
      : [{ label: "Production", color: "#7961A9" }];

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {dfsPreTaxNpv8UsdM != null ? "Feasibility study — DCF & NAV" : "DCF & NAV (simplified)"}
          </h2>
          {dfsPreTaxNpv8UsdM != null && (
            <p className="mt-1 text-sm text-neutral-700">
              DFS pre-tax NPV<sub>8</sub> (study):{" "}
              <span className="font-semibold tabular-nums text-neutral-900">
                {formatUsdM(dfsPreTaxNpv8UsdM)}
              </span>
              {" · "}
              Model NAV (scenario): <span className="font-semibold tabular-nums">{formatUsdM(navUsdM)}</span>
            </p>
          )}
          <p className="mt-1 text-sm text-neutral-600">
            {commodityName} price scenario:{" "}
            <span className="font-mono">
              ${goldPriceUsdPerOz.toFixed(2)}/{commodityPriceUnit.replace(/^USD\//, "")}
            </span>{" "}
            · Discount{" "}
            <span className="font-mono">{discountRatePct.toFixed(2)}%</span>
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Cash flow: OCF = ({commodityName} price − {costSeriesLabel}) × production (by mine plan); capex from
            mine-level schedules. Change the price input to rerun the scenario.
          </p>
          {assumptionsSource && (
            <p className="mt-1 text-xs text-neutral-400 line-clamp-2" title={assumptionsSource}>
              Source: {assumptionsSource}
            </p>
          )}
        </div>
        <div className="w-full max-w-xl rounded-xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3 border-b border-neutral-200 pb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Scenario Snapshot</div>
            <div className="text-xs text-neutral-500">Spot vs input sensitivity</div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <div className="text-xs font-medium text-neutral-500">
                {commodityName?.toLowerCase().includes("gold") ||
                commodityName?.toLowerCase().includes("copper") ||
                !commodityName
                  ? `Live spot (${commodityName ?? "Gold"})`
                  : `Spot price (${commodityName})`}
              </div>
              <div className="mt-1 text-base font-semibold tabular-nums text-neutral-900">
                {Number.isFinite(spotCommodityPrice ?? NaN)
                  ? `$${Number(spotCommodityPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : "—"}
                <span className="ml-1 text-xs font-medium text-neutral-600">{commodityPriceUnit}</span>
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <div className="text-xs font-medium text-neutral-500">{commodityName} input price</div>
              {goldPriceInput ? (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-base font-semibold text-neutral-900">$</span>
                  <input
                    type="number"
                    min={priceInputMin}
                    step={priceInputStep}
                    value={goldPriceInput.value}
                    onChange={(e) => goldPriceInput.onChange(Number(e.target.value) || 0)}
                    className="w-28 rounded-md border border-neutral-300 bg-white px-2 py-1 text-base font-semibold text-neutral-900"
                  />
                  <span className="text-xs font-medium text-neutral-600">{commodityPriceUnit}</span>
                </div>
              ) : (
                <div className="mt-1 text-base font-semibold tabular-nums text-neutral-900">
                  ${goldPriceUsdPerOz.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <span className="ml-1 text-xs font-medium text-neutral-600">{commodityPriceUnit}</span>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <div className="text-xs font-medium text-neutral-500">Spot NAV</div>
              <div className="mt-1 text-base font-semibold tabular-nums text-neutral-900">
                {Number.isFinite(impliedNavAtSpotUsdM ?? NaN) ? formatUsdM(Number(impliedNavAtSpotUsdM)) : "—"}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2">
              <div className="text-xs font-medium text-neutral-500">Input NAV</div>
              <div className="mt-1 text-base font-semibold tabular-nums text-neutral-900">{formatUsdM(navUsdM)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-lg p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">Annual cash flow</h3>
            <div className="text-xs text-neutral-500">OCF / Capex / Financing bars + FCF line</div>
          </div>
          <div className="h-[27rem]">
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
                  yAxisId="left"
                  tick={CHART_AXIS_TICK_STYLE}
                  axisLine={{ stroke: "#a3a3a3" }}
                  tickLine={{ stroke: "#a3a3a3" }}
                  tickFormatter={(v) => formatUsdMTick(Number(v))}
                  width={76}
                  domain={cashFlowAxis.domain}
                  ticks={cashFlowAxis.ticks}
                  allowDataOverflow
                >
                  <Label value="$M" position="insideTopLeft" offset={4} style={CHART_AXIS_LABEL_STYLE} />
                </YAxis>
                <ReferenceLine yAxisId="left" y={0} stroke="#00000030" strokeDasharray="4 4" />
                <Tooltip
                  formatter={(value: any, name: any) => {
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
                    return [formatUsdM(Number(value)), label];
                  }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: "#262626", fontWeight: 600, fontSize: 13 }}
                  itemStyle={{ color: "#404040", fontSize: 13 }}
                  labelFormatter={(key) => {
                    const row = cashFlowData.find((d) => d.periodKey === key);
                    return row?.periodLabel ?? String(key);
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="ocfUsdM"
                  name="Operating cash flow"
                  fill="#56C4CF"
                  stackId="cf"
                  maxBarSize={maxBarSize}
                />
                <Bar
                  yAxisId="left"
                  dataKey="capexUsdM"
                  name="Capex"
                  fill="#8B5CF6"
                  stackId="cf"
                  maxBarSize={maxBarSize}
                />
                <Bar
                  yAxisId="left"
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
                  yAxisId="left"
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
              Financing reflects estimated debt service (principal + interest) from balance-sheet debt when
              available, or values in assumptions JSON.
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

        <div className="rounded-lg p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">Production & AISC</h3>
            <div className="text-xs text-neutral-500">Stacked production by mine + weighted AISC line</div>
          </div>
          <div className="h-[27rem]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={productionData} margin={{ top: 10, right: 12, left: 4, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                <XAxis
                  dataKey="periodKey"
                  type="category"
                  tick={CHART_AXIS_TICK_STYLE}
                  tickFormatter={(key) => {
                    const row = productionData.find((d) => d.periodKey === key);
                    return row?.periodLabel ?? key;
                  }}
                  axisLine={{ stroke: "#a3a3a3" }}
                  tickLine={{ stroke: "#a3a3a3" }}
                  interval={0}
                  padding={{ left: 16, right: 16 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={CHART_AXIS_TICK_STYLE}
                  axisLine={{ stroke: "#a3a3a3" }}
                  tickLine={{ stroke: "#a3a3a3" }}
                  width={64}
                  domain={productionAxis.domain}
                  ticks={productionAxis.ticks}
                  tickFormatter={(v) => formatCountTick(Number(v))}
                  allowDataOverflow
                >
                  <Label
                    value={productionUnitLabel}
                    position="insideTopLeft"
                    offset={4}
                    style={CHART_AXIS_LABEL_STYLE}
                  />
                </YAxis>
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={CHART_AXIS_TICK_STYLE}
                  axisLine={{ stroke: "#a3a3a3" }}
                  tickLine={{ stroke: "#a3a3a3" }}
                  width={72}
                  domain={aiscAxis.domain}
                  ticks={aiscAxis.ticks}
                  tickFormatter={(v) => formatPriceTick(Number(v))}
                  allowDataOverflow
                >
                  <Label value={costUnitLabel} position="insideTopRight" offset={4} style={CHART_AXIS_LABEL_STYLE} />
                </YAxis>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={{ color: "#262626", fontWeight: 600, fontSize: 13 }}
                  itemStyle={{ color: "#404040", fontSize: 13 }}
                  labelFormatter={(key) => {
                    const row = productionData.find((d) => d.periodKey === key);
                    return row?.periodLabel ?? String(key);
                  }}
                  formatter={(value: any, name: any) => {
                    const v = Number(value);
                    const key = String(name);
                    if (key === "aiscUsdPerOz") {
                      return [`$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, costSeriesLabel];
                    }
                    if (key === "productionKoz") return [`${v.toFixed(0)}${productionValueSuffix}`, "Production"];
                    if (mineNames.includes(key)) return [`${v.toFixed(0)}${productionValueSuffix}`, key];
                    return [`${v.toFixed(0)}`, key];
                  }}
                />
                {mineNames.length > 0 ? (
                  mineNames.map((mineName, index) => (
                    <Bar
                      key={mineName}
                      yAxisId="left"
                      dataKey={mineName}
                      name={mineName}
                      stackId="production"
                      fill={palette[index % palette.length]}
                      maxBarSize={maxBarSize}
                    />
                  ))
                ) : (
                  <Bar
                    yAxisId="left"
                    dataKey="productionKoz"
                    name="Production"
                    fill="#7961A9"
                    maxBarSize={maxBarSize}
                  />
                )}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="aiscUsdPerOz"
                  name={costSeriesLabel}
                  stroke={aiscLineColor}
                  strokeWidth={2}
                  dot={lineDotProps(aiscLineColor)}
                  activeDot={{ ...lineDotProps(aiscLineColor), r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5 text-sm text-neutral-700">
            {productionLegendItems.map((item) => (
              <div key={item.label} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
            <div className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: aiscLineColor }}
              />
              <span>{costSeriesLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

