import { NextResponse } from "next/server";
import { getSessionUser, getRoleUser } from "@/app/lib/auth";
import { save, uid } from "@/app/lib/store";
import { careDb, canRead, visibleMessages } from "../../_lib";

/**
 * Read receipts for care-channel messages.
 *
 * PRIVACY RULE: receipts are an ANNOUNCEMENT feature only. Announcements are
 * one-way staff broadcasts ("did the cohort see the closure notice?"), so
 * exposing who read them is operational, not surveillance. For one_to_one and
 * program_group channels this API always returns {reads: null} / {byMessage:
 * null} - surfacing per-person read activity in conversational channels would
 * turn a support space into chat surveillance, and we never do that.
 *
 * The MessageRead collection {id, messageId, userId, readAt} is seeded by the
 * store, but this route accesses it DEFENSIVELY (??=) so it works on a store
 * snapshot that predates the seed.
 */

type MessageRead = {
  id: string;
  messageId: string;
  userId: string;
  readAt: number;
};

/** Defensive accessor - guarantees db.messageReads exists. */
function readsDb() {
  const d = careDb() as ReturnType<typeof careDb> & {
    messageReads?: MessageRead[];
  };
  d.messageReads ??= [];
  return d as typeof d & { messageReads: MessageRead[] };
}

/**
 * POST /api/care-channels/[id]/reads  { messageIds: string[] }
 * Marks messages in this channel as read by the caller. Idempotent upsert
 * (one row per message+user), capped at 100 ids per call. Any signed-in user
 * who can READ the channel may post; self-reads (your own messages) are
 * skipped. Fire-and-forget friendly - always returns {ok:true} on success.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const isStaff = !!(await getRoleUser());

  const { id } = await params;
  const channel = readsDb().careChannels.find((c) => c.id === id);
  if (!channel || !canRead(channel, user, isStaff)) {
    return NextResponse.json({ error: "Channel not found." }, { status: 404 });
  }

  const payload = await req.json().catch(() => null);
  const raw = Array.isArray(payload?.messageIds) ? payload.messageIds : null;
  if (!raw) {
    return NextResponse.json(
      { error: "Send { messageIds: string[] }." },
      { status: 400 }
    );
  }
  const messageIds = raw
    .filter((v: unknown): v is string => typeof v === "string")
    .slice(0, 100); // cap - a thread view never legitimately needs more

  const db = readsDb();
  // Only messages that actually live (visibly) in THIS channel can be marked.
  const inChannel = new Set(visibleMessages(id).map((m) => m.id));
  const byId = new Map(db.careMessages.map((m) => [m.id, m]));

  let changed = false;
  const now = Date.now();
  for (const messageId of messageIds) {
    if (!inChannel.has(messageId)) continue;
    const msg = byId.get(messageId);
    if (!msg || msg.senderId === user.id) continue; // self-reads are noise
    const exists = db.messageReads.some(
      (r) => r.messageId === messageId && r.userId === user.id
    );
    if (exists) continue; // idempotent - first read timestamp wins
    db.messageReads.push({ id: uid(), messageId, userId: user.id, readAt: now });
    changed = true;
  }
  if (changed) save();

  return NextResponse.json({ ok: true });
}

/**
 * GET /api/care-channels/[id]/reads?messageId=<id>
 *   (staff, or the message's author) -> { reads: N, readers: [{name, readAt}] }
 *   for ANNOUNCEMENT-channel messages only; other kinds return {reads: null}
 *   (see the privacy rule above).
 *
 * GET /api/care-channels/[id]/reads   (staff only)
 *   -> { byMessage: [{messageId, reads}] } for the channel (announcement only;
 *   other kinds return {byMessage: null}).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const isStaff = !!(await getRoleUser());

  const { id } = await params;
  const db = readsDb();
  const channel = db.careChannels.find((c) => c.id === id);
  if (!channel || !canRead(channel, user, isStaff)) {
    return NextResponse.json({ error: "Channel not found." }, { status: 404 });
  }

  const messageId = new URL(req.url).searchParams.get("messageId");

  // ── Per-message receipts: staff or the message's author ────────────────
  if (messageId) {
    const msg = db.careMessages.find(
      (m) => m.id === messageId && m.channelId === id
    );
    if (!msg) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }
    if (!isStaff && msg.senderId !== user.id) {
      return NextResponse.json(
        { error: "Receipts are visible to staff or the author." },
        { status: 403 }
      );
    }
    // PRIVACY: receipts exist for announcements only. 1:1 and group channels
    // return {reads: null} so this endpoint can never become chat surveillance.
    if (channel.kind !== "announcement") {
      return NextResponse.json({ reads: null });
    }
    const rows = db.messageReads
      .filter((r) => r.messageId === messageId)
      .sort((a, b) => a.readAt - b.readAt);
    const userById = new Map(db.users.map((u) => [u.id, u]));
    return NextResponse.json({
      reads: rows.length,
      readers: rows.map((r) => ({
        name: userById.get(r.userId)?.name ?? "Member",
        readAt: r.readAt,
      })),
    });
  }

  // ── Whole-channel rollup: staff only ────────────────────────────────────
  if (!isStaff) {
    return NextResponse.json(
      { error: "Channel receipts are staff-only." },
      { status: 403 }
    );
  }
  if (channel.kind !== "announcement") {
    // Same privacy rule as above - no rollups for conversational channels.
    return NextResponse.json({ byMessage: null });
  }
  const counts = new Map<string, number>();
  for (const r of db.messageReads) {
    counts.set(r.messageId, (counts.get(r.messageId) ?? 0) + 1);
  }
  return NextResponse.json({
    byMessage: visibleMessages(id).map((m) => ({
      messageId: m.id,
      reads: counts.get(m.id) ?? 0,
    })),
  });
}
