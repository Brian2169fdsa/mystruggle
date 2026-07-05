import type { Resume, ResumeSection, ResumeSectionKind } from "../lib/types";

/**
 * The "clean_blue" résumé template — white page card, navy name, blue
 * headline, hairline divider, eyebrow section headings. Montserrat comes
 * from the root layout. Print-perfect: no shadows/rounding when printing.
 * Shared by the /resume Preview step and the /resume/print route.
 */

// Content shapes stored in ResumeSection.content (varies by kind).
export interface ExperienceContent {
  role?: string;
  place?: string;
  dates?: string;
  bullets?: string[];
  /** Marks the "lived-experience strengths" entry the builder manages. */
  lived?: boolean;
}

export interface SkillsContent {
  items?: string[];
}

export interface SimpleEntryContent {
  title?: string;
  place?: string;
  dates?: string;
  note?: string;
}

export const KIND_LABELS: Record<ResumeSectionKind, string> = {
  experience: "Experience",
  skills: "Skills",
  education: "Education",
  certifications: "Certifications",
  volunteer: "Volunteer & Community",
  projects: "Projects",
  references: "References",
};

const KIND_ORDER: ResumeSectionKind[] = [
  "experience",
  "skills",
  "education",
  "certifications",
  "volunteer",
  "projects",
  "references",
];

export function bySort(a: ResumeSection, b: ResumeSection): number {
  return a.sort - b.sort;
}

// ── seed-shape tolerance ─────────────────────────────────────────────────
// Seeded résumés store one aggregate section per kind with
// content.items: [{ role|credential|name, org, year|dates, ... }].
// The builder edits one section per entry. normalizeSections() explodes
// aggregates into per-entry sections (deterministic derived ids) so both
// shapes render and edit identically.

type Raw = Record<string, unknown>;
const rstr = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

function mapItem(kind: ResumeSectionKind, item: Raw): Record<string, unknown> {
  if (kind === "experience") {
    return {
      role: rstr(item.role) ?? rstr(item.title) ?? "",
      place: rstr(item.org) ?? rstr(item.place) ?? rstr(item.company) ?? "",
      dates: rstr(item.dates) ?? rstr(item.year) ?? "",
      bullets: Array.isArray(item.bullets)
        ? item.bullets.filter((b): b is string => typeof b === "string")
        : [],
      ...(item.lived === true ? { lived: true } : {}),
    };
  }
  return {
    title: rstr(item.credential) ?? rstr(item.title) ?? rstr(item.name) ?? "",
    place: rstr(item.org) ?? rstr(item.place) ?? rstr(item.issuer) ?? "",
    dates: rstr(item.year) ?? rstr(item.dates) ?? "",
    note: rstr(item.note) ?? rstr(item.status) ?? "",
  };
}

export function normalizeSections(sections: ResumeSection[]): {
  sections: ResumeSection[];
  /** Ids of aggregate sections that were exploded (for migration). */
  explodedIds: string[];
} {
  const out: ResumeSection[] = [];
  const explodedIds: string[] = [];
  for (const sec of sections) {
    const items = (sec.content as Raw).items;
    const isAggregate =
      sec.kind !== "skills" &&
      Array.isArray(items) &&
      items.every((it) => it && typeof it === "object");
    if (isAggregate && items.length > 0) {
      explodedIds.push(sec.id);
      (items as Raw[]).forEach((item, i) => {
        out.push({
          id: `${sec.id}-${i}`,
          resumeId: sec.resumeId,
          kind: sec.kind,
          content: mapItem(sec.kind, item),
          sort: sec.sort * 100 + i,
        });
      });
    } else {
      out.push(sec);
    }
  }
  return { sections: out, explodedIds };
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-extrabold uppercase tracking-[.16em] text-blue-primary">
      {children}
    </h2>
  );
}

function ExperienceItem({ content }: { content: ExperienceContent }) {
  const bullets = (content.bullets ?? []).filter((b) => b.trim());
  const meta = [content.place, content.dates].filter(Boolean).join(" · ");
  return (
    <div className="mt-3.5 first:mt-2.5">
      <div className="text-[14.5px] font-extrabold text-navy-deep">
        {content.role || "Role"}
      </div>
      {meta && (
        <div className="mt-0.5 text-[12.5px] font-semibold text-ink-600">
          {meta}
        </div>
      )}
      {bullets.length > 0 && (
        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-[13px]/[1.6] font-medium text-ink-600 marker:text-blue-primary">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SimpleItem({ content }: { content: SimpleEntryContent }) {
  const meta = [content.place, content.dates].filter(Boolean).join(" · ");
  return (
    <div className="mt-3 first:mt-2.5">
      <div className="text-[14px] font-bold text-navy-deep">
        {content.title || "Untitled"}
      </div>
      {meta && (
        <div className="mt-0.5 text-[12.5px] font-semibold text-ink-600">
          {meta}
        </div>
      )}
      {content.note && (
        <p className="mt-1 text-[13px]/[1.6] font-medium text-ink-600">
          {content.note}
        </p>
      )}
    </div>
  );
}

function SkillChips({ content }: { content: SkillsContent }) {
  const items = (content.items ?? []).filter((s) => s.trim());
  if (!items.length) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {items.map((s) => (
        <span
          key={s}
          className="rounded-full border border-sky-tint-2 bg-sky-tint px-3 py-1 text-[12.5px] font-bold text-navy-deep"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

export default function ResumeDoc({
  resume,
  sections: rawSections,
}: {
  resume: Resume;
  sections: ResumeSection[];
}) {
  const sections = normalizeSections(rawSections).sections;
  const contact = [
    resume.contact?.phone,
    resume.contact?.email,
    resume.contact?.city,
  ].filter(Boolean);

  const groups = KIND_ORDER.map((kind) => ({
    kind,
    items: sections.filter((s) => s.kind === kind).sort(bySort),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto w-full max-w-[820px] rounded-2xl bg-white px-7 py-9 shadow-[0_2px_16px_rgba(11,37,69,.08)] print:max-w-none print:rounded-none print:px-0 print:py-0 print:shadow-none sm:px-12 sm:py-12">
      <header>
        <h1 className="text-[30px]/[1.1] font-extrabold tracking-[-0.02em] text-navy-deep sm:text-[34px]/[1.1]">
          {resume.fullName || "Your Name"}
        </h1>
        {resume.headline && (
          <div className="mt-1.5 text-[15.5px] font-bold text-blue-primary">
            {resume.headline}
          </div>
        )}
        {contact.length > 0 && (
          <div className="mt-2 text-[12.5px] font-semibold text-ink-600">
            {contact.join("  ·  ")}
          </div>
        )}
        <div className="hairline mt-5" />
      </header>

      {resume.summary && (
        <p className="mt-5 text-[13.5px]/[1.75] font-medium text-ink-600">
          {resume.summary}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.kind} className="mt-7 break-inside-avoid">
          <Eyebrow>{KIND_LABELS[g.kind]}</Eyebrow>
          {g.items.map((s) =>
            g.kind === "experience" ? (
              <ExperienceItem
                key={s.id}
                content={s.content as ExperienceContent}
              />
            ) : g.kind === "skills" ? (
              <SkillChips key={s.id} content={s.content as SkillsContent} />
            ) : (
              <SimpleItem key={s.id} content={s.content as SimpleEntryContent} />
            )
          )}
        </section>
      ))}

      {groups.length === 0 && !resume.summary && (
        <p className="mt-6 text-[13.5px] font-medium text-ink-400">
          Your résumé will appear here as you fill in the steps.
        </p>
      )}
    </div>
  );
}
