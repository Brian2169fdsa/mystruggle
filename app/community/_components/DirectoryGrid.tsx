"use client";

// Member directory grid for /community/discover.
//
// CONSENT-FIRST: this component creates no new data source. It reuses the
// existing consent gates already shipped elsewhere on the surface:
//   • candidate slugs come from GET /api/posts (each post is decorated with
//     `authorSlug`, which is NULL unless the author consented to a public
//     presence) and GET /api/requests/board (already filtered to consenting
//     members with a public slug).
//   • each candidate is then hydrated through GET /api/profile?slug=…, which
//     runs buildPublicProfile() — returning null unless the member BOTH
//     consented AND created profile details. Anything private (BARC, balances,
//     email, last name) is never in that projection, so it can never surface
//     here. Non-consenting members simply never appear.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, Users } from "lucide-react";
import { AvatarTile } from "./ui";
import type { PublicProfile } from "@/app/api/profile/profile-lib";

/** The public-safe subset we render — a projection of PublicProfile. */
type DirMember = Pick<
  PublicProfile,
  | "slug"
  | "name"
  | "avatarColor"
  | "memberNumber"
  | "tagline"
  | "journeySince"
  | "interests"
  | "level"
>;

const CARD = "rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]";

/** "2025-05" / "2025-05-03" → "3 years on the journey" (or shorter). */
function journeyLength(iso?: string): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const monthIdx = Number(m[2]) - 1;
  const now = new Date();
  const months = (now.getFullYear() - year) * 12 + (now.getMonth() - monthIdx);
  if (months < 0) return null;
  if (months < 1) return "Newly on the journey";
  if (months < 12)
    return `${months} month${months === 1 ? "" : "s"} on the journey`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return `${years} year${years === 1 ? "" : "s"} on the journey`;
  return `${years}y ${rem}m on the journey`;
}

/** Collect consenting public member slugs from the two existing feeds. */
async function gatherSlugs(): Promise<string[]> {
  const slugs = new Set<string>();
  const settled = await Promise.allSettled([
    fetch("/api/posts?limit=50", { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : null
    ),
    fetch("/api/requests/board", { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : null
    ),
  ]);

  const postsData = settled[0].status === "fulfilled" ? settled[0].value : null;
  if (postsData && Array.isArray(postsData.posts)) {
    for (const p of postsData.posts) {
      // authorSlug is null unless the author consented to a public page.
      if (typeof p?.authorSlug === "string" && p.authorSlug) {
        slugs.add(p.authorSlug);
      }
    }
  }

  const boardData = settled[1].status === "fulfilled" ? settled[1].value : null;
  if (boardData && Array.isArray(boardData.board)) {
    for (const row of boardData.board) {
      if (typeof row?.slug === "string" && row.slug) slugs.add(row.slug);
    }
  }

  return [...slugs];
}

async function hydrate(slug: string): Promise<DirMember | null> {
  try {
    const res = await fetch(`/api/profile?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile: PublicProfile | null };
    // profile === null → member hasn't consented / has no public profile.
    const p = data.profile;
    if (!p) return null;
    return {
      slug: p.slug,
      name: p.name,
      avatarColor: p.avatarColor,
      memberNumber: p.memberNumber,
      tagline: p.tagline,
      journeySince: p.journeySince,
      interests: p.interests ?? [],
      level: p.level,
    };
  } catch {
    return null;
  }
}

/* ── card ───────────────────────────────────────────────────────────── */

function MemberCard({ member }: { member: DirMember }) {
  const journey = journeyLength(member.journeySince);
  return (
    <Link
      href={`/community/u/${member.slug}`}
      className="group flex flex-col rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)] transition-shadow hover:shadow-[0_4px_16px_rgba(11,37,69,.10)]"
    >
      <div className="flex items-center gap-3">
        <AvatarTile name={member.name} color={member.avatarColor} size={52} />
        <div className="min-w-0">
          <div className="truncate text-[16px] font-extrabold text-ink-900 group-hover:text-blue-primary">
            {member.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="tnum inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2 text-[11px] font-bold text-blue-primary">
              #{member.memberNumber}
            </span>
            <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-indigo-brand/10 px-2 text-[11px] font-extrabold text-indigo-brand">
              ◆ {member.level.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {member.tagline && (
        <p className="mt-3.5 line-clamp-3 text-[14px]/[1.55] font-medium italic text-ink-600">
          “{member.tagline}”
        </p>
      )}

      {journey && (
        <p className="mt-2.5 text-[12.5px] font-semibold text-ink-400">
          {journey}
        </p>
      )}

      {member.interests.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {member.interests.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex h-7 items-center rounded-full border border-sky-tint-2 bg-canvas px-3 text-[12px] font-semibold text-ink-600"
            >
              {tag}
            </span>
          ))}
          {member.interests.length > 4 && (
            <span className="inline-flex h-7 items-center rounded-full px-2 text-[12px] font-semibold text-ink-400">
              +{member.interests.length - 4}
            </span>
          )}
        </div>
      )}

      <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-blue-primary">
        View profile →
      </span>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className={CARD + " animate-pulse"} aria-hidden>
      <div className="flex items-center gap-3">
        <div className="h-[52px] w-[52px] rounded-full bg-sky-tint" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-28 rounded bg-sky-tint" />
          <div className="h-3 w-20 rounded bg-sky-tint" />
        </div>
      </div>
      <div className="mt-4 h-3 w-full rounded bg-canvas" />
      <div className="mt-2 h-3 w-2/3 rounded bg-canvas" />
      <div className="mt-4 flex gap-1.5">
        <div className="h-7 w-16 rounded-full bg-sky-tint" />
        <div className="h-7 w-16 rounded-full bg-sky-tint" />
      </div>
    </div>
  );
}

/* ── grid ───────────────────────────────────────────────────────────── */

export default function DirectoryGrid() {
  const [members, setMembers] = useState<DirMember[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const slugs = await gatherSlugs();
      const hydrated = await Promise.all(slugs.map(hydrate));
      if (!alive) return;
      const clean = hydrated
        .filter((m): m is DirMember => m !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
      setMembers(clean);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    if (!members) return null;
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const haystack = [
        m.name,
        m.tagline ?? "",
        m.memberNumber,
        ...m.interests,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, query]);

  return (
    <div className="flex flex-col gap-5">
      {/* search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or interest…"
          aria-label="Search members by name or interest"
          className="h-12 w-full rounded-2xl border border-sky-tint-2 bg-white pl-11 pr-4 text-[15px] font-medium text-ink-900 shadow-[0_1px_3px_rgba(11,37,69,.06)] outline-none placeholder:text-ink-400 focus:border-blue-primary"
        />
      </div>

      {members !== null && (
        <p className="text-[13px] font-semibold text-ink-400">
          {results!.length}{" "}
          {results!.length === 1 ? "member" : "members"}
          {query.trim() ? " match your search" : " sharing publicly"}
        </p>
      )}

      {/* states */}
      {members === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : results!.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {results!.map((m) => (
            <MemberCard key={m.slug} member={m} />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint text-blue-primary">
            <Users className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-5 text-[19px] font-extrabold text-ink-900">
            The directory is just getting started
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[14px]/[1.65] font-medium text-ink-600">
            Members choose whether to share a public profile. As more of the
            community opens their door, you&rsquo;ll meet them here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white px-6 py-12 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint text-blue-primary">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="mt-5 text-[19px] font-extrabold text-ink-900">
            No one by that name — yet
          </h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[14px]/[1.65] font-medium text-ink-600">
            Try another name or interest. Every member&rsquo;s journey looks a
            little different.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white hover:bg-blue-hover"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
