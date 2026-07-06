import { NextResponse } from "next/server";
import { db, save, uid } from "@/app/lib/store";
import { getSessionUser } from "@/app/lib/auth";
import type { Resume, ResumeSection, ResumeSectionKind } from "@/app/lib/types";

/**
 * /api/resumes - the member-owned Résumé Builder API (docs/13 Part D).
 *
 * GET  → { resume, sections } for the signed-in user's primary résumé.
 *        Creates an empty clean_blue default on first request.
 * POST → three autosave-friendly shapes, all owner-only:
 *        { fullName?|headline?|summary?|contact? }          field updates
 *        { section: { id?, kind, content, sort? } }          upsert a section
 *        { deleteSectionId }                                 remove a section
 */

const KINDS: ResumeSectionKind[] = [
  "experience",
  "education",
  "skills",
  "certifications",
  "volunteer",
  "references",
  "projects",
];

// The store's DB interface may not know about résumés yet - the seed data
// lands from a concurrent workstream. Access defensively and create the
// arrays on demand so both orders of arrival work.
type ResumeTables = { resumes: Resume[]; resumeSections: ResumeSection[] };

function tables(): ResumeTables {
  const d = db() as unknown as Partial<ResumeTables>;
  d.resumes ??= [];
  d.resumeSections ??= [];
  return d as ResumeTables;
}

/** The user's primary résumé - created empty on first touch. */
function primaryResumeFor(user: {
  id: string;
  name: string;
  email: string;
}): Resume {
  const t = tables();
  let resume =
    t.resumes.find((r) => r.memberId === user.id && r.isPrimary) ??
    t.resumes.find((r) => r.memberId === user.id);
  if (!resume) {
    resume = {
      id: uid(),
      memberId: user.id,
      fullName: user.name,
      contact: { email: user.email },
      template: "clean_blue",
      isPrimary: true,
      updatedAt: Date.now(),
    };
    t.resumes.push(resume);
    save();
  }
  return resume;
}

function sectionsOf(resumeId: string): ResumeSection[] {
  return tables()
    .resumeSections.filter((s) => s.resumeId === resumeId)
    .sort((a, b) => a.sort - b.sort);
}

const str = (v: unknown, max = 2000): string | undefined =>
  typeof v === "string" ? v.slice(0, max) : undefined;

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const resume = primaryResumeFor(user);
  return NextResponse.json({ resume, sections: sectionsOf(resume.id) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const t = tables();
  const resume = primaryResumeFor(user);

  // ── delete a section (owner-scoped) ──────────────────────────────────
  if (typeof body.deleteSectionId === "string") {
    const before = t.resumeSections.length;
    const idx = t.resumeSections.findIndex(
      (s) => s.id === body.deleteSectionId && s.resumeId === resume.id
    );
    if (idx >= 0) t.resumeSections.splice(idx, 1);
    resume.updatedAt = Date.now();
    save();
    return NextResponse.json({
      ok: true,
      deleted: t.resumeSections.length < before,
      resume,
      sections: sectionsOf(resume.id),
    });
  }

  // ── upsert a section (owner-scoped) ──────────────────────────────────
  if (body.section && typeof body.section === "object") {
    const s = body.section as Record<string, unknown>;
    const kind = s.kind as ResumeSectionKind;
    if (!KINDS.includes(kind)) {
      return NextResponse.json({ error: "Unknown section kind." }, { status: 400 });
    }
    const content =
      s.content && typeof s.content === "object" && !Array.isArray(s.content)
        ? (s.content as Record<string, unknown>)
        : {};
    const sort =
      typeof s.sort === "number" && Number.isFinite(s.sort)
        ? s.sort
        : sectionsOf(resume.id).length;

    let section: ResumeSection | undefined =
      typeof s.id === "string"
        ? t.resumeSections.find(
            (x) => x.id === s.id && x.resumeId === resume.id
          )
        : undefined;

    if (section) {
      section.kind = kind;
      section.content = content;
      section.sort = sort;
    } else {
      // Honor a client-generated id unless it's taken by someone else's row.
      const requestedId = typeof s.id === "string" ? s.id : undefined;
      const idTaken =
        requestedId && t.resumeSections.some((x) => x.id === requestedId);
      section = {
        id: !requestedId || idTaken ? uid() : requestedId,
        resumeId: resume.id,
        kind,
        content,
        sort,
      };
      t.resumeSections.push(section);
    }
    resume.updatedAt = Date.now();
    save();
    return NextResponse.json({
      ok: true,
      section,
      resume,
      sections: sectionsOf(resume.id),
    });
  }

  // ── résumé field updates (autosave) ──────────────────────────────────
  const fullName = str(body.fullName, 120);
  if (fullName !== undefined && fullName.trim()) resume.fullName = fullName.trim();
  const headline = str(body.headline, 200);
  if (headline !== undefined) resume.headline = headline;
  const summary = str(body.summary, 2000);
  if (summary !== undefined) resume.summary = summary;
  if (body.contact && typeof body.contact === "object") {
    const c = body.contact as Record<string, unknown>;
    resume.contact = {
      phone: str(c.phone, 40),
      email: str(c.email, 120),
      city: str(c.city, 80),
    };
  }
  resume.updatedAt = Date.now();
  save();
  return NextResponse.json({ ok: true, resume, sections: sectionsOf(resume.id) });
}
