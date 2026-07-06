import { NextResponse } from "next/server";
import { db, findUserById, threadBetween } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";

/** Threads for the signed-in user, with the other participant's public
 *  identity and the last message for list rendering. A member always gets
 *  a thread with their mentor (created on demand). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (user.role === "member" && user.mentorId) {
    threadBetween(user.id, user.mentorId); // ensure it exists
  }

  const threads = db()
    .threads.filter((t) => t.participantIds.includes(user.id))
    .map((t) => {
      const otherId = t.participantIds.find((id) => id !== user.id)!;
      const other = findUserById(otherId);
      return {
        id: t.id,
        other: other
          ? {
              id: other.id,
              name: other.name,
              role: other.role,
              avatarColor: other.avatarColor,
            }
          : null,
        lastMessage: t.messages[t.messages.length - 1] ?? null,
        messageCount: t.messages.length,
      };
    })
    .sort(
      (a, b) =>
        (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0)
    );

  return NextResponse.json({ threads, viewerId: user.id });
}

/** POST { memberId } - mentor-side ensure-thread.
 *
 *  Members get their mentor thread created on demand in GET above, but that
 *  left mentors unable to reach a mentee who hadn't opened the app yet. This
 *  endpoint closes that gap: a signed-in MENTOR (or staff acting as one) can
 *  find-or-create the DM thread with one of THEIR OWN mentees, exactly like
 *  threadBetween does for members.
 *
 *  SCOPE: the mentee must be a member whose `mentorId` is the caller's id -
 *  the same linkage /api/mentor/analytics scopes its roster by. Anyone else
 *  (non-mentors, or a member not on the caller's roster) gets a warm 403.
 *  Members' GET behavior is unchanged.
 *
 *  Returns { thread } in the same summary shape GET's list entries use. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (user.role !== "mentor" && user.role !== "staff") {
    return NextResponse.json(
      {
        error:
          "Only mentors open conversations this way - your own mentor thread is already waiting in Messages.",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const memberId = String(body?.memberId ?? "").trim();
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required." }, { status: 400 });
  }

  const member = findUserById(memberId);
  if (!member || member.role !== "member" || member.mentorId !== user.id) {
    return NextResponse.json(
      {
        error:
          "That member isn't on your roster - if you think they should be, the care team can connect you.",
      },
      { status: 403 }
    );
  }

  const t = threadBetween(user.id, member.id);
  return NextResponse.json({
    thread: {
      id: t.id,
      other: {
        id: member.id,
        name: member.name,
        role: member.role,
        avatarColor: member.avatarColor,
      },
      lastMessage: t.messages[t.messages.length - 1] ?? null,
      messageCount: t.messages.length,
    },
  });
}
