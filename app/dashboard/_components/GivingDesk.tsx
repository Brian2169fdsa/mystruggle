"use client";

import { useState } from "react";
import { ScanLine } from "lucide-react";
import { CARD, SKELETON, fmtMoney } from "./types";
import type { AdminMember, GivingStep, OverviewData } from "./types";

/** Daily cash redemption cap (docs/04 guardrails — mirrors the API). */
const DAILY_CAP = 100;

/** The flow's own step — includes the member-lookup "scan" step that the
 *  page-level GivingStep type doesn't model. */
type DeskStep = "scan" | "amount" | "pin" | "done";

type DeskMember = {
  id: string;
  name: string;
  memberNumber: string;
  avatarColor: string;
  cash: number;
};

/** Warm inline error — amber, never red on a person. */
function InlineError({ msg }: { msg: string }) {
  return (
    <div className="mt-3 rounded-xl bg-amber-bg px-4 py-2.5 text-[13px] font-semibold text-amber-ink">
      {msg}
    </div>
  );
}

export default function GivingDesk({
  overview,
}: {
  // The flow is live + self-contained now; the page-level step/amount props
  // are accepted (page.tsx still passes them) but no longer drive the UI.
  overview: OverviewData | null;
  step: GivingStep;
  redeemAmount: number;
  onSelectAmount: (v: number) => void;
  onToPin: () => void;
  onBackToAmount: () => void;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const [deskStep, setDeskStep] = useState<DeskStep>("scan");
  const [memberInput, setMemberInput] = useState("");
  const [member, setMember] = useState<DeskMember | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [amountStr, setAmountStr] = useState("20");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [pinDigits, setPinDigits] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    amount: number;
    newCash: number;
    capRemaining: number;
  } | null>(null);
  // What the API told us each member redeemed today — starts optimistic at
  // $0 and is corrected from every redeem response.
  const [redeemedByMember, setRedeemedByMember] = useState<
    Record<string, number>
  >({});

  const redeemedToday = member ? redeemedByMember[member.id] ?? 0 : 0;
  const capRemaining = DAILY_CAP - redeemedToday;
  const amount = Number(amountStr);

  async function lookupMember() {
    const num = memberInput.trim();
    if (!/^\d{4,}$/.test(num)) {
      setScanError("Enter the member # from the ID card — digits only.");
      return;
    }
    setLooking(true);
    setScanError(null);
    try {
      const res = await fetch("/api/admin/members");
      if (!res.ok) throw new Error("roster");
      const data = (await res.json()) as { members: AdminMember[] };
      const m = data.members.find((x) => x.memberNumber === num);
      if (!m) {
        setScanError(
          `No member card matches #${num} — double-check the number and try again.`
        );
        return;
      }
      setMember({
        id: m.id,
        name: m.name,
        memberNumber: m.memberNumber,
        avatarColor: m.avatarColor,
        cash: m.balances.cash,
      });
      const cash = m.balances.cash;
      setAmountStr(cash >= 20 ? "20" : cash >= 1 ? String(cash) : "");
      setAmountError(null);
      setDeskStep("amount");
    } catch {
      setScanError("Couldn't reach the roster — try again in a moment.");
    } finally {
      setLooking(false);
    }
  }

  function toPin() {
    if (!member) return;
    if (!Number.isInteger(amount) || amount < 1) {
      setAmountError("Enter a whole dollar amount of $1 or more.");
      return;
    }
    if (amount > DAILY_CAP) {
      setAmountError(`Daily cash cap is $${DAILY_CAP} per member.`);
      return;
    }
    if (amount > capRemaining) {
      setAmountError(
        `Only $${capRemaining} remaining on ${member.name}'s cap today.`
      );
      return;
    }
    if (amount > member.cash) {
      setAmountError(`${member.name} has $${member.cash} cash available.`);
      return;
    }
    setAmountError(null);
    setPinDigits("");
    setPinError(null);
    setDeskStep("pin");
  }

  async function confirmRedeem() {
    if (!member) return;
    if (pinDigits.length !== 4) {
      setPinError("Enter your 4-digit staff PIN.");
      return;
    }
    setSubmitting(true);
    setPinError(null);
    try {
      const res = await fetch("/api/admin/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, amount, pin: pinDigits }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        newCash?: number;
        redeemedToday?: number;
        capRemaining?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setPinError(data.error ?? "Something went wrong — try again.");
        return;
      }
      setRedeemedByMember((prev) => ({
        ...prev,
        [member.id]: data.redeemedToday ?? 0,
      }));
      setMember({ ...member, cash: data.newCash ?? member.cash });
      setResult({
        amount,
        newCash: data.newCash ?? 0,
        capRemaining: data.capRemaining ?? 0,
      });
      setDeskStep("done");
    } catch {
      setPinError("Couldn't reach the server — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setDeskStep("scan");
    setMember(null);
    setMemberInput("");
    setScanError(null);
    setAmountStr("20");
    setAmountError(null);
    setPinDigits("");
    setPinError(null);
    setResult(null);
    // redeemedByMember is kept — the cap note stays honest between runs.
  }

  const scan = deskStep === "scan";
  const amountStep = deskStep === "amount";
  const pin = deskStep === "pin";
  const done = deskStep === "done";

  // Quick chips — $10 / $40 / All-$cash.
  const chips = member
    ? [
        { label: "$10", value: 10 },
        { label: "$40", value: 40 },
        { label: `All $${member.cash}`, value: member.cash },
      ]
    : [];

  /** Stepper badge state per position (1=scan, 2=amount, 3=confirm). */
  const stepIndex = scan ? 1 : amountStep ? 2 : 3;
  const badge = (n: number, label: string) => {
    const doneStep = stepIndex > n;
    const active = stepIndex === n;
    return (
      <span
        className={
          "flex items-center gap-2 text-[13px] font-bold " +
          (doneStep
            ? "text-success"
            : active
              ? "text-blue-primary"
              : "text-ink-400")
        }
      >
        <span
          className={
            "box-border inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-xs font-bold " +
            (doneStep
              ? "bg-success text-white"
              : active
                ? "bg-blue-primary text-white"
                : "border-2 border-[#E2E8F0] bg-white text-ink-400")
          }
        >
          {doneStep ? "✓" : n}
        </span>
        {label}
      </span>
    );
  };
  const connector = (afterStep: number) => (
    <div
      className={
        "mx-3 h-0.5 flex-1 " +
        (stepIndex > afterStep ? "bg-success" : "bg-[#E2E8F0]")
      }
    />
  );

  // LIVE split utilization — real held balances from /api/admin/overview.
  const heldTotal = overview
    ? overview.cashHeld + overview.creditsHeld + overview.savingsHeld
    : 0;
  const pctOf = (n: number) =>
    heldTotal > 0 ? Math.round((n / heldTotal) * 100) : 0;
  const split = overview
    ? [
        {
          label: "Cash held",
          amount: overview.cashHeld,
          pct: pctOf(overview.cashHeld),
          swatch: "bg-blue-primary",
        },
        {
          label: "Reentry fund held",
          amount: overview.creditsHeld,
          pct: pctOf(overview.creditsHeld),
          swatch: "bg-indigo-brand",
        },
        {
          label: "Reentry savings held",
          amount: overview.savingsHeld,
          pct: pctOf(overview.savingsHeld),
          swatch: "bg-success",
        },
      ]
    : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Giving desk
      </div>
      <div className="grid grid-cols-[1.2fr_1fr] items-start gap-[18px]">
        {/* Redemption flow */}
        <div className={CARD + " px-[34px] py-[30px]"}>
          {done && member && result ? (
            <div className="flex flex-col items-center gap-3.5 py-[30px] text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F8F0] text-[34px] font-extrabold text-success">
                ✓
              </div>
              <div className="text-2xl font-extrabold tracking-[-0.02em] text-ink-900">
                ${result.amount} cash recorded for {member.name}
              </div>
              <div className="max-w-[380px] text-sm/[1.7] text-ink-600">
                Ledger entry created with dual record — {member.name}&apos;s
                card scan + your staff PIN. Their app balance updated
                instantly: cash now{" "}
                <strong className="text-ink-900">${result.newCash}</strong> ·
                ${result.capRemaining} left on today&apos;s ${DAILY_CAP} cap.
              </div>
              <button
                type="button"
                onClick={resetFlow}
                className="mt-1.5 inline-flex h-12 cursor-pointer items-center rounded-full bg-blue-primary px-7 text-sm font-bold text-white hover:bg-blue-hover"
              >
                New redemption
              </button>
            </div>
          ) : (
            <div>
              {/* Stepper */}
              <div className="mb-[26px] flex items-center">
                {badge(1, "Scan card")}
                {connector(1)}
                {badge(2, "Amount")}
                {connector(2)}
                {badge(3, "Confirm")}
              </div>

              {scan && (
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-sky-tint px-[22px] py-[28px] text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-blue-primary">
                    <ScanLine size={26} strokeWidth={2.2} />
                  </div>
                  <div className="text-[17px] font-bold text-ink-900">
                    Scan member ID card
                  </div>
                  <div className="text-[13px] text-ink-600">
                    Card scan simulated — enter the member # printed on the
                    card.
                  </div>
                  <form
                    className="mt-3 flex w-full max-w-[360px] items-center gap-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void lookupMember();
                    }}
                  >
                    <input
                      value={memberInput}
                      onChange={(e) =>
                        setMemberInput(e.target.value.replace(/\D/g, ""))
                      }
                      inputMode="numeric"
                      autoFocus
                      placeholder="e.g. 039521464"
                      aria-label="Member number"
                      className="tnum h-12 min-w-0 flex-1 rounded-full border-[1.5px] border-sky-tint-2 bg-white px-5 text-[15px] font-bold text-ink-900 outline-none placeholder:font-medium placeholder:text-ink-400 focus:border-blue-primary"
                    />
                    <button
                      type="submit"
                      disabled={looking}
                      className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-blue-primary px-6 text-sm font-bold text-white hover:bg-blue-hover disabled:opacity-60"
                    >
                      {looking ? "Verifying…" : "Verify"}
                    </button>
                  </form>
                  {scanError && <InlineError msg={scanError} />}
                </div>
              )}

              {/* Verified member banner */}
              {member && !scan && (
                <div className="flex items-center gap-5 rounded-2xl bg-sky-tint px-[22px] py-[18px]">
                  <div
                    className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-white text-[22px] font-extrabold"
                    style={{ color: member.avatarColor }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="text-[17px] font-bold text-ink-900">
                      {member.name}{" "}
                      <span className="text-xs font-semibold text-ink-600">
                        #{member.memberNumber}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold text-success">
                      ✓ ID card verified · photo match confirmed by staff
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="tnum text-2xl font-extrabold text-blue-primary">
                      ${member.cash}
                    </div>
                    <div className="text-[11px] font-semibold text-ink-600">
                      cash available
                    </div>
                  </div>
                </div>
              )}

              {amountStep && member && (
                <div>
                  <div className="mt-[22px]">
                    <div className="text-[13px] font-bold text-ink-900">
                      Redemption amount
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="tnum flex h-16 flex-1 items-center rounded-2xl border-2 border-blue-primary bg-white px-6 text-[30px] font-extrabold text-ink-900">
                        <span>$</span>
                        <input
                          value={amountStr}
                          onChange={(e) =>
                            setAmountStr(e.target.value.replace(/\D/g, ""))
                          }
                          inputMode="numeric"
                          aria-label="Redemption amount in dollars"
                          className="tnum w-full min-w-0 bg-transparent font-extrabold text-ink-900 outline-none"
                        />
                      </div>
                      {chips.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => {
                            setAmountStr(String(c.value));
                            setAmountError(null);
                          }}
                          className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-sky-tint px-5 text-sm font-bold text-ink-600 hover:bg-sky-tint"
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2.5 text-xs font-medium text-ink-600">
                      Daily cap ${DAILY_CAP} · ${redeemedToday} redeemed today
                      →{" "}
                      <strong className="text-ink-900">
                        ${capRemaining} remaining today
                      </strong>
                    </div>
                    {amountError && <InlineError msg={amountError} />}
                  </div>
                  <div className="mt-6 flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={toPin}
                      className="inline-flex h-14 cursor-pointer items-center justify-center rounded-full bg-blue-primary px-9 text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
                    >
                      Continue → staff PIN
                    </button>
                    <span className="text-[13px] text-ink-400">
                      Dual record: card scan + staff PIN, both logged
                    </span>
                  </div>
                </div>
              )}

              {pin && member && (
                <div className="mt-[22px] text-center">
                  <div className="text-[15px] font-bold text-ink-900">
                    Confirm ${amount} cash to {member.name}
                  </div>
                  <div className="mt-1.5 text-[13px] text-ink-600">
                    Enter your staff PIN to complete the dual record.
                  </div>
                  <div className="relative mx-auto mt-[18px] flex w-fit justify-center gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <span
                        key={i}
                        className={
                          "inline-flex h-[60px] w-[52px] items-center justify-center rounded-[14px] text-2xl font-extrabold text-ink-900 " +
                          (i < pinDigits.length
                            ? "border-2 border-blue-primary bg-sky-tint"
                            : "border-[1.5px] border-sky-tint bg-white")
                        }
                      >
                        {i < pinDigits.length ? "•" : ""}
                      </span>
                    ))}
                    {/* Invisible input over the boxes captures the PIN. */}
                    <input
                      value={pinDigits}
                      onChange={(e) =>
                        setPinDigits(
                          e.target.value.replace(/\D/g, "").slice(0, 4)
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !submitting)
                          void confirmRedeem();
                      }}
                      inputMode="numeric"
                      autoFocus
                      aria-label="Staff PIN"
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-ink-400">
                    Demo hint: PIN 1234
                  </div>
                  {pinError && (
                    <div className="mx-auto max-w-[380px]">
                      <InlineError msg={pinError} />
                    </div>
                  )}
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => void confirmRedeem()}
                      disabled={submitting}
                      className="inline-flex h-14 cursor-pointer items-center justify-center rounded-full bg-success px-9 text-base font-bold text-white shadow-[0_6px_16px_rgba(18,183,106,.28)] disabled:opacity-60"
                    >
                      {submitting ? "Recording…" : "Confirm redemption"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeskStep("amount")}
                      className="inline-flex h-14 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#E2E8F0] px-6 text-sm font-bold text-ink-600"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-[18px]">
          <div className={CARD + " px-7 py-6"}>
            <div className="text-[15px] font-bold text-ink-900">
              Split utilization · held balances
            </div>
            {split ? (
              <>
                <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-sky-tint">
                  {split.map((s) => (
                    <div
                      key={s.label}
                      className={s.swatch}
                      style={{
                        width:
                          heldTotal > 0
                            ? `${(s.amount / heldTotal) * 100}%`
                            : "0%",
                      }}
                    />
                  ))}
                </div>
                <div className="mt-3.5 flex flex-col gap-2 text-[13px] font-semibold text-ink-900">
                  {split.map((s) => (
                    <div key={s.label} className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <span
                          className={"h-2.5 w-2.5 rounded-[3px] " + s.swatch}
                        />
                        {s.label}
                      </span>
                      <span className="tnum">
                        {fmtMoney(s.amount)} · {s.pct}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={SKELETON + " mt-4 h-[110px]"} />
            )}
          </div>

          <div className={CARD + " px-7 py-6"}>
            <div className="text-[15px] font-bold text-ink-900">
              QR giving funnel · 30 days
            </div>
            <div className="mt-3.5 grid grid-cols-3 gap-2.5 text-center">
              <div>
                <div className="tnum text-[26px] font-extrabold text-blue-primary">
                  1,204
                </div>
                <div className="text-[11px] font-semibold text-ink-600">
                  scans (demo)
                </div>
              </div>
              <div>
                <div className="tnum text-[26px] font-extrabold text-blue-primary">
                  {overview ? overview.donations.toLocaleString("en-US") : "—"}
                </div>
                <div className="text-[11px] font-semibold text-ink-600">
                  gifts
                </div>
              </div>
              <div>
                <div className="tnum text-[26px] font-extrabold text-success">
                  {overview
                    ? overview.weeklyRecurring.toLocaleString("en-US")
                    : "—"}
                </div>
                <div className="text-[11px] font-semibold text-ink-600">
                  weekly recurring
                </div>
              </div>
            </div>
            {overview && (
              <div className="mt-3 text-center text-[11px] font-semibold text-ink-400">
                {overview.donations} gift{overview.donations === 1 ? "" : "s"} ·{" "}
                {overview.weeklyRecurring} weekly recurring
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
