"use client";

// /community/p/[id] - single-post permalink. The deep-link target for the
// journey rail and post notifications: works no matter how far the post has
// scrolled off feed page 1. Renders the REAL community PostCard (hearts,
// shared reactions, comments) inside a centered single column; hidden/held
// posts 404 for everyone but their author (the API owns that gate).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Nav from "@/app/components/Nav";
import Footer from "@/app/components/Footer";
import PrototypeMap from "@/app/components/PrototypeMap";
import type { SafeUser } from "@/app/lib/types";
import CommunityTabBar from "@/app/community/_components/CommunityTabBar";
import PostCard from "@/app/community/_components/PostCard";
import type { FeedPost } from "@/app/community/_components/ui";

/** Loading skeleton shaped like a post card. */
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="flex items-center gap-3">
        <div className="h-[46px] w-[46px] rounded-full bg-sky-tint" />
        <div className="flex flex-col gap-1.5">
          <div className="h-3.5 w-32 rounded bg-sky-tint" />
          <div className="h-2.5 w-20 rounded bg-canvas" />
        </div>
      </div>
      <div className="mt-4 h-3 w-full rounded bg-canvas" />
      <div className="mt-2 h-3 w-4/5 rounded bg-canvas" />
      <div className="mt-2 h-3 w-2/3 rounded bg-canvas" />
    </div>
  );
}

/** Warm not-found state - a missing post is never treated like an error. */
function NotFoundCard() {
  return (
    <div className="rounded-2xl bg-white px-8 py-12 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint text-[22px]">
        🌱
      </div>
      <h1 className="mt-5 text-[22px] font-extrabold text-ink-900">
        This post isn&rsquo;t here anymore.
      </h1>
      <p className="mt-2.5 text-[14px]/[1.65] font-medium text-ink-600">
        It may have been shared privately, or the author may have taken it
        down. The community is still going strong - come see what&rsquo;s new.
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

export default function PostPermalinkPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [post, setPost] = useState<FeedPost | null>(null);
  const [viewer, setViewer] = useState<SafeUser | null>(null);
  // null = loading, "ok" = post loaded, "missing" = 404 / bad id
  const [state, setState] = useState<null | "ok" | "missing">(null);

  useEffect(() => {
    if (!id) {
      setState("missing");
      return;
    }
    let alive = true;

    // Post + viewer in parallel - same viewer source Feed uses (/api/auth/me).
    fetch(`/api/posts/${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ post: FeedPost }>) : null))
      .then((data) => {
        if (!alive) return;
        if (data?.post) {
          setPost(data.post);
          setState("ok");
        } else {
          setState("missing");
        }
      })
      .catch(() => {
        if (alive) setState("missing");
      });

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { user: SafeUser | null }) => {
        if (alive) setViewer(d.user ?? null);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-canvas">
      <Nav />

      {/* pb-20 keeps the fixed mobile community tab bar clear of the card */}
      <main className="mx-auto flex max-w-[680px] flex-col gap-4 px-4 py-8 pb-20 lg:px-0 lg:py-12">
        <Link
          href="/community"
          className="inline-flex min-h-[44px] w-fit items-center gap-1.5 text-[14px] font-bold text-blue-primary transition-colors hover:text-blue-hover"
        >
          <ArrowLeft size={16} />
          Back to the community
        </Link>

        {state === null && <CardSkeleton />}
        {state === "missing" && <NotFoundCard />}
        {state === "ok" && post && (
          <PostCard
            post={post}
            viewer={viewer}
            onChange={setPost}
            initialCommentsOpen
          />
        )}
      </main>

      <CommunityTabBar />
      <Footer />
      <PrototypeMap />
    </div>
  );
}
