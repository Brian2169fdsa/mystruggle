"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, ClipboardCheck, Globe, Mail } from "lucide-react";
import { CARD, SKELETON } from "./types";

/**
 * Employer vetting console (docs/17 P0 gate) - staff review fair-chance
 * employer applications and postings held for review. Talks to
 * /api/admin/employer-verifications; verified is the single switch the public
 * job board filters on, so Suspend hides an employer's postings immediately
 * and Reinstate brings them back.
 */

type VerificationStatus = "pending" | "verified" | "suspended";

/** One row of GET /api/admin/employer-verifications `applications`. */
type EmployerApplication = {
  profileId: string;
  company: string;
  contactName: string;
  email: string;
  industry?: string;
  website?: string;
  about?: string;
  pledgeSignedAt?: number;
  verificationStatus: VerificationStatus;
  createdAt: number;
};

/** One row of `pendingPostings` - a job post held in "pending_review". */
type PendingPosting = {
  id: string;
  title: string;
  company: string;
  createdAt: number;
};

const STATUS_PILL: Record<VerificationStatus, { label: string; cls: string }> =
  {
    pending: {
      label: "Pending review",
      cls: "bg-amber-bg text-amber-ink",
    },
    verified: {
      label: "Fair-Chance Verified",
      cls: "bg-[#E8F8F0] text-success",
    },
    suspended: {
      label: "Suspended",
      cls: "bg-amber-bg text-amber-ink",
    },
  };

/** "Mar 4, 2026" for pledge / applied dates. */
function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const BTN_BASE =
  "inline-flex h-11 cursor-pointer items-center rounded-full px-5 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-50";
const BTN_BLUE = BTN_BASE + " bg-blue-primary text-white hover:bg-blue-hover";
const BTN_BLUE_OUTLINE =
  BTN_BASE +
  " border-[1.5px] border-blue-primary text-blue-primary hover:bg-sky-tint";
const BTN_AMBER_OUTLINE =
  BTN_BASE +
  " border-[1.5px] border-amber-ink text-amber-ink hover:bg-amber-bg";

export default function EmployerVetting({
  onPendingCount,
}: {
  /** Optional live-badge hook: pending applications + postings in review. */
  onPendingCount?: (n: number) => void;
}) {
  const [applications, setApplications] = useState<
    EmployerApplication[] | null
  >(null);
  const [postings, setPostings] = useState<PendingPosting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Keep the callback out of the poll effect's deps so an inline arrow prop
  // can't restart the interval every render.
  const countRef = useRef(onPendingCount);
  countRef.current = onPendingCount;

  const report = useCallback(
    (apps: EmployerApplication[], posts: PendingPosting[]) => {
      countRef.current?.(
        apps.filter((a) => a.verificationStatus === "pending").length +
          posts.length
      );
    },
    []
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/employer-verifications");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        applications?: EmployerApplication[];
        pendingPostings?: PendingPosting[];
      };
      const apps = data.applications ?? [];
      const posts = data.pendingPostings ?? [];
      setApplications(apps);
      setPostings(posts);
      setError(null);
      report(apps, posts);
    } catch {
      setError("Couldn't load employer verifications right now.");
    }
  }, [report]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  /** Verify / suspend / reinstate with an optimistic status flip; a failed
   *  call reloads from the server so the row snaps back to the truth. */
  async function actOnProfile(
    profileId: string,
    action: "verify" | "suspend" | "reinstate"
  ) {
    const next: VerificationStatus =
      action === "suspend" ? "suspended" : "verified";
    setBusyId(profileId);
    setApplications((cur) => {
      const updated = (cur ?? []).map((a) =>
        a.profileId === profileId ? { ...a, verificationStatus: next } : a
      );
      report(updated, postings ?? []);
      return updated;
    });
    try {
      const res = await fetch("/api/admin/employer-verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      await load(); // roll back the optimistic flip
    } finally {
      setBusyId(null);
    }
  }

  /** Approve / reject a held posting - optimistically drop it from the queue. */
  async function actOnPosting(postingId: string, action: "approve" | "reject") {
    setBusyId(postingId);
    setPostings((cur) => {
      const updated = (cur ?? []).filter((p) => p.id !== postingId);
      report(applications ?? [], updated);
      return updated;
    });
    try {
      const res = await fetch("/api/admin/employer-verifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postingId, action }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      await load(); // restore the row if the call failed
    } finally {
      setBusyId(null);
    }
  }

  const loading = applications === null && postings === null && !error;

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Employers
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-ink-600">
          Fair-chance employer vetting - only verified companies reach the
          member job board, and every posting is reviewed before it goes live.
        </div>
      </div>

      {error && (
        <div className={CARD + " px-[30px] py-8 text-center"}>
          <div className="text-[13px] font-semibold text-ink-600">{error}</div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              load();
            }}
            className={BTN_BLUE_OUTLINE + " mt-3"}
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <>
          <div className={SKELETON + " h-[180px]"} />
          <div className={SKELETON + " h-[120px]"} />
        </>
      )}

      {/* ── EMPLOYER VERIFICATIONS ───────────────────────────────────── */}
      {applications !== null && (
        <div className={CARD + " px-[30px] py-6"}>
          <div className="flex items-center gap-2.5">
            <Building2 size={18} strokeWidth={2.4} className="text-blue-primary" />
            <div className="text-[17px] font-extrabold text-ink-900">
              Employer verifications
            </div>
          </div>

          {applications.length === 0 && (
            <div className="py-10 text-center text-[13px] font-semibold text-ink-400">
              No employers waiting - the marketplace is caught up.
            </div>
          )}

          <div className="mt-2 divide-y divide-sky-tint">
            {applications.map((a) => {
              const pill = STATUS_PILL[a.verificationStatus];
              const busy = busyId === a.profileId;
              return (
                <div key={a.profileId} className="py-5 first:pt-4 last:pb-1">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[16px] font-bold text-ink-900">
                          {a.company}
                        </span>
                        <span
                          className={
                            "inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-bold " +
                            pill.cls
                          }
                        >
                          {pill.label}
                        </span>
                        {a.pledgeSignedAt ? (
                          <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-[#E8F8F0] px-2.5 text-[11px] font-bold text-success">
                            <ClipboardCheck size={12} strokeWidth={2.6} />
                            Pledge signed {fmtDate(a.pledgeSignedAt)}
                          </span>
                        ) : (
                          <span className="inline-flex h-[22px] items-center rounded-full bg-amber-bg px-2.5 text-[11px] font-bold text-amber-ink">
                            Pledge not signed
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] font-semibold text-ink-600">
                        <span>{a.contactName}</span>
                        {a.email && (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail
                              size={14}
                              strokeWidth={2.3}
                              className="text-blue-primary"
                            />
                            {a.email}
                          </span>
                        )}
                        {a.industry && <span>{a.industry}</span>}
                        {a.website && (
                          <span className="inline-flex items-center gap-1.5">
                            <Globe
                              size={14}
                              strokeWidth={2.3}
                              className="text-blue-primary"
                            />
                            {a.website}
                          </span>
                        )}
                        <span className="text-ink-400">
                          Applied {fmtDate(a.createdAt)}
                        </span>
                      </div>

                      {a.about && (
                        <div className="mt-2 text-[13.5px]/[1.6] font-medium text-ink-600">
                          {a.about}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-none items-center gap-2.5 self-center">
                      {a.verificationStatus === "pending" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => actOnProfile(a.profileId, "verify")}
                          className={BTN_BLUE}
                        >
                          Verify
                        </button>
                      )}
                      {a.verificationStatus === "verified" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => actOnProfile(a.profileId, "suspend")}
                          className={BTN_AMBER_OUTLINE}
                        >
                          Suspend
                        </button>
                      )}
                      {a.verificationStatus === "suspended" && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            actOnProfile(a.profileId, "reinstate")
                          }
                          className={BTN_BLUE_OUTLINE}
                        >
                          Reinstate
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── POSTINGS AWAITING REVIEW ─────────────────────────────────── */}
      {postings !== null && (
        <div className={CARD + " px-[30px] py-6"}>
          <div className="flex items-center gap-2.5">
            <ClipboardCheck
              size={18}
              strokeWidth={2.4}
              className="text-blue-primary"
            />
            <div className="text-[17px] font-extrabold text-ink-900">
              Postings awaiting review
            </div>
            {postings.length > 0 && (
              <span className="inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[11px] font-bold text-indigo-brand">
                {postings.length}
              </span>
            )}
          </div>

          {postings.length === 0 && (
            <div className="py-10 text-center text-[13px] font-semibold text-ink-400">
              No postings waiting - everything on the board has been reviewed.
            </div>
          )}

          <div className="mt-2 divide-y divide-sky-tint">
            {postings.map((p) => {
              const busy = busyId === p.id;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 py-4 first:pt-3 last:pb-1"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-bold text-ink-900">
                      {p.title}
                    </div>
                    <div className="mt-0.5 text-[13px] font-semibold text-ink-600">
                      {p.company}
                      <span className="text-ink-400">
                        {" "}
                        · submitted {fmtDate(p.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-none items-center gap-2.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => actOnPosting(p.id, "approve")}
                      className={BTN_BLUE}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => actOnPosting(p.id, "reject")}
                      className={BTN_AMBER_OUTLINE}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
