import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";
import { getSessionUser } from "../lib/auth";
import { toSafeUser } from "../lib/types";
import Feed from "./_components/Feed";
import LeftRail from "./_components/rails/LeftRail";
import RightRail from "./_components/rails/RightRail";

export const metadata: Metadata = {
  title: "Community — My Struggle",
  description:
    "The My Struggle recovery community — wins, milestones, and support requests from members rebuilding, together.",
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

/**
 * /community — the desktop social recovery community.
 * Three columns on lg+: channel rail · feed · community rail. Below lg the
 * rails collapse and the feed's horizontal topic chip row takes over.
 */
export default async function CommunityPage() {
  const sessionUser = await getSessionUser();
  const viewer = sessionUser ? toSafeUser(sessionUser) : null;
  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr_300px] lg:px-6">
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

      <Footer />
      <PrototypeMap />
    </div>
  );
}
