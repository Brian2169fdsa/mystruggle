"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeOff, HeartHandshake, ShieldCheck, X } from "lucide-react";
import { CARD, SKELETON, relTime } from "./types";

/** One member report against a community post (GET /api/reports).
 *  Matches the staff contract; `createdAt` is normalized defensively since the
 *  backend may send it as ms, seconds, or an ISO string. */
type MemberReport = {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  note?: string | null;
  status: "open" | "reviewed" | "actioned";
  createdAt: number | string;
  post: { id: string; authorName: string; excerpt: string } | null;
  reporterName: string;
};

/** The moderation actions staff can take on a report (PATCH /api/reports). */
type ReportAction = "reviewed" | "dismiss" | "hide_post" | "warn_author";

/** Normalize any timestamp shape (ms, seconds, or ISO string) to ms epoch. */
function toMs(v: number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v; // seconds → ms
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}

/** Reasons that signal member wellbeing get an amber (concern) chip - never a
 *  red "on a person". Everything else reads as a neutral sky chip. */
const CONCERN = /(harm|safe|crisis|suicid|threat|danger)/i;

function reasonLabel(reason: string): string {
  const s = (reason ?? "").trim();
  if (!s) return "Reported";
  return s
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export default function ReportsQueue({
  onOpenCount,
}: {
  onOpenCount?: (n: number) => void;
}) {
  const [reports, setReports] = useState<MemberReport[] | null | "offline">(
    null
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      // Staff surface is already gated by the page; treat auth/absent as empty.
      if (res.status === 401) {
        setReports([]);
        onOpenCount?.(0);
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { reports?: MemberReport[] };
      const list = data.reports ?? [];
      setReports(list);
      onOpenCount?.(list.filter((r) => r.status === "open").length);
    } catch {
      // Keep any list we already have; otherwise show the "coming online" note.
      setReports((cur) => (Array.isArray(cur) ? cur : "offline"));
    }
  }, [onOpenCount]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // One handler for every moderation action. reviewed/dismiss resolve the
  // report as "reviewed"; hide_post/warn_author resolve it as "actioned" (they
  // changed something). Optimistic flip, then the badge is reconciled.
  const act = useCallback(
    async (id: string, action: ReportAction) => {
      const resolvedStatus: MemberReport["status"] =
        action === "hide_post" || action === "warn_author"
          ? "actioned"
          : "reviewed";
      setBusyId(id);
      try {
        const res = await fetch("/api/reports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setReports((cur) => {
          if (!Array.isArray(cur)) return cur;
          const next = cur.map((r) =>
            r.id === id ? { ...r, status: resolvedStatus } : r
          );
          onOpenCount?.(next.filter((r) => r.status === "open").length);
          return next;
        });
      } catch {
        // Refetch so the button state matches the server on failure.
        await load().catch(() => {});
      } finally {
        setBusyId(null);
      }
    },
    [load, onOpenCount]
  );

  const header = (
    <div>
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        Member reports
      </div>
      <div className="mt-0.5 text-[13px] font-medium text-ink-600">
        When a member flags a post, it lands here. Reviewing is care work, not
        punishment - read with the whole person in mind.
      </div>
    </div>
  );

  // Coming-online / loading state.
  if (reports === null || reports === "offline") {
    return (
      <div className="flex flex-col gap-5">
        {header}
        {reports === "offline" && (
          <div className="text-[13px] font-semibold text-ink-400">
            Reports queue coming online…
          </div>
        )}
        <div className="flex flex-col gap-[18px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={SKELETON + " h-[128px]"} />
          ))}
        </div>
      </div>
    );
  }

  // Open first, then reviewed; newest first within each group.
  const rows = [...reports].sort((a, b) => {
    if (a.status !== b.status) return a.status === "open" ? -1 : 1;
    return toMs(b.createdAt) - toMs(a.createdAt);
  });
  const openCount = reports.filter((r) => r.status === "open").length;

  // Warm empty state - nothing open to review.
  if (openCount === 0) {
    return (
      <div className="flex flex-col gap-5">
        {header}
        <div className={CARD + " flex flex-col items-center px-8 py-16 text-center"}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F8F0]">
            <ShieldCheck size={26} strokeWidth={2.4} className="text-success" />
          </div>
          <div className="mt-4 text-[17px] font-extrabold text-ink-900">
            No open reports
          </div>
          <div className="mt-1 max-w-[420px] text-[14px]/[1.6] font-medium text-ink-600">
            The community&rsquo;s looking out for each other.
          </div>
        </div>
        {/* Recently reviewed stays visible for context, if any. */}
        {rows.length > 0 && (
          <ReviewedList rows={rows.filter((r) => r.status !== "open")} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header}
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-6 items-center rounded-full bg-sky-tint px-3 text-[11px] font-extrabold tracking-[.06em] text-blue-primary">
          {openCount} OPEN
        </span>
        <span className="text-[13px] font-medium text-ink-600">
          {openCount === 1 ? "post is" : "posts are"} waiting for a look
        </span>
      </div>

      <div className="flex flex-col gap-[18px]">
        {rows.map((r) => {
          const resolved = r.status !== "open";
          const actioned = r.status === "actioned";
          const busy = busyId === r.id;
          const concern = CONCERN.test(r.reason);
          return (
            <div
              key={r.id}
              className={
                CARD +
                " px-[30px] py-6 " +
                (resolved ? "opacity-70" : "")
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "inline-flex h-[26px] items-center rounded-full px-3 text-[11px] font-extrabold tracking-[.04em] " +
                      (concern
                        ? "bg-amber-bg text-amber-ink"
                        : "bg-sky-tint text-blue-primary")
                    }
                  >
                    {reasonLabel(r.reason)}
                  </span>
                  {resolved && (
                    <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-[#E8F8F0] px-3 text-[11px] font-bold text-success">
                      <ShieldCheck size={12} strokeWidth={2.6} />{" "}
                      {actioned ? "Action taken" : "Reviewed"}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-ink-600">
                  {relTime(toMs(r.createdAt))}
                </span>
              </div>

              {/* Reported post excerpt + author */}
              <div className="mt-3 rounded-xl bg-canvas px-[18px] py-3.5">
                {r.post ? (
                  <>
                    <div className="text-[15px]/[1.6] font-medium text-ink-900">
                      &ldquo;{r.post.excerpt}&rdquo;
                    </div>
                    <div className="mt-1.5 text-xs font-semibold text-ink-600">
                      Posted by {r.post.authorName}
                    </div>
                  </>
                ) : (
                  <div className="text-[13px] font-medium italic text-ink-400">
                    This post is no longer available - it may have been removed.
                  </div>
                )}
              </div>

              {r.note && (
                <div className="mt-3 flex items-start gap-2.5">
                  <span className="mt-0.5 flex-none text-[11px] font-extrabold tracking-[.04em] text-blue-primary">
                    NOTE
                  </span>
                  <span className="text-[14px]/[1.6] font-medium text-ink-900">
                    {r.note}
                  </span>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 border-t border-canvas pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <span className="text-xs font-semibold text-ink-600">
                  Reported by {r.reporterName}
                </span>
                {!resolved && (
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Take-down + author-warning act on the post; dismiss and
                        mark-reviewed resolve without touching it. Safety first,
                        never punitive. */}
                    <button
                      type="button"
                      onClick={() => act(r.id, "hide_post")}
                      disabled={busy || !r.post}
                      title={
                        r.post
                          ? "Remove this post from the community feed"
                          : "This post is no longer available"
                      }
                      className={
                        "inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[13px] font-bold text-white " +
                        (busy || !r.post
                          ? "cursor-not-allowed bg-ink-400"
                          : "cursor-pointer bg-blue-primary hover:bg-blue-hover")
                      }
                    >
                      <EyeOff size={15} strokeWidth={2.4} />
                      Hide post
                    </button>
                    <button
                      type="button"
                      onClick={() => act(r.id, "warn_author")}
                      disabled={busy || !r.post}
                      title="Send the author a gentle reminder about community guidelines"
                      className={
                        "inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] px-5 text-[13px] font-bold " +
                        (busy || !r.post
                          ? "cursor-not-allowed border-sky-tint-2 text-ink-400"
                          : "cursor-pointer border-blue-primary text-blue-primary hover:bg-sky-tint")
                      }
                    >
                      <HeartHandshake size={15} strokeWidth={2.4} />
                      Warn author
                    </button>
                    <button
                      type="button"
                      onClick={() => act(r.id, "dismiss")}
                      disabled={busy}
                      title="No action needed - close this report"
                      className={
                        "inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] px-5 text-[13px] font-bold " +
                        (busy
                          ? "cursor-not-allowed border-sky-tint-2 text-ink-400"
                          : "cursor-pointer border-sky-tint-2 text-ink-600 hover:border-blue-primary hover:text-blue-primary")
                      }
                    >
                      <X size={15} strokeWidth={2.4} />
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => act(r.id, "reviewed")}
                      disabled={busy}
                      className={
                        "inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[13px] font-bold " +
                        (busy
                          ? "cursor-not-allowed text-ink-400"
                          : "cursor-pointer text-blue-primary hover:bg-sky-tint")
                      }
                    >
                      <ShieldCheck size={15} strokeWidth={2.4} />
                      {busy ? "Saving…" : "Mark reviewed"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Collapsed context list of already-reviewed reports (shown under the empty
 *  state so staff can still see what was handled). */
function ReviewedList({ rows }: { rows: MemberReport[] }) {
  if (rows.length === 0) return null;
  return (
    <div className={CARD + " px-[30px] py-5"}>
      <div className="text-[13px] font-bold text-ink-900">
        Recently reviewed
      </div>
      <div className="mt-3 flex flex-col">
        {rows.slice(0, 6).map((r, i) => (
          <div
            key={r.id}
            className={
              "flex items-center justify-between gap-3 py-2.5 " +
              (i < Math.min(rows.length, 6) - 1 ? "border-b border-canvas" : "")
            }
          >
            <span className="min-w-0 truncate text-[13px] font-medium text-ink-600">
              {reasonLabel(r.reason)}
              {r.post ? ` · ${r.post.authorName}` : ""}
            </span>
            <span className="flex-none text-xs font-semibold text-ink-400">
              {relTime(toMs(r.createdAt))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
