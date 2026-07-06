import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import PrototypeMap from "../../components/PrototypeMap";
import LeftRail from "../_components/rails/LeftRail";
import DirectoryGrid from "../_components/DirectoryGrid";
import CommunityTabBar from "../_components/CommunityTabBar";

export const metadata: Metadata = {
  title: "Discover people - My Struggle Community",
  description:
    "Meet members of the My Struggle recovery community who share a public profile - search by name or interest and find your people.",
};

/**
 * /community/discover - a searchable directory of members who have chosen to
 * share a public profile. Consent-first: nobody appears here unless they've
 * opened their profile publicly (see DirectoryGrid for the gating detail).
 */
export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      {/* pb-20 keeps the mobile community tab bar from overlapping the
          last rows (lg:pb-6 once the bar hides). */}
      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-4 py-6 pb-20 lg:grid-cols-[260px_1fr] lg:px-6 lg:pb-6">
        <aside className="hidden lg:block">
          <Suspense fallback={null}>
            <LeftRail />
          </Suspense>
        </aside>

        <div className="min-w-0">
          <header className="mb-5">
            <h1 className="text-[26px] font-extrabold leading-tight text-ink-900 sm:text-[30px]">
              Discover our <span className="script text-[1.35em]">people</span>
            </h1>
            <div className="hairline mt-3 w-16 rounded-full" />
            <p className="mt-3 max-w-[560px] text-[14.5px]/[1.65] font-medium text-ink-600">
              These members chose to share their journey with the community.
              Search by name or interest, then say hello on their profile.
            </p>
          </header>

          <DirectoryGrid />
        </div>
      </main>

      <CommunityTabBar />
      <Footer />
      <PrototypeMap />
    </div>
  );
}
