"use client";

const QUIZ_OPTIONS = [
  "A choice you keep making, one day at a time",
  "A one-time event you complete",
  "Something your mentor decides for you",
];

export default function LessonPlayer({
  closeLesson,
  quiz,
  setQuiz,
  completeLesson,
  courseTitle = "ISE Course 3 — Decision",
  lessonNumber = 2,
  lessonCount = 6,
}: {
  closeLesson: () => void;
  quiz: number;
  setQuiz: (i: number) => void;
  completeLesson: () => void;
  /** Real course/lesson when signed in; defaults = the styled demo. */
  courseTitle?: string;
  lessonNumber?: number;
  lessonCount?: number;
}) {
  return (
    <div className="flex flex-1 flex-col">
      {/* Navy header */}
      <div className="flex items-center justify-between bg-navy-deep px-5 py-3.5">
        <button
          type="button"
          onClick={closeLesson}
          className="min-h-[44px] min-w-[44px] cursor-pointer text-left text-[20px] font-bold text-white"
        >
          ←
        </button>
        <div className="text-center">
          <div className="text-[14px] font-bold text-white">
            {courseTitle}
          </div>
          <div className="text-[11px] font-medium text-[#8FBCF0]">
            Lesson {lessonNumber} of {lessonCount}
          </div>
        </div>
        <span className="min-w-[44px]" />
      </div>

      {/* Video area */}
      <div className="relative h-[220px] bg-[repeating-linear-gradient(45deg,#16335C_0_14px,#12294A_14px_28px)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-blue-primary shadow-[0_8px_24px_rgba(11,37,69,.5)]">
            <div className="ml-[5px] h-0 w-0 border-y-[12px] border-l-[18px] border-y-transparent border-l-white" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[5px] bg-white/20">
          <div className="h-full w-[35%] bg-blue-primary" />
        </div>
        <span className="tnum absolute bottom-3 right-3.5 rounded-md bg-[rgba(11,37,69,.7)] px-2 py-[3px] text-[11px] font-bold text-white">
          4:12 / 12:04
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="text-[19px] font-extrabold tracking-[-0.02em] text-ink-900">
          Made a decision — what it actually means
        </div>

        {/* Journal — private */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold tracking-[.12em] text-indigo-brand">
              JOURNAL · PRIVATE
            </span>
            <span className="text-[11px] font-semibold text-success">
              ✓ Draft saved
            </span>
          </div>
          <div className="mt-2.5 text-[15px]/[1.5] font-semibold text-ink-900">
            What decision have you been circling but not making? What would
            deciding look like this week?
          </div>
          <textarea
            className="mt-3 min-h-[96px] w-full resize-none rounded-[14px] border-[1.5px] border-sky-tint bg-canvas px-4 py-3.5 text-[14px]/[1.6] text-ink-900 outline-none focus:border-blue-primary"
            defaultValue="Honestly I've been putting off calling my sister. Deciding looks like just dialing…"
            aria-label="Journal draft"
          />
          <div className="mt-2 text-[11px] text-ink-400">
            Only you and your assigned staff can read this. Saved offline,
            syncs when connected.
          </div>
        </div>

        {/* Quiz */}
        <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
            QUICK CHECK · 1 OF 1
          </div>
          <div className="mt-2.5 text-[15px]/[1.5] font-semibold text-ink-900">
            In Step 3, &ldquo;made a decision&rdquo; means:
          </div>
          <div className="mt-3.5 flex flex-col gap-2.5">
            {QUIZ_OPTIONS.map((label, i) => {
              const on = quiz === i;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setQuiz(i)}
                  className={
                    "flex min-h-[48px] cursor-pointer items-center rounded-[14px] px-4 py-2.5 text-left text-[14px] " +
                    (on
                      ? "border-2 border-blue-primary bg-sky-tint font-bold text-blue-primary"
                      : "border-[1.5px] border-sky-tint bg-white font-semibold text-ink-600")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={completeLesson}
          className="inline-flex h-14 cursor-pointer items-center justify-center rounded-full bg-blue-primary text-[16px] font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
        >
          Complete lesson · +10 points
        </button>
        <div className="pb-3 text-center text-[12px] font-medium text-ink-400">
          {lessonNumber < lessonCount
            ? `Lesson ${lessonNumber + 1} unlocks when this one's done`
            : "Last lesson — the course completes when this one's done"}
        </div>
      </div>
    </div>
  );
}
