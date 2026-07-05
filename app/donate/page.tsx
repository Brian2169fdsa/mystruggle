import Link from "next/link";
import { Heart } from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";

export const metadata = {
  title: "Donate Today — My Struggle",
};

const WAYS = [
  {
    href: "#tiers",
    external: false,
    diamond: "bg-blue-primary",
    title: "One-time gift",
    desc: "Any amount, right now, wherever it's needed most.",
  },
  {
    href: "#tiers",
    external: false,
    diamond: "bg-blue-primary",
    title: "Monthly giving",
    desc: "Steady support members can plan a life around.",
  },
  {
    href: "/give",
    external: false,
    diamond: "bg-indigo-brand",
    title: "Sponsor a QR code",
    desc: "Fund one member's giving page and follow their journey.",
  },
  {
    href: "/about",
    external: false,
    diamond: "bg-indigo-brand",
    title: "Apartment complexes fund",
    desc: "Help us secure transitional housing units at scale.",
  },
];

// First six diamonds blue, last six indigo — exactly as in the prototype.
const COVERS = [
  "Halfway house placement",
  "Job training",
  "Childcare",
  "Food while in treatment",
  "Emergency medical",
  "Legal support",
  "Transportation",
  "Treatment & insurance",
  "Mental health care",
  "Clothing",
  "Reentry programs",
  "Education",
];

const TIERS = [
  {
    name: "Basic",
    price: "$25",
    desc: "A week of essential services for one member, every month.",
    cta: "Choose Basic",
    featured: false,
  },
  {
    name: "Advanced",
    price: "$39",
    desc: "Essentials plus transportation to work and treatment.",
    cta: "Choose Advanced",
    featured: false,
  },
  {
    name: "Elite",
    price: "$59",
    desc: "A full week of services, transport, and program materials.",
    cta: "Choose Elite",
    featured: true,
  },
  {
    name: "Pro",
    price: "$200",
    desc: "Sponsors a member's full journey — housing goal included.",
    cta: "Choose Pro",
    featured: false,
  },
];

export default function Donate() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="relative flex min-h-[440px] items-center overflow-hidden bg-[repeating-linear-gradient(45deg,#DFEAF9_0_14px,#D2E2F5_14px_28px)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,37,69,.92)_0%,rgba(11,37,69,.55)_55%,rgba(11,37,69,.2)_100%)]" />
        <span className="absolute bottom-4 right-5 rounded-md bg-[rgba(11,37,69,.5)] px-2.5 py-1 font-mono text-[11px] font-medium text-white/75">
          photo: a hand passing a bag of essentials, warm light
        </span>
        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-16 lg:px-6 lg:py-20">
          <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
            DONATE TODAY
          </div>
          <h1 className="text-[clamp(38px,4.8vw,60px)]/[1.06] font-extrabold tracking-[-0.02em] text-white">
            Every Contribution{" "}
            <span className="script text-[1.24em] text-[#A9B4E8]">Counts</span>
          </h1>
          <p className="max-w-[560px] text-[18px]/[1.6] font-medium text-white/[.88]">
            $175 a week could change everything for one member. $25 covers a
            week of essential services.
          </p>
        </div>
      </section>

      {/* 500,000 STAT SPLIT */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-5 py-16 lg:grid-cols-[minmax(280px,400px)_1fr] lg:gap-20 lg:px-6 lg:py-[100px]">
          <div>
            <div className="tnum text-[clamp(64px,7vw,96px)]/[1] font-extrabold tracking-[-0.02em] text-blue-primary">
              500,000
            </div>
            <div className="mt-3 text-[18px] font-bold text-ink-900">
              people are homeless in America on any given night
            </div>
          </div>
          <div className="text-[17px]/[1.75] text-ink-600">
            Behind that number are members — people one mentor, one program,
            one steady week of support away from a different life. Your
            donation doesn&apos;t go into a general fund. It goes to a person,
            a center, a program you can see.{" "}
            <strong className="text-ink-900">
              Why your donation matters: it lands somewhere specific.
            </strong>
          </div>
        </div>
      </section>

      {/* FOUR WAYS TO HELP */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[100px]">
          <div className="text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Four ways to help
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Give the way that fits{" "}
              <span className="script text-[42px] lg:text-[56px]">you</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
            {WAYS.map((w) => (
              <Link
                key={w.title}
                href={w.href}
                className="block rounded-2xl bg-white px-7 py-8 shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:bg-sky-tint"
              >
                <div
                  className={`h-3.5 w-3.5 rotate-45 rounded-[3px] ${w.diamond}`}
                />
                <div className="mt-5 text-[19px] font-bold text-ink-900">
                  {w.title}
                </div>
                <div className="mt-2 text-[14px]/[1.65] text-ink-600">
                  {w.desc}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT DONATIONS COVER — 12-ITEM GRID */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[100px]">
          <div className="text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              What donations cover
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Twelve things your gift{" "}
              <span className="script text-[42px] lg:text-[56px]">becomes</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-x-7 lg:gap-y-4">
            {COVERS.map((item, i) => (
              <div
                key={item}
                className="flex items-center gap-4 rounded-2xl bg-canvas px-[22px] py-[18px]"
              >
                <span
                  className={
                    "h-2.5 w-2.5 flex-none rotate-45 rounded-[2px] " +
                    (i < 6 ? "bg-blue-primary" : "bg-indigo-brand")
                  }
                />
                <div className="text-[15px] font-bold text-ink-900">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MONTHLY TIERS */}
      <section id="tiers" className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[100px]">
          <div className="text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Monthly giving
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Pick your <span className="script text-[42px] lg:text-[56px]">tier</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={
                  "flex flex-col gap-3.5 rounded-2xl bg-white px-[30px] py-9 " +
                  (t.featured
                    ? "relative border-t-[3px] border-blue-primary shadow-[0_6px_20px_rgba(46,124,214,.15)]"
                    : "border-t-[3px] border-transparent shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:border-blue-primary")
                }
              >
                {t.featured && (
                  <span className="absolute -top-3.5 left-1/2 inline-flex h-7 -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-indigo-brand px-4 text-[12px] font-bold text-white">
                    Best choice
                  </span>
                )}
                <div className="text-[15px] font-bold text-ink-600">
                  {t.name}
                </div>
                <div className="tnum text-[48px] font-extrabold tracking-[-0.02em] text-ink-900">
                  {t.price}
                  <span className="text-[15px] font-semibold tracking-normal text-ink-600">
                    /mo
                  </span>
                </div>
                <div className="text-[14px]/[1.65] text-ink-600">{t.desc}</div>
                {t.featured ? (
                  <span className="mt-auto inline-flex h-12 cursor-pointer items-center justify-center gap-[7px] rounded-full bg-blue-primary text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover">
                    {t.cta} <Heart size={13} fill="currentColor" />
                  </span>
                ) : (
                  <span className="mt-auto inline-flex h-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-blue-primary text-[15px] font-bold text-blue-primary hover:bg-sky-tint">
                    {t.cta}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-5 text-center text-[13px] font-medium text-ink-600">
            Secure checkout via Stripe · cancel anytime
          </div>
        </div>
      </section>

      {/* DANIELLE DIRECT-SUPPORT BAND */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[90px]">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-navy-deep shadow-[0_8px_30px_rgba(11,37,69,.2)] lg:grid-cols-[minmax(240px,340px)_1fr]">
            <div className="relative flex min-h-[200px] items-end bg-[repeating-linear-gradient(45deg,#16335C_0_12px,#12294A_12px_24px)] p-3.5 lg:min-h-0">
              <span className="rounded-md bg-[rgba(11,37,69,.6)] px-2 py-[3px] font-mono text-[10px] font-medium text-white/75">
                photo: Danielle
              </span>
            </div>
            <div className="flex flex-col gap-3.5 px-6 py-8 lg:px-[52px] lg:py-11">
              <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
                SUPPORT ONE MEMBER DIRECTLY
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="text-[30px] font-extrabold text-white">
                  Danielle
                </div>
                <span className="inline-flex h-[26px] items-center rounded-full bg-white/[.12] px-3 text-[11px] font-bold text-[#8FBCF0]">
                  Member #039521464
                </span>
              </div>
              <div className="max-w-[560px] text-[15px]/[1.7] text-white/80">
                $175 a week keeps her hallway house on track. Give straight to
                her journey — 50% cash at our centers, 50% held for her
                reentry.
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-5">
                <Link
                  href="/give"
                  className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-blue-primary px-[30px] text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
                >
                  Give to Danielle <Heart size={14} fill="currentColor" />
                </Link>
                <Link
                  href="/give"
                  className="text-[14px] font-semibold text-[#8FBCF0]"
                >
                  give.my-struggle.org/p/danielle →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AMAZON ASSOCIATES + ASHLEY J. TESTIMONIAL */}
      <section className="border-t border-sky-tint bg-canvas">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:px-6 lg:py-[70px]">
          <div className="rounded-2xl bg-white px-6 py-8 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:px-10 lg:py-9">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Shop &amp; support
            </div>
            <div className="mt-2.5 text-[20px] font-bold text-ink-900">
              Buying on Amazon anyway?
            </div>
            <div className="mt-2 text-[14px]/[1.65] text-ink-600">
              Use our Amazon Associates link and a portion of every purchase
              supports the centers — at no cost to you.
            </div>
            <a
              href="https://amzn.to/4gQuaR8"
              target="_blank"
              rel="noopener"
              className="mt-3.5 inline-block text-[14px] font-bold text-blue-primary"
            >
              amzn.to/4gQuaR8 →
            </a>
          </div>
          <div className="px-1 lg:px-5">
            <div className="text-[19px]/[1.6] italic text-ink-900 lg:text-[22px]">
              &ldquo;I gave $25 to a member&apos;s QR code on my lunch break.
              Two months later I got an update that she&apos;d moved into
              housing. I&apos;ve never felt a donation like that.&rdquo;
            </div>
            <div className="mt-4 text-[14px] font-bold tracking-[.08em] text-indigo-brand">
              — ASHLEY J., MONTHLY DONOR
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
