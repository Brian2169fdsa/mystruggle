import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import PrototypeMap from "../../components/PrototypeMap";
import LeftRail from "../_components/rails/LeftRail";
import CirclesBrowser from "../_components/CirclesBrowser";

export const metadata: Metadata = {
  title: "Circles — My Struggle Community",
  description:
    "Browse the community's circles — small peer-led and staff-supported spaces like Job Seekers, Parents in Recovery, and center alumni circles.",
};

/**
 * /community/circles — the circles directory. Circles are our groups:
 * peer-led or staff-supported spaces members join to walk a stretch of the
 * road together. Alumni circles of other centers appear locked here — the
 * directory lists them, but their feeds stay private to their center.
 */
export default function CirclesPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      {/* pb-20 lg:pb-0 keeps the mobile community tab bar (if present
          globally) from overlapping the last rows. */}
      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-4 py-6 pb-20 lg:grid-cols-[260px_1fr] lg:px-6 lg:pb-6">
        <aside className="hidden lg:block">
          <Suspense fallback={null}>
            <LeftRail />
          </Suspense>
        </aside>

        <div className="min-w-0">
          <header className="mb-5">
            <h1 className="text-[26px] font-extrabold leading-tight text-ink-900 sm:text-[30px]">
              Find your <span className="script text-[1.35em]">circles</span>
            </h1>
            <div className="hairline mt-3 w-16 rounded-full" />
            <p className="mt-3 max-w-[560px] text-[14.5px]/[1.65] font-medium text-ink-600">
              Small spaces to walk together — some peer-led, some watched over
              by the care team. Join the ones that fit where you are today.
            </p>
          </header>

          <CirclesBrowser />
        </div>
      </main>

      <Footer />
      <PrototypeMap />
    </div>
  );
}
