import { NextResponse } from "next/server";
import {
  db,
  save,
  uid,
  findUserById,
  emitNotification,
} from "@/app/lib/store";
import { getSessionUser, getRoleUser } from "@/app/lib/auth";
import type { PostReport } from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
// postReports is seeded in the store, but guard in place so a fresh boot or a
// concurrent pass that hasn't seeded yet still works.
function reportStore() {
  const d = db();
  d.postReports ??= [];
  return d;
}

/** POST { postId, reason, note? } — a signed-in member files a report on a post.
 *  Creates an "open" PostReport and notifies center staff. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const postId = String(body?.postId ?? "").trim();
  const reason = String(body?.reason ?? "").trim();
  const note =
    body?.note != null ? String(body.note).trim().slice(0, 1000) : undefined;

  if (!postId || !reason) {
    return NextResponse.json(
      { error: "A post and a reason are required." },
      { status: 400 }
    );
  }

  const d = reportStore();
  const post = d.posts.find((p) => p.id === postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 400 });
  }

  const report: PostReport = {
    id: uid(),
    postId,
    reporterId: user.id,
    reason,
    note: note || undefined,
    status: "open",
    createdAt: Date.now(),
  };
  d.postReports.unshift(report);
  save();

  // Notify center staff so the moderation queue lights up. Non-fatal.
  const staff = d.users.filter((u) => u.role === "staff");
  for (const s of staff) {
    if (s.id === user.id) continue;
    emitNotification(
      s.id,
      "system",
      "New post report",
      "A member reported a post for review.",
      "report",
      report.id
    );
  }

  return NextResponse.json({ ok: true, report });
}

/** GET — staff-only moderation queue, newest first, each decorated with a small
 *  post preview + the reporter's first name. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const staff = await getRoleUser("staff");
  if (!staff) {
    return NextResponse.json({ error: "Staff only." }, { status: 403 });
  }

  const d = reportStore();
  const reports = [...d.postReports]
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((r) => {
      const post = d.posts.find((p) => p.id === r.postId);
      const reporter = findUserById(r.reporterId);
      return {
        ...r,
        post: post
          ? {
              id: post.id,
              authorName: post.authorName,
              excerpt: post.body.slice(0, 140),
            }
          : null,
        reporterName: reporter?.name ?? "A member",
      };
    });

  return NextResponse.json({ reports });
}

/** PATCH { id, status: "reviewed" } — staff marks a report reviewed. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const staff = await getRoleUser("staff");
  if (!staff) {
    return NextResponse.json({ error: "Staff only." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const id = String(body?.id ?? "").trim();
  const status = body?.status;
  if (!id || status !== "reviewed") {
    return NextResponse.json(
      { error: "Provide a report id and status \"reviewed\"." },
      { status: 400 }
    );
  }

  const d = reportStore();
  const report = d.postReports.find((r) => r.id === id);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  report.status = "reviewed";
  save();

  return NextResponse.json({ report });
}
