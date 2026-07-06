import { NextResponse } from "next/server";
import { getRoleUser } from "@/app/lib/auth";
import { db, save, uid, findUserById } from "@/app/lib/store";

// ── Staff task queue (docs/16 Part C) ───────────────────────────────────
// Follow-ups assigned to specific staff ("call Danielle re: housing"), with
// due dates and a done-state. Local structural type - the store array is
// landing concurrently, so this route guards with `??=`.

interface StaffTask {
  id: string;
  staffId: string;
  memberId?: string;
  title: string;
  dueAt?: number;
  done: boolean;
  createdBy: string;
  createdAt: number;
}

type TaskDb = ReturnType<typeof db> & { staffTasks?: StaffTask[] };

const MAX_TITLE = 200;

function withMemberName(t: StaffTask) {
  return {
    ...t,
    memberName: t.memberId ? findUserById(t.memberId)?.name ?? null : null,
  };
}

/**
 * GET /api/staff-tasks (staff)
 * My follow-up queue: open tasks first, then done; due-soonest first within
 * each group (no due date sorts last, then newest-created first).
 */
export async function GET() {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const d = db() as TaskDb;
  d.staffTasks ??= [];

  const tasks = d.staffTasks
    .filter((t) => t.staffId === me.id)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ad = a.dueAt ?? Infinity;
      const bd = b.dueAt ?? Infinity;
      if (ad !== bd) return ad - bd;
      return b.createdAt - a.createdAt;
    })
    .map(withMemberName);

  return NextResponse.json({ tasks });
}

/**
 * POST /api/staff-tasks (staff) { title, memberId?, dueAt?, staffId? }
 * Creates a follow-up. Assigned to me unless staffId names another staff
 * person (a supervisor handing off a follow-up).
 */
export async function POST(req: Request) {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const title = String(payload?.title ?? "").trim();
  if (!title || title.length > MAX_TITLE) {
    return NextResponse.json(
      { error: `Give the follow-up a short title (max ${MAX_TITLE} chars).` },
      { status: 400 }
    );
  }

  const memberId = payload?.memberId ? String(payload.memberId) : undefined;
  if (memberId) {
    const member = findUserById(memberId);
    if (!member || member.role !== "member") {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
  }

  let dueAt: number | undefined;
  if (payload?.dueAt !== undefined && payload?.dueAt !== null && payload?.dueAt !== "") {
    dueAt = Number(payload.dueAt);
    if (!Number.isFinite(dueAt)) {
      return NextResponse.json({ error: "Invalid due date." }, { status: 400 });
    }
  }

  let staffId = me.id;
  if (payload?.staffId) {
    const assignee = findUserById(String(payload.staffId));
    if (!assignee || assignee.role !== "staff") {
      return NextResponse.json({ error: "Staff person not found." }, { status: 404 });
    }
    staffId = assignee.id;
  }

  const d = db() as TaskDb;
  d.staffTasks ??= [];

  const task: StaffTask = {
    id: uid(),
    staffId,
    memberId,
    title,
    dueAt,
    done: false,
    createdBy: me.id,
    createdAt: Date.now(),
  };
  d.staffTasks.push(task);
  save();

  return NextResponse.json({ task: withMemberName(task) });
}

/**
 * PATCH /api/staff-tasks (staff) { id, done }
 * Toggles done-state. Only the assignee or the creator may update a task.
 */
export async function PATCH(req: Request) {
  const me = await getRoleUser("staff");
  if (!me) {
    return NextResponse.json({ error: "Staff sign-in required." }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const id = String(payload?.id ?? "");
  const done = payload?.done;
  if (!id || typeof done !== "boolean") {
    return NextResponse.json({ error: "id and done are required." }, { status: 400 });
  }

  const d = db() as TaskDb;
  d.staffTasks ??= [];

  const task = d.staffTasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json({ error: "Task not found." }, { status: 404 });
  }
  if (task.staffId !== me.id && task.createdBy !== me.id) {
    return NextResponse.json(
      { error: "This follow-up belongs to another staff person." },
      { status: 403 }
    );
  }

  task.done = done;
  save();

  return NextResponse.json({ task: withMemberName(task) });
}
