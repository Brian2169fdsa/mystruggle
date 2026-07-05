"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SafeUser } from "../lib/types";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

const inputCls =
  "box-border h-[52px] w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none";

/** Sign-in page — routes members to /member-app and mentors to /mentor-app. */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Email or password didn't match.");
        setBusy(false);
        return;
      }
      const user = data.user as SafeUser;
      router.push(user.role === "mentor" ? "/mentor-app" : "/member-app");
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* MINIMAL HEADER — wordmark + hairline */}
      <div className="bg-white">
        <div className="flex h-[60px] items-center justify-center">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={WORDMARK_INDIGO}
              alt="My Struggle"
              className="block h-8 w-auto"
            />
          </Link>
        </div>
        <div className="hairline" />
      </div>

      <main className="mx-auto w-full max-w-[440px] flex-1 px-5 pb-16 pt-10">
        <h1 className="text-center text-[30px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900">
          Welcome back
        </h1>
        <p className="mt-2.5 text-center text-[15px]/[1.7] font-medium text-ink-600">
          Sign in to pick your journey back up.
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink-900">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink-900">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              className={inputCls}
            />
          </label>

          {error && (
            <div className="rounded-xl bg-heart-bg px-4 py-3 text-[13.5px]/[1.6] font-semibold text-heart-red">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-[56px] cursor-pointer items-center justify-center rounded-full bg-blue-primary text-[17px] font-extrabold text-white shadow-[0_8px_20px_rgba(46,124,214,.35)] hover:bg-blue-hover disabled:cursor-default disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-center text-[13.5px] font-medium text-ink-600">
            New here?{" "}
            <Link href="/signup" className="font-bold text-blue-primary">
              Create your account
            </Link>
          </p>
        </form>

        {/* DEMO ACCOUNTS HINT */}
        <div className="mt-8 rounded-2xl bg-sky-tint px-5 py-4">
          <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
            Demo accounts
          </div>
          <div className="mt-2 flex flex-col gap-1.5 text-[12.5px]/[1.6] font-medium text-ink-600">
            <div>
              <span className="font-bold text-ink-900">Member</span> ·
              danielle@themystruggles.com / mystruggle
            </div>
            <div>
              <span className="font-bold text-ink-900">Mentor</span> ·
              marcus@themystruggles.com / mystruggle
            </div>
          </div>
        </div>
      </main>

      <div className="mt-auto bg-navy-deep px-6 py-5 text-center text-[12px] font-medium text-white/60">
        my-struggle.org · My Struggle is a 501(c)(3) nonprofit
      </div>
    </div>
  );
}
