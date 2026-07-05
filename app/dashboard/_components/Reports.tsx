import { CARD } from "./types";

type Cell = {
  value: string;
  /** green = above benchmark, red = below, blue = 12-month figure */
  tone: "green" | "red" | "blue";
  delta?: string;
};

const TONE: Record<Cell["tone"], string> = {
  green: "text-success",
  red: "text-heart-red",
  blue: "text-blue-primary",
};

const ROWS: {
  chip: string;
  indigo: boolean;
  enrolled: string;
  cells: Cell[];
}[] = [
  {
    chip: "PON",
    indigo: false,
    enrolled: "128 enrolled",
    cells: [
      { value: "74%", tone: "green", delta: "▲ +9 vs goal" },
      { value: "68%", tone: "green" },
      { value: "81%", tone: "blue" },
    ],
  },
  {
    chip: "VOC",
    indigo: true,
    enrolled: "64 enrolled",
    cells: [
      { value: "70%", tone: "green" },
      { value: "58%", tone: "red", delta: "▼ −7 vs goal" },
      { value: "76%", tone: "blue" },
    ],
  },
  {
    chip: "IOP",
    indigo: false,
    enrolled: "43 enrolled",
    cells: [
      { value: "69%", tone: "green" },
      { value: "66%", tone: "green" },
      { value: "83%", tone: "blue" },
    ],
  },
  {
    chip: "NAV",
    indigo: true,
    enrolled: "87 enrolled",
    cells: [
      { value: "77%", tone: "green" },
      { value: "71%", tone: "green" },
      { value: "85%", tone: "blue" },
    ],
  },
];

export default function Reports() {
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <div className="text-[26px] font-extrabold tracking-[-0.02em] text-ink-900">
          Outcomes &amp; retention
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex h-11 cursor-pointer items-center rounded-full border-[1.5px] border-blue-primary px-[22px] text-[13px] font-bold text-blue-primary hover:bg-sky-tint"
          >
            2026 cohorts ▾
          </button>
          <button
            type="button"
            className="inline-flex h-11 cursor-pointer items-center rounded-full bg-blue-primary px-[22px] text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(46,124,214,.28)] hover:bg-blue-hover"
          >
            Export CSV / PDF
          </button>
        </div>
      </div>

      <div className={CARD + " px-8 py-7"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-base font-bold text-ink-900">
            Retention by program
          </div>
          <div className="text-xs font-semibold text-ink-600">
            Benchmarks: 65% (3-mo) · 65% (6-mo) · 80% (12-mo program completion)
          </div>
        </div>
        <div className="mt-5 grid grid-cols-[1.2fr_1fr_1fr_1fr] px-1 text-xs font-bold tracking-[.06em] text-ink-600">
          <span>PROGRAM</span>
          <span>3-MONTH</span>
          <span>6-MONTH</span>
          <span>12-MONTH</span>
        </div>
        {ROWS.map((r, i) => (
          <div
            key={r.chip}
            className={
              "grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center border-t border-canvas px-1 py-4" +
              (i === 0 ? " mt-2.5" : "")
            }
          >
            <span className="text-[15px] font-bold text-ink-900">
              <span
                className={
                  "mr-2.5 inline-flex h-6 items-center rounded-full px-3 text-[11px] font-extrabold " +
                  (r.indigo
                    ? "bg-[#F0EDFB] text-indigo-brand"
                    : "bg-sky-tint text-blue-primary")
                }
              >
                {r.chip}
              </span>
              {r.enrolled}
            </span>
            {r.cells.map((c, j) => (
              <span
                key={j}
                className={"tnum text-[22px] font-extrabold " + TONE[c.tone]}
              >
                {c.value}
                {c.delta && (
                  <span className="text-[11px] font-semibold text-ink-600">
                    {" "}
                    {c.delta}
                  </span>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-[18px]">
        <div className={CARD + " px-7 py-6"}>
          <div className="text-[13px] font-medium text-ink-600">
            Stage advances this year
          </div>
          <div className="tnum mt-1.5 text-[40px] font-extrabold tracking-[-0.02em] text-blue-primary">
            96
          </div>
          <div className="mt-0.5 text-xs font-semibold text-success">
            ▲ 18% vs 2025
          </div>
        </div>
        <div className={CARD + " px-7 py-6"}>
          <div className="text-[13px] font-medium text-ink-600">
            Reached Independent
          </div>
          <div className="tnum mt-1.5 text-[40px] font-extrabold tracking-[-0.02em] text-success">
            22
          </div>
          <div className="mt-0.5 text-xs font-semibold text-ink-600">
            avg 9.5 months in program
          </div>
        </div>
        <div className={CARD + " px-7 py-6"}>
          <div className="text-[13px] font-medium text-ink-600">
            Reentry savings released
          </div>
          <div className="tnum mt-1.5 text-[40px] font-extrabold tracking-[-0.02em] text-blue-primary">
            $41,200
          </div>
          <div className="mt-0.5 text-xs font-semibold text-ink-600">
            to 31 members at stage advance
          </div>
        </div>
      </div>
    </div>
  );
}
