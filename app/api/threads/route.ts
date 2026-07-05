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
