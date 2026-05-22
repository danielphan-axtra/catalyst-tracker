import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Equity Catalyst Tracker",
  description: "Terms of Service for Equity Catalyst Tracker.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-black">Terms of Service</h1>
      <p className="mt-2 text-sm text-black/60">Last updated: February 2025</p>
      <div className="mt-8 space-y-6 text-black/80 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-black">1. Acceptance</h2>
          <p>
            By using Equity Catalyst Tracker (&quot;Service&quot;), you agree to these Terms of
            Service. If you do not agree, do not use the Service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">2. Use of the Service</h2>
          <p>
            The Service provides catalyst and market data for informational purposes only. It
            does not constitute investment, legal, or tax advice. You are responsible for your
            own investment decisions.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">3. Accounts</h2>
          <p>
            You may need to register to access certain features. You must provide accurate
            information and keep your account secure. Paid subscriptions are subject to the
            pricing and billing terms displayed at the time of purchase.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">4. Intellectual Property</h2>
          <p>
            The Service and its content are owned by us or our licensors. You may not copy,
            modify, or distribute our content without permission.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">5. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, we are not liable for any indirect,
            incidental, or consequential damages arising from your use of the Service.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">6. Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the Service after
            changes constitutes acceptance of the new terms.
          </p>
        </section>
      </div>
    </div>
  );
}
