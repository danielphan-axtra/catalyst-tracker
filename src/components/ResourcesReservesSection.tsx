import type { MineralInventoryFile } from "@/lib/mineral-inventory-types";
import { formatNumber } from "@/lib/format";
import { formatMiSummaryLine, getResourceReportingLabels } from "@/lib/mineral-inventory-labels";

function formatContained(value: number | null | undefined, unit: string | null | undefined): string {
  if (value == null || !unit) return "—";
  if (unit.includes("Moz")) return `${value.toFixed(2)} Moz`;
  if (unit.includes("Blb")) return `${value.toFixed(2)} Blb`;
  return `${formatNumber(value, value < 10 ? 2 : 1)} ${unit}`;
}

export function ResourcesReservesSection({ inventory }: { inventory: MineralInventoryFile }) {
  const { summary } = inventory;
  const isGold = inventory.commodityFocus === "gold";
  const reporting = getResourceReportingLabels(inventory);

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-semibold text-neutral-900">Mineral resources & reserves</h2>
        <p className="text-xs text-neutral-500">As of {inventory.asOfDate}</p>
      </div>
      <p className="mt-1 text-xs text-neutral-600">
        Source:{" "}
        {inventory.sourceUrl ? (
          <a href={inventory.sourceUrl} className="text-blue-700 hover:underline" target="_blank" rel="noreferrer">
            {inventory.source}
          </a>
        ) : (
          inventory.source
        )}
      </p>

      {isGold ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {summary.reserves && (
            <SummaryCard
              title="Proven & probable reserves"
              lines={[
                reporting.reservesNote || null,
                summary.reserves.containedMoz != null
                  ? `${summary.reserves.containedMoz.toFixed(1)} Moz Au (100%)`
                  : null,
                summary.reserves.attributableMoz != null
                  ? `${summary.reserves.attributableMoz.toFixed(1)} Moz attributable`
                  : null,
                summary.reserves.tonnesKt != null && summary.reserves.gradeGt != null
                  ? `${formatNumber(summary.reserves.tonnesKt, 0)} kt @ ${summary.reserves.gradeGt.toFixed(2)} g/t`
                  : null,
              ]}
            />
          )}
          {summary.measuredIndicated && (
            <SummaryCard
              title={reporting.measuredIndicatedTitle}
              lines={[
                summary.measuredIndicated.containedMoz != null
                  ? formatMiSummaryLine(
                      inventory,
                      summary.measuredIndicated.containedMoz,
                      summary.measuredIndicated.attributableMoz,
                    )
                  : null,
                summary.measuredIndicated.tonnesKt != null && summary.measuredIndicated.gradeGt != null
                  ? `${formatNumber(summary.measuredIndicated.tonnesKt, 0)} kt @ ${summary.measuredIndicated.gradeGt.toFixed(2)} g/t`
                  : null,
              ]}
            />
          )}
          {reporting.combinedExclusiveMoz != null && (
            <SummaryCard
              title="Combined gold inventory"
              lines={[
                `${reporting.combinedExclusiveMoz.toFixed(1)} Moz Au (reserves + M&I, not double-counted)`,
              ]}
            />
          )}
          {summary.inferred && (
            <SummaryCard
              title={reporting.inferredTitle}
              lines={[
                summary.inferred.containedMoz != null
                  ? `${summary.inferred.containedMoz.toFixed(1)} Moz Au`
                  : null,
                reporting.inferredNote || null,
                summary.inferred.attributableMoz != null
                  ? `${summary.inferred.attributableMoz.toFixed(1)} Moz attributable`
                  : null,
                summary.inferred.tonnesKt != null && summary.inferred.gradeGt != null
                  ? `${formatNumber(summary.inferred.tonnesKt, 0)} kt @ ${summary.inferred.gradeGt.toFixed(2)} g/t`
                  : null,
              ]}
            />
          )}
        </div>
      ) : summary.reserves?.containedCuLb || summary.measuredIndicated?.containedCuLb ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {summary.reserves?.containedCuLb != null && (
            <SummaryCard
              title="Proven & probable reserves"
              lines={[`${(summary.reserves.containedCuLb / 1e9).toFixed(2)} Blb Cu`]}
            />
          )}
          {summary.measuredIndicated?.containedCuLb != null && (
            <SummaryCard
              title={reporting.measuredIndicatedTitle.replace(" gold", "").replace("Au", "Cu")}
              lines={[
                `${(summary.measuredIndicated.containedCuLb / 1e9).toFixed(2)} Blb Cu ${
                  inventory.resourceReporting?.measuredIndicatedIncludesReserves
                    ? "(incl. reserves)"
                    : "(excl. reserves)"
                }`,
              ]}
            />
          )}
          {summary.containedCuEqLb != null && (
            <SummaryCard
              title="CuEq (summary)"
              lines={[`${(summary.containedCuEqLb / 1e9).toFixed(2)} Blb CuEq`]}
            />
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryCard
            title="Mineral inventory (inferred / pre-production)"
            lines={[
              summary.resourceTonnesMt != null
                ? `${summary.resourceTonnesMt.toFixed(1)} Mt @ ${summary.resourceCuEqPct?.toFixed(2) ?? "—"}% CuEq`
                : null,
              summary.containedCuEqLb != null
                ? `${(summary.containedCuEqLb / 1e9).toFixed(2)} Blb CuEq contained`
                : null,
              summary.reserves?.containedMoz == null && !summary.reserves?.containedCuLb
                ? "No mineral reserves declared"
                : null,
            ]}
          />
          <SummaryCard
            title="Contained metals"
            lines={[
              summary.containedCuLb != null
                ? `${(summary.containedCuLb / 1e9).toFixed(2)} Blb Cu`
                : null,
              summary.containedAuOz != null
                ? `${(summary.containedAuOz / 1e6).toFixed(2)} Moz Au`
                : null,
              summary.containedAgOz != null
                ? `${(summary.containedAgOz / 1e6).toFixed(2)} Moz Ag`
                : null,
            ]}
          />
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs font-medium uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-3">Deposit</th>
              <th className="py-2 pr-3">Category</th>
              <th className="py-2 pr-3">Classification</th>
              <th className="py-2 pr-3 text-right">Tonnes</th>
              <th className="py-2 pr-3 text-right">Grade</th>
              <th className="py-2 text-right">Contained</th>
            </tr>
          </thead>
          <tbody>
            {inventory.rows.map((row, i) => (
              <tr key={`${row.deposit}-${row.classification}-${i}`} className="border-b border-neutral-50">
                <td className="py-2 pr-3 font-medium text-neutral-900">{row.deposit}</td>
                <td className="py-2 pr-3 capitalize text-neutral-700">{row.category}</td>
                <td className="py-2 pr-3 text-neutral-700">{row.classification}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                  {row.tonnesKt != null ? `${formatNumber(row.tonnesKt, 0)} kt` : "—"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-neutral-800">
                  {row.grade != null && row.gradeUnit ? `${row.grade} ${row.gradeUnit}` : "—"}
                </td>
                <td className="py-2 text-right tabular-nums text-neutral-800">
                  {formatContained(row.attributableContained ?? row.containedMetal, row.containedUnit)}
                  {row.attributablePct != null && row.attributableContained != null && (
                    <span className="block text-xs text-neutral-500">{row.attributablePct}% attr.</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inventory.disclaimers && inventory.disclaimers.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-neutral-500">
          {inventory.disclaimers.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SummaryCard({ title, lines }: { title: string; lines: (string | null)[] }) {
  const visible = lines.filter(Boolean) as string[];
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{title}</div>
      <ul className="mt-1 space-y-0.5 text-sm text-neutral-800">
        {visible.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
