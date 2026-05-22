import Link from "next/link";
import type { Company, Catalyst } from "@prisma/client";
import { getLatestInvestorPresentationUrl } from "@/lib/investor-presentation";

type CompanyWithCatalysts = Company & { catalysts: Catalyst[] };

export async function CompanyOverview({ company }: { company: CompanyWithCatalysts }) {
  const latestInvestorPresentationUrl = company.website
    ? await getLatestInvestorPresentationUrl(company.website)
    : null;
  const investorPresentationUrl = latestInvestorPresentationUrl ?? company.website ?? null;

  return (
    <div>
      <nav className="mb-4 text-sm text-neutral-500">
        <Link href="/companies" className="hover:text-neutral-900">
          Companies
        </Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-600">{company.name}</span>
      </nav>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-3xl font-bold text-neutral-900">{company.name}</h1>
        <span className="font-mono text-lg text-neutral-500">{company.symbol}</span>
        <span className="rounded-full bg-neutral-200 px-3 py-0.5 text-sm font-medium text-neutral-700 capitalize">
          {company.industry}
        </span>
      </div>
      {company.website && (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:underline"
          >
            Visit company website
            <span aria-hidden>↗</span>
          </a>
          {investorPresentationUrl && (
            <a
              href={investorPresentationUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:underline"
            >
              Investor presentation
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
