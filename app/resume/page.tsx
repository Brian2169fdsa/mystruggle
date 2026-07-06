"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PrototypeMap from "../components/PrototypeMap";
import type { Resume, ResumeSection, ResumeSectionKind, SafeUser } from "../lib/types";
import ResumeDoc, {
  bySort,
  normalizeSections,
  type ExperienceContent,
  type SimpleEntryContent,
  type SkillsContent,
} from "./ResumeDoc";

/**
 * /resume - the dignity-first guided Résumé Builder (docs/13 Part D).
 * Mobile-first standalone page: wordmark header + hairline, canvas bg,
 * PrototypeMap. Warm plain-language prompts, autosave, clean_blue preview.
 * PDF export = the browser's print-to-PDF via /resume/print (a pdf library
 * is a later upgrade).
 */

const WORDMARK_INDIGO =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2844%29-1920w.png";

const inputCls =
  "box-border h-[48px] w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 text-[15px] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none";
const textareaCls =
  "box-border w-full rounded-xl border-[1.5px] border-sky-tint-2 bg-white px-4 py-3 text-[15px]/[1.6] font-medium text-ink-900 placeholder:text-ink-400 focus:border-blue-primary focus:outline-none";
const labelCls = "text-[13px] font-bold text-ink-900";
const hintCls = "text-[12.5px]/[1.6] font-medium text-ink-600";

type StepId = "basics" | "experience" | "skills" | "education" | "extras" | "preview";

const STEPS: { id: StepId; label: string }[] = [
  { id: "basics", label: "Basics" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "extras", label: "Extras" },
  { id: "preview", label: "Preview" },
];

const SUGGESTED_SKILLS = [
  "Reliability",
  "Forklift (in training)",
  "Inventory",
  "Food service",
  "De-escalation",
  "Teamwork",
  "Punctuality",
];

// Pre-written fair-chance strength lines - positive reframing of lived
// experience into real transferable skills. Never legal advice.
const STRENGTH_LINES = [
  "Peer mentor - supported 3 members weekly through structured recovery programming",
  "Center inventory volunteer - stocked, counted, and organized donations for 200+ visitors/week",
  "Completed structured personal-development program with perfect attendance",
  "Group facilitator - led weekly peer support circle of 8–12 people",
  "Kitchen crew volunteer - prepped and served meals for 60+ guests per shift",
];

function newId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `sec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── small UI pieces ──────────────────────────────────────────────────────

function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="bg-white">
        <div className="flex h-[60px] items-center justify-center">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={WORDMARK_INDIGO} alt="My Struggle" className="block h-8 w-auto" />
          </Link>
        </div>
        <div className="hairline" />
      </div>
      {children}
      <PrototypeMap />
    </div>
  );
}

function SignedOutCard() {
  return (
    <main className="mx-auto w-full max-w-[440px] flex-1 px-5 pb-16 pt-12">
      <div className="rounded-2xl bg-white px-6 py-8 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-tint text-[26px]">
          📄
        </div>
        <h1 className="mt-4 text-[24px]/[1.2] font-extrabold tracking-[-0.02em] text-ink-900">
          Build a résumé that tells{" "}
          <span className="script text-[34px]">your</span> story
        </h1>
        <p className="mt-3 text-[14px]/[1.7] font-medium text-ink-600">
          A step-by-step builder made for people rebuilding - it saves as you
          go, and your story is strength here. Sign in to start yours.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-full bg-blue-primary text-[16px] font-extrabold text-white shadow-[0_8px_20px_rgba(46,124,214,.35)] hover:bg-blue-hover"
        >
          Sign in to get started
        </Link>
        <p className="mt-4 text-[13px] font-medium text-ink-600">
          New here?{" "}
          <Link href="/signup" className="font-bold text-blue-primary">
            Create your account
          </Link>
        </p>
      </div>
    </main>
  );
}

function SavedBadge({ state }: { state: "idle" | "saving" | "saved" }) {
  return (
    <span
      className={
        "text-[12px] font-bold " +
        (state === "saved"
          ? "text-success"
          : state === "saving"
            ? "text-ink-400"
            : "text-transparent")
      }
      aria-live="polite"
    >
      {state === "saving" ? "Saving…" : "Saved ✓"}
    </span>
  );
}

function StepChips({
  step,
  setStep,
}: {
  step: StepId;
  setStep: (s: StepId) => void;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
      <div className="flex w-max gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={
              "flex h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13px] font-bold " +
              (step === s.id
                ? "bg-blue-primary text-white shadow-[0_4px_12px_rgba(46,124,214,.3)]"
                : "bg-white text-ink-600 shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:text-ink-900")
            }
          >
            <span
              className={
                "flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10.5px] font-extrabold " +
                (step === s.id ? "bg-white/25 text-white" : "bg-sky-tint text-blue-primary")
              }
            >
              {i + 1}
            </span>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
      {children}
    </div>
  );
}

function ArrowButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "up" ? "Move up" : "Move down"}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-sky-tint text-[13px] font-extrabold text-blue-primary hover:bg-sky-tint-2 disabled:cursor-default disabled:opacity-30"
    >
      {dir === "up" ? "↑" : "↓"}
    </button>
  );
}

// ── the builder ──────────────────────────────────────────────────────────

export default function ResumeBuilderPage() {
  const [me, setMe] = useState<SafeUser | null | undefined>(undefined);
  const [resume, setResume] = useState<Resume | null>(null);
  const [sections, setSections] = useState<ResumeSection[]>([]);
  const [step, setStep] = useState<StepId>("basics");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [skillDraft, setSkillDraft] = useState("");

  const resumeRef = useRef<Resume | null>(null);
  resumeRef.current = resume;
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me").then((r) => r.json());
        if (!alive) return;
        const user = (meRes?.user ?? null) as SafeUser | null;
        setMe(user);
        if (!user) return;
        const res = await fetch("/api/resumes");
        if (!res.ok || !alive) return;
        const data = await res.json();
        if (!alive) return;
        setResume(data.resume as Resume);
        // Seeded résumés use aggregate content.items sections - explode
        // them into the builder's one-section-per-entry shape and persist
        // the migration so future edits round-trip cleanly.
        const { sections: norm, explodedIds } = normalizeSections(
          (data.sections ?? []) as ResumeSection[]
        );
        setSections(norm);
        if (explodedIds.length > 0) {
          const exploded = new Set(explodedIds);
          void (async () => {
            for (const s of norm) {
              if (s.id.includes("-") && exploded.has(s.id.replace(/-\d+$/, ""))) {
                await fetch("/api/resumes", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ section: s }),
                }).catch(() => null);
              }
            }
            for (const id of explodedIds) {
              await fetch("/api/resumes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ deleteSectionId: id }),
              }).catch(() => null);
            }
          })();
        }
      } catch {
        if (alive) setMe(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const post = useCallback(async (body: unknown) => {
    setSaveState("saving");
    try {
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setSaveState("idle");
        return null;
      }
      setSaveState("saved");
      return (await res.json()) as {
        resume?: Resume;
        section?: ResumeSection;
      };
    } catch {
      setSaveState("idle");
      return null;
    }
  }, []);

  const debounced = useCallback((key: string, fn: () => void, ms = 800) => {
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(fn, ms);
  }, []);

  // Résumé field autosave (debounced).
  const updateResume = useCallback(
    (patch: Partial<Resume>) => {
      setResume((r) => (r ? { ...r, ...patch } : r));
      debounced("resume", () => {
        const r = resumeRef.current;
        if (!r) return;
        void post({
          fullName: r.fullName,
          headline: r.headline ?? "",
          summary: r.summary ?? "",
          contact: r.contact ?? {},
        });
      });
    },
    [debounced, post]
  );

  // Section upsert - optimistic local state + (debounced or immediate) POST.
  const upsertSection = useCallback(
    (section: ResumeSection, immediate = false) => {
      setSections((prev) => {
        const i = prev.findIndex((s) => s.id === section.id);
        if (i < 0) return [...prev, section];
        const next = [...prev];
        next[i] = section;
        return next;
      });
      const fire = () => {
        void post({ section }).then((res) => {
          // Server may reassign the id (collision safety) - reconcile.
          if (res?.section && res.section.id !== section.id) {
            const fresh = res.section;
            setSections((prev) =>
              prev.map((s) => (s.id === section.id ? fresh : s))
            );
          }
        });
      };
      if (immediate) fire();
      else debounced(`sec-${section.id}`, fire);
    },
    [debounced, post]
  );

  const deleteSection = useCallback(
    (id: string) => {
      clearTimeout(timers.current[`sec-${id}`]);
      setSections((prev) => prev.filter((s) => s.id !== id));
      void post({ deleteSectionId: id });
    },
    [post]
  );

  // Ordering only matters within a kind (the template groups by kind).
  const ofKind = useCallback(
    (kind: ResumeSectionKind) =>
      sections.filter((s) => s.kind === kind).sort(bySort),
    [sections]
  );

  const moveSection = useCallback(
    (kind: ResumeSectionKind, id: string, delta: -1 | 1) => {
      const items = ofKind(kind);
      const i = items.findIndex((s) => s.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= items.length) return;
      const reordered = [...items];
      [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
      reordered.forEach((s, idx) => {
        if (s.sort !== idx) upsertSection({ ...s, sort: idx }, true);
      });
    },
    [ofKind, upsertSection]
  );

  const addSection = useCallback(
    (kind: ResumeSectionKind, content: Record<string, unknown>) => {
      if (!resumeRef.current) return;
      const existing = ofKind(kind);
      upsertSection(
        {
          id: newId(),
          resumeId: resumeRef.current.id,
          kind,
          content,
          sort: existing.length
            ? Math.max(...existing.map((s) => s.sort)) + 1
            : 0,
        },
        true
      );
    },
    [ofKind, upsertSection]
  );

  // Lived-experience strengths → bullets on one managed experience entry.
  const addStrengthLine = useCallback(
    (line: string) => {
      if (!resumeRef.current) return;
      const existing = sections.find(
        (s) =>
          s.kind === "experience" &&
          (s.content as ExperienceContent).lived === true
      );
      if (existing) {
        const c = existing.content as ExperienceContent;
        const bullets = c.bullets ?? [];
        if (bullets.includes(line)) return;
        upsertSection(
          { ...existing, content: { ...c, bullets: [...bullets, line] } },
          true
        );
      } else {
        addSection("experience", {
          role: "Community & program experience",
          place: "My Struggle Center",
          dates: "",
          bullets: [line],
          lived: true,
        });
      }
    },
    [sections, addSection, upsertSection]
  );

  // Skills live in a single skills-kind section.
  const skillsSection = sections.find((s) => s.kind === "skills");
  const skills = ((skillsSection?.content as SkillsContent)?.items ?? []).filter(
    (s) => s.trim()
  );
  const setSkills = useCallback(
    (items: string[]) => {
      if (!resumeRef.current) return;
      const sec: ResumeSection = skillsSection ?? {
        id: newId(),
        resumeId: resumeRef.current.id,
        kind: "skills",
        content: {},
        sort: 0,
      };
      upsertSection({ ...sec, content: { items } }, true);
    },
    [skillsSection, upsertSection]
  );

  const addSkill = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (!v) return;
      if (skills.some((s) => s.toLowerCase() === v.toLowerCase())) return;
      setSkills([...skills, v]);
    },
    [skills, setSkills]
  );

  // ── render ────────────────────────────────────────────────────────────

  if (me === undefined) {
    return (
      <Chrome>
        <main className="mx-auto flex w-full max-w-[440px] flex-1 items-center justify-center px-5">
          <div className="animate-pulse text-[14px] font-semibold text-ink-400">
            Opening your résumé…
          </div>
        </main>
      </Chrome>
    );
  }

  if (me === null) {
    return (
      <Chrome>
        <SignedOutCard />
      </Chrome>
    );
  }

  const experiences = ofKind("experience");
  const educations = ofKind("education");
  const certifications = ofKind("certifications");
  const volunteers = ofKind("volunteer");

  return (
    <Chrome>
      <main className="mx-auto w-full max-w-[680px] flex-1 px-5 pb-24 pt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px]/[1.15] font-extrabold tracking-[-0.02em] text-ink-900">
              Your <span className="script text-[38px] text-indigo-brand">résumé</span>
            </h1>
            <p className="mt-1.5 text-[13.5px]/[1.6] font-medium text-ink-600">
              One step at a time. It saves as you type.
            </p>
          </div>
          <SavedBadge state={saveState} />
        </div>

        <div className="mt-5">
          <StepChips step={step} setStep={setStep} />
        </div>

        {resume === null ? (
          <div className="mt-8 animate-pulse text-[14px] font-semibold text-ink-400">
            Loading…
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            {/* ── BASICS ─────────────────────────────────────────────── */}
            {step === "basics" && (
              <>
                <Card>
                  <div className="flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Your name</span>
                      <input
                        value={resume.fullName}
                        onChange={(e) => updateResume({ fullName: e.target.value })}
                        placeholder="First and last name"
                        className={inputCls}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Headline</span>
                      <input
                        value={resume.headline ?? ""}
                        onChange={(e) => updateResume({ headline: e.target.value })}
                        placeholder="One line about the worker you are - e.g. 'Reliable warehouse & inventory associate'"
                        className={inputCls}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Summary</span>
                      <textarea
                        value={resume.summary ?? ""}
                        onChange={(e) => updateResume({ summary: e.target.value })}
                        rows={4}
                        placeholder="Two or three sentences about who you are at work."
                        className={textareaCls}
                      />
                      <span className={hintCls}>
                        Say what you&apos;re great at now. Your story is strength -
                        time in a program counts as structured personal
                        development.
                      </span>
                    </label>
                  </div>
                </Card>
                <Card>
                  <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
                    How to reach you
                  </div>
                  <div className="mt-3 flex flex-col gap-4">
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Phone</span>
                      <input
                        value={resume.contact?.phone ?? ""}
                        onChange={(e) =>
                          updateResume({
                            contact: { ...resume.contact, phone: e.target.value },
                          })
                        }
                        placeholder="(602) 555-0148"
                        className={inputCls}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>Email</span>
                      <input
                        value={resume.contact?.email ?? ""}
                        onChange={(e) =>
                          updateResume({
                            contact: { ...resume.contact, email: e.target.value },
                          })
                        }
                        placeholder="you@example.com"
                        className={inputCls}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className={labelCls}>City</span>
                      <input
                        value={resume.contact?.city ?? ""}
                        onChange={(e) =>
                          updateResume({
                            contact: { ...resume.contact, city: e.target.value },
                          })
                        }
                        placeholder="Laveen, AZ"
                        className={inputCls}
                      />
                    </label>
                  </div>
                </Card>
              </>
            )}

            {/* ── EXPERIENCE ─────────────────────────────────────────── */}
            {step === "experience" && (
              <>
                <p className={hintCls}>
                  Every job counts - paid work, program roles, volunteering at
                  the center. Plain words beat fancy ones.
                </p>

                {experiences.map((sec, i) => {
                  const c = sec.content as ExperienceContent;
                  return (
                    <Card key={sec.id}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
                          {c.lived ? "Lived-experience strengths" : `Experience ${i + 1}`}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowButton
                            dir="up"
                            disabled={i === 0}
                            onClick={() => moveSection("experience", sec.id, -1)}
                          />
                          <ArrowButton
                            dir="down"
                            disabled={i === experiences.length - 1}
                            onClick={() => moveSection("experience", sec.id, 1)}
                          />
                          <button
                            onClick={() => deleteSection(sec.id)}
                            className="ml-1 h-8 cursor-pointer rounded-full px-2.5 text-[12px] font-bold text-ink-400 hover:bg-heart-bg hover:text-heart-red"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-3.5">
                        <label className="flex flex-col gap-1.5">
                          <span className={labelCls}>Role</span>
                          <input
                            value={c.role ?? ""}
                            onChange={(e) =>
                              upsertSection({
                                ...sec,
                                content: { ...c, role: e.target.value },
                              })
                            }
                            placeholder="e.g. Warehouse associate"
                            className={inputCls}
                          />
                        </label>
                        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                          <label className="flex flex-col gap-1.5">
                            <span className={labelCls}>Where</span>
                            <input
                              value={c.place ?? ""}
                              onChange={(e) =>
                                upsertSection({
                                  ...sec,
                                  content: { ...c, place: e.target.value },
                                })
                              }
                              placeholder="Company, program, or center"
                              className={inputCls}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className={labelCls}>When</span>
                            <input
                              value={c.dates ?? ""}
                              onChange={(e) =>
                                upsertSection({
                                  ...sec,
                                  content: { ...c, dates: e.target.value },
                                })
                              }
                              placeholder="2019 – 2021"
                              className={inputCls}
                            />
                          </label>
                        </div>
                        <label className="flex flex-col gap-1.5">
                          <span className={labelCls}>
                            What did you do day to day?
                          </span>
                          <textarea
                            value={(c.bullets ?? []).join("\n")}
                            onChange={(e) =>
                              upsertSection({
                                ...sec,
                                content: {
                                  ...c,
                                  bullets: e.target.value.split("\n"),
                                },
                              })
                            }
                            rows={3}
                            placeholder={
                              "One line per task - 2 or 3 is plenty.\ne.g. Loaded and unloaded 20+ trucks per shift"
                            }
                            className={textareaCls}
                          />
                        </label>
                      </div>
                    </Card>
                  );
                })}

                <button
                  onClick={() =>
                    addSection("experience", {
                      role: "",
                      place: "",
                      dates: "",
                      bullets: [],
                    })
                  }
                  className="h-[48px] cursor-pointer rounded-full border-[1.5px] border-dashed border-sky-tint-2 bg-white text-[14px] font-bold text-blue-primary hover:border-blue-primary"
                >
                  + Add experience
                </button>

                <Card>
                  <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
                    Add lived-experience strengths
                  </div>
                  <p className={"mt-2 " + hintCls}>
                    What you did in the program is real work experience. Tap a
                    line to add it to your résumé - then make it yours.
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {STRENGTH_LINES.map((line) => (
                      <button
                        key={line}
                        onClick={() => addStrengthLine(line)}
                        className="cursor-pointer rounded-xl bg-sky-tint px-4 py-2.5 text-left text-[13px]/[1.55] font-semibold text-navy-deep hover:bg-sky-tint-2"
                      >
                        + {line}
                      </button>
                    ))}
                  </div>
                </Card>

                <div className="rounded-2xl bg-amber-bg px-5 py-4 text-[13px]/[1.65] font-semibold text-amber-ink">
                  Questions about discussing a record? Your center staff can
                  help - this tool never gives legal advice.
                </div>
              </>
            )}

            {/* ── SKILLS ─────────────────────────────────────────────── */}
            {step === "skills" && (
              <>
                <Card>
                  <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
                    Your skills
                  </div>
                  <p className={"mt-2 " + hintCls}>
                    Showing up on time is a skill. So is staying calm when
                    things get loud. Add what&apos;s true about you.
                  </p>
                  {skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {skills.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center gap-1.5 rounded-full bg-blue-primary px-3.5 py-1.5 text-[13px] font-bold text-white"
                        >
                          {s}
                          <button
                            onClick={() => setSkills(skills.filter((x) => x !== s))}
                            aria-label={`Remove ${s}`}
                            className="cursor-pointer text-white/70 hover:text-white"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <form
                    className="mt-4 flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      addSkill(skillDraft);
                      setSkillDraft("");
                    }}
                  >
                    <input
                      value={skillDraft}
                      onChange={(e) => setSkillDraft(e.target.value)}
                      placeholder="Type a skill and press enter"
                      className={inputCls}
                    />
                    <button
                      type="submit"
                      className="h-[48px] shrink-0 cursor-pointer rounded-full bg-blue-primary px-5 text-[14px] font-extrabold text-white hover:bg-blue-hover"
                    >
                      Add
                    </button>
                  </form>
                </Card>
                <Card>
                  <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
                    Ideas to get you started
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTED_SKILLS.filter(
                      (s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())
                    ).map((s) => (
                      <button
                        key={s}
                        onClick={() => addSkill(s)}
                        className="cursor-pointer rounded-full border border-sky-tint-2 bg-sky-tint px-3.5 py-1.5 text-[13px] font-bold text-navy-deep hover:bg-sky-tint-2"
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </Card>
              </>
            )}

            {/* ── EDUCATION ──────────────────────────────────────────── */}
            {step === "education" && (
              <SimpleEntriesStep
                kind="education"
                items={educations}
                heading="Education & courses"
                intro="GED, classes at the center, online courses - in progress counts too."
                titlePlaceholder="e.g. GED - completed"
                placePlaceholder="e.g. Laveen Center"
                addLabel="+ Add education"
                upsertSection={upsertSection}
                deleteSection={deleteSection}
                moveSection={moveSection}
                addSection={addSection}
              />
            )}

            {/* ── EXTRAS ─────────────────────────────────────────────── */}
            {step === "extras" && (
              <>
                <SimpleEntriesStep
                  kind="certifications"
                  items={certifications}
                  heading="Certifications"
                  intro="Forklift, food handler, OSHA, first aid - anything with a card or a certificate."
                  titlePlaceholder="e.g. Forklift certification - in training"
                  placePlaceholder="Who issued it"
                  addLabel="+ Add certification"
                  upsertSection={upsertSection}
                  deleteSection={deleteSection}
                  moveSection={moveSection}
                  addSection={addSection}
                />
                <SimpleEntriesStep
                  kind="volunteer"
                  items={volunteers}
                  heading="Volunteer & community"
                  intro="Helping at the center, church, or in your neighborhood shows employers who you are."
                  titlePlaceholder="e.g. Donation room volunteer"
                  placePlaceholder="e.g. My Struggle Center"
                  addLabel="+ Add volunteer work"
                  upsertSection={upsertSection}
                  deleteSection={deleteSection}
                  moveSection={moveSection}
                  addSection={addSection}
                />
              </>
            )}

            {/* ── PREVIEW ────────────────────────────────────────────── */}
            {step === "preview" && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={hintCls}>
                    This is exactly what employers will see.
                  </p>
                  <button
                    onClick={() => window.open("/resume/print?auto=1", "_blank")}
                    className="h-[44px] cursor-pointer rounded-full bg-blue-primary px-6 text-[14px] font-extrabold text-white shadow-[0_8px_20px_rgba(46,124,214,.35)] hover:bg-blue-hover"
                  >
                    Download PDF
                  </button>
                </div>
                <ResumeDoc resume={resume} sections={sections} />
                <p className={"text-center " + hintCls}>
                  Tip: &ldquo;Download PDF&rdquo; opens a print view - choose
                  &ldquo;Save as PDF&rdquo; in the print dialog.
                </p>
                <div className="rounded-2xl bg-sky-tint px-5 py-4 text-[13px]/[1.65] font-semibold text-navy-deep">
                  Ready to use it? You can attach this résumé to a job
                  application from <span className="font-extrabold">My Plan</span>{" "}
                  in your member app.
                </div>
              </>
            )}

            {/* next-step footer */}
            {step !== "preview" && (
              <button
                onClick={() => {
                  const i = STEPS.findIndex((s) => s.id === step);
                  setStep(STEPS[i + 1].id);
                  window.scrollTo({ top: 0 });
                }}
                className="mt-2 h-[52px] cursor-pointer rounded-full bg-navy-deep text-[15px] font-extrabold text-white hover:opacity-90"
              >
                Next: {STEPS[STEPS.findIndex((s) => s.id === step) + 1].label} →
              </button>
            )}
          </div>
        )}
      </main>
    </Chrome>
  );
}

// ── shared editor for education / certifications / volunteer entries ─────

function SimpleEntriesStep({
  kind,
  items,
  heading,
  intro,
  titlePlaceholder,
  placePlaceholder,
  addLabel,
  upsertSection,
  deleteSection,
  moveSection,
  addSection,
}: {
  kind: ResumeSectionKind;
  items: ResumeSection[];
  heading: string;
  intro: string;
  titlePlaceholder: string;
  placePlaceholder: string;
  addLabel: string;
  upsertSection: (s: ResumeSection, immediate?: boolean) => void;
  deleteSection: (id: string) => void;
  moveSection: (kind: ResumeSectionKind, id: string, delta: -1 | 1) => void;
  addSection: (kind: ResumeSectionKind, content: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
          {heading}
        </div>
        <p className={"mt-2 " + hintCls}>{intro}</p>
      </Card>

      {items.map((sec, i) => {
        const c = sec.content as SimpleEntryContent;
        return (
          <Card key={sec.id}>
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-brand">
                Entry {i + 1}
              </div>
              <div className="flex items-center gap-1.5">
                <ArrowButton
                  dir="up"
                  disabled={i === 0}
                  onClick={() => moveSection(kind, sec.id, -1)}
                />
                <ArrowButton
                  dir="down"
                  disabled={i === items.length - 1}
                  onClick={() => moveSection(kind, sec.id, 1)}
                />
                <button
                  onClick={() => deleteSection(sec.id)}
                  className="ml-1 h-8 cursor-pointer rounded-full px-2.5 text-[12px] font-bold text-ink-400 hover:bg-heart-bg hover:text-heart-red"
                >
                  Remove
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3.5">
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>What is it?</span>
                <input
                  value={c.title ?? ""}
                  onChange={(e) =>
                    upsertSection({
                      ...sec,
                      content: { ...c, title: e.target.value },
                    })
                  }
                  placeholder={titlePlaceholder}
                  className={inputCls}
                />
              </label>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>Where</span>
                  <input
                    value={c.place ?? ""}
                    onChange={(e) =>
                      upsertSection({
                        ...sec,
                        content: { ...c, place: e.target.value },
                      })
                    }
                    placeholder={placePlaceholder}
                    className={inputCls}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={labelCls}>When</span>
                  <input
                    value={c.dates ?? ""}
                    onChange={(e) =>
                      upsertSection({
                        ...sec,
                        content: { ...c, dates: e.target.value },
                      })
                    }
                    placeholder="2024 – present"
                    className={inputCls}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1.5">
                <span className={labelCls}>Anything to add? (optional)</span>
                <input
                  value={c.note ?? ""}
                  onChange={(e) =>
                    upsertSection({
                      ...sec,
                      content: { ...c, note: e.target.value },
                    })
                  }
                  placeholder="One short line"
                  className={inputCls}
                />
              </label>
            </div>
          </Card>
        );
      })}

      <button
        onClick={() => addSection(kind, { title: "", place: "", dates: "" })}
        className="h-[48px] cursor-pointer rounded-full border-[1.5px] border-dashed border-sky-tint-2 bg-white text-[14px] font-bold text-blue-primary hover:border-blue-primary"
      >
        {addLabel}
      </button>
    </div>
  );
}
