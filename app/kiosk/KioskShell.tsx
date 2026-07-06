"use client";

// Kiosk mode (docs/16 Part D) - quick sign-in for shared facility devices.
// 430px phone shell like the member app. Sessions issued here live 2 hours
// (see /api/kiosk); this shell also runs a 5-minute idle auto-logout timer
// whenever the ms_kiosk_ui cookie marks a kiosk session on this device.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "box-border h-[56px] w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 text-[17px] font-semibold text-ink-900 placeholder:font-medium placeholder:text-ink-400 focus:border-blue-primary focus:outline-none";

const IDLE_MS = 5 * 60 * 1000; // 5 minutes of no pointer/key activity

function hasKioskCookie(): boolean {
  return document.cookie.split("; ").some((c) => c === "ms_kiosk_ui=1");
}

function clearKioskCookies() {
  // ms_kiosk is httpOnly (server truth) and expires with the session; the
  // client can only clear its readable mirror, which drives the idle timer.
  document.cookie = "ms_kiosk_ui=; path=/; max-age=0";
}

export default function KioskShell() {
  const router = useRouter();
  const [memberNumber, setMemberNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  // Detect an existing session so the prominent Sign out button appears.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setSignedIn(Boolean(d?.user)))
      .catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // still clear local state below
    }
    clearKioskCookies();
    window.location.href = "/kiosk";
  }, []);

  // Idle auto-logout: only armed while a kiosk session cookie is present.
  useEffect(() => {
    if (!hasKioskCookie()) return;
    let timer = window.setTimeout(signOut, IDLE_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(signOut, IDLE_MS);
    };
    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "pointermove",
      "keydown",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [signOut, signedIn]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/kiosk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberNumber: memberNumber.trim(),
          firstName: firstName.trim(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error ??
            "Check your member number and first name with a staff member."
        );
        setBusy(false);
        return;
      }
      router.push("/member-app");
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen justify-center bg-[#E8ECF4]">
      {/* PHONE SHELL - same 430px frame as the member app */}
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-canvas shadow-[0_0_60px_rgba(11,37,69,.12)]">
        {/* HEADER */}
        <div className="bg-white px-6 pb-5 pt-8 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[.14em] text-indigo-brand">
            Front desk kiosk
          </div>
          <h1 className="mt-2 text-[28px]/[1.2] font-extrabold tracking-[-0.02em] text-ink-900">
            Welcome <span className="script">back</span>
          </h1>
          <p className="mt-2 text-[15px]/[1.6] font-medium text-ink-600">
            Sign in at the front desk kiosk to pick your journey back up.
          </p>
        </div>
        <div className="hairline" />

        <main className="flex-1 px-6 pb-10 pt-7">
          {signedIn && (
            <div className="mb-6 rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(11,37,69,.06)]">
              <p className="text-[14px]/[1.6] font-semibold text-ink-900">
                You're signed in on this shared device.
              </p>
              <button
                type="button"
                onClick={signOut}
                className="mt-3 inline-flex h-[56px] w-full cursor-pointer items-center justify-center rounded-full bg-navy-deep text-[17px] font-extrabold text-white hover:opacity-90"
              >
                Sign out
              </button>
            </div>
          )}

          <form onSubmit={submit} className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink-900">
                Member number
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={memberNumber}
                onChange={(e) => setMemberNumber(e.target.value)}
                placeholder="e.g. 039521464"
                autoComplete="off"
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold text-ink-900">
                First name
              </span>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Your first name"
                autoComplete="off"
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
          </form>

          {/* SHARED-DEVICE + PRIVACY NOTES */}
          <div className="mt-7 flex flex-col gap-3">
            <div className="rounded-2xl bg-sky-tint px-5 py-4 text-[13px]/[1.65] font-medium text-ink-600">
              <span className="font-bold text-ink-900">Shared device:</span>{" "}
              you will be signed out automatically after 2 hours or when you
              tap Sign out.
            </div>
            <div className="rounded-2xl bg-sky-tint px-5 py-4 text-[13px]/[1.65] font-medium text-ink-600">
              <span className="font-bold text-ink-900">Your privacy:</span>{" "}
              your notifications stay in your account, not on this device.
            </div>
          </div>
        </main>

        <div className="mt-auto bg-navy-deep px-6 py-5 text-center text-[12px] font-medium text-white/60">
          my-struggle.org · My Struggle is a 501(c)(3) nonprofit
        </div>
      </div>
    </div>
  );
}
