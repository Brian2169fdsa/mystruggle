"use client";

import { useState } from "react";
import { CARD } from "./types";

const TABS = ["Journey", "Courses", "Mentorship", "Balances", "Consent"] as const;
type Tab = (typeof TABS)[number];

const TIMELINE = [
  {
    title: "Outreach — met Laveen team",
    date: <>Oct 12, 2025</>,
    done: true,
    lineColor: "#12B76A",
  },
  {
    title: "Stabilization — matched with Marcus, IOP intake",
    date: <>Nov 3, 2025</>,
    done: true,
    lineColor: "#12B76A",
  },
  {
    title: "In Program — GED earned, first job at ABC Painting",
    date: (
      <>
        Feb 20, 2026 ·{" "}
        <span className="font-bold text-gold-ink">◆ GED badge</span>
      </>
    ),
    done: true,
    lineColor: "#2E7CD6",
  },
  {
    title: "Transitional — hallway house, $175/wk goal live",
    date: <>May 4, 2026 · current stage</>,
    done: false,
    lineColor: null,
  },
];

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle?: () => void;
}) {
  return (
    <span
      onClick={onToggle}
      className={
        "relative h-[26px] w-11 rounded-full transition-colors duration-200 " +
        (onToggle ? "cursor-pointer " : "") +
        (on ? "bg-success" : "bg-[#E2E8F0]")
      }
    >
      <span
        className={
          "absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-[left] duration-200 " +
          (on ? "left-5" : "left-0.5")
        }
      />
    </span>
  );
}

export default function ParticipantDetail({
  pagePublic,
  photoPublic,
  onTogglePage,
  onTogglePhoto,
  redeemed,
  goParticipants,
  goGiving,
}: {
  pagePublic: boolean;
  photoPublic: boolean;
  onTogglePage: () => void;
  onTogglePhoto: () => void;
  /** Amount redeemed at the giving desk this session (0 until confirmed). */
  redeemed: number;
  goParticipants: () => void;
  goGiving: () => void;
}) {
  const [tab, setTab] = useState<Tab>("Journey");

  const cash = 64 - redeemed;
  const redeemedToday = 20 + redeemed;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="text-[13px] font-semibold text-ink-600">
        <button
          type="button"
          onClick={goParticipants}
          className="cursor-pointer text-[13px] font-semibold text-blue-primary"
        >
          Participants
        </button>{" "}
        / <span className="font-bold text-ink-900">Danielle</span>
      </div>

      {/* Header card */}
      <div className={CARD + " flex flex-wrap items-center gap-[22px] px-[30px] py-[26px]"}>
        <div className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full bg-sky-tint text-[28px] font-extrabold text-indigo-brand">
          D
        </div>
        <div className="min-w-[260px] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
              Danielle
            </div>
            <span className="inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
              #039521464
            </span>
            <span className="inline-flex h-[26px] items-center rounded-full bg-[#DDEBFB] px-3 text-[11px] font-bold text-blue-primary">
              Transitional
            </span>
          </div>
          <div className="mt-1 text-[13px] font-medium text-ink-600">
            Joined Oct 2025 · mentor Marcus T. · PON program
          </div>
        </div>
        <button
          type="button"
          className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-[22px] text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
        >
          Print ID card
        </button>
        <button
          type="button"
          onClick={goGiving}
          className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-[22px] text-[13px] font-bold text-white hover:bg-blue-hover"
        >
          Record redemption
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              "inline-flex h-[38px] cursor-pointer items-center rounded-full px-[18px] text-[13px] " +
              (tab === t
                ? "bg-blue-primary font-bold text-white"
                : "border-[1.5px] border-sky-tint bg-white font-semibold text-ink-600 hover:bg-sky-tint")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab !== "Journey" ? (
        <div className={CARD + " px-[30px] py-[26px]"}>
          <div className="text-[15px] font-bold text-ink-900">{tab}</div>
          <div className="mt-2 text-[13px] text-ink-600">
            {tab} view is a stub in this prototype — the Journey tab shows the
            working record, including balances and consent.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1.4fr_1fr] gap-[18px]">
          {/* Journey timeline */}
          <div className={CARD + " px-[30px] py-[26px]"}>
            <div className="text-[15px] font-bold text-ink-900">
              Journey timeline
            </div>
            <div className="mt-4 flex flex-col">
              {TIMELINE.map((t) => (
                <div key={t.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {t.done ? (
                      <span className="inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-success text-[10px] font-bold text-white">
                        ✓
                      </span>
                    ) : (
                      <span className="h-5 w-5 flex-none rounded-full bg-blue-primary shadow-[0_0_0_4px_#EAF2FC]" />
                    )}
                    {t.lineColor && (
                      <div
                        className="w-0.5 flex-1"
                        style={{ minHeight: 22, background: t.lineColor }}
                      />
                    )}
                  </div>
                  <div className={t.done ? "pb-3.5" : ""}>
                    <div
                      className={
                        "text-[13px] font-bold " +
                        (t.done ? "text-ink-900" : "text-blue-primary")
                      }
                    >
                      {t.title}
                    </div>
                    <div className="text-xs text-ink-600">{t.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[18px]">
            {/* Balances */}
            <div className={CARD + " px-[26px] py-[22px]"}>
              <div className="text-[15px] font-bold text-ink-900">Balances</div>
              <div className="mt-3.5 grid grid-cols-3 gap-2.5 text-center">
                <div>
                  <div className="tnum text-[22px] font-extrabold text-blue-primary">
                    ${cash}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    cash
                  </div>
                </div>
                <div>
                  <div className="tnum text-[22px] font-extrabold text-indigo-brand">
                    $58
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    credits
                  </div>
                </div>
                <div>
                  <div className="tnum text-[22px] font-extrabold text-success">
                    $240
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    reentry
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center text-[11px] text-ink-400">
                Daily cash cap $100 · ${redeemedToday} redeemed today
              </div>
            </div>

            {/* Consent */}
            <div className={CARD + " px-[26px] py-[22px]"}>
              <div className="text-[15px] font-bold text-ink-900">Consent</div>
              <div className="mt-3 flex flex-col gap-2.5 text-[13px] font-semibold text-ink-900">
                <div className="flex items-center justify-between">
                  Public giving page
                  <Toggle on={pagePublic} onToggle={onTogglePage} />
                </div>
                <div className="flex items-center justify-between">
                  Story approved
                  <span className="text-xs font-bold text-success">
                    ✓ Jun 2, 2026
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  Photo on page
                  <Toggle on={photoPublic} onToggle={onTogglePhoto} />
                </div>
                <div className="flex items-center justify-between">
                  Milestone updates to donors
                  <Toggle on />
                </div>
              </div>
              <div className="mt-3 text-[11px]/[1.5] text-ink-400">
                {pagePublic
                  ? "Revoking flips the public page to a generic org-giving state within minutes."
                  : "Public page is OFF — give.my-struggle.org/p/danielle now shows the generic org-giving state."}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
