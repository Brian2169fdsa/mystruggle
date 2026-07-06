import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronRight,
  Compass,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Nav from "../../components/Nav";
import { getSessionUser } from "../../lib/auth";
import { toSafeUser } from "../../lib/types";
import CommunityTabBar from "../_components/CommunityTabBar";

export const metadata: Metadata = {
  title: "Menu - Community - My Struggle",
  description:
    "Everything in one place - your profile, circles, events, giving page, and more across the My Struggle community.",
};

type Shortcut = {
  href: string;
  label: string;
  caption: string;
  icon: LucideIcon;
};

/** One big tappable shortcut card (≥44px target, rounded-2xl). */
function ShortcutCard({ s }: { s: Shortcut }) {
  const Icon = s.icon;
  return (
    <Link
      href={s.href}
      className="flex min-h-[104px] flex-col gap-2.5 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(11,37,69,.06)] transition-shadow hover:shadow-[0_4px_14px_rgba(11,37,69,.10)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-sky-tint text-blue-primary">
        <Icon size={19} strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold leading-tight text-ink-900">
          {s.label}
        </span>
        <span className="mt-0.5 block text-[12px]/[1.35] text-ink-600">
          {s.caption}
        </span>
      </span>
    </Link>
  );
}

/**
 * /community/menu - the mobile "Menu" surface reached from the community tab
 * bar. Profile at the top, big shortcut cards to every community destination,
 * small footer links. Works on desktop too (centered, max-w 680px).
 */
export default async function CommunityMenuPage() {
  const sessionUser = await getSessionUser();
  const viewer = sessionUser ? toSafeUser(sessionUser) : null;

  const shortcuts: Shortcut[] = [
    ...(viewer?.slug
      ? [
          {
            href: `/p/${viewer.slug}`,
            label: "My giving page",
            caption: "Your public QR giving page",
            icon: QrCode,
          },
        ]
      : []),
    {
      href: "/community",
      label: "The Community",
      caption: "Wins, gratitude, and honest days",
      icon: MessageCircle,
    },
    {
      href: "/community/circles",
      label: "Circles",
      caption: "Topic and alumni groups",
      icon: Users,
    },
    {
      href: "/community/events",
      label: "Events",
      caption: "Meetings and gatherings near you",
      icon: CalendarDays,
    },
    {
      href: "/community/discover",
      label: "Discover people",
      caption: "Members walking the same road",
      icon: Compass,
    },
    {
      href: "/jobs",
      label: "Jobs board",
      caption: "Recovery-friendly work",
      icon: Briefcase,
    },
    {
      href: "/notifications",
      label: "Notifications",
      caption: "Everything that needs you",
      icon: Bell,
    },
    {
      href: "/member-app",
      label: "Learn",
      caption: "Courses and programs in the member app",
      icon: GraduationCap,
    },
    {
      href: "/give",
      label: "Support requests",
      caption: "Help fund a member's next step",
      icon: HeartHandshake,
    },
    {
      href: "/privacy",
      label: "Privacy",
      caption: "How we protect your story",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      <main className="mx-auto w-full max-w-[680px] px-4 py-6 pb-24 lg:py-10 lg:pb-12">
        <h1 className="px-1 text-[22px] font-extrabold text-navy-deep">Menu</h1>

        {/* Profile card / sign-in card */}
        {viewer ? (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            {viewer.slug ? (
              <Link
                href={`/community/u/${viewer.slug}`}
                className="group flex min-h-[44px] items-center gap-3.5"
              >
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[22px] font-extrabold text-white"
                  style={{ backgroundColor: viewer.avatarColor }}
                >
                  {viewer.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-extrabold text-ink-900">
                    {viewer.name}
                  </span>
                  <span className="mt-0.5 block text-[13px] font-semibold text-blue-primary group-hover:text-blue-hover">
                    See your community profile
                  </span>
                </span>
                <ChevronRight
                  size={18}
                  className="shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            ) : (
              <div className="flex min-h-[44px] items-center gap-3.5">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[22px] font-extrabold text-white"
                  style={{ backgroundColor: viewer.avatarColor }}
                >
                  {viewer.name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-extrabold text-ink-900">
                    {viewer.name}
                  </span>
                  <span className="mt-0.5 block text-[13px] font-semibold text-ink-600">
                    Part of the My Struggle community
                  </span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            <h2 className="text-[16px] font-extrabold text-ink-900">
              You belong here
            </h2>
            <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-ink-600">
              Sign in to see your profile, join circles, and walk alongside
              members cheering each other on.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-blue-primary text-[14px] font-extrabold text-white hover:bg-blue-hover"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="mt-2.5 inline-flex h-11 w-full items-center justify-center rounded-full border-2 border-blue-primary text-[14px] font-extrabold text-blue-primary hover:bg-sky-tint"
            >
              Create account
            </Link>
          </div>
        )}

        {/* Shortcuts */}
        <h2 className="mt-7 px-1 text-[11px] font-extrabold uppercase tracking-[.12em] text-ink-400">
          Your shortcuts
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {shortcuts.map((s) => (
            <ShortcutCard key={s.href + s.label} s={s} />
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-sky-tint-2 pt-5 pb-2">
          {[
            { href: "/about", label: "About" },
            { href: "/terms", label: "Terms" },
            { href: "/privacy", label: "Privacy" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-[44px] items-center px-1 text-[13px] font-semibold text-ink-600 hover:text-blue-primary"
            >
              {label}
            </Link>
          ))}
        </div>
      </main>

      <CommunityTabBar />
    </div>
  );
}
