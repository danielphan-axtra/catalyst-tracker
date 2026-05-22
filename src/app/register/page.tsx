"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        setLoading(false);
        return;
      }
      const signInRes = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: "/",
      });
      setLoading(false);
      if (signInRes?.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      router.push("/signin");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-black">Create account</h1>
      <p className="mt-2 text-black/70">
        Sign up with your email and password. You can also sign in with Google after signing in once.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-black/80">
            Name (optional)
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2 text-black focus:border-[#7961A9] focus:outline-none focus:ring-1 focus:ring-[#7961A9]"
            placeholder="Your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-black/80">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2 text-black focus:border-[#7961A9] focus:outline-none focus:ring-1 focus:ring-[#7961A9]"
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-black/80">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/20 px-3 py-2 text-black focus:border-[#7961A9] focus:outline-none focus:ring-1 focus:ring-[#7961A9]"
            minLength={8}
            required
          />
          <p className="mt-1 text-xs text-black/50">At least 8 characters</p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#7961A9] py-2.5 font-medium text-white hover:bg-[#6a5296] transition-colors disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-black/60">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-[#7961A9] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
