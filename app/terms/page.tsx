import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  HeartHandshake,
  HandCoins,
  ShieldAlert,
  Users,
  Gavel,
  DoorOpen,
  LifeBuoy,
} from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";

export const metadata: Metadata = {
  title: "Terms of Service · My Struggle",
  description:
    "The plain-language agreement for using the My Struggle community — dignity, the 50/50 Reentry Fund giving model, conduct, moderation, and safety.",
};

const LAST_UPDATED = "July 6, 2026";

/** A titled prose block with an icon chip — the page's section rhythm. */
function Block({
  icon: Icon,
  eyebrow,
  title,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-sky-tint bg-white first:border-t-0">
      <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-6 px-5 py-12 lg:grid-cols-[minmax(220px,300px)_1fr] lg:gap-14 lg:px-6 lg:py-[70px]">
        <div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-tint text-blue-primary">
            <Icon size={21} strokeWidth={2} />
          </span>
          <div className="mt-4 text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-[26px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[30px]/[1.14]">
            {title}
          </h2>
        </div>
        <div className="flex flex-col gap-[18px] text-[16px]/[1.75] text-ink-600 lg:pt-1">
          {children}
        </div>
      </div>
    </section>
  );
}

export default function Terms() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="relative flex min-h-[360px] items-center overflow-hidden bg-[repeating-linear-gradient(45deg,#DFEAF9_0_14px,#D2E2F5_14px_28px)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,37,69,.94)_0%,rgba(11,37,69,.62)_60%,rgba(11,37,69,.28)_100%)]" />
        <div className="relative mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-5 py-16 lg:px-6 lg:py-20">
          <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
            TERMS OF SERVICE
          </div>
          <h1 className="max-w-[760px] text-[clamp(34px,4.4vw,54px)]/[1.08] font-extrabold tracking-[-0.02em] text-white">
            A community built on{" "}
            <span className="script text-[1.24em] text-[#A9B4E8]">dignity</span>
          </h1>
          <p className="max-w-[620px] text-[16px]/[1.7] text-white/80">
            These terms are the agreement between you and My Struggle. They keep
            the community safe and explain how giving, mentorship, and your
            account work — in plain language, not fine print.
          </p>
          <div className="text-[13px] font-medium text-white/60">
            Last updated {LAST_UPDATED}
          </div>
        </div>
      </section>

      {/* INTRO */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1000px] px-5 py-12 lg:px-6 lg:py-16">
          <p className="text-[18px]/[1.75] text-ink-600 lg:text-[19px]/[1.8]">
            My Struggle is a nonprofit peer-mentorship platform (EST. 2021,
            Laveen, Arizona). By creating an account or using the platform — the
            website, community, member and mentor apps, and giving pages — you
            agree to these terms. If you don&apos;t agree, please don&apos;t use
            the platform. We may update these terms as the platform grows;
            we&apos;ll change the date above and tell you about meaningful
            updates.
          </p>
        </div>
      </section>

      {/* ACCEPTABLE USE */}
      <Block
        icon={Users}
        eyebrow="Acceptable use"
        title="Treat every person with dignity"
      >
        <p className="m-0">
          The community only works when it&apos;s safe. When you post, comment,
          message, or show up here, you agree to protect that. In this space:
        </p>
        <ul className="m-0 flex flex-col gap-3 pl-0">
          {[
            [
              "Lead with dignity",
              "Everyone here is somewhere on a hard journey. Speak to people the way you'd want to be spoken to on your worst day.",
            ],
            [
              "No harassment or hate",
              "No bullying, threats, harassment, or attacks on anyone based on who they are. No content that endangers a person.",
            ],
            [
              "No solicitation",
              "This isn't a marketplace. Don't sell, promote, recruit, or pitch products, services, or outside programs to members.",
            ],
            [
              "Protect privacy",
              "Don't share other people's identities, stories, images, or recovery details outside the community. What's shared here stays here.",
            ],
            [
              "Keep it honest",
              "Don't impersonate others, misrepresent your role, or use the platform to deceive, defraud, or exploit anyone.",
            ],
          ].map(([label, body]) => (
            <li key={label} className="flex gap-3">
              <span className="mt-2 h-2 w-2 flex-none rounded-full bg-blue-primary" />
              <span>
                <strong className="text-ink-900">{label}.</strong> {body}
              </span>
            </li>
          ))}
        </ul>
        <p className="m-0">
          You&apos;re responsible for what you post. You keep ownership of your
          content, and you give us permission to display it within the platform
          so the community can see and support you.
        </p>
      </Block>

      {/* GIVING / REENTRY FUND */}
      <Block
        icon={HandCoins}
        eyebrow="Giving & the Reentry Fund"
        title={
          <>
            Every gift splits{" "}
            <span className="script text-[1.15em]">50/50</span>
          </>
        }
      >
        <p className="m-0">
          When someone gives to a member — by scanning a QR code or visiting a
          giving page — that gift is divided in half:
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-sky-tint/60 p-6">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-blue-primary">
              50% now
            </div>
            <div className="mt-2 text-[17px] font-bold text-ink-900">
              Cash at a center
            </div>
            <p className="mt-2 text-[15px]/[1.65] text-ink-600">
              Half of every gift goes to the member as cash, made available
              through a My Struggle center — meeting a real need today.
            </p>
          </div>
          <div className="rounded-2xl bg-sky-tint/60 p-6">
            <div className="text-[13px] font-bold uppercase tracking-[.1em] text-blue-primary">
              50% held
            </div>
            <div className="mt-2 text-[17px] font-bold text-ink-900">
              The Reentry Fund
            </div>
            <p className="mt-2 text-[15px]/[1.65] text-ink-600">
              The other half is held as the member&apos;s Reentry Fund and
              released on their re-entry to society — a foundation for the next
              chapter.
            </p>
          </div>
        </div>
        <p className="m-0">
          Reentry Fund balances are held and released according to program
          guidelines tied to a member&apos;s re-entry. Gifts to a nonprofit are
          generally non-refundable. Card payments are processed by our payment
          partner; by giving, you authorize that charge. My Struggle is a
          501(c)(3) nonprofit — donation tax treatment depends on your
          situation, so keep your receipt and consult a tax professional.
        </p>
      </Block>

      {/* MENTOR / MEMBER CONDUCT */}
      <Block
        icon={HeartHandshake}
        eyebrow="Mentor & member conduct"
        title="Walking beside, not above"
      >
        <p className="m-0">
          Mentorship at My Struggle is built on lived experience and trust.
          Mentors walk beside members as peers — not as clinicians, counselors,
          or authorities over someone&apos;s life.
        </p>
        <ul className="m-0 flex flex-col gap-3 pl-0">
          {[
            [
              "Respect boundaries",
              "Mentors don't exploit the trust of a member for money, romantic or sexual attention, labor, or any personal gain.",
            ],
            [
              "Stay in your lane",
              "Peer support is not medical, legal, or financial advice. Encourage members toward qualified professionals when they need them.",
            ],
            [
              "Hold confidence",
              "What a member shares in a care channel or circle is trusted to you. Protect it.",
            ],
            [
              "Show up honestly",
              "Model the recovery you're walking. Mentors and members alike are accountable to this community.",
            ],
          ].map(([label, body]) => (
            <li key={label} className="flex gap-3">
              <span className="mt-2 h-2 w-2 flex-none rounded-full bg-blue-primary" />
              <span>
                <strong className="text-ink-900">{label}.</strong> {body}
              </span>
            </li>
          ))}
        </ul>
      </Block>

      {/* NOT A SUBSTITUTE FOR CARE / 988 */}
      <section className="bg-navy-deep">
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-6 px-5 py-14 lg:grid-cols-[minmax(220px,300px)_1fr] lg:gap-14 lg:px-6 lg:py-[80px]">
          <div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[#8FBCF0]">
              <LifeBuoy size={21} strokeWidth={2} />
            </span>
            <div className="mt-4 text-[12px] font-bold uppercase tracking-[.12em] text-[#8FBCF0]">
              Not emergency or clinical care
            </div>
            <h2 className="mt-2 text-[26px]/[1.15] font-extrabold tracking-[-0.02em] text-white lg:text-[30px]/[1.14]">
              In a crisis, reach real help first
            </h2>
          </div>
          <div className="flex flex-col gap-[18px] text-[16px]/[1.75] text-white/80 lg:pt-1">
            <p className="m-0">
              My Struggle is peer support and community. It is{" "}
              <strong className="text-white">not</strong> a medical, clinical,
              or emergency service, and it is not a substitute for professional
              treatment or advice.
            </p>
            <p className="m-0">
              If you or someone else is in crisis or danger, don&apos;t rely on
              the platform. Call or text{" "}
              <strong className="text-white">988</strong> — the Suicide &amp;
              Crisis Lifeline — or call 911. Always seek qualified professionals
              for medical, legal, or financial matters.
            </p>
          </div>
        </div>
      </section>

      {/* MODERATION */}
      <Block
        icon={ShieldAlert}
        eyebrow="Content moderation"
        title="We keep the space safe"
      >
        <p className="m-0">
          To protect the community, we may review, limit, hide, or remove
          content that breaks these terms or puts someone at risk. Care channels
          and the community include safety screening that can flag content
          suggesting a person may be in crisis, so they can be pointed toward
          help.
        </p>
        <p className="m-0">
          Moderation is done with care and a bias toward the safety and dignity
          of the people here. We aren&apos;t able to review everything, and
          content from members and mentors reflects them, not My Struggle.
        </p>
      </Block>

      {/* TERMINATION */}
      <Block
        icon={DoorOpen}
        eyebrow="Accounts & termination"
        title="Your account, and when access ends"
      >
        <p className="m-0">
          You can close your account at any time. You&apos;re responsible for
          keeping your sign-in secure and for activity under your account.
        </p>
        <p className="m-0">
          We may suspend or end access if someone breaks these terms, harms
          another person, or puts the community at risk — and, where it&apos;s
          safe and appropriate, we&apos;ll try to explain why. Some things
          naturally continue after an account ends, including a member&apos;s
          Reentry Fund handling under program guidelines and any legal or safety
          obligations we&apos;re required to keep.
        </p>
      </Block>

      {/* LEGAL */}
      <Block
        icon={Gavel}
        eyebrow="The legal basics"
        title="A few things we have to say"
      >
        <p className="m-0">
          The platform is provided on an &ldquo;as is&rdquo; basis. We work hard
          to keep it useful, safe, and available, but we can&apos;t guarantee it
          will be uninterrupted or error-free. To the extent the law allows, My
          Struggle isn&apos;t liable for indirect or incidental damages arising
          from use of the platform, and our programs don&apos;t guarantee any
          particular outcome in a person&apos;s recovery.
        </p>
        <p className="m-0">
          These terms are governed by the laws of the State of Arizona. If any
          part is found unenforceable, the rest still applies.
        </p>
        <div className="rounded-2xl border border-sky-tint bg-canvas p-5 text-[14px]/[1.7] text-ink-400">
          <strong className="text-ink-600">A note on this template.</strong>{" "}
          These terms are written in plain language to reflect how My Struggle
          actually operates. They are a starting template and{" "}
          <strong className="text-ink-600">
            should be reviewed and finalized by qualified legal counsel
          </strong>{" "}
          before being relied upon as a binding agreement.
        </div>
      </Block>

      {/* CONTACT BAND */}
      <section className="bg-sky-tint">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 px-5 py-12 lg:gap-10 lg:px-6 lg:py-16">
          <div>
            <div className="text-[24px] font-extrabold tracking-[-0.02em] text-navy-deep lg:text-[28px]">
              Questions about these terms?
            </div>
            <div className="mt-2 text-[15px] font-medium text-ink-600">
              Call 602-402-5121 or reach out through our contact form — a real
              person will help.
            </div>
          </div>
          <Link
            href="/about"
            className="inline-flex h-[52px] w-full flex-none items-center justify-center rounded-full bg-blue-primary px-8 text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover sm:w-auto"
          >
            Contact us
          </Link>
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
