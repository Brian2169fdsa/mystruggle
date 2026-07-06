import { NextResponse } from "next/server";
import { getSessionUser, getRoleUser } from "@/app/lib/auth";
import { save, uid } from "@/app/lib/store";
import { isCrisisText } from "@/app/lib/crisis";
import {
  careDb,
  canRead,
  canPost,
  visibleMessages,
  toClientMessage,
  CARE_NOTICE,
  CRISIS_RESOURCES,
  type CareMessage,
} from "../../_lib";

/**
 * GET /api/care-channels/[id]/messages
 * Messages in a care channel the viewer may read. Crisis-held messages are
 * never included (not broadcast). Supports ?after=<timestamp> for polling.
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
  const channel = careDb().careChannels.find((c) => c.id === id);
  if (!channel || !canRead(channel, user, isStaff)) {
    return NextResponse.json({ error: "Channel not found." }, { status: 404 });
  }

  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  const messages = visibleMessages(id)
    .filter((m) => (after ? m.createdAt > after : true))
    .map(toClientMessage);

  return NextResponse.json({
    messages,
    viewerId: user.id,
    channel: {
      id: channel.id,
      kind: channel.kind,
      title: channel.title,
      canPost: canPost(channel, user, isStaff),
    },
    notice: CARE_NOTICE,
  });
}

/**
 * POST /api/care-channels/[id]/messages { body }
 * Members post in their program group + their 1:1 (never announcements); staff
 * post anywhere. Crisis language is HELD (moderationStatus "flagged"), returned
 * with held:true + 988 resources, and NEVER broadcast.
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
  const channel = careDb().careChannels.find((c) => c.id === id);
  if (!channel || !canRead(channel, user, isStaff)) {
    return NextResponse.json({ error: "Channel not found." }, { status: 404 });
  }
  if (!canPost(channel, user, isStaff)) {
    const reason =
      channel.kind === "announcement"
        ? "Announcements are posted by your care team. You can read them here."
        : "You can't post in this channel.";
    return NextResponse.json({ error: reason }, { status: 403 });
  }

  const payload = await req.json().catch(() => null);
  const text = String(payload?.body ?? "").trim();
  if (!text || text.length > 2000) {
    return NextResponse.json(
      { error: "Write something first (max 2,000 chars)." },
      { status: 400 }
    );
  }

  // SAFETY: crisis language is HELD (docs/06). Held messages are stored as
  // "flagged" so a human follows up, but visibleMessages() never returns them —
  // they are not broadcast. The sender is met with support, not silence.
  const crisis = isCrisisText(text);
  const message: CareMessage = {
    id: uid(),
    channelId: channel.id,
    senderId: user.id,
    senderName: user.name,
    senderRole: user.role,
    body: text,
    createdAt: Date.now(),
    moderationStatus: crisis ? "flagged" : "approved",
  };
  careDb().careMessages.push(message);
  save();

  if (crisis) {
    return NextResponse.json({ held: true, resources: CRISIS_RESOURCES });
  }
  return NextResponse.json({ message: toClientMessage(message) });
}
