import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Equity Catalyst Tracker",
  description: "Privacy Policy for Equity Catalyst Tracker.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-black">Privacy Policy</h1>
      <p className="mt-2 text-sm text-black/60">Last updated: February 2025</p>
      <div className="mt-8 space-y-6 text-black/80 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-black">1. Information We Collect</h2>
          <p>
            We collect information you provide when registering (e.g. email, name), usage data
            (e.g. pages visited), and payment information when you subscribe. We may use
            cookies and similar technologies for authentication and analytics.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">2. How We Use It</h2>
          <p>
            We use your information to provide and improve the Service, process payments,
            communicate with you, and comply with legal obligations.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">3. Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with service
            providers (e.g. hosting, payment processors) and when required by law.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">4. Security</h2>
          <p>
            We implement reasonable measures to protect your data. No system is completely
            secure; you use the Service at your own risk.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-black">5. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, delete, or
            port your data. Contact us to exercise these rights.
          </p>
        </section>
      </div>
    </div>
  );
}
