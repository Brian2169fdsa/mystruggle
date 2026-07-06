"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, ChevronRight } from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import CommunityTabBar from "../community/_components/CommunityTabBar";
import {
  KIND_META,
  notificationHref,
  relTime,
  type NotificationItem,
} from "../components/NotificationBell";

type FeedResponse = {
  notifications?: NotificationItem[];
  unreadCount?: number;
};

// null = still loading, false = signed out, true = signed in
type Auth = boolean | null;

/** A single notification row - kind icon, title, body, relative time. */
function Row({
  n,
  onMark,
}: {
  n: NotificationItem;
  onMark: (id: string) => void;
}) {
  const Icon = (KIND_META[n.kind] ?? KIND_META.system).icon;
  const meta = KIND_META[n.kind] ?? KIND_META.system;
  const href = notificationHref(n);
  const inner = (
    <>
      <span
        className={
          "grid h-11 w-11 flex-none place-items-center rounded-xl " +
          (n.read ? "bg-canvas text-ink-400" : "bg-white text-blue-primary")
        }
      >
        <Icon size={20} strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
            {meta.label}
          </span>
          {!n.read && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-white">
              New
            </span>
          )}
        </div>
        <div className="mt-1 text-[16px] font-bold text-ink-900">{n.title}</div>
        {n.body && (
          <p className="mt-1 text-[14px]/[1.6] text-ink-600">{n.body}</p>
        )}
        <div className="mt-2 text-[13px] font-medium text-ink-400">
          {relTime(n.createdAt)}
        </div>
      </div>

      {href && (
        <ChevronRight
          size={18}
          className="mt-3 flex-none text-ink-400"
          aria-hidden
        />
      )}
    </>
  );
  return (
    <li
      className={
        "flex items-start gap-4 rounded-2xl border p-4 lg:p-5 " +
        (n.read
          ? "border-sky-tint bg-white"
          : "border-transparent bg-sky-tint shadow-[0_1px_3px_rgba(11,37,69,.06)]")
      }
    >
      {href ? (
        <Link
          href={href}
          onClick={() => {
            if (!n.read) onMark(n.id);
          }}
          className="flex min-w-0 flex-1 items-start gap-4"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-4">{inner}</div>
      )}

      {!n.read && (
        <button
          type="button"
          onClick={() => onMark(n.id)}
          className="inline-flex h-11 flex-none items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-blue-primary hover:bg-white hover:text-blue-hover"
        >
          <Check size={15} /> Mark read
        </button>
      )}
    </li>
  );
}

/**
 * Full notifications view - shared Nav/Footer marketing layout. Groups items
 * into "New" (unread) and "Earlier" (read), with per-item and bulk mark-read,
 * a warm empty state, and graceful signed-out / loading handling.
 */
export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [auth, setAuth] = useState<Auth>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (res.status === 401) {
        setAuth(false);
        return;
      }
      if (!res.ok) {
        setAuth(true);
        return;
      }
      const data = (await res.json()) as FeedResponse;
      setAuth(true);
      setItems(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      // Leave prior state; the user can retry with a refresh.
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = useCallback(
    async (ids?: string[]) => {
      setItems((prev) =>
        prev.map((n) =>
          !ids || ids.includes(n.id) ? { ...n, read: true } : n
        )
      );
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "markRead", ids }),
        });
      } catch {
        // Ignore; a reload reconciles.
      }
      load();
    },
    [load]
  );

  const sorted = items.slice().sort((a, b) => b.createdAt - a.createdAt);
  const unreadItems = sorted.filter((n) => !n.read);
  const readItems = sorted.filter((n) => n.read);

  return (
    <>
      <Nav />

      {/* pb-20 clears the fixed mobile tab bar (lg:hidden) */}
      <section className="min-h-[60vh] bg-canvas pb-20 lg:pb-0">
        <div className="mx-auto max-w-[760px] px-5 py-12 lg:px-6 lg:py-16">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
                Your notifications
              </div>
              <h1 className="mt-2 text-[32px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[40px]/[1.1]">
                What&apos;s{" "}
                <span className="script text-[38px] lg:text-[48px]">new</span>{" "}
                for you
              </h1>
            </div>
            {auth === true && unreadItems.length > 0 && (
              <button
                type="button"
                onClick={() => markRead()}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-blue-primary px-5 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover"
              >
                <Check size={16} /> Mark all read
              </button>
            )}
          </div>

          <div className="mt-8 lg:mt-10">
            {/* Loading */}
            {auth === null && (
              <div className="rounded-2xl border border-sky-tint bg-white px-6 py-16 text-center text-[15px] text-ink-600">
                Loading your notifications…
              </div>
            )}

            {/* Signed out */}
            {auth === false && (
              <div className="rounded-2xl border border-sky-tint bg-white px-6 py-14 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky-tint text-blue-primary">
                  <Bell size={26} />
                </div>
                <div className="mt-4 text-[20px] font-extrabold text-ink-900">
                  Sign in to see your notifications
                </div>
                <p className="mx-auto mt-2 max-w-[420px] text-[15px]/[1.6] text-ink-600">
                  Reactions, care messages, and follow-ups from your journey
                  live here once you&apos;re signed in.
                </p>
                <Link
                  href="/login"
                  className="mt-6 inline-flex h-11 items-center rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover"
                >
                  Sign in
                </Link>
              </div>
            )}

            {/* Signed in, empty */}
            {auth === true && sorted.length === 0 && (
              <div className="rounded-2xl border border-sky-tint bg-white px-6 py-16 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sky-tint text-blue-primary">
                  <Bell size={26} />
                </div>
                <div className="mt-4 text-[20px] font-extrabold text-ink-900">
                  You&apos;re all caught up
                </div>
                <p className="mx-auto mt-2 max-w-[420px] text-[15px]/[1.6] text-ink-600">
                  Nothing needs you right now. Keep going - we&apos;ll let you
                  know the moment someone reaches out.
                </p>
              </div>
            )}

            {/* Signed in, with items */}
            {auth === true && sorted.length > 0 && (
              <div className="flex flex-col gap-8">
                {unreadItems.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[.12em] text-ink-900">
                      New
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-blue-primary px-1.5 text-[11px] font-bold text-white">
                        {unreadItems.length}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-3">
                      {unreadItems.map((n) => (
                        <Row key={n.id} n={n} onMark={(id) => markRead([id])} />
                      ))}
                    </ul>
                  </div>
                )}

                {readItems.length > 0 && (
                  <div>
                    <div className="mb-3 text-[13px] font-bold uppercase tracking-[.12em] text-ink-600">
                      Earlier
                    </div>
                    <ul className="flex flex-col gap-3">
                      {readItems.map((n) => (
                        <Row key={n.id} n={n} onMark={(id) => markRead([id])} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
      <CommunityTabBar />
    </>
  );
}
