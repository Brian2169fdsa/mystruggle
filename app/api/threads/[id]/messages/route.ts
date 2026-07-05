import { NextResponse } from "next/server";
import { db, addMessage } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { MessageKind } from "@/app/lib/types";

/** Messages in a thread the signed-in user participates in. Supports
 *  ?after=<timestamp> for cheap polling. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const thread = db().threads.find((t) => t.id === id);
  if (!thread || !thread.participantIds.includes(user.id)) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  const messages = after
    ? thread.messages.filter((m) => m.createdAt > after)
    : thread.messages;
  return NextResponse.json({ messages, viewerId: user.id });
}

/** Send a message (text, 1–5 mood check-in, or cheer). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await params;
  const thread = db().threads.find((t) => t.id === id);
  if (!thread || !thread.participantIds.includes(user.id)) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const kind: MessageKind = ["mood", "cheer"].includes(body?.kind)
    ? body.kind
    : "text";
  const text = String(body?.body ?? "").trim();
  const rawMood = Number(body?.mood ?? 0);
  const mood =
    kind === "mood" && Number.isInteger(rawMood) && rawMood >= 1 && rawMood <= 5
      ? rawMood
      : undefined;

  if (kind === "text" && (!text || text.length > 2000)) {
    return NextResponse.json({ error: "Write something first (max 2,000 chars)." }, { status: 400 });
  }
  if (kind === "mood" && !mood) {
    return NextResponse.json({ error: "Pick a mood from 1 to 5." }, { status: 400 });
  }

  const message = addMessage(thread, user, text, kind, mood);
  return NextResponse.json({ message });
}
