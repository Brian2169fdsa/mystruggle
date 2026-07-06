"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CARD, SKELETON } from "./types";

/** One in-program member on the cohort roster (GET /api/admin/cohort). */
type CohortMember = {
  id: string;
  name: string;
  memberNumber: string;
  avatarColor: string;
  engagement30d: number;
  lastActive: number;
  attendancePct: number;
  atRisk: boolean;
};

/** A cohort = a level-of-care group, optionally joined to a group channel. */
type Cohort = {
  cohortId: string;
  title: string;
  levelOfCare: string;
  channelId: string | null;
  members: CohortMember[];
};

/** One message in the program group channel preview. */
type ChannelMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  body: string;
  createdAt: number;
};

type ChannelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "offline" }
  | { status: "ready"; messages: ChannelMessage[]; notice: string | null };

const ROSTER_GRID = "grid grid-cols-[2fr_1.4fr_1fr_1.1fr]";

/** "3d ago" style relative time from a ms timestamp (0 ⇒ never). */
function relActive(ts: number): string {
  if (!ts) return "no activity yet";
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const mos = Math.floor(days / 30);
  return `${mos}mo ago`;
}

function msgTime(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function ProgramCockpit() {
  // null = still loading; "offline" = API not online yet (retrying).
  const [cohorts, setCohorts] = useState<Cohort[] | null | "offline">(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelState>({ status: "idle" });

  // ── Load cohorts, retrying quietly until the API comes online ──────────
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const res = await fetch("/api/admin/cohort");
        if (res.status === 401) {
          // Session lapsed — a reload will re-gate; stop retrying.
          if (!stop) setCohorts([]);
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (stop) return;
        const list = (data.cohorts ?? []) as Cohort[];
        setCohorts(list);
        setSelectedId((cur) => cur ?? list[0]?.cohortId ?? null);
      } catch {
        if (stop) return;
        setCohorts((cur) => (Array.isArray(cur) ? cur : "offline"));
        timer = setTimeout(load, 4000); // keep trying over the session
      }
    };

    load();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const list = Array.isArray(cohorts) ? cohorts : [];
  const selected = list.find((c) => c.cohortId === selectedId) ?? list[0] ?? null;
  const channelId = selected?.channelId ?? null;

  // ── Load the selected cohort's group channel, retrying on transient miss ─
  const loadChannel = useCallback(async (chId: string) => {
    setChannel({ status: "loading" });
    try {
      const res = await fetch(`/api/care-channels/${chId}/messages`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setChannel({
        status: "ready",
        messages: (data.messages ?? []) as ChannelMessage[],
        notice: data.notice ?? null,
      });
    } catch {
      setChannel({ status: "offline" });
    }
  }, []);

  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (retryRef.current) clearTimeout(retryRef.current);
    if (!channelId) {
      setChannel({ status: "idle" });
      return;
    }
    loadChannel(channelId);
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [channelId, loadChannel]);

  // If the channel is offline, keep retrying quietly while it stays selected.
  useEffect(() => {
    if (channel.status !== "offline" || !channelId) return;
    retryRef.current = setTimeout(() => loadChannel(channelId), 5000);
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [channel.status, channelId, loadChannel]);

  // ── Header ────────────────────────────────────────────────────────────
  const header = (
    <div>
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Program cockpit
      </div>
      <div className="mt-0.5 text-[13px] font-medium text-ink-600">
        Live in-program cohorts · engagement, attendance &amp; the group channel
      </div>
    </div>
  );

  // ── Coming-online skeleton (API not up yet) ───────────────────────────
  if (cohorts === null || cohorts === "offline") {
    return (
      <div className="flex flex-col gap-5">
        {header}
        {cohorts === "offline" && (
          <div className="text-[13px] font-semibold text-ink-400">
            Cohort analytics coming online…
          </div>
        )}
        <div className="grid grid-cols-3 gap-[18px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={SKELETON + " h-[104px]"} />
          ))}
        </div>
        <div className="grid grid-cols-[1.5fr_1fr] gap-[18px]">
          <div className={SKELETON + " h-[340px]"} />
          <div className={SKELETON + " h-[340px]"} />
        </div>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className={CARD + " px-[30px] py-16 text-center"}>
          <div className="text-base font-bold text-ink-900">
            No active cohorts yet
          </div>
          <div className="mt-1.5 text-[13px] font-medium text-ink-600">
            In-program members will appear here as they enter a level of care.
          </div>
        </div>
      </div>
    );
  }

  // ── KPIs for the selected cohort ──────────────────────────────────────
  const members = selected?.members ?? [];
  const size = members.length;
  const avgEng = size
    ? Math.round(
        (members.reduce((s, m) => s + m.engagement30d, 0) / size) * 10
      ) / 10
    : 0;
  const atRiskCount = members.filter((m) => m.atRisk).length;
  const maxEng = Math.max(1, ...members.map((m) => m.engagement30d));

  const kpis = [
    { label: "Cohort size", value: String(size), green: false },
    {
      label: "Avg engagement · 30d",
      value: avgEng.toLocaleString("en-US"),
      suffix: "events",
      green: false,
    },
    {
      label: "On watch",
      value: String(atRiskCount),
      green: atRiskCount === 0,
      amber: atRiskCount > 0,
    },
  ] as {
    label: string;
    value: string;
    suffix?: string;
    green: boolean;
    amber?: boolean;
  }[];

  return (
    <div className="flex flex-col gap-5">
      {header}

      {/* Cohort selector — pills, mirrors the filter-pill pattern */}
      <div className="flex flex-wrap items-center gap-2.5">
        {list.map((c) => {
          const on = c.cohortId === selected?.cohortId;
          const risk = c.members.filter((m) => m.atRisk).length;
          return (
            <button
              key={c.cohortId}
              type="button"
              onClick={() => setSelectedId(c.cohortId)}
              className={
                "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-[18px] text-[13px] " +
                (on
                  ? "border-blue-primary bg-sky-tint font-bold text-blue-primary"
                  : "border-sky-tint bg-white font-semibold text-ink-600")
              }
            >
              {c.title}
              <span className="tnum text-[11px] font-bold text-ink-400">
                {c.members.length}
              </span>
              {risk > 0 && (
                <span className="inline-flex h-[18px] items-center rounded-full bg-amber-bg px-1.5 text-[10px] font-bold text-amber-ink">
                  {risk}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-[18px]">
        {kpis.map((k) => (
          <div key={k.label} className={CARD + " px-[26px] py-5"}>
            <div className="text-[13px] font-medium text-ink-600">{k.label}</div>
            <div
              className={
                "tnum mt-1 text-[34px] font-extrabold tracking-[-0.02em] " +
                (k.amber
                  ? "text-amber-ink"
                  : k.green
                    ? "text-success"
                    : "text-blue-primary")
              }
            >
              {k.value}
              {k.suffix && (
                <span className="text-[13px] font-semibold text-ink-600">
                  {" "}
                  {k.suffix}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Roster + group channel */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-[18px]">
        {/* Cohort roster */}
        <div className={CARD + " overflow-hidden"}>
          <div className="flex items-center justify-between px-[26px] pb-3 pt-[22px]">
            <div className="text-base font-bold text-ink-900">
              {selected?.title} roster
            </div>
            <span className="text-[13px] font-semibold text-ink-400">
              {size} member{size === 1 ? "" : "s"}
            </span>
          </div>
          <div
            className={
              ROSTER_GRID +
              " bg-canvas px-[26px] py-3 text-xs font-bold tracking-[.06em] text-ink-600"
            }
          >
            <span>MEMBER</span>
            <span>ENGAGEMENT · 30d</span>
            <span>ATTEND.</span>
            <span>LAST ACTIVE</span>
          </div>

          {members.length === 0 && (
            <div className="px-[26px] py-10 text-center text-[13px] font-semibold text-ink-400">
              No members in this cohort yet.
            </div>
          )}

          {members.map((m) => (
            <div
              key={m.id}
              className={
                ROSTER_GRID +
                " items-center border-t border-canvas py-4 pr-[26px] " +
                // Amber (never red) left border marks an engagement dip.
                (m.atRisk
                  ? "border-l-[3px] border-l-gold-badge bg-amber-bg/40 pl-[23px]"
                  : "border-l-[3px] border-l-transparent pl-[23px]")
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-extrabold text-white"
                  style={{ background: m.avatarColor }}
                >
                  {m.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-bold text-ink-900">
                    {m.name}
                  </div>
                  <div className="text-xs text-ink-600">#{m.memberNumber}</div>
                </div>
              </div>
              {/* Engagement bar (relative to the busiest member in-cohort) */}
              <div className="pr-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sky-tint">
                    <div
                      className={
                        "h-full rounded-full " +
                        (m.atRisk ? "bg-gold-badge" : "bg-blue-primary")
                      }
                      style={{
                        width: `${Math.max(6, (m.engagement30d / maxEng) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="tnum w-6 flex-none text-right text-[13px] font-bold text-ink-900">
                    {m.engagement30d}
                  </span>
                </div>
              </div>
              <span className="tnum text-sm font-semibold text-ink-900">
                {m.attendancePct}%
              </span>
              <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-ink-600">
                {relActive(m.lastActive)}
                {m.atRisk && (
                  <span className="inline-flex h-6 flex-none items-center rounded-full bg-amber-bg px-2.5 text-[11px] font-bold text-amber-ink">
                    watch
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Group channel preview */}
        <div className={CARD + " flex flex-col px-[26px] py-[22px]"}>
          <div className="flex items-center justify-between">
            <div className="text-base font-bold text-ink-900">Group channel</div>
            <span className="inline-flex h-6 items-center rounded-full bg-sky-tint px-3 text-[11px] font-extrabold tracking-[.06em] text-blue-primary">
              READ-ONLY
            </span>
          </div>
          <div className="mt-0.5 text-[12.5px] font-medium text-ink-600">
            {selected?.title}
          </div>

          {/* No channel joined for this cohort */}
          {!channelId && (
            <div className="mt-6 flex-1 rounded-2xl bg-canvas px-5 py-10 text-center text-[13px] font-medium text-ink-400">
              No group channel is linked to this cohort yet.
            </div>
          )}

          {/* Channel loading / coming-online */}
          {channelId &&
            (channel.status === "loading" || channel.status === "idle") && (
              <div className="mt-4 flex flex-col gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={SKELETON + " h-14"} />
                ))}
              </div>
            )}

          {channelId && channel.status === "offline" && (
            <div className="mt-6 flex-1 rounded-2xl bg-canvas px-5 py-10 text-center text-[13px] font-medium text-ink-400">
              Group channel coming online…
            </div>
          )}

          {channelId && channel.status === "ready" && (
            <>
              <div className="mt-4 flex max-h-[300px] flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {channel.messages.length === 0 && (
                  <div className="rounded-2xl bg-canvas px-4 py-8 text-center text-[13px] font-medium text-ink-400">
                    No messages in this channel yet.
                  </div>
                )}
                {channel.messages.slice(-12).map((msg) => {
                  const staff = msg.senderRole === "staff";
                  return (
                    <div key={msg.id} className="flex gap-2.5">
                      <div
                        className={
                          "flex h-7 w-7 flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white " +
                          (staff ? "bg-indigo-brand" : "bg-blue-primary")
                        }
                      >
                        {msg.senderName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-bold text-ink-900">
                            {msg.senderName}
                          </span>
                          {staff && (
                            <span className="inline-flex h-[15px] items-center rounded-full bg-sky-tint px-1.5 text-[9px] font-bold uppercase tracking-[.08em] text-blue-primary">
                              staff
                            </span>
                          )}
                          <span className="ml-auto flex-none text-[11px] font-medium text-ink-400">
                            {msgTime(msg.createdAt)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[13px]/[1.5] text-ink-600">
                          {msg.body}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {channel.notice && (
                <div className="mt-3 rounded-xl bg-canvas px-3.5 py-2.5 text-[11.5px]/[1.5] font-medium text-ink-400">
                  {channel.notice}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
