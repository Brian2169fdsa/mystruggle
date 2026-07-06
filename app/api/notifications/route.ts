import { NextResponse } from "next/server";
import { db, save, centerPolicyFor } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { Notification } from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
// The engagement arrays may be seeded by a concurrent pass or absent on a
// fresh store - always default them in place so both orders of arrival work.
type EngagementStore = { notifications?: Notification[] };

function notifStore() {
  const d = db() as ReturnType<typeof db> & EngagementStore;
  d.notifications ??= [];
  return d as ReturnType<typeof db> & Required<EngagementStore>;
}

// ── quiet hours (docs/16) ──────────────────────────────────────────────
// emitNotification stamps `quiet: true` on rows created inside the
// recipient's center quiet window. Those rows are delivered (they render in
// the bell and on /notifications) but stay OUT of the unread badge until the
// window ends - a pure read-time rule, no data change when morning comes.

/** True when hour `h` (0-23) falls inside the quiet window [start, end),
 *  handling windows that wrap past midnight (e.g. 22 → 7). start === end is
 *  treated as no window. (Mirrors the store's private inQuietWindow.) */
function inQuietWindow(h: number, start: number, end: number): boolean {
  if (start < end) return h >= start && h < end;
  if (start > end) return h >= start || h < end;
  return false;
}

/** Is the recipient's center quiet window active right now?
 *  America/Phoenix wall clock: UTC-7 year-round (no DST). */
function quietWindowActive(user: { centerId?: string }): boolean {
  const policy = centerPolicyFor(user.centerId);
  if (
    !policy ||
    policy.quietHoursStart === undefined ||
    policy.quietHoursEnd === undefined
  ) {
    return false;
  }
  const phoenixHour = new Date(Date.now() - 7 * 3600e3).getUTCHours();
  return inQuietWindow(phoenixHour, policy.quietHoursStart, policy.quietHoursEnd);
}

/** Unread rows that should light the badge - quiet rows are excluded while
 *  the recipient's quiet window is still active, then count normally. */
function unreadCount(user: { id: string; centerId?: string }): number {
  const quietNow = quietWindowActive(user);
  return notifStore().notifications.filter(
    (n) => n.userId === user.id && !n.read && !(quietNow && n.quiet)
  ).length;
}

/** GET - the signed-in user's notifications, newest first, with unread count. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const notifications = notifStore()
    .notifications.filter((n) => n.userId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({
    notifications,
    unreadCount: unreadCount(user),
  });
}

/** POST - { action: "markRead", ids?: string[] }. Marks the given own
 *  notifications read; with ids omitted, marks ALL of the user's unread read. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || body.action !== "markRead") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  const d = notifStore();
  const ids: string[] | undefined = Array.isArray(body.ids)
    ? body.ids.map(String)
    : undefined;
  for (const n of d.notifications) {
    if (n.userId !== user.id) continue;
    if (ids && !ids.includes(n.id)) continue;
    n.read = true;
  }
  save();
  return NextResponse.json({ ok: true, unreadCount: unreadCount(user) });
}
