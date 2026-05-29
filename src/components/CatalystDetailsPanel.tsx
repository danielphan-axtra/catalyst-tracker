"use client";

import { useState } from "react";
import type { CatalystAnalysisPayload } from "@/lib/catalyst-analysis-types";

export function CatalystDetailsPanel({
  analysis,
  forceOpen = false,
}: {
  analysis: CatalystAnalysisPayload;
  /** When true, always show full analysis (e.g. Gantt modal). */
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(forceOpen);
  const expanded = forceOpen || open;

  const hasWatch = (analysis.watchItems?.length ?? 0) > 0;
  const hasBullBear = Boolean(analysis.bullCase || analysis.bearCase);

  return (
    <div className="mt-2">
      {!forceOpen && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs font-medium text-[#7961A9] hover:text-[#6a5296] hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? "Hide Details" : "More Details..."}
        </button>
      )}
      {expanded && (
        <div className="mt-3 space-y-4 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 text-sm text-neutral-800">
          {analysis.companyContext && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Company & project context
              </h4>
              <p className="mt-1.5 leading-relaxed">{analysis.companyContext}</p>
            </div>
          )}

          {analysis.sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {section.title}
              </h4>
              {section.paragraphs?.map((p) => (
                <p key={p.slice(0, 48)} className="mt-1.5 leading-relaxed">
                  {p}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 && (
                <ul className="mt-1.5 list-disc space-y-1 pl-4">
                  {section.bullets.map((b) => (
                    <li key={b.slice(0, 48)} className="leading-relaxed">
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {hasBullBear && (
            <div className="grid gap-3 sm:grid-cols-2">
              {analysis.bullCase && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
                  <h4 className="text-xs font-semibold uppercase text-emerald-800">Bull case</h4>
                  <p className="mt-1 leading-relaxed text-emerald-900/90">{analysis.bullCase}</p>
                </div>
              )}
              {analysis.bearCase && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
                  <h4 className="text-xs font-semibold uppercase text-amber-900">Bear case</h4>
                  <p className="mt-1 leading-relaxed text-amber-950/90">{analysis.bearCase}</p>
                </div>
              )}
            </div>
          )}

          {hasWatch && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                What to watch
              </h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {analysis.watchItems!.map((item) => (
                  <li key={item.slice(0, 48)} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
