"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SafeUser, SupportRequest } from "../lib/types";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

/** Signed-in account overview — profile, QR code, support goals, sign out. */
export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        setUser(data.user ?? null);
        setRequests(data.requests ?? []);
      })
      .catch(() => {
        if (live) setUser(null);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/");
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

      <main className="mx-auto w-full max-w-[480px] flex-1 px-5 pb-16 pt-10">
        {loading ? (
          <div className="rounded-2xl bg-white px-6 py-10 text-center text-[14px] font-semibold text-ink-400 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            Loading your account…
          </div>
        ) : !user ? (
          /* ── NOT SIGNED IN ─────────────────────────────────────── */
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-6 py-10 text-center shadow-[0_2px_12px_rgba(11,37,69,.1)]">
            <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
              Sign in first
            </div>
            <p className="max-w-[300px] text-[14px]/[1.7] font-medium text-ink-600">
              You need to be signed in to see your account. It only takes a
              moment.
            </p>
            <Link
              href="/login"
              className="inline-flex h-[52px] items-center rounded-full bg-blue-primary px-9 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-[13.5px] font-semibold text-blue-primary"
            >
              New here? Create your account
            </Link>
          </div>
        ) : (
          /* ── SIGNED-IN OVERVIEW ────────────────────────────────── */
          <div className="flex flex-col gap-6">
            {/* PROFILE */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className="flex h-[88px] w-[88px] items-center justify-center rounded-full border-[3px] border-white text-[32px] font-extrabold text-white shadow-[0_4px_14px_rgba(11,37,69,.15)]"
                style={{ background: user.avatarColor }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-[28px] font-extrabold tracking-[-0.02em] text-ink-900">
                  {user.name}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold capitalize text-indigo-brand">
                    {user.role}
                  </span>
                  {user.memberNumber && (
                    <span className="inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
                      Member #{user.memberNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* QR CODE — members only */}
            {user.role === "member" && user.slug && (
              <div className="rounded-2xl bg-white p-6 text-center shadow-[0_2px_12px_rgba(11,37,69,.1)]">
                <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary">
                  Your QR code
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr/${user.slug}`}
                  alt={`QR code for ${user.name}'s giving page`}
                  className="mx-auto mt-4 block h-auto w-full max-w-[200px]"
                />
                <p className="mt-4 text-[13px]/[1.7] font-medium text-ink-600">
                  Anyone who scans this lands on your giving page.
                </p>
                <Link
                  href={`/p/${user.slug}`}
                  className="mt-1 inline-flex min-h-[44px] items-center text-[13.5px] font-bold text-blue-primary"
                >
                  View my giving page →
                </Link>
              </div>
            )}

            {/* SUPPORT REQUESTS — members only */}
            {user.role === "member" && (
              <div className="flex flex-col gap-3">
                <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary">
                  My support goals
                </div>
                {requests.length === 0 ? (
                  <div className="rounded-2xl bg-white px-5 py-6 text-center text-[13.5px]/[1.7] font-medium text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
                    No support goals yet — your mentor can help you set your
                    first one.
                  </div>
                ) : (
                  requests.map((r) => {
                    const pct = Math.min(
                      100,
                      Math.round((r.raised / Math.max(1, r.weeklyTarget)) * 100)
                    );
                    const funded = r.status === "funded";
                    return (
                      <div
                        key={r.id}
                        className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]"
                      >
                        <div className="flex items-center justify-between gap-3 text-[14px] font-semibold text-ink-900">
                          <span>
                            {r.label} · weekly
                            {funded && (
                              <span className="ml-2 inline-flex h-[20px] items-center rounded-full bg-[#E8F8F0] px-2 text-[10px] font-bold uppercase tracking-wide text-success">
                                Funded
                              </span>
                            )}
                          </span>
                          <span
                            className={
                              "tnum " +
                              (funded ? "text-success" : "text-blue-primary")
                            }
                          >
                            ${r.raised} / ${r.weeklyTarget}
                          </span>
                        </div>
                        <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-sky-tint">
                          <div
                            className={
                              "h-full rounded-full " +
                              (funded
                                ? "bg-success"
                                : "bg-[linear-gradient(90deg,#4E5B9B,#2E7CD6)]")
                            }
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* APP LINK + SIGN OUT */}
            <Link
              href={user.role === "mentor" ? "/mentor-app" : "/member-app"}
              className="inline-flex h-[52px] items-center justify-center rounded-full bg-blue-primary text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
            >
              {user.role === "mentor" ? "Open the mentor app" : "Open my member app"}
            </Link>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex h-[52px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-sky-tint-2 bg-white text-[15px] font-bold text-ink-600 hover:border-blue-primary hover:text-blue-primary disabled:cursor-default disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        )}
      </main>

      <div className="mt-auto bg-navy-deep px-6 py-5 text-center text-[12px] font-medium text-white/60">
        my-struggle.org · My Struggle is a 501(c)(3) nonprofit
      </div>
    </div>
  );
}
