"use client";

import Link from "next/link";

export default function GiveTab() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-white px-5 pb-3.5 pt-[18px]">
        <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
          Give
        </div>
      </div>
      <div className="hairline" />

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
    </div>
  );
}
