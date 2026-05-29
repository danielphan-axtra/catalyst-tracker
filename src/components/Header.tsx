"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import clsx from "clsx";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/companies", label: "Companies" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/careers", label: "Careers" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuth = status === "authenticated" && session?.user;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-neutral-900 hover:text-neutral-600 transition-colors"
        >
          Equity Catalyst Tracker
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "text-sm font-medium transition-colors",
                pathname === href
                  ? "text-neutral-900"
                  : "text-neutral-600 hover:text-neutral-900"
              )}
            >
              {label}
            </Link>
          ))}
          {isAuth ? (
            <>
              {!session.user.hasPaidAccess && (
                <Link
                  href="/pricing"
                  className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  Upgrade
                </Link>
              )}
              <span className="text-sm text-neutral-500 truncate max-w-[140px]">
                {session.user.email ?? session.user.name}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/signin" })}
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
        <button
          type="button"
          className="md:hidden p-2 text-neutral-900"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-4 py-4 space-y-2">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block py-2 text-sm font-medium text-neutral-600"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
          {isAuth ? (
            <>
              {!session.user.hasPaidAccess && (
                <Link
                  href="/pricing"
                  className="block border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Upgrade
                </Link>
              )}
              <span className="block py-2 text-sm text-neutral-500 truncate">
                {session.user.email ?? session.user.name}
              </span>
              <button
                type="button"
                onClick={() => { setMobileOpen(false); signOut({ callbackUrl: "/signin" }); }}
                className="block py-2 text-sm font-medium text-neutral-600 w-full text-left"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="block py-2 text-sm font-medium text-neutral-600" onClick={() => setMobileOpen(false)}>
                Sign in
              </Link>
              <Link
                href="/register"
                className="block border border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white text-center"
                onClick={() => setMobileOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

