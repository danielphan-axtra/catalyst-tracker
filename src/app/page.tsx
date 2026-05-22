import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-[80vh]">
      {/* Hero: image left, content right — dambisamoyo.com style */}
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid min-h-[420px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-stretch lg:gap-16">
            {/* Left: exchanges list — same font as title, one per row */}
            <div className="flex flex-col justify-center gap-1 text-left">
              {["TSX", "TSX Venture Exchange", "LSE", "ASX", "CSE", "NASDAQ", "NYSE"].map((label) => (
                <span
                  key={label}
                  className="block font-sans font-light tracking-tight text-neutral-900 text-xl sm:text-2xl"
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex flex-col justify-center">
              <h1 className="font-sans text-4xl font-light tracking-tight text-neutral-900 sm:text-5xl lg:text-[2.75rem]">
                Equity Catalyst Tracker
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-600">
                Track upcoming catalysts for TSX and TSXV Metals &amp; Mining companies.
                Drill results, feasibility studies, quarterly results—all in one place.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/companies"
                  className="inline-block border border-neutral-900 bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  Browse companies
                </Link>
                <Link
                  href="/pricing"
                  className="inline-block border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400 hover:bg-neutral-50"
                >
                  Unlock catalyst importance
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <h2 className="font-sans text-2xl font-light text-neutral-900 sm:text-3xl">
          Why track catalysts?
        </h2>
        <p className="mt-4 max-w-2xl text-neutral-600">
          Metals &amp; Mining names move on specific events. Know when drill results,
          feasibility studies, and earnings land—and prioritize by impact.
        </p>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Upcoming catalysts", desc: "Headlines, descriptions, and expected dates or ranges for every company." },
            { title: "Impact analysis", desc: "Subscriber-only: short explanations of how each catalyst could move the share price." },
            { title: "Market data", desc: "Live price, 52w range, volume, market cap, balance sheet, and enterprise value." },
          ].map((item) => (
            <div
              key={item.title}
              className="border-b border-neutral-200 pb-6 transition-colors hover:border-neutral-300"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-neutral-900 text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <h2 className="font-sans text-2xl font-light sm:text-3xl">
              Ready to stay ahead?
            </h2>
            <p className="mt-4 max-w-xl text-neutral-300">
              Create an account, add companies to your watchlist, and subscribe to see
              catalyst importance and impact analysis.
            </p>
            <Link
              href="/pricing"
              className="mt-8 inline-block border border-white bg-white px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
