import { NextResponse } from "next/server";
import { getSessionUser, getRoleUser } from "@/app/lib/auth";
import {
  careDb,
  channelsForMember,
  visibleMessages,
  unreadish,
  canPost,
  canRead,
  toClientMessage,
  CARE_NOTICE,
  type CareChannel,
} from "./_lib";

/** Shape one channel for a list view: identity + last message + unread-ish.
 *  canPost is filled in by the caller (it needs the full user). */
function summarize(c: CareChannel, viewerId: string) {
  const msgs = visibleMessages(c.id);
  const last = msgs[msgs.length - 1] ?? null;
  return {
    id: c.id,
    kind: c.kind,
    title: c.title,
    centerId: c.centerId,
    memberId: c.memberId ?? null,
    cohortId: c.cohortId ?? null,
    lastMessage: last ? toClientMessage(last) : null,
    messageCount: msgs.length,
    unreadCount: unreadish(c.id, viewerId),
  };
}

/**
 * GET /api/care-channels
 *  - member/mentor: the care channels they belong to (their center announcement +
 *    their center's program group(s) + their own 1:1), each with last message +
 *    unread-ish count.
 *  - staff: ?channelId=<id> to read one, or ?centerId=<id> (default: their center)
 *    to list all channels for a center.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const staff = await getRoleUser(); // staff-only passes (no roles → staff)
  const isStaff = !!staff;
  const url = new URL(req.url);

  // ── Staff read paths ────────────────────────────────────────────────
  if (isStaff) {
    const channelId = url.searchParams.get("channelId");
    if (channelId) {
      const c = careDb().careChannels.find((c) => c.id === channelId);
      if (!c) {
        return NextResponse.json({ error: "Channel not found." }, { status: 404 });
      }
      return NextResponse.json({
        channel: {
          ...summarize(c, user.id),
          canPost: canPost(c, user, true),
        },
        notice: CARE_NOTICE,
        viewerId: user.id,
        isStaff: true,
      });
    }
    const centerId = url.searchParams.get("centerId") ?? user.centerId ?? "";
    const channels = careDb()
      .careChannels.filter((c) => c.centerId === centerId)
      .map((c) => ({ ...summarize(c, user.id), canPost: true }))
      .sort(
        (a, b) =>
          (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0)
      );
    return NextResponse.json({
      channels,
      notice: CARE_NOTICE,
      viewerId: user.id,
      isStaff: true,
    });
  }

  // ── Member / mentor ─────────────────────────────────────────────────
  const channels = channelsForMember(user)
    .map((c) => ({
      ...summarize(c, user.id),
      canRead: canRead(c, user, false),
      canPost: canPost(c, user, false),
    }))
    // Program group first, then 1:1, then announcements (stable, warm order).
    .sort((a, b) => {
      const order = { program_group: 0, one_to_one: 1, announcement: 2 } as const;
      return order[a.kind] - order[b.kind];
    });

  return NextResponse.json({
    channels,
    notice: CARE_NOTICE,
    viewerId: user.id,
    isStaff: false,
  });
}
