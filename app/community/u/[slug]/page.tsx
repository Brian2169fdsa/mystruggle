// /community/u/[slug] — a member's public profile (docs/13 Part A).
// Consent-first: renders only what buildPublicProfile() releases; a member
// with consent off (or no profile details yet) gets the warm private card.

import type { Metadata } from "next";
import Link from "next/link";
import { Award, Flame, GraduationCap, Heart, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";
import PrototypeMap from "@/app/components/PrototypeMap";
import { findMemberBySlug } from "@/app/lib/store";
import {
  buildPublicProfile,
  type ProfilePost,
  type PublicProfile,
} from "@/app/api/profile/profile-lib";
import {
  AvatarTile,
  KindChip,
  MentorChip,
  TopicTag,
  timeAgo,
} from "@/app/community/_components/ui";
import ProfileHeader from "@/app/community/_components/ProfileHeader";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = buildPublicProfile(findMemberBySlug(slug));
  return {
    title: profile
      ? `${profile.name} — My Struggle Community`
      : "Member profile — My Struggle",
    description: "A member of the My Struggle recovery community.",
  };
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2025-05-03" → "May 2025" (no timezone math — parse the string). */
function journeyLabel(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : null;
}

/** One recovery-capital ring — conic gradient, % in the middle. */
function CapitalRing({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  const angle = Math.max(0, Math.min(100, pct)) * 3.6;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="img"
        aria-label={`${label} capital ${pct} percent`}
        className="relative h-[96px] w-[96px] rounded-full"
        style={{ background: `conic-gradient(${color} ${angle}deg, #DFEAF9 ${angle}deg)` }}
      >
        <div className="absolute inset-[9px] flex items-center justify-center rounded-full bg-white">
          <span className="tnum text-[19px] font-extrabold" style={{ color }}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="text-[12px] font-bold tracking-[.06em] text-ink-600">
        {label.toUpperCase()}
      </div>
    </div>
  );
}

/** Journey highlight card — icon + value + label. */
function MilestoneCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-white px-4 py-5 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-indigo-brand/10">
        <Icon size={17} className="text-indigo-brand" />
      </div>
      <div className="mt-2.5 text-[20px] font-extrabold text-indigo-brand">
        {value}
      </div>
      <div className="mt-1 text-[11px] font-bold tracking-[.05em] text-ink-600">
        {label.toUpperCase()}
      </div>
    </div>
  );
}

/** Uppercase section label, matching the community surface. */
function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="mb-3 text-[13px] font-bold tracking-[.12em] text-blue-primary">
      {children}
    </h2>
  );
}

/** Read-only post card — mirrors the community card, hearts view-only. */
function ProfilePostCard({ post }: { post: ProfilePost }) {
  const milestone = post.kind === "milestone";
  return (
    <article
      className={
        milestone
          ? "rounded-2xl border-[1.5px] border-indigo-brand/35 bg-white px-6 py-5 shadow-[0_2px_8px_rgba(78,91,155,.12)]"
          : "rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]"
      }
    >
      <div className="flex items-start gap-3">
        <AvatarTile name={post.authorName} color={post.avatarColor} size={46} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[15px] font-bold text-ink-900">
              {post.authorName}
            </span>
            {post.authorRole === "mentor" && <MentorChip />}
            <KindChip kind={post.kind} />
            <TopicTag topic={post.topic ?? "general"} />
          </div>
          <div className="mt-0.5 text-[12px] font-medium text-ink-600">
            {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>
      <div className="mt-3.5 whitespace-pre-wrap text-[15px]/[1.65] font-medium text-ink-900">
        {post.body}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[13px] font-semibold text-ink-600">
        <span className="inline-flex items-center gap-1.5">
          <Heart size={14} className="text-heart-red" fill="currentColor" />
          <span className="tnum">{post.hearts}</span>
        </span>
        <span className="tnum">
          {post.comments} {post.comments === 1 ? "comment" : "comments"}
        </span>
      </div>
    </article>
  );
}

function PrivateCard() {
  return (
    <div className="mx-auto max-w-[520px] rounded-2xl bg-white px-8 py-12 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint text-[22px]">
        🌱
      </div>
      <h1 className="mt-5 text-[22px] font-extrabold text-ink-900">
        This member keeps their profile private.
      </h1>
      <p className="mt-2.5 text-[14px]/[1.65] font-medium text-ink-600">
        Every member chooses exactly what to share — and private is a
        perfectly good choice. The journey counts either way.
      </p>
      <Link
        href="/community"
        className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-full bg-blue-primary px-7 text-[14px] font-bold text-white transition-colors hover:bg-blue-hover"
      >
        Back to the community
      </Link>
    </div>
  );
}

function ProfileBody({
  profile,
  memberId,
}: {
  profile: PublicProfile;
  memberId: string;
}) {
  const journey = profile.journeySince ? journeyLabel(profile.journeySince) : null;
  const m = profile.milestones;
  return (
    <>
      {/* cover band, overlapping avatar, identity, actions, sticky tabs */}
      <ProfileHeader profile={profile} memberId={memberId} journey={journey} />

      {/* ── Journey — milestone highlights + rings (each consent-gated) ── */}
      <section
        id="journey"
        className="flex scroll-mt-[132px] flex-col gap-6 lg:scroll-mt-[148px]"
      >
        {m && (
          <div>
            <SectionLabel>MILESTONES</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MilestoneCard icon={Award} value={m.level} label="Level" />
              <MilestoneCard
                icon={Flame}
                value={`${m.bestStreak} day${m.bestStreak === 1 ? "" : "s"}`}
                label="Best streak"
              />
              <MilestoneCard
                icon={Target}
                value={String(m.goalsAchieved)}
                label="Goals achieved"
              />
              <MilestoneCard
                icon={GraduationCap}
                value={String(m.coursesCompleted)}
                label="Courses done"
              />
            </div>
          </div>
        )}

        {/* recovery-capital rings — only when the member made them public */}
        {profile.recoveryCapital && (
          <div className="rounded-2xl bg-white px-6 py-7 shadow-[0_1px_3px_rgba(11,37,69,.06)] sm:px-10">
            <h2 className="text-center text-[13px] font-bold tracking-[.12em] text-blue-primary">
              RECOVERY CAPITAL
            </h2>
            <div className="mt-5 flex flex-wrap items-start justify-center gap-8 sm:gap-14">
              <CapitalRing
                label="Personal"
                pct={profile.recoveryCapital.personal}
                color="#2E7CD6"
              />
              <CapitalRing
                label="Social"
                pct={profile.recoveryCapital.social}
                color="#4E5B9B"
              />
              <CapitalRing
                label="Community"
                pct={profile.recoveryCapital.community}
                color="#12B76A"
              />
            </div>
            <p className="mt-5 text-center text-[12px] font-medium text-ink-600">
              Grown from {profile.name}&rsquo;s own activity — never a clinical
              score.
            </p>
          </div>
        )}

        {!m && !profile.recoveryCapital && (
          <div className="rounded-2xl bg-white px-6 py-8 text-center text-[14px] font-medium text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            {profile.name} keeps these details close for now — and that&rsquo;s
            a perfectly good choice.
          </div>
        )}
      </section>

      {/* ── About — what the member chose to share about themselves ── */}
      <section id="about" className="scroll-mt-[132px] lg:scroll-mt-[148px]">
        <SectionLabel>ABOUT</SectionLabel>
        <div className="rounded-2xl bg-white px-6 py-7 shadow-[0_1px_3px_rgba(11,37,69,.06)] sm:px-8">
          {journey && (
            <p className="text-[14px] font-semibold text-ink-900">
              On the journey since{" "}
              <span className="text-blue-primary">{journey}</span>
            </p>
          )}
          {profile.interests.length > 0 && (
            <div className={journey ? "mt-4" : ""}>
              <div className="text-[11px] font-bold tracking-[.08em] text-ink-600">
                INTERESTS
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.interests.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex h-8 items-center rounded-full border border-sky-tint-2 bg-canvas px-3.5 text-[12px] font-semibold text-ink-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!journey && profile.interests.length === 0 && (
            <p className="text-center text-[14px] font-medium text-ink-600">
              {profile.name} hasn&rsquo;t added more here yet.
            </p>
          )}
        </div>
      </section>

      {/* ── Wins — the member's shared posts (read-only) ── */}
      <section id="wins" className="scroll-mt-[132px] lg:scroll-mt-[148px]">
        <SectionLabel>WINS &amp; POSTS</SectionLabel>
        {profile.posts.length > 0 ? (
          <div className="flex flex-col gap-4">
            {profile.posts.map((p) => (
              <ProfilePostCard key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white px-6 py-8 text-center text-[14px] font-medium text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
            Nothing shared yet — the journey is still being written.
          </div>
        )}
      </section>
    </>
  );
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const member = findMemberBySlug(slug);
  const profile = buildPublicProfile(member);

  return (
    <div className="min-h-screen bg-canvas">
      <Nav />
      <main className="mx-auto flex max-w-[860px] flex-col gap-6 px-4 py-8 lg:px-6 lg:py-12">
        {profile && member ? (
          <ProfileBody profile={profile} memberId={member.id} />
        ) : (
          <PrivateCard />
        )}
      </main>
      <Footer />
      <PrototypeMap />
    </div>
  );
}
