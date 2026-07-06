"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AtSign,
  Bell,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  HeartHandshake,
  Heart,
  Info,
  MessageCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Contract with /api/notifications (built concurrently) ───────────────
   GET  -> { notifications: NotificationItem[]; unreadCount: number }
   POST { action:"markRead", ids?: string[] } -> { ok:true; unreadCount:number }
   401 when signed out - the bell renders nothing in that case. */

export type NotificationKind =
  | "reaction"
  | "comment"
  | "care_message"
  | "follow_up"
  | "job"
  | "event"
  | "mention"
  | "system";

export type NotificationItem = {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  refType?: string;
  refId?: string;
  read: boolean;
  createdAt: number;
};

type FeedResponse = {
  notifications?: NotificationItem[];
  unreadCount?: number;
};

/** Kind → warm, dignified icon + tint. No gold on the website. */
export const KIND_META: Record<
  NotificationKind,
  { icon: LucideIcon; label: string }
> = {
  reaction: { icon: Heart, label: "Reaction" },
  comment: { icon: MessageCircle, label: "Comment" },
  care_message: { icon: HeartHandshake, label: "Care message" },
  follow_up: { icon: CalendarClock, label: "Follow-up" },
  job: { icon: Briefcase, label: "Opportunity" },
  event: { icon: CalendarDays, label: "Event" },
  mention: { icon: AtSign, label: "Mention" },
  system: { icon: Info, label: "Update" },
};

/**
 * Where a notification should take you - shared by the bell dropdown and the
 * full /notifications page (same export pattern as KIND_META). Returns null
 * when there is no sensible destination (row stays a mark-read-only row).
 */
export function notificationHref(n: NotificationItem): string | null {
  const refType = n.refType ?? "";
  switch (refType) {
    case "post":
      return n.refId ? `/community#post-${n.refId}` : "/community";
    case "event":
      return "/community/events";
    case "job":
    case "posting":
    case "posting_candidate":
      // Employers get candidate alerts (kind "job", "New candidate…" titles);
      // members get opportunity alerts - their job tracker lives in the app.
      if (n.kind === "job" && /new candidate/i.test(n.title)) {
        return "/employer/dashboard";
      }
      return "/member-app";
    case "donation":
      return "/member-app";
    case "channel":
    case "care_message":
      return "/member-app";
    case "circle":
      return "/community/circles";
    case "report":
      return "/dashboard";
    case "kudos":
      return "/member-app";
  }
  if (n.kind === "care_message") return "/member-app";
  if (n.kind === "mention" || n.kind === "comment" || n.kind === "reaction") {
    return "/community";
  }
  return null;
}

/** "just now" / "5m" / "3h" / "2d" / "May 12" - relative recency. */
export function relTime(ts: number): string {
  const secs = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 28) return `${Math.floor(days / 7)}w ago`;
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Header notification bell - self-gating. Polls GET /api/notifications on
 * mount; a 401 means "signed out", so the whole control renders nothing.
 * Click opens a dropdown of recent notifications with "Mark all read" and a
 * "See all" link to the full /notifications page.
 */
export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  // null = unknown, true = signed in, false = signed out (hide entirely)
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (res.status === 401) {
        setSignedIn(false);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as FeedResponse;
      setSignedIn(true);
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
      setUnread(
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : (data.notifications ?? []).filter((n) => !n.read).length
      );
    } catch {
      // Network hiccup - leave state as-is; a later poll can recover.
    }
  }, []);

  // Poll on mount, then refresh gently while mounted.
  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, [load]);

  // Refresh when the tab regains focus.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const markRead = useCallback(
    async (ids?: string[]) => {
      // Optimistic - dim the badge immediately, then reconcile with server.
      setItems((prev) =>
        prev.map((n) =>
          !ids || ids.includes(n.id) ? { ...n, read: true } : n
        )
      );
      setUnread((prev) =>
        !ids
          ? 0
          : Math.max(0, prev - items.filter((n) => ids.includes(n.id) && !n.read).length)
      );
      try {
        const res = await fetch("/api/notifications", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "markRead", ids }),
        });
        if (res.ok) {
          const data = (await res.json()) as { unreadCount?: number };
          if (typeof data.unreadCount === "number") setUnread(data.unreadCount);
        }
      } catch {
        // Ignore - the next poll re-syncs truth.
      }
      load();
    },
    [items, load]
  );

  // Signed out (or a 401 during the first load): render nothing.
  if (signedIn === false) return null;

  const recent = items
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);
  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <div ref={rootRef} className="relative flex items-center">
      <button
        type="button"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent text-ink-900 hover:bg-sky-tint hover:text-blue-primary"
      >
        <Bell size={21} strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-blue-primary px-1 text-[10px] font-bold leading-none text-white shadow-[0_0_0_2px_#fff]">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[70] mt-2 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(11,37,69,.25)]"
        >
          <div className="hairline" />
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="text-[15px] font-bold text-ink-900">
              Notifications
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="inline-flex items-center gap-1.5 rounded-full bg-transparent px-2 py-1 text-[13px] font-bold text-blue-primary hover:text-blue-hover"
              >
                <Check size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {recent.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-sky-tint text-blue-primary">
                  <Bell size={20} />
                </div>
                <div className="mt-3 text-[14px] font-semibold text-ink-900">
                  You&apos;re all caught up
                </div>
                <div className="mt-1 text-[13px] text-ink-600">
                  We&apos;ll let you know when something needs you.
                </div>
              </div>
            ) : (
              <ul className="flex flex-col">
                {recent.map((n) => {
                  const Icon = (KIND_META[n.kind] ?? KIND_META.system).icon;
                  const href = notificationHref(n);
                  const rowCls =
                    "flex w-full items-start gap-3 border-t border-sky-tint px-4 py-3 text-left hover:bg-canvas " +
                    (n.read ? "" : "bg-sky-tint/50");
                  const inner = (
                    <>
                      <span
                        className={
                          "grid h-9 w-9 flex-none place-items-center rounded-[10px] " +
                          (n.read
                            ? "bg-canvas text-ink-400"
                            : "bg-sky-tint text-blue-primary")
                        }
                      >
                        <Icon size={17} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink-900">
                            {n.title}
                          </span>
                          {!n.read && (
                            <span className="h-2 w-2 flex-none rounded-full bg-blue-primary" />
                          )}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block text-[13px]/[1.4] text-ink-600 line-clamp-2">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-1 block text-[12px] font-medium text-ink-400">
                          {relTime(n.createdAt)}
                        </span>
                      </span>
                      {href && (
                        <ChevronRight
                          size={16}
                          className="mt-2.5 flex-none text-ink-400"
                          aria-hidden
                        />
                      )}
                    </>
                  );
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link
                          href={href}
                          onClick={() => {
                            if (!n.read) markRead([n.id]);
                            setOpen(false);
                          }}
                          className={rowCls}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (!n.read) markRead([n.id]);
                          }}
                          className={rowCls}
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-sky-tint px-4 py-3 text-center text-[14px] font-bold text-blue-primary hover:bg-canvas hover:text-blue-hover"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
