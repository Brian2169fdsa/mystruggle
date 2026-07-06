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

/** POST { postId, reason, note? } - a signed-in member files a report on a post.
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

/** GET - staff-only moderation queue, newest first, each decorated with a small
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

/** The moderation actions staff can take on a report (the report→action safety
 *  chain, docs/06). `reviewed`/`dismiss` resolve without a take-down; `hide_post`
 *  and `warn_author` resolve WITH a moderation action on the post/author. */
const ACTIONS = ["reviewed", "dismiss", "hide_post", "warn_author"] as const;
type ReportAction = (typeof ACTIONS)[number];

/** PATCH { id, action } - staff acts on a report.
 *   - "reviewed" | "dismiss" → status "reviewed" (post stays; no author impact).
 *   - "hide_post" → hide the reported post from the community + status "actioned".
 *   - "warn_author" → warm-but-firm system notification to the author + status
 *     "actioned".
 *  Back-compat: an old caller sending { id, status: "reviewed" } is treated as
 *  action "reviewed". Returns the updated report. 400 unknown action; 404 when
 *  the report - or the post an action needs - is missing. */
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
  // Prefer `action`; fall back to legacy `status: "reviewed"`.
  const action = (body?.action ?? (body?.status === "reviewed" ? "reviewed" : undefined)) as
    | ReportAction
    | undefined;
  if (!id) {
    return NextResponse.json({ error: "Provide a report id." }, { status: 400 });
  }
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `Unknown action. Expected one of: ${ACTIONS.join(", ")}.` },
      { status: 400 }
    );
  }

  const d = reportStore();
  const report = d.postReports.find((r) => r.id === id);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  // Actions that touch the post need the post to still exist.
  if (action === "hide_post" || action === "warn_author") {
    const post = d.posts.find((p) => p.id === report.postId);
    if (!post) {
      return NextResponse.json(
        { error: "The reported post is no longer available." },
        { status: 404 }
      );
    }

    if (action === "hide_post") {
      // Soft take-down - removes it from the community feed for everyone.
      post.hidden = true;
    } else {
      // warn_author - a warm, non-punitive nudge to the post's author. Never
      // notify a member about their own staff action against someone else, and
      // skip if the author account is gone.
      const author = findUserById(post.authorId);
      if (author) {
        emitNotification(
          author.id,
          "system",
          "A note from the care team",
          "A community member flagged one of your posts. Please review our community guidelines - keep it supportive and safe.",
          "post",
          post.id
        );
      }
    }
    report.status = "actioned";
  } else {
    // "reviewed" | "dismiss" - resolved without a take-down.
    report.status = "reviewed";
  }

  save();
  return NextResponse.json({ report });
}
