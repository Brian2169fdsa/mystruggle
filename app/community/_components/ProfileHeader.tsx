"use client";

// Big-profile header for /community/u/[slug] - cover band, overlapping
// avatar, identity block, action row, and a sticky anchor-tab row.
// Renders ONLY fields already released by buildPublicProfile(); the
// consent gate lives upstream in the page (profile === null → private card).

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { PublicProfile } from "@/app/api/profile/profile-lib";
import { AvatarTile } from "@/app/community/_components/ui";
import { BlockButton } from "@/app/community/_components/BlockControls";

const TABS = [
  { id: "journey", label: "Journey" },
  { id: "about", label: "About" },
  { id: "wins", label: "Wins" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Sticky-ish anchor tabs with a 3px active underline (scroll-spied). */
function ProfileTabs() {
  const [active, setActive] = useState<TabId>("journey");

  useEffect(() => {
    const onScroll = () => {
      let current: TabId = TABS[0].id;
      for (const t of TABS) {
        const el = document.getElementById(t.id);
        if (el && el.getBoundingClientRect().top <= 170) current = t.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const jump = (id: TabId) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    <nav
      aria-label="Profile sections"
      className="sticky top-[64px] z-30 rounded-2xl bg-white px-2 shadow-[0_2px_10px_rgba(11,37,69,.08)] lg:top-[76px]"
    >
      <div className="flex">
        {TABS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            onClick={jump(t.id)}
            aria-current={active === t.id ? "true" : undefined}
            className={
              "relative flex min-h-[52px] flex-1 items-center justify-center text-[14px] font-bold transition-colors " +
              (active === t.id
                ? "text-blue-primary"
                : "text-ink-600 hover:text-ink-900")
            }
          >
            {t.label}
            {active === t.id && (
              <span
                aria-hidden
                className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-blue-primary"
              />
            )}
          </a>
        ))}
      </div>
    </nav>
  );
}

export default function ProfileHeader({
  profile,
  memberId,
  journey,
}: {
  profile: PublicProfile;
  memberId: string;
  /** Pre-formatted "May 2025" label, or null when the member left it blank. */
  journey: string | null;
}) {
  return (
    <>
      <header className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        {/* cover band - token gradient + faint script watermark (no photo uploads yet) */}
        <div
          aria-hidden
          className="relative h-[160px] overflow-hidden bg-gradient-to-r from-navy-deep via-indigo-brand to-blue-primary lg:h-[220px]"
        >
          <span
            className="script pointer-events-none absolute -bottom-3 right-3 select-none text-[110px] lg:-bottom-5 lg:right-10 lg:text-[170px]"
            style={{ color: "rgba(255,255,255,.09)" }}
          >
            journey
          </span>
        </div>

        {/* identity block - avatar overlaps the cover's bottom edge */}
        <div className="px-5 pb-7 sm:px-8">
          <div className="-mt-[44px] w-fit rounded-full ring-4 ring-white lg:hidden">
            <AvatarTile name={profile.name} color={profile.avatarColor} size={88} />
          </div>
          <div className="-mt-[56px] hidden w-fit rounded-full ring-4 ring-white lg:block">
            <AvatarTile name={profile.name} color={profile.avatarColor} size={112} />
          </div>

          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-[28px] font-extrabold text-ink-900 lg:text-[32px]">
              {profile.name}
            </h1>
            <span className="tnum inline-flex h-[26px] items-center rounded-full bg-sky-tint px-3 text-[11px] font-bold text-blue-primary">
              Member #{profile.memberNumber}
            </span>
            <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-indigo-brand/10 px-3 text-[11px] font-extrabold text-indigo-brand">
              ◆ {profile.level.toUpperCase()}
            </span>
          </div>

          {profile.tagline && (
            <p className="mt-2.5 max-w-[560px] text-[17px]/[1.5] font-medium italic text-ink-600">
              “{profile.tagline}”
            </p>
          )}

          {journey && (
            <p className="mt-2 text-[13px] font-semibold text-ink-600">
              On the journey since {journey}
            </p>
          )}

          {/* action row - give pill (consent-gated upstream) + the existing block control */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            {profile.hasGivingPage && (
              <Link
                href={`/p/${profile.slug}`}
                className="inline-flex min-h-[46px] w-fit items-center gap-2 rounded-full bg-blue-primary px-7 text-[14px] font-bold text-white transition-colors hover:bg-blue-hover"
              >
                Give to {profile.name}&rsquo;s journey
                <Heart size={14} fill="currentColor" />
              </Link>
            )}
            {/* signed-in, non-self viewers only - renders nothing otherwise */}
            <div className="sm:ml-auto [&>div]:mt-0 sm:[&>div]:items-end sm:[&>div>p]:text-right">
              <BlockButton targetId={memberId} targetName={profile.name} />
            </div>
          </div>
        </div>
      </header>

      <ProfileTabs />
    </>
  );
}
