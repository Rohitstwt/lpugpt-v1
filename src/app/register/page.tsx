"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
    department: "",
    studentId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-2xl font-700 text-orange">
          LPUGPT
        </Link>
        <h1 className="mt-8 text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-text-muted">Sign up to start chatting with LPUGPT.</p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Full name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-orange"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-orange"
              placeholder="you@lpu.in"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-orange"
              placeholder="Min 8 characters"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-text-muted">I am a</label>
            <div className="grid grid-cols-2 gap-2">
              {(["STUDENT", "TEACHER"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm({ ...form, role })}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    form.role === role
                      ? "border-orange bg-orange-soft text-orange"
                      : "border-border text-text-muted hover:border-text-muted"
                  }`}
                >
                  {role === "STUDENT" ? "Student" : "Teacher"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">Department</label>
              <input
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-orange"
                placeholder="CSE"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-text-muted">ID</label>
              <input
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-orange"
                placeholder="Optional"
              />
            </div>
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange py-3 text-sm font-semibold text-bg transition hover:bg-orange-dim disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-orange hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
