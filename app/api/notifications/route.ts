import { NextResponse } from "next/server";
import { db, save } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { Notification } from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
// The engagement arrays may be seeded by a concurrent pass or absent on a
// fresh store — always default them in place so both orders of arrival work.
type EngagementStore = { notifications?: Notification[] };

function notifStore() {
  const d = db() as ReturnType<typeof db> & EngagementStore;
  d.notifications ??= [];
  return d as ReturnType<typeof db> & Required<EngagementStore>;
}

function unreadCount(userId: string): number {
  return notifStore().notifications.filter(
    (n) => n.userId === userId && !n.read
  ).length;
}

/** GET — the signed-in user's notifications, newest first, with unread count. */
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
    unreadCount: notifications.filter((n) => !n.read).length,
  });
}

/** POST — { action: "markRead", ids?: string[] }. Marks the given own
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
  return NextResponse.json({ ok: true, unreadCount: unreadCount(user.id) });
}
