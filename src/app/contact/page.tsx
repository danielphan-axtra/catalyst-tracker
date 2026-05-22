import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Equity Catalyst Tracker",
  description: "Contact Equity Catalyst Tracker.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-black">Contact</h1>
      <div className="mt-8 space-y-6 text-black/80">
        <p>
          For general inquiries, partnership opportunities, or support:
        </p>
        <p className="font-medium text-[#7961A9]">contact@tsxvcatalyst.com</p>
        <p className="text-sm text-black/60">
          We aim to respond within 1–2 business days.
        </p>
      </div>
    </div>
  );
}
