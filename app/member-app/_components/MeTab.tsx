"use client";

const JOURNEY: {
  title: string;
  sub: string;
  state: "done" | "current" | "future";
  lineColor?: string;
}[] = [
  {
    title: "Outreach",
    sub: "Met the Laveen team · Oct 2025",
    state: "done",
    lineColor: "#12B76A",
  },
  {
    title: "Stabilization",
    sub: "Matched with Marcus · Nov 2025",
    state: "done",
    lineColor: "#12B76A",
  },
  {
    title: "In Program",
    sub: "GED + first job · Feb 2026",
    state: "done",
    lineColor: "#2E7CD6",
  },
  {
    title: "Transitional — you are here",
    sub: "Hallway house · $175/week goal",
    state: "current",
    lineColor: "#E2E8F0",
  },
  { title: "Independent", sub: "A place of her own", state: "future" },
];

export default function MeTab({
  points,
  lessonDone,
}: {
  points: number;
  lessonDone: boolean;
}) {
  const levelPct = Math.round((points / 1000) * 100);

  return (
    <div className="flex flex-1 flex-col">
      {/* Navy profile header */}
      <div className="bg-navy-deep px-5 pb-6 pt-7 text-center">
        <div className="mx-auto flex h-[84px] w-[84px] items-center justify-center rounded-full border-[3px] border-white/25 bg-sky-tint text-[30px] font-extrabold text-indigo-brand">
          D
        </div>
        <div className="mt-3 text-[22px] font-extrabold text-white">
          Danielle
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-2">
          <span className="inline-flex h-[26px] items-center rounded-full bg-white/[.12] px-3 text-[11px] font-bold text-[#8FBCF0]">
            Member #039521464
          </span>
          <span className="tnum inline-flex h-[26px] items-center gap-[5px] rounded-full bg-[rgba(234,179,8,.18)] px-3 text-[11px] font-extrabold text-gold-badge">
            ◆ SILVER · {points} pts
          </span>
        </div>
        <div className="mx-auto mt-3.5 max-w-[260px]">
          <div className="flex justify-between text-[10px] font-semibold text-[#8FBCF0]">
            <span>Silver</span>
            <span>Gold at 1,000</span>
          </div>
          <div className="mt-[5px] h-1.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-gold-badge"
              style={{ width: `${levelPct}%` }}
            />
          </div>
        </div>
      </div>
      <div className="hairline" />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Badges */}
        <div className="text-[12px] font-bold tracking-[.12em] text-blue-primary">
          MY BADGES
        </div>
        <div className="grid grid-cols-4 gap-3">
          {["First Week", "GED Earned", "30-Day Streak"].map((name) => (
            <div
              key={name}
              className="rounded-2xl border-[1.5px] border-gold-border bg-white px-2 py-3.5 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)]"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gold-bg text-[16px] font-extrabold text-gold-ink">
                ◆
              </div>
              <div className="mt-2 text-[10px]/[1.3] font-bold text-ink-900">
                {name}
              </div>
            </div>
          ))}
          {/* Course Champ — unlocked by completing the lesson */}
          <div
            className={
              "rounded-2xl border-[1.5px] bg-white px-2 py-3.5 text-center shadow-[0_1px_3px_rgba(11,37,69,.06)] " +
              (lessonDone ? "border-gold-border" : "border-white opacity-45")
            }
          >
            <div
              className={
                "mx-auto flex h-10 w-10 items-center justify-center rounded-full text-[16px] font-extrabold " +
                (lessonDone
                  ? "bg-gold-bg text-gold-ink"
                  : "bg-[#F1F5F9] text-ink-400")
              }
            >
              {lessonDone ? "◆" : "◇"}
            </div>
            <div className="mt-2 text-[10px]/[1.3] font-bold text-ink-900">
              Course Champ
            </div>
          </div>
        </div>

        {/* Journey timeline */}
        <div className="mt-1.5 text-[12px] font-bold tracking-[.12em] text-blue-primary">
          MY JOURNEY
        </div>
        <div className="rounded-2xl bg-white px-6 pb-5 pt-6 shadow-[0_1px_3px_rgba(11,37,69,.06)]">
          <div className="flex flex-col">
            {JOURNEY.map((step, i) => {
              const last = i === JOURNEY.length - 1;
              return (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    {step.state === "done" && (
                      <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-success text-[11px] font-bold text-white">
                        ✓
                      </span>
                    )}
                    {step.state === "current" && (
                      <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-blue-primary text-[10px] font-bold text-white shadow-[0_0_0_4px_#EAF2FC]">
                        ●
                      </span>
                    )}
                    {step.state === "future" && (
                      <span className="h-[22px] w-[22px] flex-none rounded-full border-2 border-[#E2E8F0]" />
                    )}
                    {!last && (
                      <div
                        className="min-h-[26px] w-0.5 flex-1"
                        style={{ background: step.lineColor }}
                      />
                    )}
                  </div>
                  <div className={last ? "" : "pb-[18px]"}>
                    <div
                      className={
                        "text-[14px] font-bold " +
                        (step.state === "current"
                          ? "text-blue-primary"
                          : step.state === "future"
                            ? "text-ink-400"
                            : "text-ink-900")
                      }
                    >
                      {step.title}
                    </div>
                    <div
                      className={
                        "text-[12px] " +
                        (step.state === "future" ? "text-ink-400" : "text-ink-600")
                      }
                    >
                      {step.sub}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
