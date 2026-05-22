import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers | Equity Catalyst Tracker",
  description: "Careers at Equity Catalyst Tracker.",
};

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-black">Careers</h1>
      <div className="mt-8 space-y-6 text-black/80 leading-relaxed">
        <p>
          We are a small team focused on building the best catalyst intelligence product for
          TSXV Metals &amp; Mining. If you are interested in joining us, please reach out
          with your background and interests.
        </p>
        <p>
          <a href="/contact" className="font-medium text-[#7961A9] hover:underline">
            Contact us
          </a> with the subject line &quot;Careers&quot; and we&apos;ll get back to you.
        </p>
      </div>
    </div>
  );
}
