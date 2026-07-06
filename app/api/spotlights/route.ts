import { NextResponse } from "next/server";
import {
  db,
  save,
  uid,
  findUserById,
  emitNotification,
  emitContinuumEvent,
} from "@/app/lib/store";
import { getRoleUser, getSessionUser } from "@/app/lib/auth";
import type { Post, Spotlight } from "@/app/lib/types";

// Milestone spotlights (docs/16 deferred set) - staff draft a celebration,
// the MEMBER decides whether it reaches the community feed. Nothing publishes
// without consent; a decline stays private and is never shown to the feed.

/** Defensive accessor - tolerates a store snapshot that predates spotlights. */
function spotlights(): Spotlight[] {
  const d = db() as ReturnType<typeof db> & { spotlights?: Spotlight[] };
  d.spotlights ??= [];
  return d.spotlights;
}

function firstName(name: string | undefined): string {
  return (name ?? "").trim().split(/\s+/)[0] || "Your care team";
}

/** Names only - safe for both the staff console and the member consent card. */
function decorate(s: Spotlight) {
  const member = findUserById(s.memberId);
  const staff = findUserById(s.staffId);
  return {
    ...s,
    memberName: member?.name ?? null,
    staffName: firstName(staff?.name),
  };
}

/** GET /api/spotlights - staff: their center's spotlights newest-first;
 *  member: their OWN pending_consent items (the consent card's source). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (user.role === "staff") {
    const mine = spotlights()
      .filter((s) => {
        const member = findUserById(s.memberId);
        return member?.centerId === user.centerId;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ spotlights: mine.map(decorate) });
  }

  if (user.role === "member") {
    const mine = spotlights()
      .filter((s) => s.memberId === user.id && s.status === "pending_consent")
      .sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ spotlights: mine.map(decorate) });
  }

  return NextResponse.json({ spotlights: [] });
}

/** POST /api/spotlights (staff) - draft a celebration for a member. Creates a
 *  pending_consent spotlight and notifies the member; nothing goes public. */
export async function POST(req: Request) {
  const staff = await getRoleUser("staff");
  if (!staff || staff.role !== "staff") {
    return NextResponse.json(
      { error: "Only center staff can draft a spotlight." },
      { status: 403 }
    );
  }

  const payload = await req.json().catch(() => null);
  const memberId = String(payload?.memberId ?? "");
  const title = String(payload?.title ?? "").trim();
  const body = String(payload?.body ?? "").trim();

  const member = findUserById(memberId);
  if (!member || member.role !== "member") {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (!title || title.length > 120) {
    return NextResponse.json(
      { error: "Give the celebration a short title (max 120 chars)." },
      { status: 400 }
    );
  }
  if (!body || body.length > 280) {
    return NextResponse.json(
      { error: "Write a short celebration (max 280 chars)." },
      { status: 400 }
    );
  }

  const spotlight: Spotlight = {
    id: uid(),
    memberId: member.id,
    staffId: staff.id,
    title,
    body,
    status: "pending_consent",
    createdAt: Date.now(),
  };
  spotlights().unshift(spotlight);
  save();

  // The member decides - the notification is the consent doorbell.
  emitNotification(
    member.id,
    "system",
    "A celebration is waiting for your OK 🎉",
    `${firstName(staff.name)} wants to celebrate: "${title}". You decide if it goes on the community feed.`,
    "spotlight",
    spotlight.id
  );

  return NextResponse.json({ spotlight: decorate(spotlight) });
}

/** PATCH /api/spotlights (member, own spotlight only) - approve or decline.
 *  Approve publishes a community post AUTHORED BY THE MEMBER (their consent
 *  makes it theirs) and notifies the staff drafter; decline stays private. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const id = String(payload?.id ?? "");
  const decision = String(payload?.decision ?? "");
  if (decision !== "approve" && decision !== "decline") {
    return NextResponse.json(
      { error: 'decision must be "approve" or "decline".' },
      { status: 400 }
    );
  }

  const spotlight = spotlights().find((s) => s.id === id);
  if (!spotlight) {
    return NextResponse.json({ error: "Spotlight not found." }, { status: 404 });
  }
  if (spotlight.memberId !== user.id) {
    return NextResponse.json(
      { error: "Only the celebrated member can decide this spotlight." },
      { status: 403 }
    );
  }
  if (spotlight.status !== "pending_consent") {
    return NextResponse.json(
      { error: "This spotlight was already decided." },
      { status: 409 }
    );
  }

  if (decision === "decline") {
    spotlight.status = "declined";
    spotlight.decidedAt = Date.now();
    save();
    emitNotification(
      spotlight.staffId,
      "system",
      `Not this time - ${user.name} passed on the spotlight`,
      "Keep celebrating them privately.",
      "spotlight",
      spotlight.id
    );
    return NextResponse.json({ spotlight: decorate(spotlight) });
  }

  // Approve → publish. "milestone" is a valid PostKind here; keep the "win"
  // fallback wired in case the kind union ever narrows.
  const kind: Post["kind"] = (
    ["regular", "milestone", "win"] as Post["kind"][]
  ).includes("milestone")
    ? "milestone"
    : "win";
  const post: Post = {
    id: uid(),
    authorId: user.id,
    authorName: user.name,
    authorRole: user.role,
    avatarColor: user.avatarColor,
    body: `${spotlight.title} - ${spotlight.body} (celebrated by their care team 💙)`,
    kind,
    topic: "general",
    status: "approved",
    hearts: [],
    comments: [],
    createdAt: Date.now(),
  };
  db().posts.unshift(post);

  spotlight.status = "approved";
  spotlight.decidedAt = Date.now();
  spotlight.postId = post.id;
  save();

  // A published celebration is a community engagement signal, same as a post.
  emitContinuumEvent(user.id, "community", 2, post.id);
  emitNotification(
    spotlight.staffId,
    "system",
    `${user.name} said yes - the spotlight is live`,
    `"${spotlight.title}" is on the community feed now.`,
    "post",
    post.id
  );

  return NextResponse.json({ spotlight: decorate(spotlight), post });
}
