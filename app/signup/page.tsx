"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import type { Role, SafeUser } from "../lib/types";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

const inputCls =
  "box-border h-[52px] w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none";

/**
 * Account creation - role picker, member/mentor fields, and (for members)
 * the QR reveal moment on success. Standalone page, minimal /give-style header.
 */
export default function SignupPage() {
  const [role, setRole] = useState<Role>("member");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [story, setStory] = useState("");
  const [goalLabel, setGoalLabel] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  // Public giving page is OPT-IN - consent must be explicit, default off.
  const [consentPublic, setConsentPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<SafeUser | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please tell us your first name.");
    if (!email.includes("@")) return setError("Please enter a valid email.");
    if (password.length < 6)
      return setError("Password needs at least 6 characters.");
    const goal = parseInt(goalAmount, 10);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          ...(role === "member" ? { consentPublic } : {}),
          ...(role === "member" && story.trim() ? { story: story.trim() } : {}),
          ...(role === "member" && goalLabel.trim() && goal > 0
            ? { goalLabel: goalLabel.trim(), goalAmount: goal }
            : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setCreated(data.user as SafeUser);
      window.scrollTo({ top: 0 });
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* MINIMAL HEADER - wordmark + hairline */}
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

      <main className="mx-auto w-full max-w-[480px] flex-1 px-5 pb-16 pt-9">
        {created ? (
          created.role === "member" ? (
            /* ── THE QR REVEAL ─────────────────────────────────────── */
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F8F0] text-[26px] font-extrabold text-success">
                ✓
              </div>
              <div>
                <h1 className="text-[30px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900">
                  Welcome home,{" "}
                  <span className="script text-[38px]">{created.name}</span>
                </h1>
                {created.memberNumber && (
                  <div className="mt-3 inline-flex h-[28px] items-center rounded-full bg-sky-tint px-3.5 text-[12px] font-bold text-blue-primary">
                    Member #{created.memberNumber}
                  </div>
                )}
              </div>

              {created.consentPublic ? (
                <>
                  <div className="w-full max-w-[320px] rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(11,37,69,.1)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/qr/${created.slug}`}
                      alt={`QR code for ${created.name}'s giving page`}
                      className="mx-auto block h-auto w-full max-w-[220px]"
                    />
                  </div>

                  <p className="max-w-[320px] text-[15px]/[1.7] font-medium text-ink-600">
                    This code is yours. Anyone who scans it lands on your
                    giving page.
                  </p>
                </>
              ) : (
                /* No consent yet - the page stays private, no QR to show */
                <div className="w-full max-w-[320px] rounded-2xl bg-white p-6 text-center shadow-[0_2px_12px_rgba(11,37,69,.1)]">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sky-tint text-blue-primary">
                    <Lock size={22} strokeWidth={2} />
                  </div>
                  <div className="mt-3 text-[16px] font-bold text-ink-900">
                    Your page is private
                  </div>
                  <p className="mt-1.5 text-[14px]/[1.7] font-medium text-ink-600">
                    Nothing about you is shared. Turn on sharing anytime from
                    your profile and your giving page and QR code will be
                    ready.
                  </p>
                </div>
              )}

              <Link
                href="/member-app"
                className="inline-flex h-[52px] w-full max-w-[320px] items-center justify-center rounded-full bg-blue-primary text-[16px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
              >
                Open my member app
              </Link>
              {created.consentPublic && (
                <Link
                  href={`/p/${created.slug}`}
                  className="text-[14px] font-semibold text-blue-primary"
                >
                  See my public giving page →
                </Link>
              )}
            </div>
          ) : (
            /* ── MENTOR SUCCESS ────────────────────────────────────── */
            <div className="flex flex-col items-center gap-5 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F8F0] text-[26px] font-extrabold text-success">
                ✓
              </div>
              <h1 className="text-[30px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900">
                Thank you, {created.name}.
              </h1>
              <p className="max-w-[320px] text-[15px]/[1.7] font-medium text-ink-600">
                Your mentor account is ready. Someone walking the road you
                already know is waiting to meet you.
              </p>
              <Link
                href="/mentor-app"
                className="inline-flex h-[52px] w-full max-w-[320px] items-center justify-center rounded-full bg-blue-primary text-[16px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
              >
                Open the mentor app
              </Link>
            </div>
          )
        ) : (
          /* ── SIGNUP FORM ─────────────────────────────────────────── */
          <>
            <h1 className="text-center text-[32px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900">
              Begin your <span className="script text-[42px]">journey</span>
            </h1>
            <p className="mt-3 text-center text-[15px]/[1.7] font-medium text-ink-600">
              Nobody escapes the struggle alone. Create your account and
              let&apos;s walk it together.
            </p>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
              {/* ROLE PICKER */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "member" as Role,
                      title: "I'm starting my journey",
                      sub: "Get a mentor, a member ID, and your own QR giving page.",
                    },
                    {
                      value: "mentor" as Role,
                      title: "I want to mentor",
                      sub: "Walk beside a member on the road you already know.",
                    },
                  ] as const
                ).map((opt) => {
                  const on = role === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRole(opt.value)}
                      aria-pressed={on}
                      className={
                        "flex min-h-[96px] cursor-pointer flex-col justify-center gap-1.5 rounded-2xl px-5 py-4 text-left transition-colors " +
                        (on
                          ? "border-2 border-blue-primary bg-sky-tint"
                          : "border-[1.5px] border-sky-tint-2 bg-white hover:border-blue-primary/40")
                      }
                    >
                      <span
                        className={
                          "text-[15px] font-bold " +
                          (on ? "text-blue-primary" : "text-ink-900")
                        }
                      >
                        {opt.title}
                      </span>
                      <span className="text-[12.5px]/[1.5] font-medium text-ink-600">
                        {opt.sub}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* CORE FIELDS */}
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-bold text-ink-900">
                  First name
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Danielle"
                  autoComplete="given-name"
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] font-bold text-ink-900">
                  Email
                </span>
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
                  placeholder="6+ characters"
                  autoComplete="new-password"
                  minLength={6}
                  className={inputCls}
                />
              </label>

              {/* MEMBER-ONLY FIELDS */}
              {role === "member" && (
                <>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold text-ink-900">
                      My story{" "}
                      <span className="font-semibold text-ink-400">
                        (optional)
                      </span>
                    </span>
                    <textarea
                      value={story}
                      onChange={(e) => setStory(e.target.value)}
                      rows={4}
                      placeholder="Where you've been, where you're headed…"
                      className="box-border w-full resize-y rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 py-3.5 text-[15px]/[1.6] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
                    />
                    <span className="text-[12px]/[1.6] font-medium text-ink-600">
                      Shared publicly only with your consent - you control this
                      anytime.
                    </span>
                  </label>

                  {/* CONSENT - explicit opt-in for the public giving page */}
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-sky-tint-2 bg-white px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={consentPublic}
                      onChange={(e) => setConsentPublic(e.target.checked)}
                      className="mt-0.5 h-5 w-5 flex-none accent-[#2E7CD6]"
                    />
                    <span className="text-[13.5px]/[1.6] font-medium text-ink-900">
                      Create my public giving page and share my first name and
                      story so supporters can give to my journey.{" "}
                      <span className="text-ink-600">
                        You can change this anytime.
                      </span>
                    </span>
                  </label>

                  <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
                    <div className="text-[13px] font-bold text-ink-900">
                      First support goal{" "}
                      <span className="font-semibold text-ink-400">
                        (optional)
                      </span>
                    </div>
                    <p className="mt-1 text-[12px]/[1.6] font-medium text-ink-600">
                      A goal donors can fund each week - you can add or change
                      goals later.
                    </p>
                    <div className="mt-3 grid grid-cols-[1fr_120px] gap-2.5">
                      <input
                        value={goalLabel}
                        onChange={(e) => setGoalLabel(e.target.value)}
                        placeholder="e.g. Hallway house"
                        aria-label="Goal name"
                        className={inputCls}
                      />
                      <input
                        value={goalAmount}
                        onChange={(e) =>
                          setGoalAmount(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        inputMode="numeric"
                        placeholder="$ / week"
                        aria-label="Weekly dollar target"
                        className={inputCls + " tnum"}
                      />
                    </div>
                  </div>
                </>
              )}

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
                {busy ? "Creating your account…" : "Create my account"}
              </button>

              <p className="text-center text-[13.5px] font-medium text-ink-600">
                Already a member?{" "}
                <Link href="/login" className="font-bold text-blue-primary">
                  Sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </main>

      <div className="mt-auto bg-navy-deep px-6 py-5 text-center text-[12px] font-medium text-white/60">
        my-struggle.org · My Struggle is a 501(c)(3) nonprofit
      </div>
    </div>
  );
}
