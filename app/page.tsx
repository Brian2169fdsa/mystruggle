import Link from "next/link";
import {
  Heart,
  Users,
  Activity,
  Home as HomeIcon,
  ArrowRight,
  MessagesSquare,
  CircleDot,
  LifeBuoy,
  ShieldCheck,
  Smartphone,
  Compass,
  LayoutDashboard,
  HeartHandshake,
} from "lucide-react";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import PrototypeMap from "./components/PrototypeMap";

const WORDMARK_WHITE =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png";

// Blue-tint + glow filter for the ghost wordmark over the hero (handoff §Assets).
const HERO_GHOST_FILTER =
  "brightness(0) saturate(100%) invert(45%) sepia(82%) saturate(1200%) hue-rotate(192deg) brightness(1.08) drop-shadow(0 4px 22px rgba(46,124,214,.55))";

export default function Home() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="relative flex min-h-[560px] items-center overflow-hidden bg-navy-deep bg-[url('/center-exterior.png')] bg-[center_60%] bg-cover bg-no-repeat lg:min-h-[86vh]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,37,69,.97)_0%,rgba(11,37,69,.82)_42%,rgba(11,37,69,.35)_72%,rgba(11,37,69,.15)_100%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={WORDMARK_WHITE}
          alt=""
          className="absolute right-12 top-11 hidden h-[140px] opacity-90 lg:block"
          style={{ filter: HERO_GHOST_FILTER }}
        />
        <div className="relative mx-auto w-full max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[120px]">
          <div className="flex max-w-[720px] flex-col gap-5 lg:gap-[26px]">
            <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
              2026 MISSION
            </div>
            <h1 className="text-[clamp(40px,5vw,68px)]/[1.06] font-extrabold tracking-[-0.02em] text-white">
              End the Struggle, Build the{" "}
              <span className="script text-[1.25em] text-[#A9B4E8]">Future</span>{" "}
              Together
            </h1>
            <p className="max-w-[560px] text-[16px]/[1.65] font-medium text-white/[.88] lg:text-[19px]">
              Peer mentorship, outreach centers, and QR Code Giving - built by
              people who&apos;ve lived the struggle, for people still in it.
            </p>
            <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <Link
                href="/donate"
                className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
                style={{ color: "#fff" }}
              >
                Donate today <Heart size={14} fill="currentColor" />
              </Link>
              <Link
                href="/mentor"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-white/85 bg-[rgba(11,37,69,.35)] px-[34px] text-base font-bold text-white hover:bg-white/[.12] sm:w-auto"
                style={{
                  color: "#fff",
                  borderColor: "rgba(255,255,255,.85)",
                }}
              >
                Become a mentor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-5 py-16 lg:grid-cols-[minmax(300px,440px)_1fr] lg:gap-20 lg:px-6 lg:py-[110px]">
          <div>
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Our mission
            </div>
            <h2 className="mt-4 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              what is <span className="script text-[44px] lg:text-[60px]">My</span> Struggle
            </h2>
          </div>
          <div className="flex flex-col gap-[22px] text-[17px]/[1.75] text-ink-600">
            <p className="m-0">
              My Struggle is a nonprofit founded in 2021 in Laveen, Arizona, by
              people who have lived through homelessness, addiction, and
              incarceration - and found their way home.
            </p>
            <p className="m-0">
              We believe nobody escapes the struggle alone. Our outreach centers
              pair every member with a peer mentor who has walked the same road,
              because the person best equipped to guide you out is someone who
              has been where you are.
            </p>
            <p className="m-0">
              Through QR Code Giving, anyone can give directly to a
              member&apos;s journey - half in cash they redeem at our centers,
              half held safely for their reentry - theirs the day they step
              back into society. Every gift is
              accountable, dignified, and personal.
            </p>
            <p className="m-0">
              Our register is simple:{" "}
              <em className="text-ink-900">
                &ldquo;How can I help you? Let&apos;s talk - tell me about
                you.&rdquo;
              </em>{" "}
              Compassion replacing contempt, one member at a time.
            </p>
          </div>
        </div>
      </section>

      {/* DANIELLE STORY SPOTLIGHT */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[100px]">
          <div className="grid grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-[0_2px_10px_rgba(11,37,69,.08)] lg:grid-cols-[minmax(300px,460px)_1fr]">
            <div
              className="relative min-h-[260px] bg-cover bg-center lg:min-h-[420px]"
              style={{ backgroundImage: "url('/danielle.png')" }}
            />

            <div className="flex flex-col gap-[18px] px-6 py-8 lg:px-16 lg:py-14">
              <div className="text-[12px] font-bold tracking-[.12em] text-blue-primary lg:text-[13px]">
                MEMBER STORY
              </div>
              <div className="flex flex-wrap items-center gap-3.5">
                <div className="text-[30px] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[36px]">
                  Danielle
                </div>
                <span className="inline-flex h-[30px] items-center rounded-full bg-sky-tint px-3.5 text-[12px] font-bold text-blue-primary">
                  Member #039521464
                </span>
              </div>
              <div className="text-[17px]/[1.7] text-ink-600">
                Danielle earned her GED, started her first job, and moved into
                transitional housing - three milestones in eight months. Right
                now she&apos;s working toward $175 a week for her hallway house,
                the last step before a place of her own.
              </div>
              <div className="mt-1.5">
                <div className="flex justify-between text-[14px] font-semibold text-ink-900">
                  <span>Hallway house · $175/week</span>
                  <span className="tnum text-blue-primary">
                    $105 raised this week
                  </span>
                </div>
                <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-sky-tint">
                  <div className="h-full w-[60%] rounded-full bg-[linear-gradient(90deg,#4E5B9B,#2E7CD6)]" />
                </div>
              </div>
              <div className="mt-2.5">
                <Link
                  href="/give"
                  className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-primary px-5 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover sm:w-auto sm:px-8 sm:text-base"
                >
                  Donate to Danielle&apos;s journey{" "}
                  <Heart size={14} fill="currentColor" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 01/02/03 GIVE CARDS */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="mx-auto max-w-[640px] text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Three ways to give
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
              Every gift builds someone&apos;s way{" "}
              <span className="script text-[44px] lg:text-[60px]">home</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 lg:mt-[60px] lg:grid-cols-3 lg:gap-7">
            {[
              {
                n: "01",
                href: "/donate",
                title: "Donate items",
                desc: "Clothing, hygiene kits, and household essentials go straight to members at our outreach centers.",
              },
              {
                n: "02",
                href: "/mentor",
                title: "Donate time",
                desc: "Mentor, teach a skill, or volunteer at a center. Lived experience isn't required - but it's always welcome.",
              },
              {
                n: "03",
                href: "/donate",
                title: "Donate funds",
                desc: "$25 provides a week of essential services for one member - meals, transportation, and a mentor who shows up.",
              },
            ].map((c) => (
              <Link
                key={c.n}
                href={c.href}
                className="relative block rounded-2xl border border-sky-tint bg-white px-8 pb-9 pt-10 shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:bg-sky-tint"
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
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* THE CONTINUUM OF CARE */}
      <TheContinuum />

      {/* EST. 2021 MANIFESTO */}
      <section className="relative overflow-hidden bg-navy-deep">
        <div className="absolute -top-[30px] left-10 hidden whitespace-nowrap text-[220px]/[1] font-extrabold tracking-[-0.02em] text-white/[.04] lg:block">
          EST. 2021
        </div>
        <div className="relative mx-auto flex max-w-[900px] flex-col gap-6 px-5 py-16 text-center lg:gap-7 lg:px-6 lg:py-[120px]">
          <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
            EST. 2021 · LAVEEN, ARIZONA
          </div>
          <div className="text-[28px]/[1.3] font-extrabold tracking-[-0.02em] text-white lg:text-[40px]/[1.25]">
            We&apos;re not experts on struggle because we studied it.
            <br />
            We&apos;re experts because we{" "}
            <span className="script text-[36px] text-[#A9B4E8] lg:text-[52px]">lived</span> it.
          </div>
          <div className="mx-auto max-w-[640px] text-[16px]/[1.7] text-white/75 lg:text-[18px]">
            &ldquo;We don&apos;t ask what&apos;s wrong with you. We ask what
            happened to you - and how we can help.&rdquo;
          </div>
          <div className="text-[14px] font-bold tracking-[.08em] text-[#8FBCF0]">
            - BRIAN REINHART, CO-FOUNDER
          </div>
        </div>
      </section>

      {/* POSITION OF NEUTRALITY */}
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(320px,560px)] lg:gap-[72px] lg:px-6 lg:py-[110px]">
          <div className="flex flex-col gap-5">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Flagship program
            </div>
            <div className="text-[34px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.12]">
              Position of Neutrality
            </div>
            <div className="text-[17px]/[1.75] text-ink-600">
              Founded by Joe McDonald, Position of Neutrality teaches members to
              find steady ground before rebuilding - the Internal Self
              Evaluation (ISE) curriculum, eight courses that move from surviving
              to deciding to becoming.
            </div>
            <div className="text-[17px]/[1.75] text-ink-600">
              Delivered through our centers and inside the member app, with
              mentors alongside every step.
            </div>
            <div className="mt-1.5 flex gap-4">
              <a
                href="https://positionofneutrality.org"
                target="_blank"
                rel="noopener"
                className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-blue-primary px-5 text-[15px] font-bold text-blue-primary hover:bg-sky-tint sm:w-auto sm:px-[30px] sm:text-base"
              >
                positionofneutrality.org ↗
              </a>
            </div>
          </div>
          <div className="aspect-video overflow-hidden rounded-2xl bg-navy-deep shadow-[0_2px_10px_rgba(11,37,69,.12)]">
            <iframe
              src="https://www.youtube.com/embed/ws7TGP2QtSE"
              title="Position of Neutrality - Joe McDonald"
              className="h-full w-full border-0"
              loading="lazy"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-sky-tint bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-5 py-16 text-center lg:grid-cols-4 lg:gap-8 lg:px-6 lg:py-[90px]">
          {[
            { n: "15,000+", l: "people mentored", green: false },
            {
              n: "6,000+",
              l: "families touched by generational change",
              green: false,
            },
            { n: "200+", l: "members reintegrated", green: false },
            { n: "90%", l: "program success rate", green: true },
          ].map((s) => (
            <div key={s.l}>
              <div
                className={
                  "tnum text-[40px] font-extrabold tracking-[-0.02em] lg:text-[56px] " +
                  (s.green ? "text-success" : "text-blue-primary")
                }
              >
                {s.n}
              </div>
              <div className="mt-2 text-[15px] font-medium text-ink-600">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* THE RECOVERY COMMUNITY (expanded community teaser) */}
      <CommunityTeaser />

      {/* PLATFORM AT A GLANCE */}
      <PlatformAtAGlance />

      {/* SOCIAL WALL */}
      <SocialWall />

      {/* EMPLOYER BAND */}
      <EmployerBand />

      {/* FAQ */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[900px] px-5 py-16 lg:px-6 lg:py-[110px]">
          <div className="text-center">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              FAQ
            </div>
            <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
              Questions, <span className="script text-[42px] lg:text-[56px]">answered</span>
            </h2>
          </div>
          <div className="mt-10 flex flex-col gap-3.5 lg:mt-[52px]">
            {FAQ.map((f, i) => (
              <details
                key={f.q}
                open={i === 0}
                className="rounded-2xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:px-8 lg:py-[26px]"
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

const FAQ = [
  {
    q: "Where does my donation actually go?",
    a: (
      <>
        When you give to a member, your gift splits 50/50: half becomes cash
        they collect at our outreach centers with their member ID card -
        whether they&apos;re unhoused or currently incarcerated - and half is
        held as their Reentry Fund, released directly to them when they
        re-enter society.
      </>
    ),
  },
  {
    q: "How does QR Code Giving work?",
    a: (
      <>
        Every member carries a personal QR code. Scan it with your phone camera
        and you land on their giving page - their story, their goals, and a
        secure checkout. Your gift reaches them in under a minute, split 50/50
        - half now, half held for their reentry.{" "}
        <Link href="/give" className="font-bold text-blue-primary">
          See Danielle&apos;s page →
        </Link>
      </>
    ),
  },
  {
    q: "Is my donation tax-deductible?",
    a: (
      <>
        My Struggle is a 501(c)(3) nonprofit. You&apos;ll receive a receipt by
        email for every gift; deductibility details for member-directed gifts
        are included on the receipt.
      </>
    ),
  },
  {
    q: "How do I become a mentor?",
    a: (
      <>
        Apply in five minutes - a center coordinator calls you within a week.
        Lived experience is the qualification; we provide training, the mentor
        app, and staff support.{" "}
        <Link href="/mentor" className="font-bold text-blue-primary">
          Start your application →
        </Link>
      </>
    ),
  },
];

/* ---------------------------------------------------------------- */
/* THE CONTINUUM OF CARE - the platform thesis on the home page      */
/* ---------------------------------------------------------------- */

const CONTINUUM_STAGES = [
  {
    key: "BEFORE CARE",
    tag: "PRE-CENTER",
    icon: Users,
    accent: "#2E7CD6",
    lines: [
      "Joins the community from a QR flyer, sets goals, the Guide checks in.",
      "Recovery capital measured before day one.",
    ],
  },
  {
    key: "IN A PROGRAM",
    tag: "IN-CENTER",
    icon: Activity,
    accent: "#4E5B9B",
    lines: [
      "Program group channels, courses, streaks, mentor sessions.",
      "Engagement measured the same inside and out.",
    ],
  },
  {
    key: "AFTER CARE",
    tag: "POST-CENTER",
    icon: HomeIcon,
    accent: "#12B76A",
    lines: [
      "Housed, working, still posting wins; 30 / 60 / 90-day check-ins.",
      "A center sees the whole arc.",
    ],
  },
];

/** Rising engagement rail spanning the three stages (sky-tint→blue→indigo→green). */
function ContinuumRail() {
  return (
    <div className="w-full">
      <svg
        viewBox="0 0 600 70"
        className="h-auto w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="One continuous engagement timeline rising from before care, through a program, to after care."
      >
        <defs>
          <linearGradient id="ms-cont-rail" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8FBCF0" />
            <stop offset="42%" stopColor="#2E7CD6" />
            <stop offset="72%" stopColor="#4E5B9B" />
            <stop offset="100%" stopColor="#12B76A" />
          </linearGradient>
        </defs>
        <path
          d="M20,58 C150,58 150,40 300,34 C450,28 470,18 580,12"
          fill="none"
          stroke="url(#ms-cont-rail)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {[
          { x: 20, y: 58, c: "#8FBCF0" },
          { x: 300, y: 34, c: "#2E7CD6" },
          { x: 580, y: 12, c: "#12B76A" },
        ].map((d) => (
          <circle
            key={d.x}
            cx={d.x}
            cy={d.y}
            r="6"
            fill="#0B2545"
            stroke={d.c}
            strokeWidth="3.5"
          />
        ))}
      </svg>
    </div>
  );
}

function TheContinuum() {
  return (
    <section className="relative overflow-hidden bg-navy-deep">
      <div className="absolute -top-6 left-8 hidden whitespace-nowrap text-[180px]/[1] font-extrabold tracking-[-0.02em] text-white/[.04] lg:block">
        CONTINUUM
      </div>
      <div className="relative mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
        <div className="mx-auto max-w-[760px] text-center">
          <div className="text-[12px] font-bold uppercase tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
            The continuum of care
          </div>
          <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-white lg:text-[48px]/[1.1]">
            We stay with people before, during, and after a{" "}
            <span className="script text-[44px] text-[#A9B4E8] lg:text-[60px]">
              center
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-[640px] text-base/[1.7] text-white/75 lg:text-[17px]">
            Recovery doesn&apos;t start at intake or end at discharge. My
            Struggle follows a person&apos;s engagement from their first day in
            the community, through their program, and for years after - one
            continuous record.
          </p>
        </div>

        {/* rising engagement rail */}
        <div className="mx-auto mt-10 max-w-[900px] lg:mt-[52px]">
          <ContinuumRail />
        </div>

        {/* three connected stage panels */}
        <div className="mt-6 flex flex-col gap-4 lg:mt-8 lg:flex-row lg:items-stretch lg:gap-3">
          {CONTINUUM_STAGES.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="flex flex-1 items-stretch lg:contents"
              >
                <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/[.06] p-6 lg:p-7">
                  <div
                    className="mb-4 h-1 w-12 rounded-full"
                    style={{ backgroundColor: s.accent }}
                  />
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
                      style={{ backgroundColor: s.accent }}
                    >
                      <Icon size={18} className="text-white" strokeWidth={2.2} />
                    </span>
                    <div>
                      <div className="text-[11px] font-bold tracking-[.1em] text-white/50">
                        {s.tag}
                      </div>
                      <div className="text-[17px] font-extrabold tracking-[-0.01em] text-white lg:text-[18px]">
                        {s.key}
                      </div>
                    </div>
                  </div>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {s.lines.map((l) => (
                      <li
                        key={l}
                        className="flex gap-2.5 text-[14px]/[1.6] text-white/85"
                      >
                        <span
                          className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full"
                          style={{ backgroundColor: s.accent }}
                        />
                        {l}
                      </li>
                    ))}
                  </ul>
                </div>
                {i < CONTINUUM_STAGES.length - 1 && (
                  <div className="hidden items-center px-1 lg:flex">
                    <ArrowRight size={22} className="text-white/35" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-[680px] text-center text-[16px]/[1.6] font-semibold text-white lg:mt-10 lg:text-[18px]">
          Every post, lesson, session, and gift becomes a point on one timeline.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
          <Link
            href="/centers"
            className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
            style={{ color: "#fff" }}
          >
            How it works for centers <ArrowRight size={16} />
          </Link>
          <Link
            href="/community"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-white/85 bg-[rgba(11,37,69,.35)] px-[34px] text-base font-bold text-white hover:bg-white/[.12] sm:w-auto"
            style={{ color: "#fff", borderColor: "rgba(255,255,255,.85)" }}
          >
            Join the community →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* PLATFORM AT A GLANCE - every surface, linked                      */
/* ---------------------------------------------------------------- */

const SURFACES = [
  {
    icon: Smartphone,
    title: "Member app",
    desc: "Courses, streaks, goals, mentor chat, and the community feed - in a pocket.",
    href: "/member-app",
  },
  {
    icon: Compass,
    title: "Mentor app",
    desc: "Message members, log mood check-ins, and quietly escalate concern to the care team.",
    href: "/mentor-app",
  },
  {
    icon: LayoutDashboard,
    title: "Center dashboard",
    desc: "Live KPIs, roster, moderation queue, giving desk, and outcome reports in one place.",
    href: "/dashboard",
  },
  {
    icon: HeartHandshake,
    title: "Public giving page",
    desc: "Scan a member's QR code and give directly - half cash now, half held for reentry.",
    href: "/give",
  },
];

function PlatformAtAGlance() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
        <div className="mx-auto max-w-[680px] text-center">
          <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
            One platform, every surface
          </div>
          <h2 className="mt-3.5 text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
            Platform at a{" "}
            <span className="script text-[44px] lg:text-[60px]">glance</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-base/[1.7] text-ink-600 lg:text-[17px]">
            The whole thing is explorable right now - nothing hidden. Open any
            screen and look around.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-[56px] lg:grid-cols-4 lg:gap-6">
          {SURFACES.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.title}
                href={s.href}
                className="flex flex-col rounded-2xl border border-sky-tint bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:bg-sky-tint hover:shadow-[0_8px_24px_rgba(11,37,69,.1)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#4E5B9B,#2E7CD6)] shadow-[0_4px_12px_rgba(46,124,214,.28)]">
                  <Icon size={20} className="text-white" strokeWidth={2.1} />
                </span>
                <div className="mt-4 text-[19px] font-bold text-ink-900">
                  {s.title}
                </div>
                <p className="mt-2 flex-1 text-[14px]/[1.65] text-ink-600">
                  {s.desc}
                </p>
                <span className="mt-4 inline-flex min-h-[24px] items-center gap-1.5 text-[15px] font-bold text-blue-primary">
                  Open <ArrowRight size={15} />
                </span>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[13px] font-medium text-ink-400">
          Explore the demo - logins on each screen.
        </p>
      </div>
    </section>
  );
}

function EmployerBand() {
  return (
    <section className="bg-navy-deep">
      <div className="mx-auto max-w-[1000px] px-5 py-16 text-center lg:px-6 lg:py-[90px]">
        <div className="text-[12px] font-bold uppercase tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
          For employers
        </div>
        <h2 className="mx-auto mt-4 max-w-[720px] text-[30px]/[1.15] font-extrabold tracking-[-0.02em] text-white lg:text-[40px]/[1.1]">
          Hire people who show{" "}
          <span className="script text-[38px] text-[#A9B4E8] lg:text-[50px]">up</span>.
        </h2>
        <p className="mx-auto mt-4 max-w-[560px] text-[16px]/[1.7] text-white/80 lg:text-[17px]">
          Post jobs and opportunities directly to our recovery community.
          Fair-chance employers change lives here - reach members building
          their next chapter, ready to work.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <a
            href="mailto:info@themystruggles.com?subject=Posting%20jobs%20to%20the%20community"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.4)] hover:bg-blue-hover sm:w-auto"
            style={{ color: "#fff" }}
          >
            Contact us to post jobs
          </a>
          <span
            title="Employer accounts are on our roadmap"
            className="inline-flex h-[52px] w-full cursor-default items-center justify-center rounded-full border-[1.5px] border-white/70 px-[34px] text-base font-bold text-white/90 sm:w-auto"
            style={{ color: "rgba(255,255,255,.9)", borderColor: "rgba(255,255,255,.7)" }}
          >
            Employer dashboard - coming soon
          </span>
        </div>
      </div>
    </section>
  );
}

const COMMUNITY_FEATURES = [
  {
    icon: MessagesSquare,
    title: "Share your journey",
    desc: "A feed for wins and milestones, honest hard days, and asking for support - met by people who get it.",
  },
  {
    icon: Users,
    title: "Circles",
    desc: "Job Seekers, New in Recovery, Parents in Recovery, and center alumni - smaller rooms for your people.",
  },
  {
    icon: LifeBuoy,
    title: "Support board",
    desc: "Raise a hand for rent, work boots, or a bus pass - donors give directly to the need.",
  },
  {
    icon: ShieldCheck,
    title: "Safe by design",
    desc: "Crisis language is held for a human, every space is staff-moderated, and 988 is always one tap away.",
  },
];

function CommunityTeaser() {
  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
        <div className="mx-auto flex max-w-[720px] flex-col items-center gap-3.5 text-center">
          <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
            The recovery community
          </div>
          <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[48px]/[1.1]">
            A community that follows you into the{" "}
            <span className="script text-[44px] text-indigo-brand lg:text-[60px]">
              world
            </span>
          </h2>
          <div className="max-w-[620px] text-base/[1.7] text-ink-600 lg:text-[17px]">
            A recovery-first, moderated, peer network. Members and mentors share
            wins, jobs, and housing leads, join circles for their people, and
            ask for support - and anyone can give directly.
          </div>
        </div>

        {/* feature row */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:mt-[52px] lg:grid-cols-4 lg:gap-6">
          {COMMUNITY_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="flex flex-col rounded-2xl border border-sky-tint bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-tint">
                  <Icon size={20} className="text-blue-primary" strokeWidth={2.1} />
                </span>
                <div className="mt-4 text-[17px] font-bold text-ink-900">
                  {f.title}
                </div>
                <p className="mt-2 text-[14px]/[1.65] text-ink-600">{f.desc}</p>
              </div>
            );
          })}
        </div>

        {/* sample posts */}
        <div className="mt-6 text-center text-[11px] font-bold uppercase tracking-[.1em] text-ink-400 lg:mt-10">
          A look at the feed
        </div>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3 lg:gap-6">
          {/* Win post */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-tint text-[11px] font-extrabold text-indigo-brand">
                DM
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-ink-900">
                  Danielle M.
                </div>
                <div className="text-[11px] text-ink-400">Member · 2h ago</div>
              </div>
              <span className="ml-auto inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-bold tracking-[.06em] text-blue-primary">
                WIN
              </span>
            </div>
            <div className="mt-3 text-[14px]/[1.6] text-ink-900">
              Eight months in transitional housing and today I signed the lease
              on my own place. My mentor was my first call.
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-ink-400">
              <Heart size={12} className="text-blue-primary" /> 214 cheering
              her on
            </div>
          </div>

          {/* Jobs post */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-tint text-[11px] font-extrabold text-indigo-brand">
                MT
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-ink-900">
                  Marcus T.
                </div>
                <div className="text-[11px] text-ink-400">Mentor · 1d ago</div>
              </div>
              <span className="ml-auto inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-bold tracking-[.06em] text-blue-primary">
                JOBS
              </span>
            </div>
            <div className="mt-3 text-[14px]/[1.6] text-ink-900">
              A warehouse in Laveen is hiring - second-chance friendly, weekly
              pay, on the bus line. I can walk you through the application.
            </div>
            <div className="mt-3 text-[12px] font-bold text-blue-primary">
              3 members connected →
            </div>
          </div>

          {/* Support request */}
          <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-tint text-[11px] font-extrabold text-indigo-brand">
                JR
              </span>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-ink-900">
                  James R.
                </div>
                <div className="text-[11px] text-ink-400">Member · 3h ago</div>
              </div>
              <span className="ml-auto inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[10px] font-bold tracking-[.06em] text-blue-primary">
                SUPPORT
              </span>
            </div>
            <div className="mt-3 text-[14px]/[1.6] text-ink-900">
              A monthly bus pass gets me to my new job and back - $64 covers
              the whole month.
            </div>
            <div className="mt-3.5">
              <div className="flex justify-between text-[12px] font-semibold text-ink-900">
                <span>Bus pass · $64</span>
                <span className="tnum text-blue-primary">$41 raised</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sky-tint">
                <div className="h-full w-[64%] rounded-full bg-[linear-gradient(90deg,#4E5B9B,#2E7CD6)]" />
              </div>
            </div>
            <div className="mt-3">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-blue-primary px-4 text-[12px] font-bold text-white">
                Give <Heart size={11} fill="currentColor" />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4 lg:mt-[52px]">
          <Link
            href="/community"
            className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-blue-primary px-[34px] text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover sm:w-auto"
          >
            Visit the community →
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-[52px] w-full items-center justify-center rounded-full border-[1.5px] border-blue-primary px-[34px] text-base font-bold text-blue-primary hover:bg-sky-tint sm:w-auto"
          >
            Create your account
          </Link>
        </div>
      </div>
    </section>
  );
}

function SocialWall() {
  const cards = [
    {
      tag: "IG",
      handle: "@themystruggle",
      when: "2 days ago",
      href: "https://www.instagram.com",
      cap: "GED celebration",
      img: "/ged-celebration.png",
      video: false,
      body: (
        <>
          Danielle got her GED today. The whole center stopped to cheer.{" "}
          <span className="text-blue-primary">#EndTheStruggle</span>
        </>
      ),
    },
    {
      tag: "MS",
      handle: "My Struggle",
      when: "4 days ago",
      href: "/community",
      cap: "Pantry restock day",
      img: "/pantry-restock.png",
      video: false,
      body: "The pantry shelves are stocked - thank you to everyone who donated items this month.",
    },
    {
      tag: "TT",
      handle: "@themystruggle",
      when: "1 week ago",
      href: "https://www.tiktok.com",
      cap: "video: a day at Laveen Center",
      img: null,
      video: "dark",
      body: '"How can I help you?" - what one question sounds like in real life.',
    },
    {
      tag: "YT",
      handle: "My Struggle",
      when: "2 weeks ago",
      href: "https://www.youtube.com",
      cap: "video: Joe McDonald on PON",
      img: null,
      video: "blue",
      body: "Position of Neutrality: the founder story, in Joe's own words.",
    },
  ];
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[110px]">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
            Social wall
          </div>
          <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.1]">
            Follow the <span className="script text-[42px] lg:text-[56px]">journey</span>
          </h2>
          <div className="text-base text-ink-600">
            Wins, reunions, and center life - @themystruggle everywhere.
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:mt-[52px] lg:grid-cols-4">
          {cards.map((c) => (
            <a
              key={c.tag}
              href={c.href}
              target="_blank"
              rel="noopener"
              className="block overflow-hidden rounded-2xl border border-sky-tint bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:shadow-[0_8px_24px_rgba(11,37,69,.12)]"
            >
              <div className="flex items-center gap-2.5 p-4">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-tint text-[11px] font-extrabold text-indigo-brand">
                  {c.tag}
                </span>
                <div>
                  <div className="text-[12px] font-bold text-ink-900">
                    {c.handle}
                  </div>
                  <div className="text-[11px] text-ink-400">{c.when}</div>
                </div>
              </div>
              <div
                className={
                  "relative flex aspect-square items-end bg-cover bg-center p-2.5 " +
                  (c.img ? "" : "photo-ph")
                }
                style={c.img ? { backgroundImage: `url('${c.img}')` } : undefined}
              >
                {c.video && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={
                        "flex h-11 w-11 items-center justify-center rounded-full " +
                        (c.video === "blue"
                          ? "bg-blue-primary shadow-[0_4px_14px_rgba(11,37,69,.3)]"
                          : "bg-navy-deep/75")
                      }
                    >
                      <div className="ml-1 h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-white" />
                    </div>
                  </div>
                )}
                {!c.img && (
                  <span className="photo-cap relative text-[10px]">
                    {c.video ? c.cap : `photo: ${c.cap}`}
                  </span>
                )}
              </div>
              <div className="p-4 text-[13px]/[1.5] font-medium text-ink-900">
                {c.body}
              </div>
            </a>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {["Instagram", "TikTok", "YouTube", "LinkedIn"].map(
            (p) => (
              <span
                key={p}
                className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-[22px] text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
              >
                {p}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}
