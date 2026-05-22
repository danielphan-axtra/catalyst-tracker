import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Equity Catalyst Tracker",
  description: "About Equity Catalyst Tracker — catalyst intelligence for Metals & Mining.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-neutral-900">About</h1>
      <div className="mt-8 space-y-6 text-neutral-700 leading-relaxed">
        <p>
          Equity Catalyst Tracker is a focused tool for tracking upcoming catalysts for companies
          listed on the Toronto Venture Exchange in the Metals &amp; Mining sector.
        </p>
        <p>
          We aggregate and present key events—drill results, feasibility study completions,
          quarterly results, and more—with expected timing and, for subscribers, concise
          analysis of how each catalyst could impact share prices.
        </p>
        <p>
          Our goal is to keep the interface sleek and data-dense, inspired by the clarity of
          Google Finance, Bloomberg, and modern financial dashboards, so you can quickly see
          what matters and when.
        </p>
      </div>
    </div>
  );
}
