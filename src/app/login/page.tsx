"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      // Hard navigation so the new session cookie is always picked up
      window.location.href = next.startsWith("/") ? next : "/app";
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm text-text-muted">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-orange"
          placeholder="you@lpu.in"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm text-text-muted">Password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none transition focus:border-orange"
          placeholder="••••••••"
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-orange py-3 text-sm font-semibold text-bg transition hover:bg-orange-dim disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-700 text-orange">
          LPUGPT
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-text-muted">Log in to continue to LPUGPT.</p>
        <div className="mt-8">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-surface" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-orange hover:underline">
            Sign up
          </Link>
        </p>
        <div className="mt-6 rounded-xl border border-border bg-surface p-4 text-xs leading-relaxed text-text-muted">
          Demo — Teacher: <span className="text-text">teacher@lpu.in</span> /{" "}
          <span className="text-text">Teacher123!</span>
          <br />
          Student: <span className="text-text">student@lpu.in</span> /{" "}
          <span className="text-text">Student123!</span>
        </div>
      </div>
    </div>
  );
}
