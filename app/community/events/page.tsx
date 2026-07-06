import type { Metadata } from "next";
import { Suspense } from "react";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import PrototypeMap from "../../components/PrototypeMap";
import LeftRail from "../_components/rails/LeftRail";
import EventsList from "../_components/EventsList";

export const metadata: Metadata = {
  title: "Events — My Struggle Community",
  description:
    "Upcoming meetups, celebrations, and workshops across the My Struggle recovery community. RSVP and save your seat.",
};

/**
 * /community/events — the community calendar. Upcoming events grouped by day,
 * each with a one-tap RSVP (POST /api/events/[id]/rsvp). Signed-out members
 * are warmly invited to sign in before RSVPing.
 */
export default function EventsPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_1fr] lg:px-6">
        <aside className="hidden lg:block">
          <Suspense fallback={null}>
            <LeftRail />
          </Suspense>
        </aside>

        <div className="min-w-0">
          <header className="mb-5">
            <h1 className="text-[26px] font-extrabold leading-tight text-ink-900 sm:text-[30px]">
              Community <span className="script text-[1.35em]">events</span>
            </h1>
            <div className="hairline mt-3 w-16 rounded-full" />
            <p className="mt-3 max-w-[560px] text-[14.5px]/[1.65] font-medium text-ink-600">
              Meetups, milestone celebrations, and workshops — the moments we
              show up for each other. Save your seat with one tap.
            </p>
          </header>

          <EventsList />
        </div>
      </main>

      <Footer />
      <PrototypeMap />
    </div>
  );
}
