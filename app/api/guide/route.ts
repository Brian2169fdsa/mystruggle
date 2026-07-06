import { NextResponse } from "next/server";
import { db } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import { isCrisisText } from "@/app/lib/crisis";
import type {
  RecoveryGoal,
  GoalMilestone,
  CareChannel,
  ContinuumEvent,
  BarcSelfCheck,
  FollowUpCheckin,
  User,
} from "@/app/lib/types";

// The Guide - the member app's AI companion, made PLAN-AWARE. This endpoint
// assembles a grounded snapshot of the signed-in member's own plan (goals,
// program, continuum activity, BARC trend, next follow-up) and answers with
// warm, deterministic, rule-based guidance rooted in THAT context. No external
// LLM call - every reply is canned and safe. Crisis language short-circuits to
// 988 + care-team resources and never returns generic advice.
//
// Voice rule (enforced in the copy below): member / mentor / journey - never
// "client" / "case", never clinical/diagnostic.

const DAY = 24 * 60 * 60 * 1000;

/** Human program label from a program-group care channel / cohort id. */
function programLabel(channel: CareChannel | undefined): string | null {
  if (!channel) return null;
  // cohortId like "cohort-iop-laveen" → "IOP"; else fall back to the title.
  const m = channel.cohortId?.match(/cohort-([a-z]+)-/i);
  if (m) return `${m[1].toUpperCase()} program`;
  return channel.title;
}

/** The next unfinished milestone (lowest sort) for a goal. */
function nextMilestone(
  milestones: GoalMilestone[],
  goalId: string
): GoalMilestone | null {
  const open = milestones
    .filter((ms) => ms.goalId === goalId && !ms.done)
    .sort((a, b) => a.sort - b.sort);
  return open[0] ?? null;
}

/** Build the plan-aware context for one member. Only ever reads THIS member's
 *  rows - never another member's data. */
function buildContext(user: User) {
  const database = db();

  // ── Active recovery goals + each one's next milestone ──
  const goals: RecoveryGoal[] = database.recoveryGoals
    .filter((g) => g.memberId === user.id && g.status === "active")
    .sort((a, b) => a.createdAt - b.createdAt);

  const goalCards = goals.map((g) => {
    const ms = nextMilestone(database.goalMilestones, g.id);
    const total = database.goalMilestones.filter((m) => m.goalId === g.id).length;
    const done = database.goalMilestones.filter(
      (m) => m.goalId === g.id && m.done
    ).length;
    return {
      id: g.id,
      title: g.title,
      domain: g.domain,
      why: g.why ?? null,
      nextMilestone: ms?.title ?? null,
      milestonesDone: done,
      milestonesTotal: total,
    };
  });

  // ── Program / care channels the member belongs to ──
  const myChannels: CareChannel[] = database.careChannels.filter(
    (c) =>
      c.memberId === user.id ||
      (user.centerId != null && c.centerId === user.centerId)
  );
  const programChannel = myChannels.find((c) => c.kind === "program_group");
  const program = programLabel(programChannel);

  // ── Recent continuum activity → engagement streak summary ──
  const now = Date.now();
  const myEvents: ContinuumEvent[] = database.continuumEvents
    .filter((e) => e.memberId === user.id)
    .sort((a, b) => b.occurredAt - a.occurredAt);
  const last7 = myEvents.filter((e) => e.occurredAt >= now - 7 * DAY).length;
  const last30 = myEvents.filter((e) => e.occurredAt >= now - 30 * DAY).length;
  const lastActivityAt = myEvents[0]?.occurredAt ?? user.lastActivityAt ?? null;

  // ── Latest BARC total + trend direction ──
  const myBarc: BarcSelfCheck[] = database.barcChecks
    .filter((b) => b.memberId === user.id)
    .sort((a, b) => a.takenAt - b.takenAt);
  const latestBarc = myBarc[myBarc.length - 1] ?? null;
  const priorBarc = myBarc[myBarc.length - 2] ?? null;
  let barcTrend: "rising" | "steady" | "dipping" | null = null;
  if (latestBarc && priorBarc) {
    if (latestBarc.total > priorBarc.total) barcTrend = "rising";
    else if (latestBarc.total < priorBarc.total) barcTrend = "dipping";
    else barcTrend = "steady";
  }

  // ── Upcoming follow-up check-in (earliest still pending) ──
  const upcoming: FollowUpCheckin | null =
    database.followUps
      .filter((f) => f.memberId === user.id && f.status === "pending")
      .sort((a, b) => a.dueDay - b.dueDay)[0] ?? null;

  return {
    member: { name: user.name, streak: user.streak ?? 0 },
    program,
    goals: goalCards,
    activity: {
      last7,
      last30,
      lastActivityAt,
      streak: user.streak ?? 0,
    },
    barc: latestBarc
      ? { total: latestBarc.total, takenAt: latestBarc.takenAt, trend: barcTrend }
      : null,
    upcomingFollowUp: upcoming
      ? { dueDay: upcoming.dueDay, status: upcoming.status }
      : null,
  };
}

type GuideContext = ReturnType<typeof buildContext>;

/**
 * GET /api/guide - the signed-in member's plan-aware Guide context.
 * Session-gated; members only (staff pass, but this is a member surface).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (user.role !== "member" && user.role !== "staff") {
    return NextResponse.json({ error: "Members only." }, { status: 403 });
  }
  return NextResponse.json({ context: buildContext(user) });
}

// ── Canned, context-grounded reply engine ──────────────────────────────

const CRISIS_REPLY = (name: string) =>
  `${name}, thank you for telling me this - it matters, and you are not a burden.\n\n` +
  `Please reach the 988 Suicide & Crisis Lifeline right now - call or text 988, ` +
  `or chat at 988lifeline.org. It's free, confidential, and open 24/7.\n\n` +
  `If you're in immediate danger, call 911.\n\n` +
  `Please also reach your care team today - your mentor and your center are ` +
  `here for you and want to hear from you. You don't have to carry this alone.`;

type Intent =
  | "goals"
  | "cravings"
  | "program"
  | "checkin"
  | "encouragement";

function detectIntent(message: string): Intent {
  const t = message.toLowerCase();
  if (
    /\b(craving|urge|relapse|use again|using|tempt|slip|triggered|trigger)\b/.test(t)
  )
    return "cravings";
  if (/\b(goal|milestone|housing|job|work|apply|resume|résumé|place|move)\b/.test(t))
    return "goals";
  if (/\b(program|cohort|group|iop|meeting|class|session|care team|mentor)\b/.test(t))
    return "program";
  if (/\b(check ?in|barc|follow ?up|progress|score|how am i)\b/.test(t))
    return "checkin";
  return "encouragement";
}

function firstName(name: string): string {
  return name.split(/\s+/)[0] || name;
}

/** Compose a warm, grounded reply for a non-crisis message. */
function cannedReply(message: string, ctx: GuideContext): string {
  const name = firstName(ctx.member.name);
  const intent = detectIntent(message);
  const streak = ctx.activity.streak;
  const goal = ctx.goals[0] ?? null;
  const goal2 = ctx.goals[1] ?? null;

  switch (intent) {
    case "cravings": {
      const anchor = goal
        ? `Picture "${goal.title}" - that's what today is buying you.`
        : `Picture the reason you started this journey.`;
      const streakLine = streak
        ? ` You've strung together a ${streak}-day streak, and an urge doesn't erase a single day of it.`
        : ``;
      return (
        `${name}, an urge is a wave - it peaks and it passes, and you are still ` +
        `standing.${streakLine}\n\n` +
        `Try this right now: name it out loud, drink a full glass of water, and ` +
        `text one safe person before you do anything else. ${anchor}\n\n` +
        `If it keeps climbing, message your mentor today - reaching out is a ` +
        `strength, not a setback.`
      );
    }
    case "goals": {
      if (!goal) {
        return (
          `${name}, this is a great moment to set your first recovery goal. ` +
          `Open your Plan and name one thing you want your journey to build ` +
          `toward - I'll help you break it into small, doable steps.`
        );
      }
      const step = goal.nextMilestone
        ? `Your next step is "${goal.nextMilestone}" (${goal.milestonesDone} of ${goal.milestonesTotal} milestones already behind you).`
        : `You've cleared every milestone on it - time to name what "done" looks like.`;
      const whyLine = goal.why ? ` You told me why: "${goal.why}"` : ``;
      const second = goal2
        ? `\n\nYou're also working toward "${goal2.title}" - one step at a time, both are within reach.`
        : ``;
      return (
        `${name}, you're moving on "${goal.title}." ${step}${whyLine}\n\n` +
        `Pick that one step for today. Small and finished beats big and someday.${second}`
      );
    }
    case "program": {
      const prog = ctx.program
        ? `You're active in your ${ctx.program}, and staying connected there is doing real work.`
        : `Your center and mentor are your people - lean on them this week.`;
      return (
        `${name}, ${prog}\n\n` +
        `Show up to your next group, say one honest thing, and let the cohort ` +
        `hold the door open for you. If you need to reach your care team, your ` +
        `mentor is one message away.`
      );
    }
    case "checkin": {
      const barcLine = ctx.barc
        ? ctx.barc.trend === "rising"
          ? `Your latest recovery self-check came in at ${ctx.barc.total} of 50 and it's trending up - that's momentum you built.`
          : ctx.barc.trend === "dipping"
            ? `Your latest self-check was ${ctx.barc.total} of 50, a little below last time. Dips are data, not defeat - let's talk about what shifted.`
            : `Your latest self-check held steady at ${ctx.barc.total} of 50 - steady is its own kind of strong.`
        : `Whenever you're ready, a quick recovery self-check helps us see your journey clearly.`;
      const followLine = ctx.upcomingFollowUp
        ? ` You have a ${ctx.upcomingFollowUp.dueDay}-day follow-up coming up - a good moment to reflect on how far you've come.`
        : ``;
      const streakLine = streak
        ? ` And that ${streak}-day streak? That's you, showing up.`
        : ``;
      return `${name}, here's where you stand. ${barcLine}${followLine}${streakLine}`;
    }
    case "encouragement":
    default: {
      const activity = ctx.activity.last7
        ? `You've logged ${ctx.activity.last7} step${ctx.activity.last7 === 1 ? "" : "s"} this week alone.`
        : `Every small action this week counts, even the quiet ones.`;
      const streakLine = streak
        ? ` Your ${streak}-day streak is proof you keep choosing yourself.`
        : ``;
      const goalLine = goal
        ? ` And "${goal.title}" is getting closer with every one.`
        : ``;
      return (
        `${name}, I see you. ${activity}${streakLine}${goalLine}\n\n` +
        `You don't have to do the whole journey today - just the next right thing. ` +
        `I'm right here for it.`
      );
    }
  }
}

/**
 * POST /api/guide - a warm, deterministic companion reply grounded in the
 * member's real plan context. Rule-based only. Crisis language returns 988 +
 * care-team resources and never generic advice.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  if (user.role !== "member" && user.role !== "staff") {
    return NextResponse.json({ error: "Members only." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Say something and I'll help." }, { status: 400 });
  }

  const name = firstName(user.name);

  // Safety first - crisis language short-circuits everything.
  if (isCrisisText(message)) {
    return NextResponse.json({
      crisis: true,
      reply: CRISIS_REPLY(name),
    });
  }

  const ctx = buildContext(user);
  return NextResponse.json({
    crisis: false,
    reply: cannedReply(message, ctx),
  });
}
