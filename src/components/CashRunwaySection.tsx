import type { CashRunwayModel } from "@/lib/cash-runway";
import { CashRunwayChart } from "@/components/CashRunwayChart";

function moneyPrefix(currency: CashRunwayModel["currency"]): string {
  if (currency === "USD") return "$";
  if (currency === "GBP") return "£";
  return "C$";
}

function formatMonths(value: number | null): string {
  if (value == null) return "—";
  if (value < 0) return "Below buffer now";
  if (value < 12) return `${value.toFixed(1)} months`;
  const years = value / 12;
  return `${years.toFixed(1)} years (${value.toFixed(0)} mo.)`;
}

export function CashRunwaySection({ model }: { model: CashRunwayModel }) {
  const prefix = moneyPrefix(model.currency);

  const burnLabel = model.selfFunding
    ? "Monthly net cash (est.)"
    : "Monthly burn (est.)";

  const burnValue = model.selfFunding
    ? `+${prefix}${model.monthlyNetCashChangeCadM.toFixed(2)}M`
    : `${prefix}${model.monthlyBurnCadM.toFixed(2)}M`;

  const burnHint = model.selfFunding
    ? "Positive projected FCF—cash balance expected to build"
    : model.monthlyBurnNote;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Cash runway</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600">
            Forward-looking treasury outlook for {model.companyDisplayName} from the latest
            published cash balance ({model.forecastStartDate}). Historical bars are filings only;
            the teal line projects from today using the same cash-flow assumptions as the chart
            above.
          </p>
        </div>
        <div className="rounded-lg bg-violet-50 px-3 py-2 text-right text-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-violet-700">
            Forward anchor cash
          </div>
          <div className="font-mono text-lg font-semibold text-violet-900">
            {prefix}
            {model.forecastStartCashCadM.toFixed(2)}M
          </div>
          <div className="text-xs text-violet-600">as of {model.forecastStartDate}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={burnLabel} value={burnValue} hint={burnHint} />
        <MetricCard
          label="Runway to min. liquidity"
          value={
            model.selfFunding
              ? "Not required"
              : formatMonths(model.monthsToMinimumLiquidity)
          }
          hint={
            model.selfFunding
              ? "Projected FCF covers operations"
              : `Below ${prefix}${model.minimumLiquidityCadM.toFixed(1)}M buffer`
          }
        />
        <MetricCard
          label="Financing window (est.)"
          value={
            model.requiresFinancing && model.financingWindowStart && model.financingWindowEnd
              ? `${model.financingWindowStart} – ${model.financingWindowEnd}`
              : model.selfFunding
                ? "None (self-funding)"
                : "—"
          }
          hint={
            model.requiresFinancing
              ? "Forward window when cash may approach stress (never historical)"
              : "No capital raise implied by forward cash flow"
          }
        />
        <MetricCard
          label="Cash depletion (est.)"
          value={model.cashDepletionDate ?? (model.selfFunding ? "N/A" : "—")}
          hint={
            model.selfFunding
              ? "Cash expected to grow at projected FCF"
              : "At constant forward burn, no new capital"
          }
        />
      </div>

      <div className="mt-6">
        <CashRunwayChart model={model} currencyPrefix={prefix} />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#7961A9]" />
          Reported cash (historical)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-teal-600" />
          Forward cash path
        </span>
        {model.requiresFinancing && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-8 rounded-sm bg-amber-400/30" />
            Estimated forward financing window
          </span>
        )}
      </div>

      <details className="mt-4 text-sm text-neutral-600">
        <summary className="cursor-pointer font-medium text-neutral-800">Methodology & sources</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {model.methodology.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-2.5">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 font-medium text-neutral-900">{value}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{hint}</div>
    </div>
  );
}
