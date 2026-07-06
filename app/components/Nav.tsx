import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Briefcase,
  Gift,
  GraduationCap,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  MessageCircle,
  QrCode,
  ScrollText,
  Smartphone,
  Sparkles,
  Target,
  UserPlus,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NavDrawer from "./NavDrawer";
import NotificationBell from "./NotificationBell";

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

type Item = {
  href: string;
  title: string;
  desc: string;
  icon: LucideIcon;
};

type Section = {
  heading: string;
  items: Item[];
};

/** Grouped columns for the Platform mega-menu. */
const PLATFORM_SECTIONS: Section[] = [
  {
    heading: "The Community",
    items: [
      {
        href: "/community",
        title: "Community feed",
        desc: "Wins, circles, and support - a recovery-first network",
        icon: MessageCircle,
      },
      {
        href: "/community",
        title: "Circles",
        desc: "Topic & alumni groups",
        icon: Users,
      },
      {
        href: "/giving",
        title: "QR Code Giving",
        desc: "Half now, half held for reentry",
        icon: QrCode,
      },
    ],
  },
  {
    heading: "For Members",
    items: [
      {
        href: "/member-app",
        title: "Member app",
        desc: "Home, tracker, streaks",
        icon: Smartphone,
      },
      {
        href: "/member-app",
        title: "Learn & programs",
        desc: "Courses by program: PON · VOC · IOP · NAV",
        icon: GraduationCap,
      },
      {
        href: "/member-app",
        title: "Goals & résumé",
        desc: "My Plan, job search, résumé builder",
        icon: Target,
      },
      {
        href: "/member-app",
        title: "The Guide",
        desc: "24/7 recovery companion",
        icon: Sparkles,
      },
    ],
  },
  {
    heading: "Programs & Mentors",
    items: [
      {
        href: "/about",
        title: "Position of Neutrality",
        desc: "The 8-course ISE curriculum",
        icon: BookOpen,
      },
      {
        href: "/mentor",
        title: "Peer Mentorship",
        desc: "Walk with someone who's been there",
        icon: HeartHandshake,
      },
      {
        href: "/mentor",
        title: "Become a Mentor",
        desc: "Lived experience is the qualification",
        icon: UserPlus,
      },
    ],
  },
];

/** Bottom strip of the Platform mega-menu. */
const CENTER_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/centers", label: "Platform overview", icon: LayoutDashboard },
  { href: "/dashboard", label: "Center dashboard", icon: Activity },
  { href: "/mentor-app", label: "Mentor app", icon: Smartphone },
];

/** Column items for the Donate mega-menu. */
const DONATE_ITEMS: Item[] = [
  {
    href: "/donate",
    title: "Give monthly",
    desc: "Tiers from $25",
    icon: HeartHandshake,
  },
  {
    href: "/give",
    title: "Give to a member",
    desc: "Scan a QR or visit their page - 50/50 split",
    icon: QrCode,
  },
  {
    href: "/mentor",
    title: "Donate items or time",
    desc: "Supplies or hands-on hours at a center",
    icon: Gift,
  },
  {
    href: "/giving",
    title: "How giving works",
    desc: "The 50/50 promise, explained",
    icon: ScrollText,
  },
];

/** A single icon-tile menu row (≥44px, hover:bg-sky-tint). */
function MenuTile({ item }: { item: Item }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="group/tile flex items-start gap-3 rounded-xl p-2.5 hover:bg-sky-tint"
    >
      <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-sky-tint text-blue-primary transition-colors group-hover/tile:bg-white">
        <Icon size={17} strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-bold leading-tight text-ink-900">
          {item.title}
        </span>
        <span className="mt-0.5 block text-[13px]/[1.35] text-ink-600">
          {item.desc}
        </span>
      </span>
    </Link>
  );
}

/**
 * Sticky website nav with two premium mega-menus - Platform (a wide, multi-
 * column panel organizing every platform destination) and Donate - both using
 * CSS-hover kept open across a 22px hover bridge, over the 3px indigo→blue
 * hairline. Shared by all marketing pages; mobile mirror in NavDrawer.
 */
export default function Nav() {
  return (
    <div className="sticky top-0 z-50 bg-white shadow-[0_1px_0_rgba(11,37,69,.04)]">
      <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-5 lg:h-[76px] lg:px-6">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={WORDMARK_INDIGO}
            alt="My Struggle"
            className="block h-9 w-auto lg:h-11"
          />
        </Link>

        <nav className="hidden items-center gap-[26px] text-[15px] font-semibold lg:flex">
          <Link href="/about" className="text-ink-900 hover:text-blue-primary">
            About us
          </Link>

          {/* Platform - wide mega-menu on hover; top-level link → /centers */}
          <div className="group relative flex items-center">
            <Link
              href="/centers"
              className="flex cursor-pointer items-center gap-[5px] text-ink-900 group-hover:text-blue-primary"
            >
              Platform <span className="text-[10px] text-ink-600">▾</span>
            </Link>
            <div className="pointer-events-none absolute left-1/2 top-full z-[60] hidden -translate-x-1/2 pt-[22px] group-hover:pointer-events-auto group-hover:block">
              <div className="w-[900px] overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(11,37,69,.25)]">
                <div className="hairline" />
                <div className="p-8">
                  <div className="grid grid-cols-[260px_1fr] gap-8">
                    {/* Featured card - The Continuum of Care */}
                    <Link
                      href="/centers"
                      className="group/feat relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-2xl p-6 text-white"
                    >
                      <div className="photo-ph absolute inset-0" />
                      <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(78,91,155,.94),rgba(11,37,69,.97))]" />
                      <div className="relative">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white">
                          <Activity size={20} />
                        </span>
                        <div className="mt-4 text-[11px] font-bold uppercase tracking-[.16em] text-[#9DBEEC]">
                          The Platform
                        </div>
                        <div className="mt-1.5 text-[20px] font-bold leading-tight">
                          The Continuum of Care
                        </div>
                        <p className="mt-2 text-[13px]/[1.5] text-white/80">
                          We follow a person before, during, and after a center
                          - one continuous record.
                        </p>
                        <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-white group-hover/feat:gap-2.5">
                          Explore the platform
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </Link>

                    {/* Three grouped columns */}
                    <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                      {PLATFORM_SECTIONS.map((section) => (
                        <div key={section.heading}>
                          <div className="mb-1.5 px-2.5 text-[11px] font-bold uppercase tracking-[.14em] text-indigo-brand">
                            {section.heading}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {section.items.map((item) => (
                              <MenuTile
                                key={item.title + item.href}
                                item={item}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom strip - For recovery centers */}
                  <div className="-mx-8 -mb-8 mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 rounded-b-2xl bg-canvas px-8 py-4">
                    <span className="text-[11px] font-bold uppercase tracking-[.14em] text-indigo-brand">
                      For recovery centers
                    </span>
                    {CENTER_LINKS.map((l) => {
                      const Icon = l.icon;
                      return (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="group/link inline-flex items-center gap-2 text-[13px] font-bold text-blue-primary hover:text-blue-hover"
                        >
                          <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-blue-primary shadow-[0_1px_3px_rgba(11,37,69,.10)]">
                            <Icon size={14} />
                          </span>
                          {l.label}
                          <ArrowRight
                            size={13}
                            className="transition-transform group-hover/link:translate-x-0.5"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Link
            href="/community"
            className="text-ink-900 hover:text-blue-primary"
          >
            Community
          </Link>

          {/* Donate - mega-menu on hover; top-level link still navigates */}
          <div className="group relative flex items-center">
            <Link
              href="/donate"
              className="flex items-center gap-[5px] text-ink-900 group-hover:text-blue-primary"
            >
              Donate today <span className="text-[10px] text-ink-600">▾</span>
            </Link>
            <div className="pointer-events-none absolute right-0 top-full z-[60] hidden pt-[22px] group-hover:pointer-events-auto group-hover:block">
              <div className="w-[660px] overflow-hidden rounded-2xl bg-white shadow-[0_18px_50px_rgba(11,37,69,.25)]">
                <div className="hairline" />
                <div className="p-8">
                  <div className="grid grid-cols-[240px_1fr] gap-8">
                    {/* Featured card */}
                    <Link
                      href="/donate"
                      className="group/feat relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-2xl p-6 text-white"
                    >
                      <div className="photo-ph absolute inset-0" />
                      <div className="absolute inset-0 bg-[linear-gradient(155deg,rgba(78,91,155,.94),rgba(11,37,69,.97))]" />
                      <div className="relative">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 text-white">
                          <Heart size={20} fill="currentColor" />
                        </span>
                        <div className="mt-4 text-[11px] font-bold uppercase tracking-[.16em] text-[#9DBEEC]">
                          Give
                        </div>
                        <div className="mt-1.5 text-[20px] font-bold leading-tight">
                          Every gift builds someone&rsquo;s way home
                        </div>
                        <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-white group-hover/feat:gap-2.5">
                          Donate today
                          <ArrowRight size={15} />
                        </span>
                      </div>
                    </Link>

                    {/* Column of items */}
                    <div className="flex flex-col gap-0.5">
                      {DONATE_ITEMS.map((item) => (
                        <MenuTile key={item.title + item.href} item={item} />
                      ))}
                    </div>
                  </div>

                  {/* Bottom strip - For employers */}
                  <div className="-mx-8 -mb-8 mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 rounded-b-2xl bg-canvas px-8 py-4">
                    <span className="text-[11px] font-bold uppercase tracking-[.14em] text-indigo-brand">
                      For employers
                    </span>
                    <Link
                      href="/employer"
                      className="group/link inline-flex items-center gap-2 text-[13px] font-bold text-blue-primary hover:text-blue-hover"
                    >
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-blue-primary shadow-[0_1px_3px_rgba(11,37,69,.10)]">
                        <Briefcase size={14} />
                      </span>
                      Post jobs to the community
                      <ArrowRight
                        size={13}
                        className="transition-transform group-hover/link:translate-x-0.5"
                      />
                    </Link>
                    <Link
                      href="/jobs"
                      className="group/link inline-flex items-center gap-2 text-[13px] font-bold text-blue-primary hover:text-blue-hover"
                    >
                      Browse recovery-friendly jobs
                      <ArrowRight
                        size={13}
                        className="transition-transform group-hover/link:translate-x-0.5"
                      />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2.5 lg:gap-[18px]">
          {/* Self-gating bell - renders nothing until a signed-in session is
              confirmed via /api/notifications (401 → hidden). */}
          <NotificationBell />
          <Link
            href="/login"
            className="hidden text-[15px] font-semibold text-blue-primary lg:block"
          >
            Sign in
          </Link>
          <Link
            href="/donate"
            className="inline-flex h-11 items-center gap-[7px] rounded-full bg-blue-primary px-[18px] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover lg:h-[46px] lg:px-[26px] lg:text-[15px]"
          >
            Donate <Heart size={13} fill="currentColor" />
          </Link>
          <NavDrawer />
        </div>
      </div>
      <div className="hairline" />
    </div>
  );
}
