"use client";

import { useEffect, useState } from "react";
import { CARD, SKELETON, fmtMoney, relTime } from "./types";
import type { AdminMember } from "./types";

/** One row of GET /api/sessions?memberId=… */
type SessionRow = {
  id: string;
  mode: "in-person" | "phone" | "video";
  minutes: number;
  note?: string;
  createdAt: number;
  mentorName: string | null;
};

const SESSION_MODE_LABEL: Record<SessionRow["mode"], string> = {
  "in-person": "In person",
  phone: "Phone",
  video: "Video",
};

const TABS = ["Journey", "Courses", "Mentorship", "Balances", "Consent"] as const;
type Tab = (typeof TABS)[number];

// Journey timeline stays the styled demo — journey stages aren't in the
// data model yet.
const TIMELINE = [
  {
    title: "Outreach — met Laveen team",
    date: <>Oct 12, 2025</>,
    done: true,
    lineColor: "#12B76A",
  },
  {
    title: "Stabilization — matched with mentor, IOP intake",
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
    title: "Transitional — hallway house, weekly goal live",
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
  member,
  goParticipants,
  goGiving,
}: {
  member: AdminMember;
  goParticipants: () => void;
  goGiving: () => void;
}) {
  const [tab, setTab] = useState<Tab>("Journey");
  // "Public giving page" is LIVE — POST /api/admin/consent, optimistic flip
  // with revert on failure. Photo + milestone toggles stay local-only: there
  // is no data model for them yet (they still need the signed consent form).
  const [pagePublic, setPagePublic] = useState(member.consentPublic);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [photoPublic, setPhotoPublic] = useState(false);

  // Re-sync when the detail view is reused for a different member.
  useEffect(() => {
    setPagePublic(member.consentPublic);
    setConsentSaving(false);
    setConsentError(null);
  }, [member.id, member.consentPublic]);

  async function togglePagePublic() {
    if (consentSaving) return;
    const next = !pagePublic;
    setPagePublic(next); // optimistic
    setConsentSaving(true);
    setConsentError(null);
    try {
      const r = await fetch("/api/admin/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, consentPublic: next }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) throw new Error("save failed");
      setPagePublic(Boolean(d.consentPublic));
    } catch {
      setPagePublic(!next); // revert — the page is unchanged
      setConsentError(
        "We couldn't save that just now, so nothing changed on the public page. Please try again in a moment."
      );
    } finally {
      setConsentSaving(false);
    }
  }

  // Recent mentor sessions — LIVE. null = loading.
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    setSessions(null);
    fetch(`/api/sessions?memberId=${member.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (alive) setSessions((d?.sessions as SessionRow[]) ?? []);
      })
      .catch(() => {
        if (alive) setSessions([]);
      });
    return () => {
      alive = false;
    };
  }, [member.id]);

  const joined = new Date(member.joinedAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

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
        / <span className="font-bold text-ink-900">{member.name}</span>
      </div>

      {/* Header card */}
      <div className={CARD + " flex flex-wrap items-center gap-[22px] px-[30px] py-[26px]"}>
        <div
          className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full text-[28px] font-extrabold text-white"
          style={{ background: member.avatarColor }}
        >
          {member.name[0]}
        </div>
        <div className="min-w-[260px] flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
              {member.name}
            </div>
            <span className="inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
              #{member.memberNumber}
            </span>
            <span className="inline-flex h-[26px] items-center rounded-full bg-[#DDEBFB] px-3 text-[11px] font-bold text-blue-primary">
              {member.level}
            </span>
          </div>
          <div className="mt-1 text-[13px] font-medium text-ink-600">
            Joined {joined} ·{" "}
            {member.mentorName
              ? `mentor ${member.mentorName}`
              : "no mentor yet"}{" "}
            · {member.points.toLocaleString("en-US")} pts
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
          {/* Left column — journey timeline (demo) + real support requests */}
          <div className="flex flex-col gap-[18px]">
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

            {/* Support requests — LIVE */}
            <div className={CARD + " px-[30px] py-[26px]"}>
              <div className="text-[15px] font-bold text-ink-900">
                Support requests
              </div>
              {member.requests.length === 0 ? (
                <div className="mt-3 text-[13px] text-ink-600">
                  No support requests yet.
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  {member.requests.map((r) => {
                    const funded = r.status === "funded";
                    const pct = Math.min(
                      100,
                      Math.round((r.raised / r.weeklyTarget) * 100)
                    );
                    return (
                      <div key={r.id}>
                        <div className="flex items-center justify-between text-[13px] font-semibold text-ink-900">
                          <span className="flex items-center gap-2.5">
                            {r.label}
                            {funded && (
                              <span className="inline-flex h-[22px] items-center rounded-full bg-[#E8F8F0] px-2.5 text-[11px] font-extrabold text-success">
                                ✓ Funded
                              </span>
                            )}
                          </span>
                          <span className="tnum text-ink-600">
                            {fmtMoney(r.raised)} of {fmtMoney(r.weeklyTarget)}
                            /wk
                          </span>
                        </div>
                        <div className="mt-1.5 h-3 rounded-full bg-sky-tint">
                          <div
                            className={
                              "h-full rounded-full " +
                              (funded ? "bg-success" : "bg-blue-primary")
                            }
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-[18px]">
            {/* Balances — LIVE */}
            <div className={CARD + " px-[26px] py-[22px]"}>
              <div className="text-[15px] font-bold text-ink-900">Balances</div>
              <div className="mt-3.5 grid grid-cols-3 gap-2.5 text-center">
                <div>
                  <div className="tnum text-[22px] font-extrabold text-blue-primary">
                    {fmtMoney(member.balances.cash)}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    cash
                  </div>
                </div>
                <div>
                  <div className="tnum text-[22px] font-extrabold text-indigo-brand">
                    {fmtMoney(member.balances.credits)}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    reentry fund
                  </div>
                </div>
                <div>
                  <div className="tnum text-[22px] font-extrabold text-success">
                    {fmtMoney(member.balances.savings)}
                  </div>
                  <div className="text-[11px] font-semibold text-ink-600">
                    savings
                  </div>
                </div>
              </div>
              <div className="mt-3 text-center text-[11px] text-ink-400">
                Daily cash cap $100 · redeem at the giving desk
              </div>
            </div>

            {/* Recent sessions — LIVE */}
            <div className={CARD + " px-[26px] py-[22px]"}>
              <div className="text-[15px] font-bold text-ink-900">
                Recent sessions
              </div>
              {sessions === null ? (
                <div className="mt-3.5 flex flex-col gap-2.5">
                  <div className={SKELETON + " h-9"} />
                  <div className={SKELETON + " h-9"} />
                  <div className={SKELETON + " h-9"} />
                </div>
              ) : sessions.length === 0 ? (
                <div className="mt-3 text-[13px] text-ink-600">
                  No sessions logged yet.
                </div>
              ) : (
                <div className="mt-2.5 flex flex-col">
                  {sessions.slice(0, 5).map((s, i) => (
                    <div
                      key={s.id}
                      className={
                        "flex items-center justify-between gap-3 py-2.5" +
                        (i > 0 ? " border-t border-canvas" : "")
                      }
                    >
                      <div>
                        <div className="text-[13px] font-semibold text-ink-900">
                          {SESSION_MODE_LABEL[s.mode]} · {s.minutes} min
                        </div>
                        <div className="text-[11px] text-ink-600">
                          {s.mentorName
                            ? `with ${s.mentorName}`
                            : "mentor unassigned"}
                        </div>
                      </div>
                      <span className="tnum flex-none text-[11px] font-medium text-ink-400">
                        {relTime(s.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consent — public-page toggle is LIVE (POST /api/admin/consent);
                photo + milestone toggles are local-only, no data model yet. */}
            <div className={CARD + " px-[26px] py-[22px]"}>
              <div className="text-[15px] font-bold text-ink-900">Consent</div>
              <div className="mt-3 flex flex-col gap-2.5 text-[13px] font-semibold text-ink-900">
                <div
                  className={
                    "flex items-center justify-between transition-opacity duration-200" +
                    (consentSaving ? " opacity-60" : "")
                  }
                >
                  <span>
                    Public giving page
                    {consentSaving && (
                      <span className="ml-2 text-[11px] font-semibold text-ink-400">
                        Saving…
                      </span>
                    )}
                  </span>
                  <Toggle on={pagePublic} onToggle={togglePagePublic} />
                </div>
                {consentError && (
                  <div className="rounded-xl bg-[#FFF7EA] px-3 py-2 text-[11px]/[1.5] font-semibold text-[#B54708]">
                    {consentError}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  Story approved
                  <span className="text-xs font-bold text-success">
                    ✓ Jun 2, 2026
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  Photo on page
                  <Toggle
                    on={photoPublic}
                    onToggle={() => setPhotoPublic((v) => !v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  Milestone updates to donors
                  <Toggle on />
                </div>
              </div>
              <div className="mt-3 text-[11px]/[1.5] text-ink-400">
                {pagePublic
                  ? `Public page is ON — give.my-struggle.org/p/${member.slug}. Revoking flips it to the generic org-giving state immediately.`
                  : `Public page is OFF — give.my-struggle.org/p/${member.slug} now shows the generic org-giving state.`}
                <br />
                Photo and milestone changes require the member&apos;s signed
                consent form.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
