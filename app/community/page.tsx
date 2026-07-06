import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";
import { getSessionUser } from "../lib/auth";
import { centerPolicyFor, db } from "../lib/store";
import { toSafeUser, type CareEpisode, type User } from "../lib/types";
import CommunityTabBar from "./_components/CommunityTabBar";
import Feed from "./_components/Feed";
import LeftRail from "./_components/rails/LeftRail";
import RightRail from "./_components/rails/RightRail";

export const metadata: Metadata = {
  title: "Community - My Struggle",
  description:
    "The My Struggle recovery community - wins, milestones, and support requests from members rebuilding, together.",
};

/** Feed skeleton shown while the client column hydrates (useSearchParams). */
function FeedFallback() {
  return (
    <div className="flex flex-col gap-5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
        >
          <div className="flex items-center gap-3">
            <div className="h-[46px] w-[46px] rounded-full bg-sky-tint" />
            <div className="flex flex-col gap-1.5">
              <div className="h-3.5 w-32 rounded bg-sky-tint" />
              <div className="h-2.5 w-20 rounded bg-canvas" />
            </div>
          </div>
          <div className="mt-4 h-3 w-full rounded bg-canvas" />
          <div className="mt-2 h-3 w-2/3 rounded bg-canvas" />
        </div>
      ))}
    </div>
  );
}

/** True when this member's center policy keeps them portal-only right now:
 *  CenterPolicy.portalOnlyEarlyPhase is on AND their latest care episode is
 *  in_program at a residential or detox level of care (docs/16). Mirrors the
 *  /api/portal policy computation. Defensive: signed-out visitors, staff,
 *  mentors, and members without a policy row or episode are never gated. */
function isPortalOnly(user: User | null): boolean {
  if (!user || user.role !== "member") return false;
  const policy = centerPolicyFor(user.centerId);
  if (policy?.portalOnlyEarlyPhase !== true) return false;
  const d = db() as { careEpisodes?: CareEpisode[] };
  const episodes = Array.isArray(d.careEpisodes) ? d.careEpisodes : [];
  const latest = episodes
    .filter((e) => e.memberId === user.id)
    .sort((a, b) => b.startedAt - a.startedAt)[0];
  return (
    !!latest &&
    latest.carePhase === "in_program" &&
    (latest.levelOfCare === "residential" || latest.levelOfCare === "detox")
  );
}

/** Warm locked state rendered instead of the feed for portal-only members -
 *  the same card the member app shows in place of its community section. */
function PortalOnlyLocked() {
  return (
    <div className="min-h-screen bg-canvas">
      <Nav />
      <main className="mx-auto flex max-w-[1240px] items-center justify-center px-4 py-16 lg:py-[110px]">
        <div className="w-full max-w-[440px] rounded-2xl bg-white px-7 py-10 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sky-tint text-indigo-brand">
            <Lock size={20} />
          </div>
          <p className="mx-auto mt-4 max-w-[340px] text-[15.5px]/[1.65] font-semibold text-ink-900">
            Your program comes first right now - the community unlocks as you
            progress. Your center can tell you more.
          </p>
          <Link
            href="/member-app"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white hover:bg-blue-hover"
          >
            Go to My Program
          </Link>
        </div>
      </main>
      <Footer />
      <PrototypeMap />
    </div>
  );
}

/**
 * /community - the desktop social recovery community.
 * Three columns on lg+: channel rail · feed · community rail. Below lg the
 * rails collapse, the feed's horizontal topic chip row takes over, and a
 * fixed bottom tab bar (CommunityTabBar) provides app-like navigation.
 */
export default async function CommunityPage() {
  const sessionUser = await getSessionUser();
  // Portal-only early-phase members get the warm locked card, not the feed.
  if (isPortalOnly(sessionUser)) return <PortalOnlyLocked />;
  const viewer = sessionUser ? toSafeUser(sessionUser) : null;
  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-3 py-6 pb-20 lg:grid-cols-[260px_1fr_300px] lg:px-6 lg:pb-6">
        <aside className="hidden lg:block">
          <Suspense fallback={null}>
            <LeftRail />
          </Suspense>
        </aside>

        <Suspense fallback={<FeedFallback />}>
          <Feed initialViewer={viewer} />
        </Suspense>

        <aside className="hidden lg:block">
          <Suspense fallback={null}>
            <RightRail />
          </Suspense>
        </aside>
      </main>

      <CommunityTabBar />
      <Footer />
      <PrototypeMap />
    </div>
  );
}
