import Link from "next/link";
import { Heart } from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";
import GivingProof from "./GivingProof";

export const metadata = {
  title: "How Giving Works - My Struggle",
  description:
    "Give directly to one person's journey - half reaches them today, half is held safely for the day they re-enter society.",
};

const STEPS = [
  {
    n: "01",
    title: "Scan or visit",
    desc: "Every member carries a personal QR code. Scan it with your phone camera - or visit their giving page - and give directly to their journey in under a minute.",
  },
  {
    n: "02",
    title: "Half arrives today",
    desc: "50% of your gift becomes cash they collect at their outreach center - whether they're unhoused or currently incarcerated, it reaches them right away.",
  },
  {
    n: "03",
    title: "Half waits for reentry",
    desc: "50% is held safely for their return, released directly to them when they re-enter society - or right away if they already are.",
  },
];

const SERVES = [
  {
    title: "Unhoused neighbors",
    desc: "Cash for today, savings for the door key. Half of every gift meets this week's needs; half builds toward a place of their own.",
  },
  {
    title: "Currently incarcerated",
    desc: "Gifts accumulate safely while they serve their time - and the reentry half is ready the day they walk out.",
  },
  {
    title: "Re-entering now",
    desc: "Both halves work for them immediately - first month's rent, deposits, work clothes. Everything a fresh start asks for.",
  },
];

const FAQ = [
  {
    q: "Where does my money go?",
    a: (
      <>
        Straight to one person. 50% of every gift goes to the member
        immediately - cash they collect at their outreach center. The other
        50% is held safely for their reentry and released directly to them
        when they step back into society: first month&apos;s rent, a deposit,
        work boots, a fresh start. If they&apos;re already re-entering, the
        held half releases to them now.
      </>
    ),
  },
  {
    q: "What if the member is incarcerated?",
    a: (
      <>
        Giving doesn&apos;t stop at a facility wall. The immediate half is
        cash they can collect through their outreach center while they serve
        their time, and the reentry half keeps accumulating safely - so the
        day they walk out, there&apos;s something waiting to walk out with
        them.
      </>
    ),
  },
  {
    q: "When does the reentry half release?",
    a: (
      <>
        The moment they re-enter society, it goes to them directly - no
        waiting period, no application. And if a member is already
        re-entering when you give, the held half releases to them right away.
      </>
    ),
  },
  {
    q: "Is my gift tax-deductible?",
    a: (
      <>
        My Struggle is a 501(c)(3) nonprofit. You&apos;ll receive a receipt
        by email for every gift; deductibility details for member-directed
        gifts are included on the receipt.
      </>
    ),
  },
];

export default function Giving() {
  return (
    <>
      <Nav />

      {/* HERO - navy manifesto band with ghost 50/50 */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="absolute -top-[30px] right-8 hidden whitespace-nowrap text-[260px]/[1] font-extrabold tracking-[-0.02em] text-white/[.04] lg:block">
          50/50
        </div>
        <div className="relative mx-auto w-full max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[120px]">
          <div className="flex max-w-[720px] flex-col gap-5 lg:gap-[26px]">
            <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
              THE GIVING PLATFORM
            </div>
            <h1 className="text-[clamp(40px,5vw,68px)]/[1.06] font-extrabold tracking-[-0.02em] text-white">
              Half now. Half for the way{" "}
              <span className="script text-[1.25em] text-[#A9B4E8]">home</span>.
            </h1>
            <p className="max-w-[560px] text-[16px]/[1.65] font-medium text-white/[.88] lg:text-[19px]">
              Give directly to one person&apos;s journey - half reaches them
              today, half is waiting when they step back into society.
            </p>
            <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/give"
                className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
              >
                Give to a member <Heart size={14} fill="currentColor" />
              </Link>
              <Link
                href="/community"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-white/85 bg-[rgba(11,37,69,.35)] px-[34px] text-base font-bold text-white hover:bg-white/[.12] sm:w-auto"
              >
                See the community
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS - 01/02/03 */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              How it works
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              One gift, two{" "}
              <span className="script text-[44px] lg:text-[60px]">moments</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-[60px] lg:grid-cols-3 lg:gap-7">
            {STEPS.map((c) => (
              <div
                key={c.n}
                className="relative rounded-2xl border border-sky-tint bg-white px-8 pb-9 pt-10 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
              >
                <div className="absolute left-[22px] top-2.5 text-[96px]/[1] font-extrabold text-[rgba(78,91,155,.1)]">
                  {c.n}
                </div>
                <div className="relative pt-14 text-[22px] font-bold text-ink-900">
                  {c.title}
                </div>
                <div className="relative mt-2.5 text-[15px]/[1.7] text-ink-600">
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE 50/50 SPLIT */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              The 50/50 split
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              Every dollar,{" "}
              <span className="script text-[44px] lg:text-[60px]">
                accountable
              </span>
            </h2>
          </div>
          <div className="mx-auto mt-10 max-w-[860px] rounded-2xl bg-white px-6 py-9 shadow-[0_2px_10px_rgba(11,37,69,.08)] lg:mt-[52px] lg:px-14 lg:py-12">
            <div className="flex justify-between gap-4">
              <div>
                <div className="tnum text-[34px] font-extrabold tracking-[-0.02em] text-blue-primary lg:text-[44px]">
                  50%
                </div>
                <div className="mt-1 text-[12px] font-bold tracking-[.1em] text-ink-900 lg:text-[13px]">
                  TODAY
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-ink-600 lg:text-[14px]">
                  cash at the center
                </div>
              </div>
              <div className="text-right">
                <div className="tnum text-[34px] font-extrabold tracking-[-0.02em] text-indigo-brand lg:text-[44px]">
                  50%
                </div>
                <div className="mt-1 text-[12px] font-bold tracking-[.1em] text-ink-900 lg:text-[13px]">
                  REENTRY
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-ink-600 lg:text-[14px]">
                  held for their fresh start
                </div>
              </div>
            </div>
            <div className="mt-6 flex h-4 overflow-hidden rounded-full">
              <div className="w-1/2 bg-blue-primary" />
              <div className="w-1/2 bg-indigo-brand" />
            </div>
            <div className="mt-2.5 flex justify-between text-[12px] font-semibold text-ink-400">
              <span>reaches them immediately</span>
              <span className="text-right">
                released the day they re-enter society
              </span>
            </div>
            <div className="mt-8 flex flex-col gap-3 border-t border-sky-tint pt-7">
              {[
                {
                  dot: "bg-blue-primary",
                  text: (
                    <>
                      <strong className="text-ink-900">
                        Member ID + staff verification
                      </strong>{" "}
                      - every redemption happens in person, with a real human
                      confirming it.
                    </>
                  ),
                },
                {
                  dot: "bg-indigo-brand",
                  text: (
                    <>
                      <strong className="text-ink-900">
                        Routed through outreach centers
                      </strong>{" "}
                      - gifts flow through the member&apos;s center, never
                      into a void.
                    </>
                  ),
                },
                {
                  dot: "bg-blue-primary",
                  text: (
                    <>
                      <strong className="text-ink-900">$100/day cash cap</strong>{" "}
                      - daily limits keep members, donors, and staff safe.
                    </>
                  ),
                },
              ].map((row, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <span
                    className={`mt-[7px] h-2.5 w-2.5 flex-none rotate-45 rounded-[2px] ${row.dot}`}
                  />
                  <div className="text-[14px]/[1.65] text-ink-600 lg:text-[15px]/[1.7]">
                    {row.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT SERVES */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Who it serves
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              Wherever they are on the{" "}
              <span className="script text-[44px] lg:text-[60px]">road</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-[60px] lg:grid-cols-3 lg:gap-7">
            {SERVES.map((c, i) => (
              <div
                key={c.title}
                className="rounded-2xl bg-canvas px-8 py-9"
              >
                <div
                  className={
                    "h-3.5 w-3.5 rotate-45 rounded-[3px] " +
                    (i % 2 === 0 ? "bg-blue-primary" : "bg-indigo-brand")
                  }
                />
                <div className="mt-5 text-[20px] font-bold text-ink-900">
                  {c.title}
                </div>
                <div className="mt-2.5 text-[15px]/[1.7] text-ink-600">
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LIVE PROOF */}
      <section className="border-y border-sky-tint bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[90px]">
          <div className="mb-8 text-center text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:mb-10 lg:text-[13px]">
            Live from the community
          </div>
          <GivingProof />
        </div>
      </section>

      {/* DANIELLE CTA BAND */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[90px]">
          <div className="rounded-2xl bg-navy-deep px-6 py-9 shadow-[0_8px_30px_rgba(11,37,69,.2)] lg:px-[52px] lg:py-11">
            <div className="flex flex-col gap-3.5">
              <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
                MEET ONE MEMBER
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-[30px] font-extrabold text-white">
                  Danielle
                </div>
                <span className="inline-flex h-[26px] items-center rounded-full bg-white/[.12] px-3 text-[11px] font-bold text-[#8FBCF0]">
                  Member #039521464
                </span>
              </div>
              <div className="max-w-[620px] text-[15px]/[1.7] text-white/80">
                GED earned, first job started, transitional housing secured -
                and $175 a week keeps her hallway house on track, the last
                step before a place of her own.
              </div>
              <div className="mt-1.5">
                <Link
                  href="/give"
                  className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-blue-primary px-[30px] text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
                >
                  Give to Danielle&apos;s journey{" "}
                  <Heart size={14} fill="currentColor" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[900px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              FAQ
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Giving, <span className="script text-[42px] lg:text-[56px]">answered</span>
            </h2>
          </div>
          <div className="mt-10 flex flex-col gap-3.5 lg:mt-[52px]">
            {FAQ.map((f, i) => (
              <details
                key={f.q}
                open={i === 0}
                className="rounded-2xl bg-canvas px-5 py-5 lg:px-8 lg:py-[26px]"
              >
                <summary className="flex items-center justify-between gap-4 text-[16px] font-bold text-ink-900 lg:text-[17px]">
                  {f.q}
                  <span className="text-[20px] text-blue-primary">
                    <span className="faq-plus">+</span>
                    <span className="faq-minus">−</span>
                  </span>
                </summary>
                <div className="mt-3 max-w-[700px] text-[15px]/[1.7] text-ink-600">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
