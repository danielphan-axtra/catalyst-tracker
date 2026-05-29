"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format, startOfDay } from "date-fns";
import { formatCatalystTiming, formatDateRange } from "@/lib/format";
import type { Catalyst } from "@prisma/client";
import { CatalystImpactInsightView } from "@/components/CatalystImpactInsight";
import { resolveCatalystView } from "@/lib/catalyst-engine";
import { CatalystDetailsPanel } from "@/components/CatalystDetailsPanel";
import {
  formatTimeAxisTick,
  getEvenTimeAxisTicks,
  pickTimeTickFormat,
  tickCountForSpan,
} from "@/lib/chart-time-axis";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getAxisTicks(rangeStart: Date, rangeEnd: Date): { date: Date; label: string }[] {
  const minTs = rangeStart.getTime();
  const maxTs = rangeEnd.getTime();
  const tickFormat = pickTimeTickFormat(minTs, maxTs);
  const tickTs = getEvenTimeAxisTicks(minTs, maxTs, tickCountForSpan(minTs, maxTs));

  return tickTs.map((ts, index) => {
    const date = new Date(ts);
    const isTodayStart =
      index === 0 && startOfDay(rangeStart).getTime() === startOfDay(new Date()).getTime();
    return {
      date,
      label: isTodayStart ? "Today" : formatTimeAxisTick(ts, tickFormat),
    };
  });
}

export function CatalystsGantt({
  catalysts,
  companyName,
  companySymbol,
}: {
  catalysts: Catalyst[];
  companyName?: string;
  companySymbol?: string;
}) {
  const { data: session } = useSession();
  const hasPaidAccess = !!session?.user?.hasPaidAccess;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const tasks = useMemo(() => {
    return catalysts
      .filter((c) => c.dateStart || c.dateEnd)
      .map((c, i) => {
        const rawStart = c.dateStart ? new Date(c.dateStart) : (c.dateEnd ? new Date(c.dateEnd) : today);
        const end = c.dateEnd ? new Date(c.dateEnd) : new Date(rawStart.getTime() + 7 * MS_PER_DAY);
        const start = rawStart.getTime() < today.getTime() ? today : rawStart;
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(end, "yyyy-MM-dd");
        return {
          id: c.id,
          catalyst: c,
          name: c.title,
          description: c.description,
          importance: c.importance,
          dateStart: c.dateStart,
          dateEnd: c.dateEnd,
          start: startStr,
          end: endStr,
          timingLabel: formatCatalystTiming(c.dateStart ?? start, end),
          progress: 0,
          custom_class: `catalyst-${i % 3}`,
        };
      });
  }, [catalysts, today]);

  const { rangeStart, rangeEnd, totalDays, axisTicks } = useMemo(() => {
    const maxDateStr = tasks.reduce(
      (acc, t) => (t.end > acc ? t.end : acc),
      tasks[0]?.end ?? format(today, "yyyy-MM-dd")
    );
    const rangeStart = today;
    const rangeEnd = new Date(maxDateStr);
    const totalDays = Math.max(1, (rangeEnd.getTime() - rangeStart.getTime()) / MS_PER_DAY);
    const axisTicks = getAxisTicks(rangeStart, rangeEnd);
    return { rangeStart, rangeEnd, totalDays, axisTicks };
  }, [tasks, today]);

  const toPercent = (d: Date) => {
    const elapsed = (d.getTime() - rangeStart.getTime()) / MS_PER_DAY;
    return Math.max(0, Math.min(100, (elapsed / totalDays) * 100));
  };

  if (tasks.length === 0) {
    return (
      <p className="mt-6 text-black/60">
        No catalysts with dates to display on the Gantt chart.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2 text-xs text-black/60">
        <span>Today: {format(today, "MMM d, yyyy")}</span>
        <span>→</span>
        <span>{format(rangeEnd, "MMM d, yyyy")}</span>
      </div>
      <div className="space-y-4">
        {tasks.map((task, index) => {
          const startDt = new Date(task.start);
          const endDt = new Date(task.end);
          const leftPct = toPercent(startDt);
          const endPct = toPercent(endDt);
          const widthPct = Math.max(1, endPct - leftPct);
          return (
            <div key={task.id} className="flex items-center gap-4">
              <div className="w-64 shrink-0">
                <div className="text-sm font-medium leading-snug text-black line-clamp-2" title={task.name}>
                  {task.name}
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                  className="mt-1 text-xs font-medium text-[#7961A9] hover:text-[#6a5296] hover:underline"
                >
                  Details …
                </button>
              </div>
              <div className="relative h-20 min-w-0 flex-1 rounded bg-black/5">
                <div
                  className="absolute top-1 bottom-1 flex items-center bg-[#56C4CF] pl-2 pr-1"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    minWidth: "12px",
                    clipPath: "polygon(0 0, calc(100% - 0.5rem) 0, 100% 50%, calc(100% - 0.5rem) 100%, 0 100%)",
                    transformOrigin: "left",
                    animation: "gantt-bar-in 0.55s ease-out forwards",
                    animationDelay: `${index * 0.07}s`,
                  }}
                  title={`${task.start} – ${task.end}`}
                >
                  {widthPct >= 8 && (
                    <span className="truncate text-xs font-medium text-white drop-shadow-sm">
                      {task.timingLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details popup overlay */}
      {expandedId && (() => {
        const task = tasks.find((t) => t.id === expandedId);
        if (!task) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedId(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Catalyst details"
          >
            <div
              className="absolute inset-0 bg-black/40"
              aria-hidden="true"
            />
            <div
              className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-black/10 bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-semibold text-black">{task.name}</h3>
                <button
                  type="button"
                  onClick={() => setExpandedId(null)}
                  className="shrink-0 rounded p-1 text-black/50 hover:bg-black/10 hover:text-black"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4 space-y-4 text-sm">
                {task.description && (
                  <div>
                    <span className="font-semibold text-black/70">Description</span>
                    <p className="mt-1 text-black/80">{task.description}</p>
                  </div>
                )}
                {task.dateStart != null || task.dateEnd != null ? (
                  <div>
                    <span className="font-semibold text-black/70">Timing</span>
                    <p className="mt-1 text-black/80">
                      {formatDateRange(task.dateStart, task.dateEnd)}
                    </p>
                  </div>
                ) : null}
                {(task.importance || task.description) && (
                  <div>
                    <span className="font-semibold text-black/70">Impact on shares</span>
                    {hasPaidAccess ? (
                      <div className="mt-2">
                        <CatalystImpactInsightView
                          impactText={task.importance}
                          title={task.name}
                          description={task.description}
                          companyName={companyName}
                          companySymbol={companySymbol}
                        />
                      </div>
                    ) : task.importance ? (
                      <div className="relative mt-1 inline-block min-h-[2.5rem] w-full">
                        <span className="select-none blur-md bg-black/20 rounded px-2 py-1 text-black/80">
                          {task.importance.slice(0, 40)}…
                        </span>
                        <Link
                          href="/pricing"
                          className="absolute inset-0 flex items-center justify-center rounded bg-white/90 text-xs font-medium text-[#7961A9] hover:bg-white"
                        >
                          Upgrade to view
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}
                <CatalystDetailsPanel
                  analysis={resolveCatalystView(task.catalyst).analysis}
                  forceOpen
                />
              </div>
            </div>
          </div>
        );
      })()}
      {/* X-axis: same 2-column layout as bars (no right column) */}
      <div className="mt-4 flex items-end gap-4">
        <div className="w-64 shrink-0" aria-hidden="true" />
        <div className="relative flex-1 border-t border-black/15 pt-2">
          {axisTicks.map((tick) => (
            <div
              key={`${tick.label}-${tick.date.getTime()}`}
              className="absolute top-0 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${toPercent(tick.date)}%` }}
            >
              <div className="h-2 w-px bg-black/20" />
              <span className="mt-1 whitespace-nowrap text-xs text-black/50">{tick.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
