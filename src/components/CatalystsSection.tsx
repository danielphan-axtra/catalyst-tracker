"use client";

import { useMemo, useState } from "react";
import { CatalystsTable } from "./CatalystsTable";
import { CatalystsGantt } from "./CatalystsGantt";
import type { Catalyst } from "@prisma/client";
import { filterUpcomingCatalysts } from "@/lib/catalyst-engine";

type ViewMode = "table" | "gantt";

export function CatalystsSection({
  catalysts,
  companyName,
  companySymbol,
}: {
  catalysts: Catalyst[];
  companyName?: string;
  companySymbol?: string;
}) {
  const [view, setView] = useState<ViewMode>("table");

  const ordered = useMemo(() => {
    const upcoming = filterUpcomingCatalysts(catalysts);
    return [...upcoming].sort((a, b) => {
      const aStart = a.dateStart ?? a.dateEnd;
      const bStart = b.dateStart ?? b.dateEnd;
      if (!aStart && !bStart) return 0;
      if (!aStart) return 1;
      if (!bStart) return -1;
      return new Date(aStart).getTime() - new Date(bStart).getTime();
    });
  }, [catalysts]);

  return (
    <div className="rounded-xl bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-neutral-900">Upcoming catalysts</h2>
        <div className="flex rounded-lg border border-neutral-200 p-1">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "table" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setView("gantt")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              view === "gantt" ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Gantt
          </button>
        </div>
      </div>
      {ordered.length === 0 ? (
        <p className="mt-6 text-neutral-500">No upcoming catalysts with future expected dates.</p>
      ) : view === "table" ? (
        <CatalystsTable
          catalysts={ordered}
          companyName={companyName}
          companySymbol={companySymbol}
        />
      ) : (
        <CatalystsGantt
          catalysts={ordered}
          companyName={companyName}
          companySymbol={companySymbol}
        />
      )}
    </div>
  );
}
