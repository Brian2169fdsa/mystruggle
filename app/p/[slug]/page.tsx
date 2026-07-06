"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Heart } from "lucide-react";
import PrototypeMap from "../../components/PrototypeMap";
import type { PublicMember, SupportRequest } from "../../lib/types";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

const PRESETS = [10, 25, 50];

type PageState =
  | { kind: "loading" }
  | { kind: "notfound" }
  | { kind: "generic" }
  | { kind: "member"; member: PublicMember };

type Split = { cash: number; credits: number };

/** $12.5 → "$12.50", $12 → "$12" */
function money(n: number) {
  return "$" + (Number.isInteger(n) ? n.toString() : n.toFixed(2));
}

/**
 * The real public QR giving page - /p/[slug].
 * Fetches /api/members/[slug] and renders loading / 404 / generic
 * (consent off) / full member states in the /give visual system.
 */
export default function PublicGivingPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [page, setPage] = useState<PageState>({ kind: "loading" });
  const [amount, setAmount] = useState(25);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [weekly, setWeekly] = useState(true);
  const [gave, setGave] = useState<null | {
    amount: number;
    weekly: boolean;
    split: Split | null;
    name: string; // "" for the general fund
  }>(null);
  const [sending, setSending] = useState(false);

  // `extra` = a request returned by POST /api/donations that just flipped to
  // "funded" - the members API only returns active requests, so we merge it
  // back in to keep showing the goal with its ✓ Funded chip.
  const load = useCallback(
    async (extra?: SupportRequest) => {
      if (!slug) return;
      try {
        const res = await fetch(`/api/members/${encodeURIComponent(slug)}`);
        if (res.status === 404) {
          setPage({ kind: "notfound" });
          return;
        }
        const data = await res.json();
        if (data?.member) {
          const member: PublicMember = data.member;
          if (extra && !member.requests.some((r) => r.id === extra.id)) {
            member.requests = [...member.requests, extra];
          }
          setPage({ kind: "member", member });
        } else if (data?.generic) setPage({ kind: "generic" });
        else setPage({ kind: "notfound" });
      } catch {
        setPage({ kind: "notfound" });
      }
    },
    [slug]
  );

  useEffect(() => {
    load();
  }, [load]);

  const currentAmount = (() => {
    if (customOpen) {
      const n = parseInt(customValue, 10);
      return isNaN(n) || n <= 0 ? null : n;
    }
    return amount;
  })();

  const amtLabel = currentAmount ? `$${currentAmount}` : "an amount";
  const giveLabel = currentAmount
    ? weekly
      ? `Give $${currentAmount} weekly`
      : `Give $${currentAmount}`
    : "Enter an amount";

  const donate = async (member: PublicMember | null) => {
    if (!currentAmount || sending) return;
    if (!member) {
      // General-fund gift (consent-off page). There is no org-level
      // donations endpoint, so this confirms client-side only.
      setGave({
        amount: currentAmount,
        weekly,
        split: { cash: currentAmount / 2, credits: currentAmount / 2 },
        name: "",
      });
      return;
    }
    setSending(true);
    try {
      const firstActive = member.requests.find((r) => r.status === "active");
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: member.slug,
          amount: currentAmount,
          weekly,
          requestId: firstActive?.id,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setGave({
          amount: currentAmount,
          weekly,
          split: data.split ?? null,
          name: member.name,
        });
        // Re-fetch so returning to the page shows updated progress; keep a
        // just-funded request visible (the API filters it out once funded).
        const returned: SupportRequest | null = data.request ?? null;
        load(returned?.status === "funded" ? returned : undefined);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#E8EDF4]">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-canvas shadow-[0_0_60px_rgba(11,37,69,.12)]">
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

        {gave ? (
          <ThankYou
            gave={gave}
            slug={slug}
            back={() => setGave(null)}
          />
        ) : page.kind === "loading" ? (
          <LoadingSkeleton />
        ) : page.kind === "notfound" ? (
          <NotFound />
        ) : page.kind === "generic" ? (
          <>
            {/* GENERIC / PRIVATE STATE - no personal info */}
            <div className="flex flex-col items-center gap-3.5 px-6 pt-8 text-center">
              <div className="photo-ph flex h-[104px] w-[104px] items-center justify-center rounded-full border-[3px] border-white text-[36px] font-extrabold text-indigo-brand shadow-[0_4px_14px_rgba(11,37,69,.15)]">
                ♥
              </div>
              <div className="text-[24px] font-extrabold tracking-[-0.02em] text-ink-900">
                This member&apos;s page is private right now
              </div>
              <div className="max-w-[320px] text-[15px]/[1.7] text-ink-600">
                They&apos;ve chosen not to share their story publicly - and we
                honor that. Your gift to My Struggle still changes lives.
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-brand">
                Every member controls what the world sees. Always.
              </div>
            </div>

            <SplitExplainer name={null} />

            <AmountPicker
              amount={amount}
              setAmount={setAmount}
              customOpen={customOpen}
              setCustomOpen={setCustomOpen}
              customValue={customValue}
              setCustomValue={setCustomValue}
              weekly={weekly}
              setWeekly={setWeekly}
              weeklyHint={
                weekly
                  ? `${amtLabel} every week sustains the general fund`
                  : "One-time gift - flip to weekly to sustain the work"
              }
              giveLabel={giveLabel}
              sending={sending}
              onDonate={() => donate(null)}
              footerName={null}
            />
          </>
        ) : (
          <MemberBody
            member={page.member}
            amount={amount}
            setAmount={setAmount}
            customOpen={customOpen}
            setCustomOpen={setCustomOpen}
            customValue={customValue}
            setCustomValue={setCustomValue}
            weekly={weekly}
            setWeekly={setWeekly}
            amtLabel={amtLabel}
            giveLabel={giveLabel}
            sending={sending}
            onDonate={() => donate(page.member)}
          />
        )}

        {/* NAVY FOOTER BAR */}
        <div className="mt-auto bg-navy-deep px-6 py-5 text-center text-[12px] font-medium text-white/60">
          give.my-struggle.org · My Struggle is a 501(c)(3) nonprofit
        </div>
      </div>

      <PrototypeMap />
    </div>
  );
}

/* ── Loading skeleton - soft sky-tint blocks, no spinners ─────────────── */
function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col items-center gap-3.5 px-6 pt-8">
        <div className="h-[104px] w-[104px] rounded-full bg-sky-tint" />
        <div className="h-7 w-36 rounded-full bg-sky-tint" />
        <div className="h-[26px] w-44 rounded-full bg-sky-tint" />
        <div className="h-4 w-full max-w-[320px] rounded-full bg-sky-tint" />
        <div className="h-4 w-4/5 max-w-[260px] rounded-full bg-sky-tint" />
      </div>
      <div className="px-5 pt-7">
        <div className="h-[220px] rounded-2xl bg-sky-tint" />
      </div>
      <div className="flex flex-col gap-3.5 px-6 pt-7 pb-9">
        <div className="h-4 w-32 rounded-full bg-sky-tint" />
        <div className="h-[76px] rounded-2xl bg-sky-tint" />
        <div className="h-14 rounded-[14px] bg-sky-tint" />
        <div className="h-[60px] rounded-full bg-sky-tint" />
      </div>
    </div>
  );
}

/* ── 404 state ────────────────────────────────────────────────────────── */
function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-7 py-[60px] text-center">
      <div className="photo-ph flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-white text-[36px] font-extrabold text-indigo-brand shadow-[0_4px_14px_rgba(11,37,69,.15)]">
        ?
      </div>
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        We couldn&apos;t find that page
      </div>
      <div className="max-w-[300px] text-[15px]/[1.7] font-medium text-ink-600">
        This giving page doesn&apos;t exist or may have been retired. You can
        still support the mission directly.
      </div>
      <Link
        href="/donate"
        className="inline-flex h-[52px] items-center rounded-full bg-blue-primary px-8 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
      >
        Give to My Struggle
      </Link>
      <Link
        href="/"
        className="text-[13px] font-semibold text-blue-primary"
      >
        Back to the homepage
      </Link>
    </div>
  );
}

/* ── Thank-you state - real split recap ───────────────────────────────── */
function ThankYou({
  gave,
  slug,
  back,
}: {
  gave: { amount: number; weekly: boolean; split: Split | null; name: string };
  slug: string;
  back: () => void;
}) {
  const confirmAmount = `$${gave.amount}` + (gave.weekly ? " weekly" : "");
  const cash = gave.split ? money(gave.split.cash) : null;
  const credits = gave.split ? money(gave.split.credits) : null;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-7 py-[60px] text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8F8F0] text-[40px] font-extrabold text-success">
        ✓
      </div>
      <div className="text-[28px] font-extrabold tracking-[-0.02em] text-ink-900">
        Thank you.
      </div>
      <div className="max-w-[300px] text-[16px]/[1.7] font-medium text-ink-600">
        Your <strong className="text-ink-900">{confirmAmount}</strong> gift is
        on its way to {gave.name || "My Struggle"} -{" "}
        {cash && credits ? (
          <>
            <strong className="text-ink-900">{cash}</strong> as cash{" "}
            {gave.name ? "at their center" : "at our centers"},{" "}
            <strong className="text-ink-900">{credits}</strong> held for their
            reentry.
          </>
        ) : (
          <>half as cash, half held for their reentry.</>
        )}
      </div>
      <div className="max-w-[300px] rounded-2xl bg-white px-[22px] py-[18px] text-[13px]/[1.7] font-medium text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        Demo checkout - Stripe payments and email receipts arrive with launch.
        <br />
        {gave.name ? (
          <>
            Want to follow {gave.name}&apos;s journey? You&apos;ll only get
            milestones they choose to share.
          </>
        ) : (
          <>
            Your gift goes where the need is greatest.
            <br />
            Demo: general-fund gifts are illustrative for now.
          </>
        )}
      </div>
      {gave.name && (
        <Link
          href={`/community/u/${encodeURIComponent(slug)}`}
          className="inline-flex h-[52px] cursor-pointer items-center rounded-full bg-blue-primary px-8 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
        >
          Follow {gave.name}&apos;s journey
        </Link>
      )}
      <button
        type="button"
        onClick={back}
        className="cursor-pointer text-[13px] font-semibold text-blue-primary"
      >
        {gave.name ? `Back to ${gave.name}’s page` : "Back to the page"}
      </button>
    </div>
  );
}

/* ── 50/50 split explainer - ported verbatim from /give, name-dynamic ─── */
function SplitExplainer({ name }: { name: string | null }) {
  return (
    <div className="px-5 pt-7">
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(11,37,69,.1)]">
        <div className="bg-navy-deep px-6 py-5 text-center">
          <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0]">
            WHERE YOUR GIFT GOES
          </div>
          <div className="mt-1.5 text-[20px] font-extrabold text-white">
            Every dollar splits{" "}
            <span className="script text-[26px] text-[#A9B4E8]">two ways</span>
          </div>
        </div>
        <div className="flex h-[14px]">
          <div className="w-1/2 bg-blue-primary" />
          <div className="w-1/2 bg-indigo-brand" />
        </div>
        <div className="grid grid-cols-2">
          <div className="border-r border-sky-tint px-[18px] py-[22px] text-center">
            <div className="tnum text-[34px] font-extrabold text-blue-primary">
              50%
            </div>
            <div className="mt-1 text-[14px] font-bold text-ink-900">Cash</div>
            <div className="mt-1.5 text-[12.5px]/[1.6] text-ink-600">
              Redeemed in person at My Struggle outreach centers with{" "}
              {name ? `${name}’s` : "a"} member ID card
            </div>
          </div>
          <div className="px-[18px] py-[22px] text-center">
            <div className="tnum text-[34px] font-extrabold text-indigo-brand">
              50%
            </div>
            <div className="mt-1 text-[14px] font-bold text-ink-900">
              Reentry Fund
            </div>
            <div className="mt-1.5 text-[12.5px]/[1.6] text-ink-600">
              Held safely and released directly to {name ? name : "the member"}{" "}
              when they re-enter society
            </div>
          </div>
        </div>
        <div className="bg-sky-tint px-5 py-3 text-center text-[12px]/[1.5] font-semibold text-indigo-brand">
          {name
            ? `${name} can also set aside extra into personal savings for the road ahead.`
            : "Members can also set aside extra into personal savings for the road ahead."}
        </div>
      </div>
    </div>
  );
}

/* ── Amount picker + weekly toggle + donate pill ──────────────────────── */
function AmountPicker(props: {
  amount: number;
  setAmount: (n: number) => void;
  customOpen: boolean;
  setCustomOpen: (b: boolean) => void;
  customValue: string;
  setCustomValue: (s: string) => void;
  weekly: boolean;
  setWeekly: (fn: (w: boolean) => boolean) => void;
  weeklyHint: string;
  giveLabel: string;
  sending: boolean;
  onDonate: () => void;
  footerName: string | null;
}) {
  const {
    amount,
    setAmount,
    customOpen,
    setCustomOpen,
    customValue,
    setCustomValue,
    weekly,
    setWeekly,
    weeklyHint,
    giveLabel,
    sending,
    onDonate,
    footerName,
  } = props;
  return (
    <div className="flex flex-col gap-4 px-6 pb-9 pt-7">
      <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary">
        Choose an amount
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {PRESETS.map((v) => {
          const on = !customOpen && amount === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => {
                setAmount(v);
                setCustomOpen(false);
              }}
              className={
                "flex h-14 cursor-pointer items-center justify-center rounded-[14px] text-[17px] " +
                (on
                  ? "border-2 border-blue-primary bg-sky-tint font-extrabold text-blue-primary"
                  : "border-[1.5px] border-sky-tint bg-white font-bold text-ink-900")
              }
            >
              ${v}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={
            "flex h-14 cursor-pointer items-center justify-center rounded-[14px] text-[15px] " +
            (customOpen
              ? "border-2 border-blue-primary bg-sky-tint font-extrabold text-blue-primary"
              : "border-[1.5px] border-sky-tint bg-white font-bold text-ink-600")
          }
        >
          Custom
        </button>
      </div>

      {customOpen && (
        <input
          placeholder="Enter amount, e.g. 75"
          value={customValue}
          onChange={(e) =>
            setCustomValue(e.target.value.replace(/[^0-9]/g, ""))
          }
          inputMode="numeric"
          className="box-border h-14 w-full rounded-[14px] border-2 border-blue-primary bg-white px-[18px] text-[17px] font-bold text-ink-900"
        />
      )}

      {/* MAKE IT WEEKLY */}
      <div className="flex items-center justify-between gap-3 rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div>
          <div className="text-[15px] font-bold text-ink-900">
            Make it weekly
          </div>
          <div className="mt-0.5 text-[12.5px] text-ink-600">{weeklyHint}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={weekly}
          aria-label="Make it weekly"
          onClick={() => setWeekly((w) => !w)}
          className={
            "relative h-8 w-[52px] flex-none cursor-pointer rounded-full transition-colors duration-200 " +
            (weekly ? "bg-blue-primary" : "bg-[#E2E8F0]")
          }
        >
          <span
            className={
              "absolute top-[3px] block h-[26px] w-[26px] rounded-full bg-white shadow-[0_1px_3px_rgba(11,37,69,.2)] transition-[left] duration-200 " +
              (weekly ? "left-[23px]" : "left-[3px]")
            }
          />
        </button>
      </div>

      {/* DONATE PILL */}
      <button
        type="button"
        onClick={onDonate}
        disabled={sending}
        className="inline-flex h-[60px] cursor-pointer items-center justify-center gap-2 rounded-full bg-blue-primary text-[18px] font-extrabold text-white shadow-[0_8px_20px_rgba(46,124,214,.35)] hover:bg-blue-hover disabled:cursor-default disabled:opacity-70"
      >
        {sending ? "Sending…" : giveLabel}{" "}
        <Heart size={15} fill="currentColor" />
      </button>
      <div className="text-center text-[12px]/[1.6] font-medium text-ink-600">
        Demo checkout - Stripe payments and email receipts arrive with launch
        {footerName && (
          <>
            <br />
            Follow {footerName}&apos;s journey - milestone updates they choose
            to share
          </>
        )}
      </div>
    </div>
  );
}

/* ── Full member page body ────────────────────────────────────────────── */
function MemberBody(props: {
  member: PublicMember;
  amount: number;
  setAmount: (n: number) => void;
  customOpen: boolean;
  setCustomOpen: (b: boolean) => void;
  customValue: string;
  setCustomValue: (s: string) => void;
  weekly: boolean;
  setWeekly: (fn: (w: boolean) => boolean) => void;
  amtLabel: string;
  giveLabel: string;
  sending: boolean;
  onDonate: () => void;
}) {
  const { member, amtLabel } = props;
  const initial = (member.name || "?").charAt(0).toUpperCase();
  return (
    <div>
      {/* PROFILE - avatar, name, member chip, consented story */}
      <div className="flex flex-col items-center gap-3.5 px-6 pt-8 text-center">
        <div className="photo-ph flex h-[104px] w-[104px] items-center justify-center rounded-full border-[3px] border-white text-[36px] font-extrabold text-indigo-brand shadow-[0_4px_14px_rgba(11,37,69,.15)]">
          {initial}
        </div>
        <div>
          <div className="text-[28px] font-extrabold tracking-[-0.02em] text-ink-900">
            {member.name}
          </div>
          <div className="mt-2 inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
            Member #{member.memberNumber}
          </div>
        </div>
        {member.story && (
          <div className="text-[15px]/[1.7] text-ink-600">
            &quot;{member.story}&quot;
          </div>
        )}
        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-[9px] text-white">
            ✓
          </span>
          Story shared with {member.name}&apos;s consent · approved by My
          Struggle
        </div>
      </div>

      <SplitExplainer name={member.name} />

      {/* GOALS - one progress card per support request + savings */}
      <div className="flex flex-col gap-3.5 px-6 pt-7">
        <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary">
          {member.name}&apos;s goals
        </div>
        {member.requests.length === 0 && (
          <div className="rounded-2xl bg-white px-5 py-[18px] text-[13px] text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            No active support requests right now - your gift still goes
            straight to {member.name}&apos;s balances.
          </div>
        )}
        {member.requests.map((r) => (
          <RequestCard key={r.id} r={r} />
        ))}
        <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="flex justify-between text-[14px] font-semibold text-ink-900">
            <span>Reentry savings</span>
            <span className="tnum text-success">
              {money(member.savings)} saved
            </span>
          </div>
          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-sky-tint">
            <div
              className="h-full rounded-full bg-success"
              style={{
                width: `${Math.min(100, Math.round((member.savings / 600) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      <AmountPicker
        amount={props.amount}
        setAmount={props.setAmount}
        customOpen={props.customOpen}
        setCustomOpen={props.setCustomOpen}
        customValue={props.customValue}
        setCustomValue={props.setCustomValue}
        weekly={props.weekly}
        setWeekly={props.setWeekly}
        weeklyHint={
          props.weekly
            ? `${amtLabel} every week keeps ${member.name}’s goals on track`
            : "One-time gift - flip to weekly to sustain their goal"
        }
        giveLabel={props.giveLabel}
        sending={props.sending}
        onDonate={props.onDonate}
        footerName={member.name}
      />
    </div>
  );
}

/* ── Single support-request progress card ─────────────────────────────── */
function RequestCard({ r }: { r: SupportRequest }) {
  const funded = r.status === "funded" || r.raised >= r.weeklyTarget;
  const pct = Math.min(
    100,
    Math.round((r.raised / Math.max(1, r.weeklyTarget)) * 100)
  );
  return (
    <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="flex items-center justify-between gap-2 text-[14px] font-semibold text-ink-900">
        <span className="flex items-center gap-2">
          {r.label} · weekly
          {funded && (
            <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-[#E8F8F0] px-2.5 text-[10px] font-bold text-success">
              ✓ Funded
            </span>
          )}
        </span>
        <span className={"tnum " + (funded ? "text-success" : "text-blue-primary")}>
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
}
