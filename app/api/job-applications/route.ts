import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { JobApplication, JobAppStatus } from "@/app/lib/types";

// ── defensive store access ─────────────────────────────────────────────
// jobApplications may be seeded by a concurrent seed pass or absent on a
// fresh store — always default the array in place.
type ExpansionStore = { jobApplications?: JobApplication[] };

function appStore() {
  const d = db() as ReturnType<typeof db> & ExpansionStore;
  d.jobApplications ??= [];
  return d as ReturnType<typeof db> & Required<ExpansionStore>;
}

/** Forward-only status ladder: applied → interview → offer, closed anytime. */
const NEXT_STATUSES: Record<JobAppStatus, JobAppStatus[]> = {
  applied: ["interview", "closed"],
  interview: ["offer", "closed"],
  offer: ["closed"],
  closed: [],
};

const OPEN_STATUSES: JobAppStatus[] = ["applied", "interview", "offer"];

/** Today as an ISO date (YYYY-MM-DD) — string compare works for ISO dates. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET — the signed-in member's job applications, plus staleCount: open
 * applications whose nextActionDate is in the past (Companion/UI nudges
 * "follow up" on those).
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "member") {
    return NextResponse.json(
      { error: "Sign in as a member first." },
      { status: 401 }
    );
  }
  const applications = appStore()
    .jobApplications.filter((a) => a.memberId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  const today = todayIso();
  const staleCount = applications.filter(
    (a) =>
      OPEN_STATUSES.includes(a.status) &&
      a.nextActionDate &&
      a.nextActionDate < today
  ).length;
  return NextResponse.json({ applications, staleCount });
}

/**
 * POST — member-only:
 * - { company, role, notes?, nextActionDate? } → log a new application
 *   (starts at "applied").
 * - { id, status } → advance an application: applied→interview→offer, or
 *   closed from any open status.
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
  const d = appStore();

  // ── advance status ────────────────────────────────────────────────────
  if (typeof body.id === "string") {
    const app = d.jobApplications.find(
      (a) => a.id === body.id && a.memberId === user.id
    );
    if (!app) {
      return NextResponse.json(
        { error: "Application not found." },
        { status: 404 }
      );
    }
    const status = String(body.status ?? "") as JobAppStatus;
    if (!NEXT_STATUSES[app.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Can't move from ${app.status} to ${status || "(none)"}.` },
        { status: 400 }
      );
    }
    app.status = status;
    save();
    return NextResponse.json({ application: app });
  }

  // ── create ────────────────────────────────────────────────────────────
  const company = String(body.company ?? "").trim();
  const role = String(body.role ?? "").trim();
  if (!company || !role) {
    return NextResponse.json(
      { error: "Company and role are required." },
      { status: 400 }
    );
  }
  const application: JobApplication = {
    id: uid(),
    memberId: user.id,
    company,
    role,
    status: "applied",
    notes: String(body.notes ?? "").trim() || undefined,
    nextActionDate: String(body.nextActionDate ?? "").trim() || undefined,
    createdAt: Date.now(),
  };
  d.jobApplications.push(application);
  save();
  return NextResponse.json({ application });
}
