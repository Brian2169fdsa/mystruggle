"use client";

// Employer entry - create a recovery-friendly hiring account or sign in, then
// land in the dashboard. Reuses the shared HMAC session; a signed-in employer
// is redirected straight to /employer/dashboard.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, Check } from "lucide-react";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

const inputCls =
  "box-border h-[52px] w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none";

const PROMISES = [
  "Reach 500+ members building their next chapter",
  "Every post is fair-chance by design",
  "Manage openings any time from your dashboard",
];

export default function EmployerEntryPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // Already signed in as an employer? Skip straight to the dashboard.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (alive && data?.user?.role === "employer") {
          router.replace("/employer/dashboard");
          return;
        }
      } catch {
        // fall through to the form
      }
      if (alive) setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && !company.trim())
      return setError("Please tell us your company name.");
    if (mode === "signup" && !name.trim())
      return setError("Please add a contact first name.");
    if (!email.includes("@")) return setError("Please enter a valid email.");
    if (password.length < 6)
      return setError("Password needs at least 6 characters.");

    setBusy(true);
    try {
      const res = await fetch(
        mode === "signup" ? "/api/employers" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "signup"
              ? {
                  company: company.trim(),
                  name: name.trim(),
                  email: email.trim(),
                  password,
                }
              : { email: email.trim(), password }
          ),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      if (mode === "signin" && data?.user?.role !== "employer") {
        setError("That account isn't an employer account.");
        return;
      }
      router.replace("/employer/dashboard");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* MINIMAL HEADER */}
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

      <main className="mx-auto grid w-full max-w-[960px] flex-1 gap-10 px-5 pb-16 pt-9 lg:grid-cols-[1fr_440px] lg:pt-14">
        {/* PITCH */}
        <div className="lg:pt-6">
          <span className="inline-flex h-9 items-center gap-2 rounded-full bg-sky-tint px-3.5 text-[12px] font-extrabold uppercase tracking-[.1em] text-blue-primary">
            <Briefcase className="h-4 w-4" aria-hidden /> For employers
          </span>
          <h1 className="mt-4 text-[32px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[38px]/[1.1]">
            Hire someone building their{" "}
            <span className="script text-[46px] lg:text-[54px]">
              next chapter
            </span>
          </h1>
          <p className="mt-4 max-w-[440px] text-[15px]/[1.7] font-medium text-ink-600">
            Post jobs to a community of members in recovery who show up, work
            hard, and don&apos;t take a second chance for granted. Create your
            employer account and manage every opening yourself.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {PROMISES.map((p) => (
              <li key={p} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-[#E8F8F0] text-success">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                </span>
                <span className="text-[14px]/[1.5] font-semibold text-ink-900">
                  {p}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[13.5px]/[1.6] font-medium text-ink-600">
            Prefer to talk first?{" "}
            <a
              href="mailto:info@themystruggles.com"
              className="font-bold text-blue-primary"
            >
              Contact us
            </a>{" "}
            and we&apos;ll help you get set up.
          </p>
        </div>

        {/* AUTH CARD */}
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(11,37,69,.08)] lg:p-7">
          {/* MODE TOGGLE */}
          <div className="grid grid-cols-2 gap-1.5 rounded-full bg-canvas p-1">
            {(
              [
                { value: "signup" as const, label: "Create account" },
                { value: "signin" as const, label: "Sign in" },
              ] as const
            ).map((opt) => {
              const on = mode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setMode(opt.value);
                    setError(null);
                  }}
                  aria-pressed={on}
                  className={
                    "h-11 cursor-pointer rounded-full text-[14px] font-bold transition-colors " +
                    (on
                      ? "bg-blue-primary text-white shadow-[0_4px_12px_rgba(46,124,214,.28)]"
                      : "text-ink-600 hover:text-blue-primary")
                  }
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {mode === "signup" && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-ink-900">
                    Company
                  </span>
                  <input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Sun Valley Warehouse"
                    autoComplete="organization"
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[13px] font-bold text-ink-900">
                    Your first name
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rosa"
                    autoComplete="given-name"
                    className={inputCls}
                  />
                </label>
              </>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink-900">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hiring@company.com"
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
                placeholder="6+ characters"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                minLength={6}
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
              disabled={busy || checking}
              className="inline-flex h-[54px] cursor-pointer items-center justify-center rounded-full bg-blue-primary text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(46,124,214,.35)] hover:bg-blue-hover disabled:cursor-default disabled:opacity-60"
            >
              {busy
                ? "One moment…"
                : mode === "signup"
                  ? "Create employer account"
                  : "Sign in"}
            </button>
          </form>

          <p className="mt-4 text-center text-[12.5px]/[1.6] font-medium text-ink-400">
            By posting, you agree to keep every opening fair-chance and
            respectful of members&apos; recovery.
          </p>
        </div>
      </main>

      <div className="mt-auto bg-navy-deep px-6 py-5 text-center text-[12px] font-medium text-white/60">
        my-struggle.org · My Struggle is a 501(c)(3) nonprofit
      </div>
    </div>
  );
}
