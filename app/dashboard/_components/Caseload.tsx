"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Heart,
  HandHeart,
  Smile,
  MessageCircle,
  Check,
  Plus,
  ClipboardList,
  Users,
  X,
} from "lucide-react";
import { CARD, SKELETON } from "./types";

// ── Contracts (GET /api/caseload, /api/staff-tasks) ─────────────────────

type CareTeamRole =
  | "case_manager"
  | "counselor"
  | "peer_support"
  | "tech"
  | "facilitator";

type CaseloadClient = {
  id: string;
  name: string;
  memberNumber: string;
  avatarColor: string;
  role: CareTeamRole;
  isPrimary: boolean;
  risk: "ok" | "watch";
  lastTouchAt: number | null;
  untouchedDays: number;
  channelId: string | null;
};

type StaffTask = {
  id: string;
  staffId: string;
  memberId?: string;
  memberName?: string | null;
  title: string;
  dueAt?: number;
  done: boolean;
  createdBy: string;
  createdAt: number;
};

type TouchKind = "kudos" | "nudge" | "checkin" | "message";

const ROLE_LABELS: Record<CareTeamRole, string> = {
  case_manager: "Case manager",
  counselor: "Counselor",
  peer_support: "Peer support",
  tech: "Tech",
  facilitator: "Facilitator",
};

/** The docs/14 boundary, shown on every touch surface. */
const NO_PHI =
  "Engagement notes only - never clinical or medical details.";

const NUDGE_PRESETS = [
  "Thinking of you today. Hope the week is treating you kindly.",
  "Gentle reminder about your session this week - we're glad to see you.",
  "You have a lesson waiting whenever you're ready. No rush, just cheering you on.",
  "Haven't seen you in a few days. The door is always open.",
];

const MOODS = ["\u{1F61E}", "\u{1F615}", "\u{1F610}", "\u{1F642}", "\u{1F604}"];

const INPUT =
  "w-full rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-3 text-[15px] font-medium text-ink-900 outline-none focus:border-blue-primary";
const LABEL = "text-[12px] font-bold uppercase tracking-[.08em] text-ink-600";

function lastTouchLabel(c: CaseloadClient): string {
  if (c.lastTouchAt === null) return "no touches yet";
  if (c.untouchedDays < 1) return "last touch today";
  return `last touch ${c.untouchedDays}d ago`;
}

function fmtDue(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function Caseload() {
  const [clients, setClients] = useState<CaseloadClient[] | null | "offline">(
    null
  );
  const [tasks, setTasks] = useState<StaffTask[] | null>(null);
  const [modal, setModal] = useState<{
    client: CaseloadClient;
    kind: TouchKind;
  } | null>(null);
  // memberId → "sent" flash after a successful touch (optimistic).
  const [sent, setSent] = useState<Record<string, boolean>>({});

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/caseload");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { clients?: CaseloadClient[] };
      setClients(data.clients ?? []);
    } catch {
      setClients((cur) => (Array.isArray(cur) ? cur : "offline"));
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/staff-tasks");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { tasks?: StaffTask[] };
      setTasks(data.tasks ?? []);
    } catch {
      setTasks((cur) => cur ?? []);
    }
  }, []);

  useEffect(() => {
    loadClients();
    loadTasks();
  }, [loadClients, loadTasks]);

  const onSent = useCallback(
    (memberId: string) => {
      setSent((s) => ({ ...s, [memberId]: true }));
      setModal(null);
      loadClients();
      setTimeout(
        () => setSent((s) => ({ ...s, [memberId]: false })),
        4000
      );
    },
    [loadClients]
  );

  const header = (
    <div>
      <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
        My Caseload
      </div>
      <div className="mt-0.5 text-[13px] font-medium text-ink-600">
        Your assigned members, the person waiting longest first. Every small
        touch counts.
      </div>
    </div>
  );

  if (clients === null || clients === "offline") {
    return (
      <div className="flex flex-col gap-5">
        {header}
        {clients === "offline" && (
          <div className="text-[13px] font-semibold text-ink-400">
            Caseload coming online…
          </div>
        )}
        <div className="flex flex-col gap-[18px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={SKELETON + " h-[92px]"} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {header}

      {clients.length === 0 ? (
        <div className={CARD + " flex flex-col items-center px-8 py-16 text-center"}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint">
            <Users size={26} strokeWidth={2.4} className="text-blue-primary" />
          </div>
          <div className="mt-4 text-[17px] font-extrabold text-ink-900">
            No assigned members yet
          </div>
          <div className="mt-1 max-w-[420px] text-[14px]/[1.6] font-medium text-ink-600">
            Care team assignments appear here.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[14px]">
          {clients.map((c) => (
            <div key={c.id} className={CARD + " px-[26px] py-5"}>
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-[16px] font-extrabold text-white"
                  style={{ backgroundColor: c.avatarColor }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[16px] font-extrabold text-ink-900">
                      {c.name}
                    </span>
                    {c.memberNumber && (
                      <span className="inline-flex h-[22px] items-center rounded-full bg-canvas px-2.5 text-[11px] font-bold tracking-[.04em] text-ink-600">
                        #{c.memberNumber}
                      </span>
                    )}
                    <span className="inline-flex h-[22px] items-center rounded-full bg-sky-tint px-2.5 text-[11px] font-extrabold tracking-[.04em] text-blue-primary">
                      {ROLE_LABELS[c.role]}
                      {c.isPrimary ? " · primary" : ""}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[12.5px] font-semibold text-ink-600">
                      {lastTouchLabel(c)}
                    </span>
                    {c.untouchedDays >= 3 && (
                      <span className="inline-flex h-[22px] items-center rounded-full bg-amber-bg px-2.5 text-[11px] font-extrabold text-amber-ink">
                        needs a touch - 3+ days
                      </span>
                    )}
                  </div>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {sent[c.id] && (
                    <span className="inline-flex h-[26px] items-center gap-1 rounded-full bg-[#E8F8F0] px-3 text-[11px] font-bold text-success">
                      <Check size={12} strokeWidth={2.6} /> Sent
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setModal({ client: c, kind: "kudos" })}
                    title="Send kudos - lands as a warm notification"
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-sky-tint-2 px-4 text-[13px] font-bold text-ink-600 hover:border-blue-primary hover:text-blue-primary"
                  >
                    <Heart size={15} strokeWidth={2.4} /> Kudos
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ client: c, kind: "nudge" })}
                    title="Send a gentle reminder"
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-sky-tint-2 px-4 text-[13px] font-bold text-ink-600 hover:border-blue-primary hover:text-blue-primary"
                  >
                    <HandHeart size={15} strokeWidth={2.4} /> Nudge
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal({ client: c, kind: "checkin" })}
                    title="Log a quick check-in (mood + note)"
                    className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-sky-tint-2 px-4 text-[13px] font-bold text-ink-600 hover:border-blue-primary hover:text-blue-primary"
                  >
                    <Smile size={15} strokeWidth={2.4} /> Check-in
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      c.channelId && setModal({ client: c, kind: "message" })
                    }
                    disabled={!c.channelId}
                    title={
                      c.channelId
                        ? "Message their 1:1 care channel"
                        : "No care channel yet for this member"
                    }
                    className={
                      "inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-[13px] font-bold " +
                      (c.channelId
                        ? "cursor-pointer bg-blue-primary text-white hover:bg-blue-hover"
                        : "cursor-not-allowed bg-ink-400 text-white")
                    }
                  >
                    <MessageCircle size={15} strokeWidth={2.4} /> Message
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FollowUps
        tasks={tasks}
        clients={clients}
        reload={loadTasks}
        onLocal={setTasks}
      />

      {modal && (
        <TouchModal
          client={modal.client}
          kind={modal.kind}
          onClose={() => setModal(null)}
          onSent={() => onSent(modal.client.id)}
        />
      )}
    </div>
  );
}

// ── Touch modal (kudos / nudge / check-in / care-channel message) ────────

function TouchModal({
  client,
  kind,
  onClose,
  onSent,
}: {
  client: CaseloadClient;
  kind: TouchKind;
  onClose: () => void;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");
  const [preset, setPreset] = useState(NUDGE_PRESETS[0]);
  const [mood, setMood] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titles: Record<TouchKind, string> = {
    kudos: `Send ${client.name} kudos`,
    nudge: `Nudge ${client.name}`,
    checkin: `Check in with ${client.name}`,
    message: `Message ${client.name}`,
  };

  const send = async () => {
    setError(null);
    if (kind === "checkin" && mood === null) {
      setError("Pick a mood first.");
      return;
    }
    if (kind === "message" && !body.trim()) {
      setError("Write a short message first.");
      return;
    }
    setBusy(true);
    try {
      let res: Response;
      if (kind === "message") {
        res = await fetch(`/api/care-channels/${client.channelId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: body.trim() }),
        });
      } else {
        const payload: {
          memberId: string;
          kind: string;
          body?: string;
          mood?: number;
        } = { memberId: client.id, kind };
        if (kind === "nudge") payload.body = preset;
        else if (body.trim()) payload.body = body.trim();
        if (kind === "checkin" && mood !== null) payload.mood = mood;
        res = await fetch("/api/staff-engagements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Something went wrong. Try again.");
      }
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/40 px-5"
      onClick={onClose}
    >
      <div
        className={CARD + " w-full max-w-[440px] px-7 py-6"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="text-[18px] font-extrabold tracking-[-0.01em] text-ink-900">
            {titles[kind]}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full text-ink-600 hover:bg-canvas"
          >
            <X size={16} strokeWidth={2.4} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          {kind === "kudos" && (
            <div>
              <div className={LABEL}>Message (optional)</div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder="Your care team noticed your progress this week. Keep going."
                className={INPUT + " mt-1.5 resize-none"}
              />
            </div>
          )}

          {kind === "nudge" && (
            <div className="flex flex-col gap-2">
              <div className={LABEL}>Pick a gentle message</div>
              {NUDGE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={
                    "cursor-pointer rounded-xl border-[1.5px] px-4 py-3 text-left text-[13.5px]/[1.5] font-medium " +
                    (preset === p
                      ? "border-blue-primary bg-sky-tint text-ink-900"
                      : "border-sky-tint text-ink-600 hover:border-blue-primary")
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {kind === "checkin" && (
            <>
              <div>
                <div className={LABEL}>How did they seem?</div>
                <div className="mt-1.5 flex items-center gap-2">
                  {MOODS.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(i + 1)}
                      aria-label={`Mood ${i + 1} of 5`}
                      className={
                        "flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] text-[20px] " +
                        (mood === i + 1
                          ? "border-blue-primary bg-sky-tint"
                          : "border-sky-tint hover:border-blue-primary")
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className={LABEL}>Note (optional)</div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={400}
                  rows={3}
                  placeholder="Quick hallway chat - in good spirits today."
                  className={INPUT + " mt-1.5 resize-none"}
                />
              </div>
            </>
          )}

          {kind === "message" && (
            <div>
              <div className={LABEL}>Message their 1:1 care channel</div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder={`Hi ${client.name}, just checking in…`}
                className={INPUT + " mt-1.5 resize-none"}
              />
            </div>
          )}

          {/* The docs/14 boundary, on every touch surface. */}
          <div className="text-[12px] font-semibold text-ink-400">
            {NO_PHI}
          </div>

          {error && (
            <div className="text-[13px] font-semibold text-amber-ink">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={send}
            disabled={busy}
            className={
              "inline-flex min-h-[48px] items-center justify-center rounded-full text-[15px] font-extrabold text-white " +
              (busy
                ? "cursor-not-allowed bg-ink-400"
                : "cursor-pointer bg-blue-primary hover:bg-blue-hover")
            }
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── My follow-ups (staff task queue) ─────────────────────────────────────

function FollowUps({
  tasks,
  clients,
  reload,
  onLocal,
}: {
  tasks: StaffTask[] | null;
  clients: CaseloadClient[];
  reload: () => Promise<void>;
  onLocal: (fn: (cur: StaffTask[] | null) => StaffTask[] | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [memberId, setMemberId] = useState("");
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!title.trim()) {
      setError("Give the follow-up a short title.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const dueAt = due ? new Date(due).getTime() : undefined;
      const res = await fetch("/api/staff-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          memberId: memberId || undefined,
          dueAt,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || "Could not add the follow-up.");
      }
      setTitle("");
      setMemberId("");
      setDue("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the follow-up.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (task: StaffTask) => {
    const next = !task.done;
    // Optimistic flip; reconcile with the server after.
    onLocal((cur) =>
      Array.isArray(cur)
        ? cur.map((t) => (t.id === task.id ? { ...t, done: next } : t))
        : cur
    );
    try {
      const res = await fetch("/api/staff-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, done: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      await reload().catch(() => {});
    }
  };

  const now = Date.now();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <ClipboardList size={18} strokeWidth={2.4} className="text-blue-primary" />
        <div className="text-[18px] font-extrabold tracking-[-0.01em] text-ink-900">
          My follow-ups
        </div>
      </div>

      {/* Add-task form */}
      <div className={CARD + " px-[26px] py-5"}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <div className={LABEL}>Follow-up</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Call Danielle re: housing paperwork"
              className={INPUT + " mt-1.5"}
            />
          </div>
          <div className="sm:w-[190px]">
            <div className={LABEL}>Member (optional)</div>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className={INPUT + " mt-1.5"}
            >
              <option value="">No one specific</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:w-[170px]">
            <div className={LABEL}>Due (optional)</div>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={INPUT + " mt-1.5"}
            />
          </div>
          <button
            type="button"
            onClick={add}
            disabled={busy}
            className={
              "inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full px-6 text-[14px] font-extrabold text-white " +
              (busy
                ? "cursor-not-allowed bg-ink-400"
                : "cursor-pointer bg-blue-primary hover:bg-blue-hover")
            }
          >
            <Plus size={15} strokeWidth={2.6} /> Add
          </button>
        </div>
        {error && (
          <div className="mt-2 text-[13px] font-semibold text-amber-ink">
            {error}
          </div>
        )}
      </div>

      {/* Task list - open first, then done (server-sorted). */}
      {tasks === null ? (
        <div className={SKELETON + " h-[72px]"} />
      ) : tasks.length === 0 ? (
        <div className={CARD + " px-[26px] py-6 text-center text-[13.5px] font-medium text-ink-600"}>
          Nothing on your list. Add a follow-up above so it never slips.
        </div>
      ) : (
        <div className={CARD + " px-[26px] py-2"}>
          {tasks.map((t, i) => {
            const overdue = !t.done && t.dueAt !== undefined && t.dueAt < now;
            return (
              <div
                key={t.id}
                className={
                  "flex items-center gap-3 py-3.5 " +
                  (i < tasks.length - 1 ? "border-b border-canvas" : "")
                }
              >
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  aria-label={t.done ? "Mark open" : "Mark done"}
                  className={
                    "flex h-[26px] w-[26px] flex-none cursor-pointer items-center justify-center rounded-full border-[1.5px] " +
                    (t.done
                      ? "border-success bg-[#E8F8F0] text-success"
                      : "border-sky-tint-2 text-transparent hover:border-blue-primary")
                  }
                >
                  <Check size={14} strokeWidth={3} />
                </button>
                <span
                  className={
                    "min-w-0 flex-1 truncate text-[14px] font-semibold " +
                    (t.done ? "text-ink-400 line-through" : "text-ink-900")
                  }
                >
                  {t.title}
                </span>
                {t.memberName && (
                  <span className="hidden flex-none rounded-full bg-sky-tint px-2.5 py-1 text-[11px] font-extrabold text-blue-primary sm:inline-flex">
                    {t.memberName}
                  </span>
                )}
                {t.dueAt !== undefined && (
                  <span
                    className={
                      "flex-none text-[12px] font-bold " +
                      (overdue ? "text-amber-ink" : "text-ink-600")
                    }
                  >
                    {overdue ? "due " : ""}
                    {fmtDue(t.dueAt)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
