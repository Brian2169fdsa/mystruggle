import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  ShieldCheck,
  Lock,
  Users,
  BarChart3,
  LifeBuoy,
  KeyRound,
  HandCoins,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";

export const metadata: Metadata = {
  title: "Privacy Policy · My Struggle",
  description:
    "How My Struggle protects your account, giving activity, community posts, self-checks, and care-channel messages — in plain language.",
};

const LAST_UPDATED = "July 6, 2026";

/** One collected-data category card. */
function CollectRow({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:p-7">
      <div className="text-[16px] font-bold text-ink-900">{title}</div>
      <p className="mt-2 text-[15px]/[1.7] text-ink-600">{body}</p>
    </div>
  );
}

/** A titled prose block with an icon chip — the page's main section rhythm. */
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

export default function Privacy() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="relative flex min-h-[360px] items-center overflow-hidden bg-[repeating-linear-gradient(45deg,#DFEAF9_0_14px,#D2E2F5_14px_28px)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,37,69,.94)_0%,rgba(11,37,69,.62)_60%,rgba(11,37,69,.28)_100%)]" />
        <div className="relative mx-auto flex w-full max-w-[1000px] flex-col gap-4 px-5 py-16 lg:px-6 lg:py-20">
          <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
            PRIVACY POLICY
          </div>
          <h1 className="max-w-[760px] text-[clamp(34px,4.4vw,54px)]/[1.08] font-extrabold tracking-[-0.02em] text-white">
            Your story stays{" "}
            <span className="script text-[1.24em] text-[#A9B4E8]">yours</span>
          </h1>
          <p className="max-w-[620px] text-[16px]/[1.7] text-white/80">
            Recovery is trusted with some of the most personal details of a
            person&apos;s life. This page explains, in plain language, what we
            collect, how we protect it, and the choices you always keep.
          </p>
          <div className="text-[13px] font-medium text-white/60">
            Last updated {LAST_UPDATED}
          </div>
        </div>
      </section>

      {/* PROMISE INTRO */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1000px] px-5 py-12 lg:px-6 lg:py-16">
          <p className="text-[18px]/[1.75] text-ink-600 lg:text-[19px]/[1.8]">
            My Struggle is a nonprofit peer-mentorship platform (EST. 2021,
            Laveen, Arizona). We built this platform so people can heal in
            community — which only works if members trust us with the truth.
            That trust is the product. We designed our systems around three
            rules you&apos;ll see throughout this page:{" "}
            <strong className="text-ink-900">
              nothing that identifies you leaves the center you consented to
            </strong>
            ,{" "}
            <strong className="text-ink-900">
              research only ever uses de-identified aggregates
            </strong>
            , and{" "}
            <strong className="text-ink-900">
              we never sell your personal information
            </strong>
            .
          </p>
        </div>
      </section>

      {/* WHAT WE COLLECT */}
      <section className="border-y border-sky-tint bg-white">
        <div className="mx-auto max-w-[1000px] px-5 py-14 lg:px-6 lg:py-[90px]">
          <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
            What we collect
          </div>
          <h2 className="mt-3 max-w-[720px] text-[30px]/[1.14] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[38px]/[1.12]">
            Only what helps you move forward
          </h2>
          <p className="mt-4 max-w-[680px] text-[16px]/[1.75] text-ink-600">
            You share information when you create an account and as you use the
            community, tools, and care channels. Here is the full picture.
          </p>
          <div className="mt-9 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <CollectRow
              title="Account information"
              body="Your name or chosen display name, email or phone, sign-in credentials, the center you're connected to, and your role — member, mentor, or center staff."
            />
            <CollectRow
              title="Giving activity"
              body="Gifts you send or receive, the 50/50 split between cash and your Reentry Fund, and the balance held for re-entry. Payment card details are handled by our payment processor — we don't store full card numbers."
            />
            <CollectRow
              title="Community posts"
              body="What you share in the feed and circles — wins, reflections, comments, reactions, and any photos you choose to upload."
            />
            <CollectRow
              title="Self-checks & BARC"
              body="Your recovery self-assessments, including BARC-style check-ins, streaks, goals, and journey milestones you track over time."
            />
            <CollectRow
              title="Care-channel messages"
              body="Messages between you and your mentor or center in the platform's private care channels, so your support team can walk beside you."
            />
            <CollectRow
              title="Device & usage basics"
              body="Standard technical data — device type, app version, and general activity — used to keep the platform secure, reliable, and accessible."
            />
          </div>
        </div>
      </section>

      {/* HOW WE USE IT */}
      <Block
        icon={ShieldCheck}
        eyebrow="How we use it"
        title="To help, not to profit"
      >
        <p className="m-0">
          We use your information to run the platform and support your journey:
          to connect you with a mentor and center, power your self-checks and
          goals, deliver gifts and track your Reentry Fund, keep the community
          safe, and let your care team reach you.
        </p>
        <p className="m-0">
          We use de-identified, aggregated information to understand what&apos;s
          working across the community and to improve our programs. We do not
          use your identifiable information to advertise to you, and we do not
          build profiles to sell.
        </p>
      </Block>

      {/* CONSENT-GATED CENTER ACCESS */}
      <Block
        icon={Lock}
        eyebrow="Consent-gated access"
        title={
          <>
            Identifiable data never leaves your{" "}
            <span className="script text-[1.15em]">center</span>
          </>
        }
      >
        <p className="m-0">
          When you join, you consent to a specific center. The people who can
          see information that identifies you — your name, your messages, your
          check-ins — are the mentors and staff at{" "}
          <strong className="text-ink-900">that center</strong>, and only while
          your consent is active.
        </p>
        <p className="m-0">
          Your identifiable record does not travel to other centers, partners,
          or third parties as part of normal operations. If your journey ever
          moves to a new center, that transfer happens only with your consent.
        </p>
        <div className="rounded-2xl bg-sky-tint/60 p-5 text-[15px]/[1.7] text-ink-600">
          <strong className="text-navy-deep">Care-team view.</strong> Mentors
          and center staff see what they need to support you and nothing
          designed to expose you. Access follows your consent — revoke it and
          that access ends.
        </div>
      </Block>

      {/* AGGREGATE RESEARCH + OPT-OUT */}
      <Block
        icon={BarChart3}
        eyebrow="Research & learning"
        title="Aggregate insight, never individual exposure"
      >
        <p className="m-0">
          Understanding recovery at scale helps every member who comes next. To
          do that responsibly, any research or reporting uses{" "}
          <strong className="text-ink-900">de-identified</strong> data —
          stripped of the details that point to a person — and is only ever
          reported in <strong className="text-ink-900">aggregate</strong>.
        </p>
        <p className="m-0">
          We apply a small-group protection rule (a{" "}
          <strong className="text-ink-900">k ≥ 11</strong> threshold): no
          statistic is shown for a group smaller than 11 people, so results can
          never be traced back to one individual. You are always counted in the
          crowd, never singled out.
        </p>
        <div className="rounded-2xl border border-sky-tint bg-white p-5 text-[15px]/[1.7] text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <strong className="text-navy-deep">Your opt-out.</strong> Even though
          research data can&apos;t identify you, you can still ask us to leave
          your information out of de-identified research and aggregate reporting
          entirely. Reach out through the{" "}
          <Link href="/about" className="font-semibold text-blue-primary underline underline-offset-2">
            contact form
          </Link>{" "}
          or email <span className="font-semibold">privacy@themystruggles.com</span>{" "}
          <span className="text-ink-400">(placeholder)</span> and we&apos;ll
          honor it.
        </div>
      </Block>

      {/* CRISIS CONTENT / 988 */}
      <section className="bg-navy-deep">
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-6 px-5 py-14 lg:grid-cols-[minmax(220px,300px)_1fr] lg:gap-14 lg:px-6 lg:py-[80px]">
          <div>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-[#8FBCF0]">
              <LifeBuoy size={21} strokeWidth={2} />
            </span>
            <div className="mt-4 text-[12px] font-bold uppercase tracking-[.12em] text-[#8FBCF0]">
              Crisis content
            </div>
            <h2 className="mt-2 text-[26px]/[1.15] font-extrabold tracking-[-0.02em] text-white lg:text-[30px]/[1.14]">
              When a moment turns urgent
            </h2>
          </div>
          <div className="flex flex-col gap-[18px] text-[16px]/[1.75] text-white/80 lg:pt-1">
            <p className="m-0">
              Some of what people share here is heavy. Our care channels and
              community include safety screening that can flag content
              suggesting someone may be in crisis, so a person can be pointed
              toward immediate help.
            </p>
            <p className="m-0">
              If you or someone you care about is in danger, don&apos;t wait for
              the platform. Call or text{" "}
              <strong className="text-white">988</strong> — the Suicide &amp;
              Crisis Lifeline — or call 911. My Struggle is peer support and
              community, not an emergency or clinical service.
            </p>
            <div className="rounded-2xl bg-white/[.06] p-5 text-[15px]/[1.7] text-white/75">
              Crisis flags exist to keep people safe. We handle this content with
              care and limit who sees it to those able to help. Reasonable steps
              to protect life may involve your consented care team.
            </div>
          </div>
        </div>
      </section>

      {/* YOUR RIGHTS */}
      <Block
        icon={KeyRound}
        eyebrow="Your data rights"
        title="You stay in control"
      >
        <p className="m-0">
          This is your information. You can exercise these rights at any time:
        </p>
        <ul className="m-0 flex flex-col gap-3 pl-0">
          {[
            [
              "Access",
              "Ask for a copy of the information we hold about you.",
            ],
            [
              "Correct",
              "Fix anything that's out of date or wrong.",
            ],
            [
              "Revoke consent",
              "Withdraw your consent to a center's access at any time — that access ends.",
            ],
            [
              "Opt out of research",
              "Remove your data from de-identified aggregate research.",
            ],
            [
              "Delete",
              "Ask us to delete your account and personal information, subject to limited legal or safety obligations we'll always explain.",
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
          To make any of these requests, use the{" "}
          <Link href="/about" className="font-semibold text-blue-primary underline underline-offset-2">
            contact form
          </Link>
          , email{" "}
          <span className="font-semibold text-ink-900">
            privacy@themystruggles.com
          </span>{" "}
          <span className="text-ink-400">(placeholder)</span>, or call{" "}
          <a href="tel:6024025121" className="font-semibold text-blue-primary">
            602-402-5121
          </a>
          .
        </p>
      </Block>

      {/* NO SALE */}
      <Block
        icon={HandCoins}
        eyebrow="No sale of data"
        title="We do not sell your personal information"
      >
        <p className="m-0">
          Full stop. We do not sell, rent, or trade your personal information,
          and we never will. We share identifiable information only with your
          consented care team, with service providers who help us run the
          platform under strict confidentiality (such as our payment
          processor), or where the law requires it.
        </p>
        <p className="m-0">
          As a nonprofit, we exist to serve members — not to monetize them.
        </p>
      </Block>

      {/* PEOPLE WE SERVE */}
      <Block
        icon={Users}
        eyebrow="Community & minors"
        title="A safe space for the people we serve"
      >
        <p className="m-0">
          The platform is built for adults in recovery, their mentors, and
          center teams. It is not directed to children. If you believe a minor
          has provided us information without appropriate consent, contact us
          and we&apos;ll address it promptly.
        </p>
        <p className="m-0">
          We may update this policy as the platform grows. When we make
          meaningful changes, we&apos;ll update the date above and, where
          appropriate, let you know in the platform.
        </p>
      </Block>

      {/* COUNSEL NOTE */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1000px] px-5 py-10 lg:px-6 lg:py-14">
          <div className="rounded-2xl border border-sky-tint bg-white p-6 text-[14px]/[1.7] text-ink-400 lg:p-7">
            <strong className="text-ink-600">A note on this template.</strong>{" "}
            This privacy policy is written in plain language to reflect how My
            Struggle actually handles data. It is a starting template and{" "}
            <strong className="text-ink-600">
              should be reviewed and finalized by qualified legal counsel
            </strong>{" "}
            before it is relied upon as a binding legal document, including for
            any state or federal privacy obligations that apply to the
            organization.
          </div>
        </div>
      </section>

      {/* CONTACT BAND */}
      <section className="bg-sky-tint">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-8 px-5 py-12 lg:gap-10 lg:px-6 lg:py-16">
          <div>
            <div className="text-[24px] font-extrabold tracking-[-0.02em] text-navy-deep lg:text-[28px]">
              Questions about your privacy?
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
