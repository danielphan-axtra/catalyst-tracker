import type { Metadata } from "next";
import { Manrope, Fira_Code } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SessionProvider } from "@/components/SessionProvider";

/** Primary font — matches dambisamoyo.com (Twenty Twenty-Five theme) */
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Equity Catalyst Tracker | Metals & Mining",
  description:
    "Track upcoming catalysts for TSX and TSXV Metals & Mining companies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${manrope.variable} ${firaCode.variable} antialiased min-h-screen flex flex-col bg-white text-neutral-900 font-sans`}
      >
        <SessionProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
