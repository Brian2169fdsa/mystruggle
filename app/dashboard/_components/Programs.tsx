"use client";

// Program Builder (docs/16 Part A) - centers create PROGRAMS: packaged,
// runnable offerings (curriculum + cohort + schedule) targeted at a level of
// care. Courses are ingredients; programs are the meal. Self-fetching; the
// dashboard renders <Programs /> as a section.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarClock,
  ListChecks,
  Flag,
  Users,
  MapPin,
  Copy,
  Megaphone,
  Sparkles,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { CARD, SKELETON } from "./types";

// ── contracts (mirror /api/programs) ─────────────────────────────────────

type LevelOfCare =
  | "detox"
  | "residential"
  | "php"
  | "iop"
  | "op"
  | "recovery_maintenance"
  | "custom";

type Delivery = "in_facility" | "remote" | "hybrid";

type CurriculumKind = "course" | "session_series" | "task_pack" | "milestone";

type CurriculumItem = {
  id: string;
  programId: string;
  sort: number;
  kind: CurriculumKind;
  courseId?: string;
  label: string;
  config?: Record<string, unknown>;
};

type ProgramListItem = {
  id: string;
  centerId?: string;
  title: string;
  description: string;
  levelOfCare: LevelOfCare;
  category?: string;
  durationWeeks?: number;
  delivery: Delivery;
  isTemplate: boolean;
  status: "draft" | "published" | "archived";
  badge?: string;
  createdAt: number;
  enrolledCount: number;
  sessionCount: number;
  curriculum: CurriculumItem[];
};

type EnrollmentRow = {
  id: string;
  programId: string;
  memberId: string;
  cohortLabel?: string;
  enrolledAt: number;
  completedAt?: number;
  status: "active" | "completed" | "withdrawn";
  memberName: string;
  avatarColor: string;
  memberNumber?: string;
};

type SessionRow = {
  id: string;
  programId: string;
  title: string;
  startsAt: number;
  durationMin: number;
  location?: string;
  createdAt: number;
};

type AttendanceRow = {
  id: string;
  sessionId: string;
  memberId: string;
  status: "present" | "remote" | "excused" | "absent";
  markedAt: number;
};

type Detail = {
  program: ProgramListItem;
  curriculum: CurriculumItem[];
  enrollments: EnrollmentRow[];
  sessions: SessionRow[];
  attendance: AttendanceRow[];
};

type RosterMember = {
  id: string;
  name: string;
  memberNumber: string;
  avatarColor: string;
};

// ── labels + chips ───────────────────────────────────────────────────────

const LOC_META: Record<LevelOfCare, { label: string; bg: string; color: string }> = {
  detox: { label: "Detox", bg: "#F0EDFB", color: "#4E5B9B" },
  residential: { label: "Residential", bg: "#EAF2FC", color: "#2E7CD6" },
  php: { label: "PHP", bg: "#EAF2FC", color: "#2E7CD6" },
  iop: { label: "IOP", bg: "#EAF2FC", color: "#0B2545" },
  op: { label: "Outpatient", bg: "#E8F8F0", color: "#12B76A" },
  recovery_maintenance: { label: "Recovery maintenance", bg: "#E8F8F0", color: "#12B76A" },
  custom: { label: "Custom", bg: "#F0EDFB", color: "#4E5B9B" },
};

const DELIVERY_LABEL: Record<Delivery, string> = {
  in_facility: "In facility",
  remote: "Remote",
  hybrid: "Hybrid",
};

const KIND_META: Record<
  CurriculumKind,
  { label: string; Icon: typeof BookOpen; bg: string; color: string }
> = {
  course: { label: "Course", Icon: BookOpen, bg: "#EAF2FC", color: "#2E7CD6" },
  session_series: { label: "Session series", Icon: CalendarClock, bg: "#F0EDFB", color: "#4E5B9B" },
  task_pack: { label: "Task pack", Icon: ListChecks, bg: "#E8F8F0", color: "#12B76A" },
  milestone: { label: "Milestone", Icon: Flag, bg: "#FFF4E5", color: "#B54708" },
};

const ATT_STATUSES: { value: AttendanceRow["status"]; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "remote", label: "Remote" },
  { value: "excused", label: "Excused" },
  { value: "absent", label: "Absent" },
];

const INPUT =
  "w-full rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-3 text-[15px] font-medium text-ink-900 outline-none focus:border-blue-primary";
const LABEL = "text-[12px] font-bold uppercase tracking-[.08em] text-ink-600";
const PRIMARY_BTN =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-blue-primary px-6 text-[13px] font-bold text-white hover:bg-blue-hover disabled:cursor-not-allowed disabled:bg-ink-400";
const GHOST_BTN =
  "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-blue-primary px-5 text-[13px] font-bold text-blue-primary hover:bg-sky-tint disabled:cursor-not-allowed disabled:opacity-50";

function statusPill(status: ProgramListItem["status"]) {
  if (status === "published")
    return { label: "Published", bg: "#E8F8F0", color: "#12B76A" };
  if (status === "archived")
    return { label: "Archived", bg: "#EEF1F5", color: "#5A6B82" };
  return { label: "Draft", bg: "#FFF4E5", color: "#B54708" };
}

function fmtWhen(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function localToMs(v: string): number | null {
  if (!v) return null;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : null;
}

/** Minimal CSV -> identifier list for the cohort importer. Takes the FIRST
 *  column of each line (handling quoted cells with "" escapes and commas
 *  inside quotes), skips a header row when its first cell is neither numeric
 *  nor an email (no "@"), dedupes, and caps at 200 rows. */
function parseCsvIdentifiers(text: string): string[] {
  const firstCell = (line: string): string => {
    const t = line.trim();
    if (t.startsWith('"')) {
      let out = "";
      for (let i = 1; i < t.length; i++) {
        if (t[i] === '"') {
          if (t[i + 1] === '"') {
            out += '"';
            i++; // escaped quote
          } else break; // closing quote
        } else out += t[i];
      }
      return out.trim();
    }
    const comma = t.indexOf(",");
    return (comma === -1 ? t : t.slice(0, comma)).trim();
  };
  const cells = text
    .split(/\r?\n/)
    .map(firstCell)
    .filter(Boolean);
  if (cells.length > 0 && !/^\d+$/.test(cells[0]) && !cells[0].includes("@")) {
    cells.shift(); // header row ("member_number", "Email", ...)
  }
  return [...new Set(cells)].slice(0, 200);
}

// ── component ────────────────────────────────────────────────────────────

export default function Programs() {
  const [programs, setPrograms] = useState<ProgramListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<RosterMember[] | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create-program form.
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loc, setLoc] = useState<LevelOfCare>("iop");
  const [delivery, setDelivery] = useState<Delivery>("in_facility");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Publish.
  const [publishing, setPublishing] = useState(false);
  const [channelMsg, setChannelMsg] = useState<string | null>(null);

  // Enroll.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [cohortLabel, setCohortLabel] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

  // CSV cohort import (identifiers = member numbers or emails).
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvPaste, setCsvPaste] = useState("");
  const [csvIdentifiers, setCsvIdentifiers] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<{
    enrolled: number;
    already: number;
    unmatched: string[];
  } | null>(null);

  // Preview-as-client modal (member-app-style view of this program).
  const [previewOpen, setPreviewOpen] = useState(false);

  // Completion (memberId in flight - one graduation at a time per member).
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Session form.
  const [sessTitle, setSessTitle] = useState("");
  const [sessStarts, setSessStarts] = useState("");
  const [sessDuration, setSessDuration] = useState("60");
  const [sessLocation, setSessLocation] = useState("");
  const [sessWeeks, setSessWeeks] = useState("1");
  const [sessSubmitting, setSessSubmitting] = useState(false);
  const [sessError, setSessError] = useState<string | null>(null);

  // Attendance.
  const [attSessionId, setAttSessionId] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null); // memberId in flight

  const loadPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/programs");
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { programs?: ProgramListItem[] };
      setPrograms(data.programs ?? []);
      setError(null);
    } catch {
      setError("Couldn't load programs right now.");
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/programs/${id}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as Detail;
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
    fetch("/api/admin/members")
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((d: { members?: RosterMember[] }) => setMembers(d.members ?? []))
      .catch(() => setMembers([]));
  }, [loadPrograms]);

  // Auto-select the first own (non-template) program once the list lands.
  useEffect(() => {
    if (!selectedId && programs && programs.length > 0) {
      const first = programs.find((p) => !p.isTemplate) ?? programs[0];
      setSelectedId(first.id);
    }
  }, [programs, selectedId]);

  useEffect(() => {
    if (selectedId) {
      setChannelMsg(null);
      setEnrollMsg(null);
      setPickerOpen(false);
      setPicked(new Set());
      setAttSessionId(null);
      setCsvOpen(false);
      setCsvPaste("");
      setCsvIdentifiers([]);
      setCsvError(null);
      setCsvResult(null);
      setPreviewOpen(false);
      loadDetail(selectedId);
    }
  }, [selectedId, loadDetail]);

  const own = (programs ?? []).filter((p) => !p.isTemplate);
  const templates = (programs ?? []).filter((p) => p.isTemplate);

  // ── actions ────────────────────────────────────────────────────────

  async function createProgram(cloneFrom?: ProgramListItem) {
    const payload = cloneFrom
      ? {
          title: cloneFrom.title,
          description: cloneFrom.description,
          levelOfCare: cloneFrom.levelOfCare,
          delivery: cloneFrom.delivery,
          durationWeeks: cloneFrom.durationWeeks,
          category: cloneFrom.category,
          cloneFromId: cloneFrom.id,
        }
      : {
          title: title.trim(),
          description: description.trim(),
          levelOfCare: loc,
          delivery,
          durationWeeks: durationWeeks ? Number(durationWeeks) : undefined,
        };
    if (!payload.title) {
      setCreateError("Give the program a title.");
      return;
    }
    if (cloneFrom) setCloningId(cloneFrom.id);
    else setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        program?: ProgramListItem;
        error?: string;
      };
      if (!res.ok) {
        setCreateError(data.error ?? "Something went wrong creating this program.");
        return;
      }
      await loadPrograms();
      if (data.program) setSelectedId(data.program.id);
      if (!cloneFrom) {
        setTitle("");
        setDescription("");
        setDurationWeeks("");
        setShowCreate(false);
      }
    } catch {
      setCreateError("Something went wrong creating this program.");
    } finally {
      setCreating(false);
      setCloningId(null);
    }
  }

  async function publish() {
    if (!detail) return;
    setPublishing(true);
    setChannelMsg(null);
    try {
      const res = await fetch(`/api/programs/${detail.program.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        program?: ProgramListItem;
        channel?: { title: string } | null;
      };
      if (!res.ok) throw new Error(String(res.status));
      if (data.program) {
        setDetail((cur) => (cur ? { ...cur, program: { ...cur.program, ...data.program } } : cur));
      }
      setChannelMsg(
        data.channel
          ? `Published. A "${data.channel.title}" cohort channel is live - your group has a home from day one.`
          : "Published. This program is live for enrollment."
      );
      loadPrograms();
    } catch {
      setChannelMsg("Couldn't publish just now - try again in a moment.");
    } finally {
      setPublishing(false);
    }
  }

  async function enroll() {
    if (!detail || picked.size === 0) return;
    setEnrolling(true);
    setEnrollMsg(null);
    try {
      const res = await fetch(`/api/programs/${detail.program.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberIds: [...picked],
          cohortLabel: cohortLabel.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        enrollments?: unknown[];
        skipped?: number;
        error?: string;
      };
      if (!res.ok) {
        setEnrollMsg(data.error ?? "Couldn't enroll right now.");
        return;
      }
      const added = data.enrollments?.length ?? 0;
      setEnrollMsg(
        added > 0
          ? `Welcomed ${added} member${added === 1 ? "" : "s"} into the cohort.`
          : "Everyone selected was already enrolled."
      );
      setPicked(new Set());
      setPickerOpen(false);
      setMemberQuery("");
      await loadDetail(detail.program.id);
      loadPrograms();
    } catch {
      setEnrollMsg("Couldn't enroll right now.");
    } finally {
      setEnrolling(false);
    }
  }

  /** CSV cohort import - POSTs the parsed identifiers; the server resolves
   *  each against the roster by exact member number or email. */
  async function importCsv() {
    if (!detail || csvIdentifiers.length === 0 || csvImporting) return;
    setCsvImporting(true);
    setCsvError(null);
    setCsvResult(null);
    try {
      const res = await fetch(`/api/programs/${detail.program.id}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifiers: csvIdentifiers }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        enrollments?: unknown[];
        skipped?: number;
        unmatched?: string[];
        error?: string;
      };
      if (!res.ok) {
        setCsvError(data.error ?? "Couldn't import right now.");
        return;
      }
      setCsvResult({
        enrolled: data.enrollments?.length ?? 0,
        already: data.skipped ?? 0,
        unmatched: data.unmatched ?? [],
      });
      setCsvPaste("");
      setCsvIdentifiers([]);
      await loadDetail(detail.program.id);
      loadPrograms();
    } catch {
      setCsvError("Couldn't import right now.");
    } finally {
      setCsvImporting(false);
    }
  }

  async function markCompleted(enrollment: EnrollmentRow) {
    if (!detail || completingId) return;
    setCompletingId(enrollment.memberId);
    const completedAt = Date.now();
    // Optimistic flip - the roster celebrates immediately; revert on failure.
    const flip = (
      status: EnrollmentRow["status"],
      when?: number
    ): void =>
      setDetail((cur) =>
        cur
          ? {
              ...cur,
              enrollments: cur.enrollments.map((e) =>
                e.id === enrollment.id
                  ? { ...e, status, completedAt: when }
                  : e
              ),
            }
          : cur
      );
    flip("completed", completedAt);
    try {
      const res = await fetch(`/api/programs/${detail.program.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: enrollment.memberId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        enrollment?: { status: EnrollmentRow["status"]; completedAt?: number };
      };
      if (!res.ok) {
        flip(enrollment.status, enrollment.completedAt);
        return;
      }
      if (data.enrollment) {
        flip(data.enrollment.status, data.enrollment.completedAt);
      }
    } catch {
      flip(enrollment.status, enrollment.completedAt);
    } finally {
      setCompletingId(null);
    }
  }

  async function createSession() {
    if (!detail) return;
    const startsAt = localToMs(sessStarts);
    if (!sessTitle.trim() || startsAt === null) {
      setSessError("Add a title and a start date & time.");
      return;
    }
    setSessSubmitting(true);
    setSessError(null);
    try {
      const res = await fetch(`/api/programs/${detail.program.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sessTitle.trim(),
          startsAt,
          durationMin: Number(sessDuration) || 60,
          location: sessLocation.trim() || undefined,
          weeks: Number(sessWeeks) || 1,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setSessError(data.error ?? "Couldn't schedule that session.");
        return;
      }
      setSessTitle("");
      setSessStarts("");
      setSessLocation("");
      setSessWeeks("1");
      await loadDetail(detail.program.id);
      loadPrograms();
    } catch {
      setSessError("Couldn't schedule that session.");
    } finally {
      setSessSubmitting(false);
    }
  }

  async function mark(memberId: string, status: AttendanceRow["status"]) {
    if (!detail || !attSession) return;
    setMarking(memberId);
    try {
      const res = await fetch(`/api/programs/${detail.program.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: attSession.id, memberId, status }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        attendance?: AttendanceRow;
      };
      if (res.ok && data.attendance) {
        const next = data.attendance;
        setDetail((cur) =>
          cur
            ? {
                ...cur,
                attendance: [
                  ...cur.attendance.filter(
                    (a) => !(a.sessionId === next.sessionId && a.memberId === next.memberId)
                  ),
                  next,
                ],
              }
            : cur
        );
      }
    } catch {
      // leave the grid as-is; the next tap retries
    } finally {
      setMarking(null);
    }
  }

  // ── derived detail state ───────────────────────────────────────────

  const now = Date.now();
  const upcomingSessions = (detail?.sessions ?? []).filter((s) => s.startsAt >= now);
  const pastSessions = (detail?.sessions ?? [])
    .filter((s) => s.startsAt < now)
    .sort((a, b) => b.startsAt - a.startsAt);
  const attSession = useMemo(() => {
    const all = detail?.sessions ?? [];
    if (attSessionId) return all.find((s) => s.id === attSessionId) ?? null;
    return pastSessions[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, attSessionId]);

  const activeEnrollments = (detail?.enrollments ?? []).filter(
    (e) => e.status !== "withdrawn"
  );
  const enrolledIds = new Set(activeEnrollments.map((e) => e.memberId));
  const q = memberQuery.trim().toLowerCase();
  const candidates = (members ?? [])
    .filter((m) => !enrolledIds.has(m.id))
    .filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.memberNumber ?? "").includes(q)
    )
    .slice(0, 40);

  const attFor = (memberId: string): AttendanceRow["status"] | null =>
    detail?.attendance.find(
      (a) => a.sessionId === attSession?.id && a.memberId === memberId
    )?.status ?? null;

  // ── render ─────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Programs
        </div>
        <div className="mt-0.5 text-[13px] font-medium text-ink-600">
          Build your center&apos;s programming - curriculum, cohorts, and
          sessions in one place, from first draft to published and running.
        </div>
      </div>

      {error && (
        <div className={CARD + " px-[30px] py-8 text-center"}>
          <div className="text-[13px] font-semibold text-ink-600">{error}</div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              loadPrograms();
            }}
            className={GHOST_BTN + " mt-3"}
          >
            Retry
          </button>
        </div>
      )}

      <div className="flex flex-col gap-[18px] lg:flex-row lg:items-start">
        {/* ══ LEFT: program list + templates + create ══════════════════ */}
        <div className="flex w-full flex-col gap-[18px] lg:w-[360px] lg:flex-none">
          {/* Your programs */}
          <div className={CARD + " px-5 py-5"}>
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-extrabold text-ink-900">
                Your programs
              </div>
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
              >
                <Plus size={16} strokeWidth={2.5} />
                New
              </button>
            </div>

            {!programs && (
              <div className="mt-3 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={SKELETON + " h-[76px]"} />
                ))}
              </div>
            )}

            {programs && own.length === 0 && (
              <div className="mt-3 rounded-xl bg-canvas px-4 py-6 text-center text-[13px] font-semibold text-ink-400">
                No programs yet - start from scratch below, or clone a My
                Struggle template to get moving fast.
              </div>
            )}

            <div className="mt-3 flex flex-col gap-2">
              {own.map((p) => {
                const pill = statusPill(p.status);
                const locMeta = LOC_META[p.levelOfCare] ?? LOC_META.custom;
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className={
                      "min-h-[44px] cursor-pointer rounded-xl border-[1.5px] px-4 py-3 text-left transition-colors " +
                      (active
                        ? "border-blue-primary bg-sky-tint/60"
                        : "border-transparent bg-canvas hover:border-sky-tint")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-bold text-ink-900">
                        {p.title}
                      </span>
                      <span
                        className="inline-flex h-[20px] flex-none items-center rounded-full px-2 text-[10px] font-bold uppercase tracking-[.04em]"
                        style={{ background: pill.bg, color: pill.color }}
                      >
                        {pill.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className="inline-flex h-[20px] items-center rounded-full px-2 text-[10px] font-bold"
                        style={{ background: locMeta.bg, color: locMeta.color }}
                      >
                        {locMeta.label}
                      </span>
                      <span className="text-[11px] font-semibold text-ink-600">
                        {DELIVERY_LABEL[p.delivery]}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-600">
                        <Users size={12} strokeWidth={2.5} />
                        {p.enrolledCount} enrolled
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className={CARD + " px-5 py-5"}>
              <div className="text-[15px] font-extrabold text-ink-900">
                Create a program
              </div>
              <div className="mt-3 flex flex-col gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Title</span>
                  <input
                    className={INPUT}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="IOP Core - Spring cohort"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Description</span>
                  <textarea
                    className={INPUT + " min-h-[72px] resize-y"}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this program covers and who it's for."
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>Level of care</span>
                    <select
                      className={INPUT}
                      value={loc}
                      onChange={(e) => setLoc(e.target.value as LevelOfCare)}
                    >
                      {(Object.keys(LOC_META) as LevelOfCare[]).map((k) => (
                        <option key={k} value={k}>
                          {LOC_META[k].label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL}>Delivery</span>
                    <select
                      className={INPUT}
                      value={delivery}
                      onChange={(e) => setDelivery(e.target.value as Delivery)}
                    >
                      {(Object.keys(DELIVERY_LABEL) as Delivery[]).map((k) => (
                        <option key={k} value={k}>
                          {DELIVERY_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1.5">
                  <span className={LABEL}>Duration (weeks, optional)</span>
                  <input
                    type="number"
                    min={1}
                    className={INPUT}
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(e.target.value)}
                    placeholder="12"
                  />
                </label>
                {createError && (
                  <div className="rounded-xl bg-amber-bg px-4 py-3 text-[13px] font-medium text-ink-900">
                    {createError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => createProgram()}
                  disabled={creating || !title.trim()}
                  className={PRIMARY_BTN}
                >
                  {creating ? "Creating…" : "Create draft"}
                </button>
              </div>
            </div>
          )}

          {/* Templates */}
          <div className={CARD + " px-5 py-5"}>
            <div className="flex items-center gap-2">
              <Sparkles size={16} strokeWidth={2.5} className="text-indigo-brand" />
              <div className="text-[15px] font-extrabold text-ink-900">
                My Struggle templates
              </div>
            </div>
            <div className="mt-1 text-[12px] font-medium text-ink-600">
              Starter programs you can clone and make your own.
            </div>
            {!programs && <div className={SKELETON + " mt-3 h-[64px]"} />}
            {programs && templates.length === 0 && (
              <div className="mt-3 rounded-xl bg-canvas px-4 py-4 text-center text-[12px] font-semibold text-ink-400">
                Templates are on their way.
              </div>
            )}
            <div className="mt-3 flex flex-col gap-2">
              {templates.map((t) => {
                const locMeta = LOC_META[t.levelOfCare] ?? LOC_META.custom;
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(t.id)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <div className="truncate text-[13px] font-bold text-ink-900">
                        {t.title}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className="inline-flex h-[18px] items-center rounded-full px-2 text-[10px] font-bold"
                          style={{ background: locMeta.bg, color: locMeta.color }}
                        >
                          {locMeta.label}
                        </span>
                        <span className="text-[11px] font-semibold text-ink-600">
                          {t.curriculum.length} item
                          {t.curriculum.length === 1 ? "" : "s"}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => createProgram(t)}
                      disabled={cloningId === t.id}
                      className="inline-flex h-11 flex-none cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-blue-primary px-4 text-[12px] font-bold text-blue-primary hover:bg-sky-tint disabled:opacity-50"
                    >
                      <Copy size={14} strokeWidth={2.5} />
                      {cloningId === t.id ? "Cloning…" : "Clone"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══ RIGHT: selected program detail ════════════════════════════ */}
        <div className="min-w-0 flex-1">
          {detailLoading && !detail && <div className={SKELETON + " h-[420px]"} />}

          {!detailLoading && !detail && programs && programs.length === 0 && (
            <div className={CARD + " px-[30px] py-16 text-center"}>
              <div className="text-[15px] font-bold text-ink-900">
                Your first program starts here
              </div>
              <div className="mx-auto mt-1 max-w-[420px] text-[13px] font-medium text-ink-600">
                Create one from scratch or clone a My Struggle starter - either
                way, your cohort will have a curriculum, a schedule, and a home.
              </div>
            </div>
          )}

          {detail && (
            <div className="flex flex-col gap-[18px]">
              {/* ── header ─────────────────────────────────────────── */}
              <div className={CARD + " px-[30px] py-6"}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[20px] font-extrabold tracking-[-0.01em] text-ink-900">
                        {detail.program.title}
                      </span>
                      {(() => {
                        const pill = statusPill(detail.program.status);
                        return (
                          <span
                            className="inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-bold"
                            style={{ background: pill.bg, color: pill.color }}
                          >
                            {pill.label}
                          </span>
                        );
                      })()}
                      {detail.program.isTemplate && (
                        <span className="inline-flex h-[22px] items-center rounded-full bg-[#F0EDFB] px-2.5 text-[11px] font-bold text-indigo-brand">
                          Template
                        </span>
                      )}
                    </div>
                    {detail.program.description && (
                      <div className="mt-1.5 max-w-[560px] text-[14px]/[1.6] font-medium text-ink-600">
                        {detail.program.description}
                      </div>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-semibold text-ink-600">
                      {(() => {
                        const locMeta =
                          LOC_META[detail.program.levelOfCare] ?? LOC_META.custom;
                        return (
                          <span
                            className="inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-bold"
                            style={{ background: locMeta.bg, color: locMeta.color }}
                          >
                            {locMeta.label}
                          </span>
                        );
                      })()}
                      <span>{DELIVERY_LABEL[detail.program.delivery]}</span>
                      {detail.program.durationWeeks && (
                        <span>{detail.program.durationWeeks} weeks</span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Users size={15} strokeWidth={2.3} className="text-blue-primary" />
                        {activeEnrollments.length} enrolled
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-none flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className={GHOST_BTN}
                    >
                      Preview as client 👁
                    </button>
                    {!detail.program.isTemplate &&
                      detail.program.status === "draft" && (
                        <button
                          type="button"
                          onClick={publish}
                          disabled={publishing}
                          className={PRIMARY_BTN + " gap-1.5"}
                        >
                          <Megaphone size={15} strokeWidth={2.5} />
                          {publishing ? "Publishing…" : "Publish program"}
                        </button>
                      )}
                  </div>
                </div>

                {channelMsg && (
                  <div className="mt-4 rounded-xl bg-[#E8F8F0] px-4 py-3 text-[13px]/[1.6] font-medium text-ink-900">
                    {channelMsg}
                  </div>
                )}
              </div>

              {/* ── curriculum ─────────────────────────────────────── */}
              <div className={CARD + " px-[30px] py-6"}>
                <div className="text-[17px] font-extrabold text-ink-900">
                  Curriculum
                </div>
                <div className="mt-0.5 text-[12px] font-medium text-ink-600">
                  The building blocks of the journey, in order.
                </div>
                {detail.curriculum.length === 0 && (
                  <div className="mt-4 rounded-xl bg-canvas px-4 py-6 text-center text-[13px] font-semibold text-ink-400">
                    No curriculum items yet - clone a template to start with a
                    full outline.
                  </div>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  {detail.curriculum.map((item, i) => {
                    const meta = KIND_META[item.kind] ?? KIND_META.course;
                    return (
                      <div
                        key={item.id}
                        className="flex min-h-[44px] items-center gap-3 rounded-xl bg-canvas px-4 py-3"
                      >
                        <span className="tnum w-6 flex-none text-center text-[12px] font-extrabold text-ink-400">
                          {i + 1}
                        </span>
                        <span
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          <meta.Icon size={16} strokeWidth={2.3} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink-900">
                          {item.label}
                        </span>
                        <span
                          className="inline-flex h-[20px] flex-none items-center rounded-full px-2 text-[10px] font-bold"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!detail.program.isTemplate && (
                <>
                  {/* ── cohort roster + enroll ───────────────────────── */}
                  <div className={CARD + " px-[30px] py-6"}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[17px] font-extrabold text-ink-900">
                          Cohort
                        </div>
                        <div className="mt-0.5 text-[12px] font-medium text-ink-600">
                          Everyone walking this program together.
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCsvOpen((v) => !v)}
                          className={GHOST_BTN + " gap-1.5"}
                        >
                          <Upload size={15} strokeWidth={2.5} />
                          Import cohort (CSV)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerOpen((v) => !v)}
                          className={GHOST_BTN + " gap-1.5"}
                        >
                          <Plus size={15} strokeWidth={2.5} />
                          Enroll members
                        </button>
                      </div>
                    </div>

                    {/* ── CSV cohort import panel ─────────────────────── */}
                    {csvOpen && (
                      <div className="mt-4 rounded-xl border-[1.5px] border-sky-tint p-4">
                        <div className="text-[13px] font-bold text-ink-900">
                          Import a cohort from CSV
                        </div>
                        <div className="mt-0.5 text-[12px] font-medium text-ink-600">
                          One member per row - we read the first column (member
                          # or email) and match it against your roster. Up to
                          200 rows.
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1.5">
                            <span className={LABEL}>Upload a .csv file</span>
                            <input
                              type="file"
                              accept=".csv,text/csv"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const text = await f.text();
                                setCsvPaste(text);
                                setCsvIdentifiers(parseCsvIdentifiers(text));
                                setCsvResult(null);
                                setCsvError(null);
                                e.target.value = "";
                              }}
                              className="w-full cursor-pointer rounded-xl border-[1.5px] border-sky-tint bg-white px-4 py-3 text-[13px] font-medium text-ink-600 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-sky-tint file:px-4 file:py-1.5 file:text-[12px] file:font-bold file:text-blue-primary"
                            />
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className={LABEL}>Or paste rows</span>
                            <textarea
                              className={INPUT + " min-h-[88px] resize-y"}
                              value={csvPaste}
                              onChange={(e) => {
                                setCsvPaste(e.target.value);
                                setCsvIdentifiers(
                                  parseCsvIdentifiers(e.target.value)
                                );
                                setCsvResult(null);
                                setCsvError(null);
                              }}
                              placeholder={
                                "member_number\n039521464\ndanielle@themystruggles.com"
                              }
                            />
                          </label>
                        </div>

                        {csvIdentifiers.length > 0 && (
                          <div className="mt-3">
                            <div className={LABEL}>
                              Preview · {csvIdentifiers.length} row
                              {csvIdentifiers.length === 1 ? "" : "s"}
                            </div>
                            <div className="mt-2 flex max-h-[140px] flex-wrap gap-1.5 overflow-y-auto">
                              {csvIdentifiers.map((idf) => (
                                <span
                                  key={idf}
                                  className="inline-flex h-[24px] items-center rounded-full bg-sky-tint px-2.5 text-[11px] font-bold text-blue-primary"
                                >
                                  {idf}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {csvError && (
                          <div className="mt-3 rounded-xl bg-amber-bg px-4 py-3 text-[13px] font-medium text-ink-900">
                            {csvError}
                          </div>
                        )}

                        {csvResult && (
                          <div className="mt-3 rounded-xl bg-canvas px-4 py-3">
                            <div className="text-[13px] font-bold text-ink-900">
                              {csvResult.enrolled} enrolled ·{" "}
                              {csvResult.already} already in ·{" "}
                              {csvResult.unmatched.length} not found
                              {csvResult.unmatched.length > 0 ? ":" : ""}
                            </div>
                            {csvResult.unmatched.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {csvResult.unmatched.map((idf) => (
                                  <span
                                    key={idf}
                                    className="inline-flex h-[24px] items-center rounded-full bg-amber-bg px-2.5 text-[11px] font-bold text-amber-ink"
                                  >
                                    {idf}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={importCsv}
                          disabled={csvIdentifiers.length === 0 || csvImporting}
                          className={PRIMARY_BTN + " mt-3"}
                        >
                          {csvImporting
                            ? "Importing…"
                            : csvIdentifiers.length > 0
                              ? `Enroll ${csvIdentifiers.length} from CSV`
                              : "Enroll from CSV"}
                        </button>
                      </div>
                    )}

                    {enrollMsg && (
                      <div className="mt-4 rounded-xl bg-[#E8F8F0] px-4 py-3 text-[13px] font-medium text-ink-900">
                        {enrollMsg}
                      </div>
                    )}

                    {pickerOpen && (
                      <div className="mt-4 rounded-xl border-[1.5px] border-sky-tint p-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <input
                            className={INPUT}
                            value={memberQuery}
                            onChange={(e) => setMemberQuery(e.target.value)}
                            placeholder="Search by name or member #"
                          />
                          <input
                            className={INPUT}
                            value={cohortLabel}
                            onChange={(e) => setCohortLabel(e.target.value)}
                            placeholder="Cohort label (optional)"
                          />
                        </div>
                        <div className="mt-3 max-h-[260px] overflow-y-auto rounded-xl bg-canvas">
                          {!members && (
                            <div className="px-4 py-4 text-[13px] font-semibold text-ink-400">
                              Loading the roster…
                            </div>
                          )}
                          {members && candidates.length === 0 && (
                            <div className="px-4 py-4 text-[13px] font-semibold text-ink-400">
                              No members match - everyone here may already be
                              enrolled.
                            </div>
                          )}
                          {candidates.map((m) => {
                            const checked = picked.has(m.id);
                            return (
                              <label
                                key={m.id}
                                className="flex min-h-[44px] cursor-pointer items-center gap-3 px-4 py-2 hover:bg-sky-tint/50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setPicked((cur) => {
                                      const next = new Set(cur);
                                      if (next.has(m.id)) next.delete(m.id);
                                      else next.add(m.id);
                                      return next;
                                    })
                                  }
                                  className="h-4 w-4 accent-[#2E7CD6]"
                                />
                                <span
                                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white"
                                  style={{ background: m.avatarColor }}
                                >
                                  {m.name.charAt(0)}
                                </span>
                                <span className="text-[14px] font-semibold text-ink-900">
                                  {m.name}
                                </span>
                                <span className="tnum ml-auto text-[11px] font-semibold text-ink-400">
                                  #{m.memberNumber}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={enroll}
                            disabled={picked.size === 0 || enrolling}
                            className={PRIMARY_BTN}
                          >
                            {enrolling
                              ? "Enrolling…"
                              : picked.size > 0
                                ? `Enroll ${picked.size} member${picked.size === 1 ? "" : "s"}`
                                : "Enroll members"}
                          </button>
                          <span className="text-[12px] font-semibold text-ink-600">
                            {picked.size} selected
                          </span>
                        </div>
                      </div>
                    )}

                    {activeEnrollments.length === 0 && !pickerOpen && (
                      <div className="mt-4 rounded-xl bg-canvas px-4 py-6 text-center text-[13px] font-semibold text-ink-400">
                        Nobody enrolled yet - your cohort starts with the first
                        name.
                      </div>
                    )}
                    {activeEnrollments.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {activeEnrollments.map((e) => (
                          <div
                            key={e.id}
                            className="flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-canvas px-4 py-2.5"
                          >
                            <span
                              className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white"
                              style={{ background: e.avatarColor }}
                            >
                              {e.memberName.charAt(0)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink-900">
                              {e.memberName}
                            </span>
                            {e.cohortLabel && (
                              <span className="inline-flex h-[20px] flex-none items-center rounded-full bg-sky-tint px-2 text-[10px] font-bold text-blue-primary">
                                {e.cohortLabel}
                              </span>
                            )}
                            {e.status === "active" && (
                              <button
                                type="button"
                                onClick={() => markCompleted(e)}
                                disabled={completingId !== null}
                                className="inline-flex h-11 flex-none cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-4 text-[12px] font-bold text-blue-primary hover:bg-sky-tint disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {completingId === e.memberId
                                  ? "Celebrating…"
                                  : "Mark completed 🎓"}
                              </button>
                            )}
                            {e.status === "completed" && (
                              <>
                                <span className="inline-flex h-[20px] flex-none items-center rounded-full bg-[#E8F8F0] px-2 text-[10px] font-bold text-[#12B76A]">
                                  Completed
                                  {e.completedAt
                                    ? ` ${new Date(e.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                    : ""}
                                </span>
                                <a
                                  href={`/certificate/${e.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-11 flex-none items-center rounded-full px-3 text-[12px] font-bold text-blue-primary hover:bg-sky-tint"
                                >
                                  Certificate
                                </a>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── sessions ─────────────────────────────────────── */}
                  <div className={CARD + " px-[30px] py-6"}>
                    <div className="text-[17px] font-extrabold text-ink-900">
                      Session schedule
                    </div>
                    <div className="mt-0.5 text-[12px] font-medium text-ink-600">
                      Group sessions for this program - set a weekly count to
                      schedule a whole series at once.
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Title</span>
                        <input
                          className={INPUT}
                          value={sessTitle}
                          onChange={(e) => setSessTitle(e.target.value)}
                          placeholder="Group session"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Starts</span>
                        <input
                          type="datetime-local"
                          className={INPUT}
                          value={sessStarts}
                          onChange={(e) => setSessStarts(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Duration (min)</span>
                        <input
                          type="number"
                          min={5}
                          className={INPUT}
                          value={sessDuration}
                          onChange={(e) => setSessDuration(e.target.value)}
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Location (optional)</span>
                        <input
                          className={INPUT}
                          value={sessLocation}
                          onChange={(e) => setSessLocation(e.target.value)}
                          placeholder="Room B"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <span className={LABEL}>Repeat weekly (weeks)</span>
                        <input
                          type="number"
                          min={1}
                          max={52}
                          className={INPUT}
                          value={sessWeeks}
                          onChange={(e) => setSessWeeks(e.target.value)}
                        />
                      </label>
                    </div>
                    {sessError && (
                      <div className="mt-3 rounded-xl bg-amber-bg px-4 py-3 text-[13px] font-medium text-ink-900">
                        {sessError}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={createSession}
                      disabled={sessSubmitting || !sessTitle.trim() || !sessStarts}
                      className={PRIMARY_BTN + " mt-4"}
                    >
                      {sessSubmitting ? "Scheduling…" : "Schedule"}
                    </button>

                    {(upcomingSessions.length > 0 || pastSessions.length > 0) && (
                      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <div className={LABEL}>Upcoming</div>
                          <div className="mt-2 flex flex-col gap-2">
                            {upcomingSessions.length === 0 && (
                              <div className="rounded-xl bg-canvas px-4 py-3 text-[12px] font-semibold text-ink-400">
                                Nothing scheduled ahead yet.
                              </div>
                            )}
                            {upcomingSessions.map((s) => (
                              <div
                                key={s.id}
                                className="rounded-xl bg-canvas px-4 py-3"
                              >
                                <div className="text-[13px] font-bold text-ink-900">
                                  {s.title}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-ink-600">
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarClock size={13} strokeWidth={2.3} className="text-blue-primary" />
                                    {fmtWhen(s.startsAt)} · {s.durationMin} min
                                  </span>
                                  {s.location && (
                                    <span className="inline-flex items-center gap-1">
                                      <MapPin size={13} strokeWidth={2.3} className="text-blue-primary" />
                                      {s.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className={LABEL}>Past</div>
                          <div className="mt-2 flex flex-col gap-2">
                            {pastSessions.length === 0 && (
                              <div className="rounded-xl bg-canvas px-4 py-3 text-[12px] font-semibold text-ink-400">
                                No sessions have run yet.
                              </div>
                            )}
                            {pastSessions.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setAttSessionId(s.id)}
                                className={
                                  "min-h-[44px] cursor-pointer rounded-xl border-[1.5px] px-4 py-3 text-left " +
                                  (attSession?.id === s.id
                                    ? "border-blue-primary bg-sky-tint/60"
                                    : "border-transparent bg-canvas hover:border-sky-tint")
                                }
                              >
                                <div className="text-[13px] font-bold text-ink-900">
                                  {s.title}
                                </div>
                                <div className="mt-1 text-[12px] font-semibold text-ink-600">
                                  {fmtWhen(s.startsAt)} · {s.durationMin} min
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── attendance grid ──────────────────────────────── */}
                  {attSession && (
                    <div className={CARD + " px-[30px] py-6"}>
                      <div className="text-[17px] font-extrabold text-ink-900">
                        Attendance
                      </div>
                      <div className="mt-0.5 text-[12px] font-medium text-ink-600">
                        {attSession.title} · {fmtWhen(attSession.startsAt)} -
                        every way of showing up counts.
                      </div>

                      {activeEnrollments.length === 0 && (
                        <div className="mt-4 rounded-xl bg-canvas px-4 py-6 text-center text-[13px] font-semibold text-ink-400">
                          Enroll the cohort first, then mark who was here.
                        </div>
                      )}

                      <div className="mt-4 flex flex-col gap-2">
                        {activeEnrollments.map((e) => {
                          const current = attFor(e.memberId);
                          return (
                            <div
                              key={e.memberId}
                              className="flex flex-col gap-2 rounded-xl bg-canvas px-4 py-3 sm:flex-row sm:items-center"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <span
                                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[12px] font-extrabold text-white"
                                  style={{ background: e.avatarColor }}
                                >
                                  {e.memberName.charAt(0)}
                                </span>
                                <span className="truncate text-[14px] font-semibold text-ink-900">
                                  {e.memberName}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {ATT_STATUSES.map((s) => {
                                  const on = current === s.value;
                                  return (
                                    <button
                                      key={s.value}
                                      type="button"
                                      disabled={marking === e.memberId}
                                      onClick={() => mark(e.memberId, s.value)}
                                      className={
                                        "inline-flex h-11 cursor-pointer items-center rounded-full px-4 text-[12px] font-bold transition-colors disabled:opacity-50 " +
                                        (on
                                          ? s.value === "absent"
                                            ? "bg-amber-bg text-amber-ink"
                                            : "bg-blue-primary text-white"
                                          : "border-[1.5px] border-sky-tint bg-white text-ink-600 hover:border-blue-primary hover:text-blue-primary")
                                      }
                                    >
                                      {s.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── preview-as-client modal (member-app view) ────────── */}
              {previewOpen && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B2545]/50 p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Member view preview"
                  onClick={() => setPreviewOpen(false)}
                >
                  {/* 430px phone frame - staff literally see the phone view */}
                  <div
                    className="flex max-h-[88vh] w-[430px] max-w-full flex-col overflow-hidden rounded-[36px] border-[6px] border-[#0B2545] bg-white shadow-[0_24px_60px_rgba(11,37,69,.45)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-none items-center justify-between px-5 pb-2 pt-4">
                      <span className="text-[11px] font-bold uppercase tracking-[.12em] text-ink-400">
                        Member view · preview
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewOpen(false)}
                        aria-label="Close preview"
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-ink-600 hover:bg-canvas"
                      >
                        <X size={18} strokeWidth={2.5} />
                      </button>
                    </div>
                    <div className="overflow-y-auto px-5 pb-6">
                      {/* My Program card - navy gradient, as the member app
                          renders it (progress starts at 0%) */}
                      <div className="rounded-2xl bg-gradient-to-br from-navy-deep to-indigo-brand p-5 text-white shadow-[0_6px_20px_rgba(11,37,69,.25)]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold tracking-[.14em] text-white/60">
                            MY PROGRAM
                          </span>
                          {(() => {
                            const cohort = activeEnrollments.find(
                              (e) => e.cohortLabel
                            )?.cohortLabel;
                            return cohort ? (
                              <span className="inline-flex h-6 items-center rounded-full bg-white/15 px-2.5 text-[10px] font-extrabold tracking-[.04em] text-white">
                                {cohort}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          {detail.program.badge && (
                            <span
                              title={`Program badge: ${detail.program.badge}`}
                              className="h-2.5 w-2.5 flex-none rounded-full bg-white/90 shadow-[0_0_8px_rgba(255,255,255,.7)]"
                            />
                          )}
                          <span className="min-w-0 truncate text-[19px] font-extrabold tracking-[-0.01em]">
                            {detail.program.title}
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-white/70">
                              Curriculum progress
                            </span>
                            <span className="tnum text-white/85">0%</span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/20">
                            <div className="h-full w-0 rounded-full bg-white/80" />
                          </div>
                          {detail.curriculum.length > 0 && (
                            <div className="mt-2 truncate text-[12.5px] font-semibold text-white/85">
                              Next up: {detail.curriculum[0].label}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Curriculum as the member sees it */}
                      <div className="mt-4">
                        <div className={LABEL}>Your curriculum</div>
                        {detail.curriculum.length === 0 && (
                          <div className="mt-2 rounded-xl bg-canvas px-4 py-4 text-center text-[12px] font-semibold text-ink-400">
                            No curriculum items yet.
                          </div>
                        )}
                        <div className="mt-2 flex flex-col gap-1.5">
                          {detail.curriculum.map((item, i) => {
                            const meta = KIND_META[item.kind] ?? KIND_META.course;
                            return (
                              <div
                                key={item.id}
                                className="flex items-center gap-2.5 rounded-xl bg-canvas px-3.5 py-2.5"
                              >
                                <span className="tnum w-5 flex-none text-center text-[11px] font-extrabold text-ink-400">
                                  {i + 1}
                                </span>
                                <span
                                  className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
                                  style={{
                                    background: meta.bg,
                                    color: meta.color,
                                  }}
                                >
                                  <meta.Icon size={14} strokeWidth={2.3} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink-900">
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Next 2 upcoming sessions */}
                      <div className="mt-4">
                        <div className={LABEL}>Coming up</div>
                        {upcomingSessions.length === 0 && (
                          <div className="mt-2 rounded-xl bg-canvas px-4 py-4 text-center text-[12px] font-semibold text-ink-400">
                            No sessions scheduled yet.
                          </div>
                        )}
                        <div className="mt-2 flex flex-col gap-1.5">
                          {upcomingSessions.slice(0, 2).map((s) => (
                            <div
                              key={s.id}
                              className="rounded-xl bg-canvas px-3.5 py-2.5"
                            >
                              <div className="text-[13px] font-bold text-ink-900">
                                {s.title}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-ink-600">
                                <span className="inline-flex items-center gap-1">
                                  <CalendarClock
                                    size={13}
                                    strokeWidth={2.3}
                                    className="text-blue-primary"
                                  />
                                  {fmtWhen(s.startsAt)} · {s.durationMin} min
                                </span>
                                {s.location && (
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin
                                      size={13}
                                      strokeWidth={2.3}
                                      className="text-blue-primary"
                                    />
                                    {s.location}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
