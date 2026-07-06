import type { Metadata } from "next";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";
import BoardForm from "./_components/BoardForm";
import BoardMembers from "./_components/BoardMembers";

export const metadata: Metadata = {
  title: "Join our board - My Struggle",
  description:
    "Serve on the My Struggle board. A short application for people who want to help lead recovery work built by people who have lived it.",
};

export default function BoardPage() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(11,37,69,1)_0%,rgba(46,124,214,.35)_100%)]" />
        <div className="relative mx-auto flex w-full max-w-[820px] flex-col gap-4 px-5 py-14 lg:px-6 lg:py-20">
          <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
            JOIN OUR BOARD
          </div>
          <h1 className="text-[clamp(32px,4.4vw,52px)]/[1.08] font-extrabold tracking-[-0.02em] text-white">
            Help lead the{" "}
            <span className="script text-[1.24em] text-[#A9B4E8]">work</span>
          </h1>
          <p className="max-w-[560px] text-[17px]/[1.6] font-medium text-white/[.88]">
            Our board is built from people who bring lived experience,
            professional skill, and a heart for this community. Tell us a little
            about yourself - this is a short application, not a term paper.
          </p>
        </div>
      </section>

      {/* MEET THE BOARD */}
      <section className="bg-white">
        <div className="mx-auto w-full max-w-[1100px] px-5 py-14 lg:px-6 lg:py-[72px]">
          <div className="max-w-[640px]">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Meet our board
            </div>
            <h2 className="mt-3 text-[28px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[38px]/[1.12]">
              Led by people who have{" "}
              <span className="script text-[1.15em] text-indigo-brand">
                lived
              </span>{" "}
              it
            </h2>
            <p className="mt-3 text-[15.5px]/[1.7] text-ink-600">
              Tap any board member to read more about the experience and heart
              they bring to this work.
            </p>
          </div>
          <div className="mt-8 lg:mt-10">
            <BoardMembers />
          </div>
        </div>
      </section>

      {/* FORM */}
      <section id="apply" className="scroll-mt-20 bg-canvas">
        <div className="mx-auto w-full max-w-[820px] px-5 py-12 lg:px-6 lg:py-16">
          <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(11,37,69,.08)] lg:p-9">
            <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink-900 lg:text-[26px]">
              Board member application
            </h2>
            <p className="mt-1.5 text-[14.5px]/[1.7] text-ink-600">
              Takes about two minutes. We&apos;ll follow up personally.
            </p>
            <div className="mt-6">
              <BoardForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
