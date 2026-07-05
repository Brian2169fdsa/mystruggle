import { NextResponse } from "next/server";
import { db, save, uid, findUserById } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import {
  RECOVERY_DOMAINS,
  type GoalMilestone,
  type GoalStatus,
  type GoalVisibility,
  type RecoveryDomain,
  type RecoveryGoal,
  type SupportRequest,
} from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
// The expansion arrays (recoveryGoals / goalMilestones) may be seeded by a
// concurrent seed pass or absent entirely on a fresh store — always default
// them in place so both orders of arrival work.
type ExpansionStore = {
  recoveryGoals?: RecoveryGoal[];
  goalMilestones?: GoalMilestone[];
};

function goalStore() {
  const d = db() as ReturnType<typeof db> & ExpansionStore;
  d.recoveryGoals ??= [];
  d.goalMilestones ??= [];
  return d as ReturnType<typeof db> & Required<ExpansionStore>;
}

/** Level ladder (docs/07): Bronze from 0, Silver at 640, Gold at 1,000. */
function levelFor(points: number): string {
  if (points >= 1000) return "Gold";
  if (points >= 640) return "Silver";
  return "Bronze";
}

/** Milestones + derived progress + the linked funding request, if any. */
function enrich(goal: RecoveryGoal) {
  const d = goalStore();
  const milestones = d.goalMilestones
    .filter((m) => m.goalId === goal.id)
    .sort((a, b) => a.sort - b.sort);
  const done = milestones.filter((m) => m.done).length;
  const progressPct =
    goal.status === "achieved"
      ? 100
      : milestones.length
        ? Math.round((done / milestones.length) * 100)
        : 0;
  const req = goal.linkedRequestId
    ? d.requests.find((r) => r.id === goal.linkedRequestId)
    : undefined;
  const linkedRequest = req
    ? {
        label: req.label,
        raised: req.raised,
        weeklyTarget: req.weeklyTarget,
        status: req.status,
      }
    : null;
  return { ...goal, milestones, progressPct, linkedRequest };
}

const STATUS_ORDER: Record<GoalStatus, number> = {
  active: 0,
  paused: 1,
  achieved: 2,
  archived: 3,
};

function goalsFor(memberId: string): RecoveryGoal[] {
  return goalStore()
    .recoveryGoals.filter((g) => g.memberId === memberId)
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.createdAt - b.createdAt
    );
}

/**
 * GET — the signed-in member's recovery goals (milestones + progress +
 * linked funding). Mentors/staff may pass ?memberId= to view a member's
 * shared goals: mentors (of that member) see visibility mentor/circle/public;
 * staff see all.
 */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const memberId = new URL(req.url).searchParams.get("memberId");

  if (memberId && memberId !== user.id) {
    if (user.role === "member") {
      return NextResponse.json(
        { error: "You can only view your own goals." },
        { status: 403 }
      );
    }
    const member = findUserById(memberId);
    if (!member || member.role !== "member") {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }
    if (user.role === "mentor" && member.mentorId !== user.id) {
      return NextResponse.json(
        { error: "Not your mentee." },
        { status: 403 }
      );
    }
    const shared: GoalVisibility[] = ["mentor", "circle", "public"];
    const goals = goalsFor(memberId).filter(
      (g) => user.role === "staff" || shared.includes(g.visibility)
    );
    return NextResponse.json({ goals: goals.map(enrich) });
  }

  return NextResponse.json({ goals: goalsFor(user.id).map(enrich) });
}

const VISIBILITIES: GoalVisibility[] = ["private", "mentor", "circle", "public"];
const ACTIONS = ["achieve", "pause", "resume", "archive"] as const;

/**
 * POST — member-only, multi-action (PATCH-style):
 * - { title, domain, why?, targetDate?, visibility?, linkedRequestId? |
 *     createRequest: { label, weeklyTarget } }  → create a goal, optionally
 *     creating a linked funding request (same shape as POST /api/requests).
 * - { goalId, action: "achieve" | "pause" | "resume" | "archive" }
 *     Achieving sets achievedAt and awards +25 points (gamification tie-in,
 *     docs/07 — level recomputed on the same ladder as lesson completions).
 * - { goalId, milestone: { title } }             → add a milestone.
 * - { milestoneId, done: boolean }               → toggle a milestone.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json(
      { error: "Sign in as a member first." },
      { status: 401 }
    );
  }
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const d = goalStore();

  // ── toggle a milestone ────────────────────────────────────────────────
  if (typeof body.milestoneId === "string") {
    const milestone = d.goalMilestones.find((m) => m.id === body.milestoneId);
    const goal =
      milestone && d.recoveryGoals.find((g) => g.id === milestone.goalId);
    if (!milestone || !goal || goal.memberId !== user.id) {
      return NextResponse.json(
        { error: "Milestone not found." },
        { status: 404 }
      );
    }
    milestone.done = Boolean(body.done);
    save();
    return NextResponse.json({ goal: enrich(goal) });
  }

  // ── goal status action / add milestone ────────────────────────────────
  if (typeof body.goalId === "string") {
    const goal = d.recoveryGoals.find((g) => g.id === body.goalId);
    if (!goal || goal.memberId !== user.id) {
      return NextResponse.json({ error: "Goal not found." }, { status: 404 });
    }

    if (body.milestone) {
      const title = String(body.milestone.title ?? "").trim();
      if (!title) {
        return NextResponse.json(
          { error: "A milestone title is required." },
          { status: 400 }
        );
      }
      const sort =
        d.goalMilestones
          .filter((m) => m.goalId === goal.id)
          .reduce((max, m) => Math.max(max, m.sort), 0) + 1;
      const milestone: GoalMilestone = {
        id: uid(),
        goalId: goal.id,
        title,
        done: false,
        sort,
      };
      d.goalMilestones.push(milestone);
      save();
      return NextResponse.json({ goal: enrich(goal), milestone });
    }

    const action = String(body.action ?? "");
    if (!(ACTIONS as readonly string[]).includes(action)) {
      return NextResponse.json(
        { error: "Unknown action." },
        { status: 400 }
      );
    }
    let awarded = false;
    if (action === "achieve") {
      if (goal.status !== "achieved") {
        goal.status = "achieved";
        goal.achievedAt = Date.now();
        // Gamification tie-in (docs/07): achieving a recovery goal awards
        // +25 points and recomputes the level — idempotent (once per goal).
        user.points = (user.points ?? 0) + 25;
        user.level = levelFor(user.points);
        awarded = true;
      }
    } else if (action === "pause") {
      if (goal.status === "active") goal.status = "paused";
    } else if (action === "resume") {
      if (goal.status === "paused" || goal.status === "archived")
        goal.status = "active";
    } else if (action === "archive") {
      goal.status = "archived";
    }
    save();
    return NextResponse.json({
      goal: enrich(goal),
      points: user.points ?? 0,
      level: user.level ?? levelFor(user.points ?? 0),
      awarded,
    });
  }

  // ── create a goal ─────────────────────────────────────────────────────
  const title = String(body.title ?? "").trim();
  const domain = String(body.domain ?? "") as RecoveryDomain;
  if (!title || !RECOVERY_DOMAINS.includes(domain)) {
    return NextResponse.json(
      { error: "A title and a valid domain are required." },
      { status: 400 }
    );
  }
  const visibility: GoalVisibility = VISIBILITIES.includes(body.visibility)
    ? body.visibility
    : "private";

  let linkedRequestId: string | undefined;
  if (typeof body.linkedRequestId === "string" && body.linkedRequestId) {
    const owned = d.requests.find(
      (r) => r.id === body.linkedRequestId && r.memberId === user.id
    );
    if (!owned) {
      return NextResponse.json(
        { error: "Linked funding request not found." },
        { status: 404 }
      );
    }
    linkedRequestId = owned.id;
  } else if (body.createRequest) {
    // Same contract as POST /api/requests — one call creates both halves.
    const label = String(body.createRequest.label ?? "").trim();
    const weeklyTarget = Math.floor(Number(body.createRequest.weeklyTarget ?? 0));
    if (!label || weeklyTarget < 1 || weeklyTarget > 10_000) {
      return NextResponse.json(
        {
          error:
            "A funding label and a weekly target between $1 and $10,000 are required.",
        },
        { status: 400 }
      );
    }
    const request: SupportRequest = {
      id: uid(),
      memberId: user.id,
      label,
      weeklyTarget,
      raised: 0,
      status: "active",
      createdAt: Date.now(),
    };
    d.requests.push(request);
    linkedRequestId = request.id;
  }

  const goal: RecoveryGoal = {
    id: uid(),
    memberId: user.id,
    title,
    domain,
    why: String(body.why ?? "").trim() || undefined,
    status: "active",
    targetDate: String(body.targetDate ?? "").trim() || undefined,
    visibility,
    linkedRequestId,
    createdAt: Date.now(),
  };
  d.recoveryGoals.push(goal);
  save();
  return NextResponse.json({ goal: enrich(goal) });
}
