import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-900 text-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Product
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/companies" className="text-neutral-300 hover:text-white transition-colors">
                  Companies
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-neutral-300 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/editor" className="text-neutral-300 hover:text-white transition-colors">
                  Editor login
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Company
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/about" className="text-neutral-300 hover:text-white transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-neutral-300 hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-neutral-300 hover:text-white transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Legal
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link href="/terms" className="text-neutral-300 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-neutral-300 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm text-neutral-400">
              Equity Catalyst Tracker. TSX &amp; TSXV Metals &amp; Mining catalyst intelligence.
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
