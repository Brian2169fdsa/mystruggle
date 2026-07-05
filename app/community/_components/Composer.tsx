"use client";

import { useEffect, useRef, useState } from "react";
import { TOPICS, type PostKind, type SafeUser, type Topic } from "@/app/lib/types";
import { AvatarTile, TOPIC_LABELS, type FeedPost } from "./ui";

const KINDS: { value: PostKind; label: string; diamond?: boolean }[] = [
  { value: "regular", label: "Post" },
  { value: "win", label: "Win" },
  { value: "milestone", label: "Milestone", diamond: true },
];

/** The editable suggested body for a support-request post. */
function suggestBody(target: number, label: string): string {
  return `I'm raising $${target}/week for ${label.trim()} — every gift splits 50/50 and goes through the center.`;
}

/**
 * Desktop composer — topic + kind chips and an "Ask for support" flow that
 * creates the support request first, then posts with the returned requestId.
 * Crisis submissions are held server-side → warm 988 care card in place.
 */
export default function Composer({
  viewer,
  topic: feedTopic,
  onPosted,
}: {
  viewer: SafeUser;
  /** Currently selected feed topic ("" = All) — seeds the composer topic. */
  topic: string;
  onPosted: (post: FeedPost) => void;
}) {
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<PostKind>("regular");
  const [topic, setTopic] = useState<Topic>(
    TOPICS.includes(feedTopic as Topic) ? (feedTopic as Topic) : "general"
  );
  const [asking, setAsking] = useState(false);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [held, setHeld] = useState<{ line: string; note: string } | null>(null);
  // Last auto-suggested body — only overwrite the textarea while untouched.
  const suggestionRef = useRef<string | null>(null);

  // Follow the feed's topic filter so posts land where the member is looking.
  useEffect(() => {
    if (TOPICS.includes(feedTopic as Topic)) setTopic(feedTopic as Topic);
  }, [feedTopic]);

  // Keep the suggested support copy in sync while the member hasn't edited it.
  useEffect(() => {
    if (!asking) return;
    const t = Math.floor(Number(target));
    setBody((prev) => {
      const untouched = !prev.trim() || prev === suggestionRef.current;
      if (!untouched) return prev;
      if (!label.trim() || !(t >= 1)) return prev;
      const next = suggestBody(t, label);
      suggestionRef.current = next;
      return next;
    });
  }, [asking, label, target]);

  const targetNum = Math.floor(Number(target));
  const supportReady = !asking || (label.trim().length > 0 && targetNum >= 1);
  const canShare = body.trim().length > 0 && supportReady && !busy;

  const submit = async () => {
    if (!canShare) return;
    setBusy(true);
    setError(null);
    try {
      // 1 — support flow: create the request first, then link the post to it.
      let requestId: string | undefined;
      if (asking) {
        const rRes = await fetch("/api/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: label.trim(), weeklyTarget: targetNum }),
        });
        const rData = await rRes.json().catch(() => null);
        if (!rRes.ok) {
          throw new Error(rData?.error ?? "Couldn't create that support request.");
        }
        requestId = rData.request.id as string;
      }

      // 2 — the post itself.
      const pRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), kind, topic, requestId }),
      });
      const pData = await pRes.json().catch(() => null);
      if (!pRes.ok) throw new Error(pData?.error ?? "That didn't go through.");

      if (pData.held) {
        // Crisis care path — the post was held, never published.
        setHeld(
          pData.resources ?? {
            line: "988 Suicide & Crisis Lifeline — call or text 988",
            note: "A member of the care team will reach out today.",
          }
        );
      } else {
        onPosted(pData.post as FeedPost);
      }
      setBody("");
      setKind("regular");
      setAsking(false);
      setLabel("");
      setTarget("");
      suggestionRef.current = null;
    } catch (e) {
      setError((e as Error).message || "That didn't go through — mind trying again?");
    } finally {
      setBusy(false);
    }
  };

  /* — crisis care card takes the composer's place until dismissed — */
  if (held) {
    return (
      <div className="rounded-2xl bg-navy-deep px-6 py-6 text-white shadow-[0_2px_10px_rgba(11,37,69,.25)]">
        <div className="text-[17px] font-extrabold">We&apos;re glad you told us.</div>
        <div className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-[14px] font-bold">
          {held.line}
        </div>
        <div className="mt-3 text-[13px]/[1.65] font-medium text-white/85">
          Your words weren&apos;t posted publicly. {held.note}
        </div>
        <button
          type="button"
          onClick={() => setHeld(null)}
          className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-white px-6 text-[13px] font-bold text-navy-deep"
        >
          Okay
        </button>
      </div>
    );
  }

  const chipBase =
    "inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-full border-[1.5px] px-3.5 text-[12px] font-bold transition-colors";

  return (
    <div className="rounded-2xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      <div className="flex items-start gap-3">
        <AvatarTile name={viewer.name} color={viewer.avatarColor} size={46} />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={`What's on your mind, ${viewer.name}?`}
          className="min-h-[76px] flex-1 resize-none rounded-xl border border-sky-tint bg-canvas px-4 py-3 text-[15px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
        />
      </div>

      {/* topic chips — plain text labels */}
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-extrabold tracking-[.06em] text-ink-400">
          TOPIC
        </span>
        {TOPICS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTopic(t)}
            className={
              chipBase +
              " " +
              (topic === t
                ? "border-blue-primary bg-sky-tint text-blue-primary"
                : "border-sky-tint bg-white text-ink-600 hover:border-sky-tint-2")
            }
          >
            {TOPIC_LABELS[t]}
          </button>
        ))}
      </div>

      {/* kind chips + support toggle */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {KINDS.map((k) => {
          const active = kind === k.value;
          return (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={
                chipBase +
                " " +
                (active
                  ? k.value === "milestone"
                    ? "border-indigo-brand bg-indigo-brand/10 text-indigo-brand"
                    : "border-blue-primary bg-sky-tint text-blue-primary"
                  : "border-sky-tint bg-white text-ink-600 hover:border-sky-tint-2")
              }
            >
              {k.diamond && <span className="text-indigo-brand">◆</span>}
              {k.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setAsking((a) => !a)}
          aria-expanded={asking}
          className={
            chipBase +
            " ml-auto " +
            (asking
              ? "border-blue-primary bg-sky-tint text-blue-primary"
              : "border-sky-tint bg-white text-ink-600 hover:border-sky-tint-2")
          }
        >
          Ask for support
        </button>
      </div>

      {/* support request fields */}
      {asking && (
        <div className="mt-3 rounded-xl border border-sky-tint-2 bg-canvas px-4 py-3.5">
          <div className="text-[12px] font-bold text-ink-600">
            What do you need? e.g. First month&apos;s rent · $175/week
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
              placeholder="First month's rent"
              className="h-11 flex-1 rounded-full border border-sky-tint bg-white px-4 text-[13px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
            />
            <div className="flex h-11 items-center gap-1 rounded-full border border-sky-tint bg-white px-4 sm:w-40">
              <span className="text-[13px] font-bold text-ink-600">$</span>
              <input
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="175"
                className="w-full min-w-0 text-[13px] font-medium text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
              <span className="whitespace-nowrap text-[12px] font-semibold text-ink-400">
                /week
              </span>
            </div>
          </div>
          <div className="mt-2 text-[12px] font-medium text-ink-600">
            Gifts split 50/50 — half cash, half credits — and go through your
            center. Your ask appears on your public giving page too.
          </div>
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between gap-3">
        {error ? (
          <div className="text-[12px] font-semibold text-amber-ink">{error}</div>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={submit}
          disabled={!canShare}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-blue-primary px-7 text-[14px] font-bold text-white transition-colors hover:bg-blue-hover disabled:cursor-default disabled:opacity-40"
        >
          {busy ? "Sharing…" : "Share"}
        </button>
      </div>
    </div>
  );
}
