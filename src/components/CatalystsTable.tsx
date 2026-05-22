"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatCatalystTiming } from "@/lib/format";
import type { Catalyst } from "@prisma/client";
import { CatalystImpactInsightView } from "@/components/CatalystImpactInsight";

export function CatalystsTable({
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

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="min-w-full table-fixed divide-y divide-black/10">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[42%]" />
          <col className="w-[15%]" />
          <col className="w-[25%]" />
        </colgroup>
        <thead>
          <tr className="text-left text-sm text-black/60">
            <th className="pb-3 font-semibold">Title</th>
            <th className="pb-3 font-semibold">Description</th>
            <th className="pb-3 font-semibold">Timing</th>
            <th className="pb-3 font-semibold">Impact</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {catalysts.map((c) => (
            <tr key={c.id} className="text-sm">
              <td className="py-4 pr-4 font-medium text-black align-top">{c.title}</td>
              <td className="py-4 pr-4 text-black/80 align-top">{c.description}</td>
              <td className="py-4 pr-4 text-black/80 whitespace-nowrap align-top">
                {formatCatalystTiming(c.dateStart, c.dateEnd)}
              </td>
              <td className="py-4 align-top">
                {c.importance ? (
                  <ImportanceCell
                    text={c.importance}
                    title={c.title}
                    description={c.description}
                    companyName={companyName}
                    companySymbol={companySymbol}
                    hasPaidAccess={hasPaidAccess}
                  />
                ) : (
                  <span className="text-black/40">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportanceCell({
  text,
  title,
  description,
  companyName,
  companySymbol,
  hasPaidAccess,
}: {
  text: string;
  title: string;
  description: string;
  companyName?: string;
  companySymbol?: string;
  hasPaidAccess: boolean;
}) {
  if (hasPaidAccess) {
    return (
      <CatalystImpactInsightView
        impactText={text}
        title={title}
        description={description}
        companyName={companyName}
        companySymbol={companySymbol}
      />
    );
  }
  return (
    <div className="relative inline-block">
      <span className="select-none blur-md bg-black/20 rounded px-2 py-1">
        {text.slice(0, 30)}…
      </span>
      <Link
        href="/pricing"
        className="absolute inset-0 flex items-center justify-center rounded bg-white/90 text-xs font-medium text-[#7961A9] hover:bg-white"
      >
        Upgrade to view
      </Link>
    </div>
  );
}
