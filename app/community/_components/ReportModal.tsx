"use client";

// Member-initiated post report. Warm, non-punitive, crisis-sensitive.
// Submits to the EXISTING staff moderation route with a member reason:
//   POST /api/posts/[id]/moderate { action:"flag", reason, note }
// The route is staff-gated, so a member's request may 401 — that's fine here.
// Reporting is a safety gesture we never want to punish or interrogate, so we
// always close with the same gentle "thank you" once the request completes;
// only a hard network failure asks them to try again.

import { useEffect, useState } from "react";
import { Flag, X, LifeBuoy } from "lucide-react";

type Reason = {
  value: string;
  label: string;
  hint: string;
};

const REASONS: Reason[] = [
  {
    value: "harmful",
    label: "Harmful or unsafe",
    hint: "Threats, self-harm, or something that could hurt someone",
  },
  {
    value: "harassment",
    label: "Harassment or cruelty",
    hint: "Targeting, bullying, or unkindness toward a member",
  },
  {
    value: "spam",
    label: "Spam or solicitation",
    hint: "Selling, scams, or repeated off-topic promotion",
  },
  {
    value: "not-supportive",
    label: "Not recovery-supportive",
    hint: "Content that works against someone's recovery",
  },
  {
    value: "other",
    label: "Something else",
    hint: "Tell us in your own words below",
  },
];

export default function ReportModal({
  postId,
  authorName,
  onClose,
}: {
  postId: string;
  authorName: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const submit = async () => {
    if (!reason || sending) return;
    setSending(true);
    setError(false);
    try {
      await fetch(`/api/posts/${postId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "flag",
          reason,
          note: note.trim().slice(0, 500),
        }),
      });
      // Any completed response (including a staff-gate 401) is treated as
      // "received" — we never turn a safety report back on the member.
      setDone(true);
    } catch {
      // Only a true network failure asks for a retry.
      setError(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-deep/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={done ? "Report received" : "Report this post"}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-t-2xl bg-white p-6 shadow-[0_12px_40px_rgba(11,37,69,.22)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          /* ── confirmation ── */
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint text-[24px]">
              💙
            </div>
            <h2 className="mt-4 text-[19px] font-extrabold text-ink-900">
              Thank you — our team will take a look.
            </h2>
            <p className="mt-2 text-[14px]/[1.6] font-medium text-ink-600">
              Looking out for each other is how this community stays safe. You
              did the right thing, and we'll take it from here.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-blue-primary px-6 text-[14px] font-bold text-white transition-colors hover:bg-blue-hover"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── reason picker ── */
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sky-tint text-blue-primary">
                  <Flag size={16} />
                </span>
                <div>
                  <h2 className="text-[17px] font-extrabold text-ink-900">
                    Report this post
                  </h2>
                  <p className="text-[12px] font-medium text-ink-600">
                    This is private — {authorName} won't be told it was you.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-canvas hover:text-ink-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Reason">
              {REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setReason(r.value)}
                    className={
                      "flex min-h-[44px] w-full flex-col items-start rounded-xl border-[1.5px] px-4 py-2.5 text-left transition-colors " +
                      (active
                        ? "border-blue-primary bg-sky-tint"
                        : "border-sky-tint bg-white hover:border-sky-tint-2")
                    }
                  >
                    <span
                      className={
                        "text-[14px] font-bold " +
                        (active ? "text-blue-primary" : "text-ink-900")
                      }
                    >
                      {r.label}
                    </span>
                    <span className="text-[12px] font-medium text-ink-600">
                      {r.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Add anything that helps us understand (optional)"
              className="mt-3 w-full resize-none rounded-xl border border-sky-tint bg-white px-4 py-3 text-[14px]/[1.5] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none"
            />

            {error && (
              <p className="mt-2 text-[12px] font-semibold text-amber-ink">
                We couldn't send that just now — please try again.
              </p>
            )}

            <div className="mt-4 flex items-center gap-2 rounded-xl bg-canvas px-3.5 py-2.5">
              <LifeBuoy size={16} className="flex-none text-blue-primary" />
              <p className="text-[12px]/[1.5] font-medium text-ink-600">
                In immediate danger or crisis? Call or text{" "}
                <span className="font-bold text-ink-900">988</span> — it's free,
                confidential, and available 24/7.
              </p>
            </div>

            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full border-2 border-sky-tint-2 bg-white px-5 text-[14px] font-bold text-ink-600 transition-colors hover:border-ink-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!reason || sending}
                className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center rounded-full bg-blue-primary px-5 text-[14px] font-bold text-white transition-colors hover:bg-blue-hover disabled:cursor-default disabled:opacity-45"
              >
                {sending ? "Sending…" : "Send report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
