import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pricing | Equity Catalyst Tracker",
  description: "Upgrade to access catalyst importance and impact analysis.",
};

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-black">Pricing</h1>
      <p className="mt-2 text-black/70">
        {isLoggedIn
          ? "Upgrade your account to unlock catalyst importance and impact analysis."
          : "Sign in first, then upgrade to unlock catalyst importance."}
      </p>
      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <div className="rounded-xl border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold text-black">Free</h2>
          <p className="mt-2 text-3xl font-bold text-black">$0</p>
          <p className="mt-4 text-sm text-black/70">
            Browse companies, market data, and catalyst titles, descriptions, and timing.
            Importance is locked.
          </p>
          {!isLoggedIn && (
            <Link
              href="/signin"
              className="mt-6 inline-block rounded-lg border-2 border-black px-4 py-2 text-sm font-medium text-black hover:bg-black/5"
            >
              Sign in
            </Link>
          )}
        </div>
        <div className="rounded-xl border-2 border-[#7961A9] bg-[#7961A9]/5 p-6">
          <h2 className="text-lg font-semibold text-[#7961A9]">Pro</h2>
          <p className="mt-2 text-3xl font-bold text-black">$XX/mo</p>
          <p className="mt-4 text-sm text-black/70">
            Unlock &quot;Importance&quot; on every catalyst: short explanations of potential
            share price impact.
          </p>
          <Link
            href={isLoggedIn ? "#" : "/signin"}
            className="mt-6 inline-block rounded-lg bg-[#7961A9] px-4 py-2 text-sm font-medium text-white hover:bg-[#6a5296]"
          >
            {isLoggedIn ? "Upgrade (coming soon)" : "Sign in to upgrade"}
          </Link>
        </div>
      </div>
    </div>
  );
}
