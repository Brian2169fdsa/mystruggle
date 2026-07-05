"use client";

import { CARD } from "./types";
import type { GivingStep } from "./types";

const QUICK = [10, 40, 64];

export default function GivingDesk({
  step,
  redeemAmount,
  onSelectAmount,
  onToPin,
  onBackToAmount,
  onConfirm,
  onReset,
}: {
  step: GivingStep;
  redeemAmount: number;
  onSelectAmount: (v: number) => void;
  onToPin: () => void;
  onBackToAmount: () => void;
  onConfirm: () => void;
  onReset: () => void;
}) {
  const pin = step === "pin";
  const done = step === "done";

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Giving desk
      </div>
      <div className="grid grid-cols-[1.2fr_1fr] items-start gap-[18px]">
        {/* Redemption flow */}
        <div className={CARD + " px-[34px] py-[30px]"}>
          {done ? (
            <div className="flex flex-col items-center gap-3.5 py-[30px] text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#E8F8F0] text-[34px] font-extrabold text-success">
                ✓
              </div>
              <div className="text-2xl font-extrabold tracking-[-0.02em] text-ink-900">
                ${redeemAmount} cash recorded for Danielle
              </div>
              <div className="max-w-[380px] text-sm/[1.7] text-ink-600">
                Ledger entry created with dual record — Danielle&apos;s card
                scan + your staff PIN. Her app balance updated instantly: cash
                now ${64 - redeemAmount}.
              </div>
              <button
                type="button"
                onClick={onReset}
                className="mt-1.5 inline-flex h-12 cursor-pointer items-center rounded-full bg-blue-primary px-7 text-sm font-bold text-white hover:bg-blue-hover"
              >
                New redemption
              </button>
            </div>
          ) : (
            <div>
              {/* Stepper */}
              <div className="mb-[26px] flex items-center">
                <span className="flex items-center gap-2 text-[13px] font-bold text-success">
                  <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-success text-xs font-bold text-white">
                    ✓
                  </span>
                  Scan card
                </span>
                <div className="mx-3 h-0.5 flex-1 bg-success" />
                <span
                  className={
                    "flex items-center gap-2 text-[13px] font-bold " +
                    (pin ? "text-success" : "text-blue-primary")
                  }
                >
                  <span
                    className={
                      "inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-xs font-bold text-white " +
                      (pin ? "bg-success" : "bg-blue-primary")
                    }
                  >
                    {pin ? "✓" : "2"}
                  </span>
                  Amount
                </span>
                <div
                  className={
                    "mx-3 h-0.5 flex-1 " + (pin ? "bg-success" : "bg-[#E2E8F0]")
                  }
                />
                <span
                  className={
                    "flex items-center gap-2 text-[13px] font-bold " +
                    (pin ? "text-blue-primary" : "text-ink-400")
                  }
                >
                  <span
                    className={
                      "box-border inline-flex h-[26px] w-[26px] items-center justify-center rounded-full text-xs font-bold " +
                      (pin
                        ? "bg-blue-primary text-white"
                        : "border-2 border-[#E2E8F0] bg-white text-ink-400")
                    }
                  >
                    3
                  </span>
                  Confirm
                </span>
              </div>

              {/* Verified member banner */}
              <div className="flex items-center gap-5 rounded-2xl bg-sky-tint px-[22px] py-[18px]">
                <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-white text-[22px] font-extrabold text-indigo-brand">
                  D
                </div>
                <div className="flex-1">
                  <div className="text-[17px] font-bold text-ink-900">
                    Danielle{" "}
                    <span className="text-xs font-semibold text-ink-600">
                      #039521464
                    </span>
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold text-success">
                    ✓ ID card verified · photo match confirmed by staff
                  </div>
                </div>
                <div className="text-right">
                  <div className="tnum text-2xl font-extrabold text-blue-primary">
                    $64
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    cash available
                  </div>
                </div>
              </div>

              {step === "amount" && (
                <div>
                  <div className="mt-[22px]">
                    <div className="text-[13px] font-bold text-ink-900">
                      Redemption amount
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="tnum flex h-16 flex-1 items-center rounded-2xl border-2 border-blue-primary bg-white px-6 text-[30px] font-extrabold text-ink-900">
                        ${redeemAmount}
                      </div>
                      {QUICK.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => onSelectAmount(v)}
                          className="inline-flex h-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-sky-tint px-5 text-sm font-bold text-ink-600 hover:bg-sky-tint"
                        >
                          {v === 64 ? "All $64" : `$${v}`}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2.5 text-xs font-medium text-ink-600">
                      Daily cap $100 · $20 already redeemed today →{" "}
                      <strong className="text-ink-900">$80 remaining</strong>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-3.5">
                    <button
                      type="button"
                      onClick={onToPin}
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

              {pin && (
                <div className="mt-[22px] text-center">
                  <div className="text-[15px] font-bold text-ink-900">
                    Confirm ${redeemAmount} cash to Danielle
                  </div>
                  <div className="mt-1.5 text-[13px] text-ink-600">
                    Enter your staff PIN to complete the dual record.
                  </div>
                  <div className="mt-[18px] flex justify-center gap-3">
                    {[true, true, false, false].map((filled, i) => (
                      <span
                        key={i}
                        className={
                          "inline-flex h-[60px] w-[52px] items-center justify-center rounded-[14px] text-2xl font-extrabold text-ink-900 " +
                          (filled
                            ? "border-2 border-blue-primary bg-sky-tint"
                            : "border-[1.5px] border-sky-tint bg-white")
                        }
                      >
                        {filled ? "•" : ""}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={onConfirm}
                      className="inline-flex h-14 cursor-pointer items-center justify-center rounded-full bg-success px-9 text-base font-bold text-white shadow-[0_6px_16px_rgba(18,183,106,.28)]"
                    >
                      Confirm redemption
                    </button>
                    <button
                      type="button"
                      onClick={onBackToAmount}
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
              Split utilization · this quarter
            </div>
            <div className="mt-4 flex h-4 overflow-hidden rounded-full">
              <div className="w-[44%] bg-blue-primary" />
              <div className="w-[38%] bg-indigo-brand" />
              <div className="w-[18%] bg-success" />
            </div>
            <div className="mt-3.5 flex flex-col gap-2 text-[13px] font-semibold text-ink-900">
              <div className="flex justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-blue-primary" />
                  Cash redeemed
                </span>
                <span className="tnum">$9,180 · 44%</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-indigo-brand" />
                  Store credits spent
                </span>
                <span className="tnum">$7,940 · 38%</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-success" />
                  Saved for reentry
                </span>
                <span className="tnum">$3,760 · 18%</span>
              </div>
            </div>
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
                  scans
                </div>
              </div>
              <div>
                <div className="tnum text-[26px] font-extrabold text-blue-primary">
                  312
                </div>
                <div className="text-[11px] font-semibold text-ink-600">
                  gifts · 26%
                </div>
              </div>
              <div>
                <div className="tnum text-[26px] font-extrabold text-success">
                  84
                </div>
                <div className="text-[11px] font-semibold text-ink-600">
                  weekly recurring
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
