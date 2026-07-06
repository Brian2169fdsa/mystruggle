"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Users,
  Heart,
  Flag,
  FlagTriangleRight,
  CalendarDays,
  BarChart3,
  ClipboardList,
  Megaphone,
  ShieldCheck,
  Inbox,
  CreditCard,
  Activity,
  GraduationCap,
} from "lucide-react";
import PrototypeMap from "../components/PrototypeMap";
import Overview from "./_components/Overview";
import Participants from "./_components/Participants";
import ParticipantDetail from "./_components/ParticipantDetail";
import GivingDesk from "./_components/GivingDesk";
import Moderation from "./_components/Moderation";
import Reports from "./_components/Reports";
import Applications from "./_components/Applications";
import AdManager from "./_components/AdManager";
import AdApproval from "./_components/AdApproval";
import LeadQueue from "./_components/LeadQueue";
import Billing from "./_components/Billing";
import ProgramCockpit from "./_components/ProgramCockpit";
import AlumniDashboard from "./_components/AlumniDashboard";
import ReportsQueue from "./_components/ReportsQueue";
import EventsManager from "./_components/EventsManager";
import type { Post, SafeUser } from "../lib/types";
import type {
  AdminMember,
  GivingStep,
  ModerateAction,
  OverviewData,
  Section,
} from "./_components/types";

const WORDMARK_WHITE =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png";
const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

/** Local section union - adds Applications + the ad/lead consoles without
 *  widening the shared type (mirrors how Applications was added). */
type PageSection =
  | Section
  | "applications"
  | "ads"
  | "adReview"
  | "leads"
  | "billing"
  | "cockpit"
  | "alumni"
  | "memberReports"
  | "events";

const NAV = [
  { key: "overview", label: "Overview", Icon: LayoutGrid },
  { key: "participants", label: "Participants", Icon: Users },
  { key: "cockpit", label: "Program cockpit", Icon: Activity },
  { key: "alumni", label: "Alumni", Icon: GraduationCap },
  { key: "applications", label: "Applications", Icon: ClipboardList },
  { key: "giving", label: "Giving desk", Icon: Heart },
  { key: "moderation", label: "Moderation", Icon: Flag },
  { key: "memberReports", label: "Member reports", Icon: FlagTriangleRight },
  { key: "events", label: "Events", Icon: CalendarDays },
  { key: "ads", label: "Ad Manager", Icon: Megaphone },
  { key: "adReview", label: "Ad Review", Icon: ShieldCheck },
  { key: "leads", label: "Demo Leads", Icon: Inbox },
  { key: "billing", label: "Billing", Icon: CreditCard },
  { key: "reports", label: "Reports", Icon: BarChart3 },
] as const;

/** Auth gate state - the dashboard renders nothing sensitive until /api/auth/me
 *  confirms a staff session (admin APIs 401 without one). */
type Auth =
  | { status: "loading" }
  | { status: "out" }
  | { status: "in"; user: SafeUser };

/** Centered full-screen shell for the sign-in gate (navy sidebar NOT shown). */
function GateShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-[440px] rounded-2xl bg-white px-8 py-10 text-center shadow-[0_1px_3px_rgba(11,37,69,.08)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={WORDMARK_INDIGO}
          alt="My Struggle"
          className="mx-auto h-9 w-auto"
        />
        {children}
      </div>
    </div>
  );
}

/** Signed-out gate - points staff at /login with the demo credentials. */
function SignInGate() {
  return (
    <GateShell>
      <h1 className="mt-6 text-[22px]/[1.3] font-extrabold tracking-[-0.01em] text-ink-900">
        Center dashboard
      </h1>
      <p className="mt-2 text-[14.5px]/[1.7] font-medium text-ink-600">
        Staff sign-in required.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(46,124,214,.35)] hover:bg-blue-hover"
      >
        Sign in
      </Link>
      <div className="mt-6 rounded-2xl bg-sky-tint px-5 py-4 text-left">
        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
          Demo staff account
        </div>
        <div className="mt-1.5 text-[12.5px]/[1.6] font-medium text-ink-600">
          sarah@themystruggles.com / mystruggle
        </div>
      </div>
    </GateShell>
  );
}

/** Signed in, but not staff - warm redirect to their own app. */
function NotStaffGate({ user }: { user: SafeUser }) {
  const appHref = user.role === "mentor" ? "/mentor-app" : "/member-app";
  const appLabel = user.role === "mentor" ? "mentor app" : "member app";
  return (
    <GateShell>
      <h1 className="mt-6 text-[22px]/[1.3] font-extrabold tracking-[-0.01em] text-ink-900">
        This area is for center staff
      </h1>
      <p className="mt-2 text-[14.5px]/[1.7] font-medium text-ink-600">
        Hi {user.name} - you&rsquo;re signed in as a {user.role}. Your journey
        lives in the {appLabel}.
      </p>
      <Link
        href={appHref}
        className="mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(46,124,214,.35)] hover:bg-blue-hover"
      >
        Go to your {appLabel}
      </Link>
      <p className="mt-4 text-[13px] font-medium text-ink-600">
        Center staff?{" "}
        <Link href="/login" className="font-bold text-blue-primary">
          Sign in with a staff account
        </Link>
      </p>
    </GateShell>
  );
}

export default function DashboardPage() {
  const [auth, setAuth] = useState<Auth>({ status: "loading" });
  const [section, setSection] = useState<PageSection>("overview");
  const [riskOnly, setRiskOnly] = useState(false);
  const [givingStep, setGivingStep] = useState<GivingStep>("amount");
  const [redeemAmount, setRedeemAmount] = useState(20);
  const [adReviewCount, setAdReviewCount] = useState(0);
  const [alumniWatch, setAlumniWatch] = useState(0);
  const [openReports, setOpenReports] = useState(0);

  // ── LIVE data ────────────────────────────────────────────────────────
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(
    null
  );

  // Who is signed in? Same-origin fetch carries the session cookie.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const user = (d?.user ?? null) as SafeUser | null;
        setAuth(user ? { status: "in", user } : { status: "out" });
      })
      .catch(() => setAuth({ status: "out" }));
  }, []);

  const isStaff = auth.status === "in" && auth.user.role === "staff";

  // A 401 from any admin API means the session lapsed - fall back to the gate.
  const onUnauthorized = useCallback(() => setAuth({ status: "out" }), []);

  const loadOverview = useCallback(async () => {
    const res = await fetch("/api/admin/overview");
    if (res.status === 401) return onUnauthorized();
    if (res.ok) setOverview(await res.json());
  }, [onUnauthorized]);

  const loadPosts = useCallback(async () => {
    const res = await fetch("/api/admin/posts");
    if (res.status === 401) return onUnauthorized();
    if (res.ok) setPosts((await res.json()).posts as Post[]);
  }, [onUnauthorized]);

  useEffect(() => {
    if (!isStaff) return; // admin APIs are staff-gated; don't fetch until confirmed
    loadOverview().catch(() => {});
    loadPosts().catch(() => {});
    fetch("/api/admin/members")
      .then((r) => {
        if (r.status === 401) {
          onUnauthorized();
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((d) => d && setMembers(d.members as AdminMember[]))
      .catch(() => {});
  }, [isStaff, loadOverview, loadPosts, onUnauthorized]);

  // Live badge for Ad Review - poll the ms_admin queue length. Quiet on 404
  // (the ad APIs may still be coming online).
  useEffect(() => {
    if (!isStaff) return;
    let stop = false;
    const poll = () => {
      fetch("/api/admin/placements")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (stop || !d) return;
          // Contract uses `queue`; the live API returns all `placements`. Count
          // only those still needing review (pending, or member-reported).
          const all = (d.queue ?? d.placements ?? []) as Array<{
            status?: string;
            reported?: boolean;
            reportCount?: number;
            stats?: { report?: number; reports?: number } | null;
            metrics?: { report?: number; reports?: number } | null;
          }>;
          const n = all.filter((p) => {
            const s = (p.status ?? "").toLowerCase();
            const m = p.stats ?? p.metrics ?? {};
            const reports = p.reportCount ?? m.reports ?? m.report ?? 0;
            return (
              s.includes("pend") ||
              s.includes("review") ||
              p.reported ||
              reports > 0
            );
          }).length;
          setAdReviewCount(n);
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 15_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [isStaff]);

  // Live badge for Alumni - the on-watch count. Quiet on 404/500 (the alumni
  // API may still be coming online); retries with the same interval.
  useEffect(() => {
    if (!isStaff) return;
    let stop = false;
    const poll = () => {
      fetch("/api/admin/alumni")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (stop || !d?.summary) return;
          setAlumniWatch(Number(d.summary.watchCount ?? 0));
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [isStaff]);

  // Live badge for member Reports - count of open reports. Quiet on 404/500
  // (the reports API may still be coming online); polls on the same cadence.
  useEffect(() => {
    if (!isStaff) return;
    let stop = false;
    const poll = () => {
      fetch("/api/reports")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (stop || !d) return;
          const list = (d.reports ?? []) as Array<{ status?: string }>;
          setOpenReports(list.filter((x) => x.status === "open").length);
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 30_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [isStaff]);

  const moderate = useCallback(
    async (postId: string, action: ModerateAction) => {
      const res = await fetch(`/api/posts/${postId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.status === 401) return onUnauthorized();
      // Refetch so the queue, badge, and overview counts reflect the server.
      await Promise.all([loadPosts(), loadOverview()]).catch(() => {});
    },
    [loadPosts, loadOverview, onUnauthorized]
  );

  // ── AUTH GATE ────────────────────────────────────────────────────────
  if (auth.status === "loading") {
    return <div className="min-h-screen bg-canvas" aria-busy="true" />;
  }
  if (auth.status === "out") return <SignInGate />;
  if (!isStaff) return <NotStaffGate user={auth.user} />;
  const staff = auth.user;

  // Live badge: posts still needing staff eyes (pending + flagged).
  const pendingCount =
    posts?.filter((p) => p.status === "pending" || p.status === "flagged")
      .length ?? 0;
  const activeKey = section === "detail" ? "participants" : section;

  const goParticipants = () => setSection("participants");
  const goModeration = () => setSection("moderation");
  const goGiving = () => setSection("giving");

  const openMember = (m: AdminMember) => {
    setSelectedMember(m);
    setSection("detail");
  };

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR - dashboard shell, not the site Nav/Footer */}
      <aside className="sticky top-0 flex h-screen w-60 flex-none flex-col bg-navy-deep pb-6 pt-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={WORDMARK_WHITE}
          alt="My Struggle"
          className="mx-6 mb-[30px] h-[38px] w-auto self-start"
        />
        {NAV.map(({ key, label, Icon }) => {
          const on = activeKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={
                "flex w-full cursor-pointer items-center gap-3 border-l-[3px] px-6 py-3 text-left text-sm " +
                (on
                  ? "border-blue-primary bg-[rgba(46,124,214,.14)] font-bold text-sky-tint"
                  : "border-transparent font-semibold text-white/65 hover:text-white/90")
              }
            >
              <Icon size={15} strokeWidth={2.4} />
              {label}
              {key === "moderation" && pendingCount > 0 && (
                <span className="ml-auto inline-flex h-5 items-center rounded-full bg-blue-primary px-2 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
              {key === "adReview" && adReviewCount > 0 && (
                <span className="ml-auto inline-flex h-5 items-center rounded-full bg-blue-primary px-2 text-[11px] font-bold text-white">
                  {adReviewCount}
                </span>
              )}
              {key === "memberReports" && openReports > 0 && (
                <span className="ml-auto inline-flex h-5 items-center rounded-full bg-blue-primary px-2 text-[11px] font-bold text-white">
                  {openReports}
                </span>
              )}
              {key === "alumni" && alumniWatch > 0 && (
                <span className="ml-auto inline-flex h-5 items-center rounded-full bg-gold-badge px-2 text-[11px] font-bold text-white">
                  {alumniWatch}
                </span>
              )}
            </button>
          );
        })}
        <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-6 pt-5">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-sky-tint text-sm font-extrabold text-indigo-brand">
            {staff.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-[13px] font-bold text-white">
              {staff.name}
            </div>
            <div className="text-[11px] font-medium text-white/55">
              Laveen Center · staff
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex min-w-0 flex-1 flex-col gap-5 px-9 py-[30px] text-[15px]">
        {section === "overview" && (
          <Overview
            overview={overview}
            pendingCount={pendingCount}
            goParticipants={goParticipants}
            goModeration={goModeration}
          />
        )}
        {section === "participants" && (
          <Participants
            members={members}
            riskOnly={riskOnly}
            onToggleRisk={() => setRiskOnly((v) => !v)}
            onOpenMember={openMember}
          />
        )}
        {section === "detail" &&
          (selectedMember ? (
            <ParticipantDetail
              key={selectedMember.id}
              member={selectedMember}
              goParticipants={goParticipants}
              goGiving={goGiving}
            />
          ) : (
            <Participants
              members={members}
              riskOnly={riskOnly}
              onToggleRisk={() => setRiskOnly((v) => !v)}
              onOpenMember={openMember}
            />
          ))}
        {section === "cockpit" && <ProgramCockpit />}
        {section === "alumni" && (
          <AlumniDashboard onWatchCount={setAlumniWatch} />
        )}
        {section === "applications" && <Applications />}
        {section === "ads" && <AdManager />}
        {section === "adReview" && (
          <AdApproval onQueueLength={setAdReviewCount} />
        )}
        {section === "leads" && <LeadQueue />}
        {section === "billing" && <Billing />}
        {section === "giving" && (
          <GivingDesk
            overview={overview}
            step={givingStep}
            redeemAmount={redeemAmount}
            onSelectAmount={setRedeemAmount}
            onToPin={() => setGivingStep("pin")}
            onBackToAmount={() => setGivingStep("amount")}
            onConfirm={() => setGivingStep("done")}
            onReset={() => {
              setGivingStep("amount");
              setRedeemAmount(20);
            }}
          />
        )}
        {section === "moderation" && (
          <Moderation
            posts={posts}
            pendingCount={pendingCount}
            onModerate={moderate}
            goParticipants={goParticipants}
          />
        )}
        {section === "reports" && <Reports />}
        {section === "memberReports" && (
          <ReportsQueue onOpenCount={setOpenReports} />
        )}
        {section === "events" && <EventsManager />}
      </main>

      <PrototypeMap />
    </div>
  );
}
