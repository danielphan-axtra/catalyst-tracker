import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Editor dashboard | Equity Catalyst Tracker",
  description: "Update your company's upcoming catalysts.",
};

export default function EditorDashboardPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-black">Editor dashboard</h1>
      <p className="mt-2 text-black/70">
        Company editors can log in to update their upcoming catalysts (title, description, timing, importance).
      </p>
      <div className="mt-8 rounded-xl border border-black/10 bg-white p-6">
        <p className="text-black/80">
          Authentication is not yet wired. Once you integrate NextAuth with your provider and
          link editors to companies, this page can list the companies you edit and allow CRUD on
          catalysts.
        </p>
        <Link
          href="/signin"
          className="mt-4 inline-block font-medium text-[#7961A9] hover:underline"
        >
          Go to sign in →
        </Link>
      </div>
    </div>
  );
}
