"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SafeUser, SupportRequest } from "../../lib/types";

/** $12.5 → "$12.50", $12 → "$12" */
function money(n: number) {
  return "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
}

type Session =
  | { kind: "loading" }
  | { kind: "guest" }
  | { kind: "member"; user: SafeUser; requests: SupportRequest[] };

export default function GiveTab() {
  const [session, setSession] = useState<Session>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        if (data?.user?.role === "member" && data.user.slug) {
          setSession({
            kind: "member",
            user: data.user,
            requests: data.requests ?? [],
          });
        } else {
          setSession({ kind: "guest" });
        }
      })
      .catch(() => alive && setSession({ kind: "guest" }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-white px-5 pb-3.5 pt-[18px]">
        <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
          Give
        </div>
      </div>
      <div className="hairline" />

      {session.kind === "loading" ? (
        <div className="flex flex-1 animate-pulse flex-col gap-4 p-5">
          <div className="h-[168px] rounded-2xl bg-sky-tint" />
          <div className="grid grid-cols-2 gap-3.5">
            <div className="h-[110px] rounded-2xl bg-sky-tint" />
            <div className="h-[110px] rounded-2xl bg-sky-tint" />
          </div>
          <div className="h-[90px] rounded-2xl bg-sky-tint" />
        </div>
      ) : session.kind === "member" ? (
        <SignedInGive
          user={session.user}
          requests={session.requests}
          addRequest={(r) =>
            setSession((s) =>
              s.kind === "member" ? { ...s, requests: [...s.requests, r] } : s
            )
          }
          replaceRequest={(tempId, r) =>
            setSession((s) =>
              s.kind === "member"
                ? {
                    ...s,
                    requests: r
                      ? s.requests.map((x) => (x.id === tempId ? r : x))
                      : s.requests.filter((x) => x.id !== tempId),
                  }
                : s
            )
          }
        />
      ) : (
        <DemoGive />
      )}
    </div>
  );
}

/* ── Signed-in: the member's REAL QR, balances, and support requests ──── */
function SignedInGive({
  user,
  requests,
  addRequest,
  replaceRequest,
}: {
  user: SafeUser;
  requests: SupportRequest[];
  addRequest: (r: SupportRequest) => void;
  replaceRequest: (tempId: string, r: SupportRequest | null) => void;
}) {
  const slug = user.slug!;
  const balances = user.balances ?? { cash: 0, credits: 0, savings: 0 };

  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [posting, setPosting] = useState(false);
  const [formError, setFormError] = useState("");

  const ask = async () => {
    const weeklyTarget = parseInt(target, 10);
    if (!label.trim() || isNaN(weeklyTarget) || weeklyTarget < 1) {
      setFormError("Add a label and a weekly amount of at least $1.");
      return;
    }
    setFormError("");
    setPosting(true);
    // Optimistic add — replaced (or removed) once the API answers.
    const tempId = `temp-${Date.now()}`;
    addRequest({
      id: tempId,
      memberId: user.id,
      label: label.trim(),
      weeklyTarget,
      raised: 0,
      status: "active",
      createdAt: Date.now(),
    });
    setLabel("");
    setTarget("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), weeklyTarget }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.request) {
        replaceRequest(tempId, data.request);
      } else {
        replaceRequest(tempId, null);
        setFormError(data?.error ?? "Couldn't save that request — try again.");
      }
    } catch {
      replaceRequest(tempId, null);
      setFormError("Couldn't save that request — try again.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-5">
      {/* QR card — real per-member QR resolving to /p/[slug] */}
      <div className="flex items-center gap-5 rounded-2xl bg-navy-deep p-6 shadow-[0_8px_24px_rgba(11,37,69,.25)]">
        <div className="h-[120px] w-[120px] flex-none rounded-xl bg-white p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qr/${slug}`}
            alt={`QR code for ${user.name}'s giving page`}
            className="h-full w-full"
          />
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[.12em] text-[#8FBCF0]">
            MY QR CODE
          </div>
          <div className="mt-1.5 text-[16px] font-bold text-white">
            mystruggle.org
            <br />
            /p/{slug}
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href={`/p/${slug}`}
              className="inline-flex h-9 items-center rounded-full bg-blue-primary px-4 text-[12px] font-bold text-white hover:bg-blue-hover"
            >
              View page
            </Link>
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center rounded-full border-[1.5px] border-white/40 px-4 text-[12px] font-bold text-white"
            >
              Print card
            </button>
          </div>
        </div>
      </div>

      {/* Balances — real numbers from the session */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-[12px] font-bold text-ink-600">Cash</div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-blue-primary">
            {money(balances.cash)}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-400">
            redeem at any center
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-[12px] font-bold text-ink-600">
            Store Credits
          </div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-indigo-brand">
            {money(balances.credits)}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-400">
            spend at The Store
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div>
          <div className="text-[12px] font-bold text-ink-600">
            Reentry Savings{" "}
            <span className="ml-1 rounded-full bg-[#E8F8F0] px-2 py-0.5 text-[10px] font-semibold text-success">
              LOCKED FOR MY FUTURE
            </span>
          </div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-success">
            {money(balances.savings)}
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-success px-5 text-[13px] font-bold text-success hover:bg-[#E8F8F0]"
        >
          Save more
        </button>
      </div>

      {/* Support requests — real progress */}
      <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
        MY SUPPORT REQUESTS
      </div>
      {requests.length === 0 && (
        <div className="rounded-2xl bg-white px-5 py-4 text-[13px] text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          No requests yet — ask for support below and it appears on your
          giving page.
        </div>
      )}
      {requests.map((r) => {
        const funded = r.status === "funded" || r.raised >= r.weeklyTarget;
        const pct = Math.min(
          100,
          Math.round((r.raised / Math.max(1, r.weeklyTarget)) * 100)
        );
        return (
          <div
            key={r.id}
            className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]"
          >
            <div className="flex items-center justify-between gap-2 text-[14px] font-semibold text-ink-900">
              <span className="flex items-center gap-2">
                {r.label} · weekly
                {funded && (
                  <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-[#E8F8F0] px-2.5 text-[10px] font-bold text-success">
                    ✓ Funded
                  </span>
                )}
              </span>
              <span
                className={
                  "tnum " + (funded ? "text-success" : "text-blue-primary")
                }
              >
                {money(r.raised)} / {money(r.weeklyTarget)}
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
      })}

      {/* Ask for support */}
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div className="text-[14px] font-bold text-ink-900">
          Ask for support
        </div>
        <div className="mt-0.5 text-[12px] text-ink-600">
          Adds a goal with a weekly target to your public giving page.
        </div>
        <div className="mt-3 flex flex-col gap-2.5">
          <input
            placeholder="What do you need? e.g. Bus pass"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="box-border h-12 w-full rounded-[12px] border-[1.5px] border-sky-tint bg-white px-4 text-[14px] font-semibold text-ink-900 focus:border-blue-primary focus:outline-none"
          />
          <div className="flex gap-2.5">
            <input
              placeholder="Weekly $, e.g. 40"
              value={target}
              onChange={(e) =>
                setTarget(e.target.value.replace(/[^0-9]/g, ""))
              }
              inputMode="numeric"
              className="box-border h-12 w-full min-w-0 flex-1 rounded-[12px] border-[1.5px] border-sky-tint bg-white px-4 text-[14px] font-semibold text-ink-900 focus:border-blue-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={ask}
              disabled={posting}
              className="inline-flex h-12 flex-none cursor-pointer items-center rounded-full bg-blue-primary px-5 text-[13px] font-bold text-white hover:bg-blue-hover disabled:cursor-default disabled:opacity-70"
            >
              {posting ? "Adding…" : "Ask"}
            </button>
          </div>
          {formError && (
            <div className="text-[12px] font-semibold text-heart-red">
              {formError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Signed-out: the original Danielle demo content, untouched ────────── */
function DemoGive() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-5">
      {/* QR card */}
      <div className="flex items-center gap-5 rounded-2xl bg-navy-deep p-6 shadow-[0_8px_24px_rgba(11,37,69,.25)]">
        <div className="h-[120px] w-[120px] flex-none rounded-xl bg-white p-2.5">
          <div
            className="h-full w-full border-4 border-navy-deep"
            style={{
              background:
                "repeating-linear-gradient(0deg,#0B2545 0 6px,#fff 6px 12px),repeating-linear-gradient(90deg,#0B2545 0 6px,#fff 6px 12px)",
              backgroundBlendMode: "screen",
            }}
          />
        </div>
        <div>
          <div className="text-[11px] font-bold tracking-[.12em] text-[#8FBCF0]">
            MY QR CODE
          </div>
          <div className="mt-1.5 text-[16px] font-bold text-white">
            give.my-struggle.org
            <br />
            /p/danielle
          </div>
          <div className="mt-3 flex gap-2">
            <Link
              href="/give"
              className="inline-flex h-9 items-center rounded-full bg-blue-primary px-4 text-[12px] font-bold text-white hover:bg-blue-hover"
            >
              View page
            </Link>
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center rounded-full border-[1.5px] border-white/40 px-4 text-[12px] font-bold text-white"
            >
              Print card
            </button>
          </div>
        </div>
      </div>

      <Link
        href="/login"
        className="text-center text-[13px] font-semibold text-blue-primary"
      >
        Sign in to see your own QR code →
      </Link>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-[12px] font-bold text-ink-600">Cash</div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-blue-primary">
            $64
          </div>
          <div className="mt-0.5 text-[11px] text-ink-400">
            redeem at any center
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-[12px] font-bold text-ink-600">
            Store Credits
          </div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-indigo-brand">
            $58
          </div>
          <div className="mt-0.5 text-[11px] text-ink-400">
            spend at The Store
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div>
          <div className="text-[12px] font-bold text-ink-600">
            Reentry Savings{" "}
            <span className="ml-1 rounded-full bg-[#E8F8F0] px-2 py-0.5 text-[10px] font-semibold text-success">
              LOCKED FOR MY FUTURE
            </span>
          </div>
          <div className="tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] text-success">
            $240
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-success px-5 text-[13px] font-bold text-success hover:bg-[#E8F8F0]"
        >
          Save more
        </button>
      </div>

      {/* Recent activity */}
      <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
        RECENT ACTIVITY
      </div>
      <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div className="flex items-center gap-3.5 border-b border-canvas px-5 py-4">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#E8F8F0] text-[16px] font-extrabold text-success">
            +
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-ink-900">
              Gift received · $25
            </div>
            <div className="text-[12px] text-ink-600">
              $12.50 cash · $12.50 credits · today
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3.5 border-b border-canvas px-5 py-4">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sky-tint text-[16px] font-extrabold text-blue-primary">
            −
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-ink-900">
              Cash redeemed · $20
            </div>
            <div className="text-[12px] text-ink-600">
              Laveen Center · Tuesday
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3.5 px-5 py-4">
          <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#F0EDFB] text-[14px] font-extrabold text-indigo-brand">
            ◆
          </span>
          <div className="flex-1">
            <div className="text-[14px] font-bold text-ink-900">
              Moved $40 to Reentry Savings
            </div>
            <div className="text-[12px] text-ink-600">last week</div>
          </div>
        </div>
      </div>
    </div>
  );
}
