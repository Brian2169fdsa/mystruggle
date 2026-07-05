"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import PrototypeMap from "../components/PrototypeMap";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

const PRESETS = [10, 25, 50];

/**
 * Public QR giving page for Danielle (`/p/danielle` prototype → /give).
 * Standalone mobile-first donor page — minimal header, no site Nav/Footer.
 * Ported from project/prototype/Give.dc.html (state + interaction included).
 */
export default function GivePage() {
  const [amount, setAmount] = useState(25);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [weekly, setWeekly] = useState(true);
  const [gave, setGave] = useState(false);

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
  const weeklyHint = weekly
    ? `${amtLabel} every week keeps Danielle’s housing on track`
    : "One-time gift — flip to weekly to sustain her goal";
  const confirmAmount =
    (currentAmount ? `$${currentAmount}` : "$25") + (weekly ? " weekly" : "");

  return (
    <div className="flex min-h-screen justify-center bg-[#E8EDF4]">
      <div className="flex min-h-screen w-full max-w-[430px] flex-col bg-canvas shadow-[0_0_60px_rgba(11,37,69,.12)]">
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

        {gave ? (
          /* THANK-YOU STATE */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-7 py-[60px] text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8F8F0] text-[40px] font-extrabold text-success">
              ✓
            </div>
            <div className="text-[28px] font-extrabold tracking-[-0.02em] text-ink-900">
              Thank you.
            </div>
            <div className="max-w-[300px] text-[16px]/[1.7] font-medium text-ink-600">
              Your{" "}
              <strong className="text-ink-900">{confirmAmount}</strong> gift is
              on its way to Danielle — half as cash at her center, half as
              Store Credits.
            </div>
            <div className="max-w-[300px] rounded-2xl bg-white px-[22px] py-[18px] text-[13px]/[1.7] font-medium text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
              Receipt sent by email.
              <br />
              Want to follow her journey? You&apos;ll only get milestones she
              chooses to share.
            </div>
            <button
              type="button"
              className="inline-flex h-[52px] cursor-pointer items-center rounded-full bg-blue-primary px-8 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
            >
              Follow Danielle&apos;s journey
            </button>
            <button
              type="button"
              onClick={() => setGave(false)}
              className="cursor-pointer text-[13px] font-semibold text-blue-primary"
            >
              Back to her page
            </button>
          </div>
        ) : (
          <div>
            {/* PROFILE — avatar, name, member chip, consented story */}
            <div className="flex flex-col items-center gap-3.5 px-6 pt-8 text-center">
              <div className="photo-ph flex h-[104px] w-[104px] items-center justify-center rounded-full border-[3px] border-white text-[36px] font-extrabold text-indigo-brand shadow-[0_4px_14px_rgba(11,37,69,.15)]">
                D
              </div>
              <div>
                <div className="text-[28px] font-extrabold tracking-[-0.02em] text-ink-900">
                  Danielle
                </div>
                <div className="mt-2 inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
                  Member #039521464
                </div>
              </div>
              <div className="text-[15px]/[1.7] text-ink-600">
                &quot;I earned my GED and started my first job this year.
                I&apos;m saving for a hallway house — $175 a week gets me
                there. Thank you for seeing me.&quot;
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-success">
                <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-success text-[9px] text-white">
                  ✓
                </span>
                Story shared with Danielle&apos;s consent · approved by My
                Struggle
              </div>
            </div>

            {/* WHERE YOUR GIFT GOES — 50/50 split explainer */}
            <div className="px-5 pt-7">
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(11,37,69,.1)]">
                <div className="bg-navy-deep px-6 py-5 text-center">
                  <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0]">
                    WHERE YOUR GIFT GOES
                  </div>
                  <div className="mt-1.5 text-[20px] font-extrabold text-white">
                    Every dollar splits{" "}
                    <span className="script text-[26px] text-[#A9B4E8]">
                      two ways
                    </span>
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
                    <div className="mt-1 text-[14px] font-bold text-ink-900">
                      Cash
                    </div>
                    <div className="mt-1.5 text-[12.5px]/[1.6] text-ink-600">
                      Redeemed in person at My Struggle outreach centers with
                      Danielle&apos;s member ID card
                    </div>
                  </div>
                  <div className="px-[18px] py-[22px] text-center">
                    <div className="tnum text-[34px] font-extrabold text-indigo-brand">
                      50%
                    </div>
                    <div className="mt-1 text-[14px] font-bold text-ink-900">
                      Store Credits
                    </div>
                    <div className="mt-1.5 text-[12.5px]/[1.6] text-ink-600">
                      Spent on necessary items at The Store — clothing, food,
                      hygiene, essentials
                    </div>
                  </div>
                </div>
                <div className="bg-sky-tint px-5 py-3 text-center text-[12px]/[1.5] font-semibold text-indigo-brand">
                  Danielle can save either balance for her reentry into
                  society.
                </div>
              </div>
            </div>

            {/* DANIELLE'S GOALS */}
            <div className="flex flex-col gap-3.5 px-6 pt-7">
              <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary">
                Danielle&apos;s goals
              </div>
              <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
                <div className="flex justify-between text-[14px] font-semibold text-ink-900">
                  <span>Hallway house · weekly</span>
                  <span className="tnum text-blue-primary">$105 / $175</span>
                </div>
                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-sky-tint">
                  <div className="h-full w-[60%] rounded-full bg-[linear-gradient(90deg,#4E5B9B,#2E7CD6)]" />
                </div>
              </div>
              <div className="rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
                <div className="flex justify-between text-[14px] font-semibold text-ink-900">
                  <span>Reentry savings</span>
                  <span className="tnum text-success">$240 saved</span>
                </div>
                <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-sky-tint">
                  <div className="h-full w-[40%] rounded-full bg-success" />
                </div>
              </div>
            </div>

            {/* CHOOSE AN AMOUNT */}
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
                  <div className="mt-0.5 text-[12.5px] text-ink-600">
                    {weeklyHint}
                  </div>
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
                onClick={() => {
                  if (currentAmount) setGave(true);
                }}
                className="inline-flex h-[60px] cursor-pointer items-center justify-center gap-2 rounded-full bg-blue-primary text-[18px] font-extrabold text-white shadow-[0_8px_20px_rgba(46,124,214,.35)] hover:bg-blue-hover"
              >
                {giveLabel} <Heart size={15} fill="currentColor" />
              </button>
              <div className="text-center text-[12px]/[1.6] font-medium text-ink-600">
                Secure checkout via Stripe · Receipt by email
                <br />
                Follow Danielle&apos;s journey — milestone updates she chooses
                to share
              </div>
            </div>
          </div>
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
