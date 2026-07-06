"use client";

import type { Course, Enrollment, ProgramCategory } from "@/app/lib/types";
import { nextLesson } from "./MemberApp";

/** Program chip + ring colors, following the demo cards' palette. */
const PROGRAM_STYLE: Record<
  ProgramCategory,
  { chipBg: string; chipText: string; ring: string; text: string }
> = {
  PON: { chipBg: "#EAF2FC", chipText: "#2E7CD6", ring: "#2E7CD6", text: "#2E7CD6" },
  VOC: { chipBg: "#F0EDFB", chipText: "#4E5B9B", ring: "#4E5B9B", text: "#4E5B9B" },
  NAV: { chipBg: "#EAF2FC", chipText: "#2E7CD6", ring: "#2E7CD6", text: "#2E7CD6" },
  IOP: { chipBg: "#F0EDFB", chipText: "#4E5B9B", ring: "#4E5B9B", text: "#4E5B9B" },
};

function CourseCard({
  course,
  enrollment,
  openCourse,
}: {
  course: Course;
  enrollment: Enrollment | undefined;
  openCourse: (id: string) => void;
}) {
  const style = PROGRAM_STYLE[course.program];
  const done = enrollment?.completedLessons.length ?? 0;
  const pct = Math.round((done / course.lessonCount) * 100);
  const next = nextLesson(course, enrollment);
  const complete = next === null;

  if (complete) {
    return (
      <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
        <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-[conic-gradient(#12B76A_0_100%)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[14px] font-extrabold text-success">
            ✓
          </div>
        </div>
        <div className="flex-1">
          <div className="mb-[5px] flex gap-1.5">
            <span
              className="inline-flex h-5 items-center rounded-full px-[9px] text-[10px] font-extrabold"
              style={{ background: style.chipBg, color: style.chipText }}
            >
              {course.program}
            </span>
          </div>
          <div className="text-[15px] font-bold text-ink-900">{course.title}</div>
          <div className="mt-0.5 text-[12px] text-success">
            Completed · all {course.lessonCount} lessons
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openCourse(course.id)}
      className="flex cursor-pointer items-center gap-4 rounded-2xl bg-white px-5 py-[18px] text-left shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:bg-sky-tint"
    >
      <div
        className="flex h-16 w-16 flex-none items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${style.ring} 0 ${pct}%, #EAF2FC ${pct}% 100%)`,
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[13px] font-extrabold"
          style={{ color: style.text }}
        >
          {pct}%
        </div>
      </div>
      <div className="flex-1">
        <div className="mb-[5px] flex gap-1.5">
          <span
            className="inline-flex h-5 items-center rounded-full px-[9px] text-[10px] font-extrabold"
            style={{ background: style.chipBg, color: style.chipText }}
          >
            {course.program}
          </span>
        </div>
        <div className="text-[15px] font-bold text-ink-900">{course.title}</div>
        <div className="mt-0.5 text-[12px] text-ink-600">
          Lesson {next} of {course.lessonCount} · Continue
        </div>
      </div>
      <span className="text-[18px] font-bold text-blue-primary">→</span>
    </button>
  );
}

const VIDEOS = [
  { title: "Walking Through Step 4", cat: "STEPS", dur: "8:24" },
  { title: "Your First 90 Days", cat: "FOUNDATIONS", dur: "12:03" },
  { title: "Why Showing Up Works", cat: "MOTIVATIONAL", dur: "6:41" },
  { title: "Step 3 in Real Life", cat: "STEPS", dur: "9:17" },
];

const CAT_MAP: Record<string, string | null> = {
  All: null,
  "Foundations": "FOUNDATIONS",
  Motivational: "MOTIVATIONAL",
  Steps: "STEPS",
};

export default function LearnTab({
  lessonDone,
  openLesson,
  vidCat,
  setVidCat,
  learn = null,
  openCourse,
}: {
  lessonDone: boolean;
  openLesson: () => void;
  vidCat: string;
  setVidCat: (c: string) => void;
  /** Real data when signed in; null = signed out → styled demo. */
  learn?: { courses: Course[]; enrollments: Enrollment[] } | null;
  openCourse?: (id: string) => void;
}) {
  const coursePct = lessonDone ? 60 : 45;
  const videos = VIDEOS.filter(
    (v) => !CAT_MAP[vidCat] || v.cat === CAT_MAP[vidCat],
  );

  // Signed in → real course cards: in-progress first, completed last.
  // A member with no enrollments sees every course, ready to start at 0%.
  let realCards: { course: Course; enrollment: Enrollment | undefined }[] = [];
  if (learn) {
    const enrolled = learn.enrollments
      .map((e) => ({
        course: learn.courses.find((c) => c.id === e.courseId),
        enrollment: e as Enrollment | undefined,
      }))
      .filter((x): x is { course: Course; enrollment: Enrollment } =>
        Boolean(x.course),
      )
      .sort((a, b) => {
        const aDone = nextLesson(a.course, a.enrollment) === null ? 1 : 0;
        const bDone = nextLesson(b.course, b.enrollment) === null ? 1 : 0;
        return aDone - bDone;
      });
    realCards = enrolled.length
      ? enrolled
      : learn.courses.map((course) => ({ course, enrollment: undefined }));
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-white px-5 pb-3.5 pt-[18px]">
        <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink-900">
          Learn
        </div>
      </div>
      <div className="hairline" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
          MY COURSES
        </div>

        {learn ? (
          realCards.map(({ course, enrollment }) => (
            <CourseCard
              key={course.id}
              course={course}
              enrollment={enrollment}
              openCourse={openCourse ?? (() => {})}
            />
          ))
        ) : (
          <>
        {/* ISE Course 3 - opens lesson player */}
        <button
          type="button"
          onClick={openLesson}
          className="flex cursor-pointer items-center gap-4 rounded-2xl bg-white px-5 py-[18px] text-left shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:bg-sky-tint"
        >
          <div
            className="flex h-16 w-16 flex-none items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#2E7CD6 0 ${coursePct}%, #EAF2FC ${coursePct}% 100%)`,
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[13px] font-extrabold text-blue-primary">
              {coursePct}%
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-[5px] flex gap-1.5">
              <span className="inline-flex h-5 items-center rounded-full bg-sky-tint px-[9px] text-[10px] font-extrabold text-blue-primary">
                PON
              </span>
              <span className="self-center text-[11px] font-semibold text-heart-red">
                Due Sunday
              </span>
            </div>
            <div className="text-[15px] font-bold text-ink-900">
              ISE Course 3 - Decision
            </div>
            <div className="mt-0.5 text-[12px] text-ink-600">
              {lessonDone
                ? "Lesson 3 of 6 · unlocked today"
                : "Lesson 2 of 6 · next: 12 min video"}
            </div>
          </div>
          <span className="text-[18px] font-bold text-blue-primary">→</span>
        </button>

        {/* Forklift Cert */}
        <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-[conic-gradient(#4E5B9B_0_20%,#EAF2FC_20%_100%)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[13px] font-extrabold text-indigo-brand">
              20%
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-[5px] flex gap-1.5">
              <span className="inline-flex h-5 items-center rounded-full bg-[#F0EDFB] px-[9px] text-[10px] font-extrabold text-indigo-brand">
                VOC
              </span>
            </div>
            <div className="text-[15px] font-bold text-ink-900">
              Forklift Certification Prep
            </div>
            <div className="mt-0.5 text-[12px] text-ink-600">
              Module 1 of 4 · self-paced
            </div>
          </div>
          <span className="text-[18px] font-bold text-blue-primary">→</span>
        </div>

        {/* Documents & ID Recovery - complete */}
        <div className="flex items-center gap-4 rounded-2xl bg-white px-5 py-[18px] shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-[conic-gradient(#12B76A_0_100%)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[14px] font-extrabold text-success">
              ✓
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-[5px] flex gap-1.5">
              <span className="inline-flex h-5 items-center rounded-full bg-sky-tint px-[9px] text-[10px] font-extrabold text-blue-primary">
                NAV
              </span>
            </div>
            <div className="text-[15px] font-bold text-ink-900">
              Documents &amp; ID Recovery
            </div>
            <div className="mt-0.5 text-[12px] text-success">
              Completed · +100 points
            </div>
          </div>
        </div>
          </>
        )}

        {/* Video library */}
        <div className="mt-2 text-[12px] font-bold tracking-[.12em] text-blue-primary">
          VIDEO LIBRARY
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(CAT_MAP).map((c) => {
            const on = vidCat === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setVidCat(c)}
                className={
                  "inline-flex h-[38px] cursor-pointer items-center rounded-full border-[1.5px] px-[18px] text-[13px] " +
                  (on
                    ? "border-blue-primary bg-blue-primary font-bold text-white"
                    : "border-sky-tint bg-white font-semibold text-ink-600")
                }
              >
                {c}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          {videos.map((vid) => (
            <div
              key={vid.title}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]"
            >
              <div className="relative h-24 bg-[repeating-linear-gradient(45deg,#DFEAF9_0_10px,#D2E2F5_10px_20px)]">
                <div className="absolute inset-0 bg-[rgba(11,37,69,.35)]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[.92]">
                    <div className="ml-[3px] h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-blue-primary" />
                  </div>
                </div>
                <span className="absolute bottom-1.5 right-2 rounded-md bg-[rgba(11,37,69,.7)] px-[7px] py-0.5 text-[10px] font-bold text-white">
                  {vid.dur}
                </span>
              </div>
              <div className="px-3.5 py-3">
                <div className="text-[13px]/[1.4] font-bold text-ink-900">
                  {vid.title}
                </div>
                <div className="mt-1 text-[10px] font-semibold text-indigo-brand">
                  {vid.cat}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
