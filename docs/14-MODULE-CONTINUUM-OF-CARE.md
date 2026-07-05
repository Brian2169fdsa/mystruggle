# 14 — Module: Continuum of Care (the platform thesis)

> **Read this first, Claude Code:** EXPANSION. This formalizes the lifecycle the platform already half-models (`enrollments`, `journey_stage`, `mv_outcomes`) into the product's central spine. Extend — do not replace — enrollments, LMS (docs/07), community (docs/05/13), giving (docs/04), dashboard (docs/08), and The Guide/Companion (docs/02/13). New checklist: `requirements/11-CONTINUUM-OF-CARE.md`. Follow AUTOPILOT.

---

## The one-sentence thesis

**My Struggle follows a person *before* they reach a treatment center, *during* their program, and *after* they leave — one continuous record of engagement and recovery-capital growth — and that longitudinal proof of continuum-of-care outcomes is exactly what centers license and what the website sells.**

Every other module is a spoke; this is the hub. Community, giving, LMS, mentorship, goals, companion — each generates a signal, and the continuum is the timeline those signals live on. Nothing on the platform should exist that doesn't feed a person's continuum record.

## Why this is the wedge (evidence + business)

The #1 unmet need centers report is **lack of program/alumni follow-up** and **inability to measure engagement/efficacy after discharge** (REPrieve deck + recovery research). Treatment is episodic; recovery is continuous. No EHR follows a person after discharge, and the pre-treatment window is invisible entirely. The platform owns both blind spots. That's the pitch: *"Treatment may end. The support — and the data — does not."* Centers pay because this is the only place they can prove long-term outcomes to funders, licensors, and referral sources.

---

## The Five Phases (one person, one continuous timeline)

The existing `journey_stage` enum expands conceptually into five care phases. Keep the enum values; add a parallel `care_phase` that captures the clinical relationship, because a person can be, e.g., `independent` in journey terms while `alumni` of a specific center.

```
care_phase (per enrollment, per person over time):
  1. PRE-CARE     — in community before any center relationship (unaffiliated member)
  2. INTAKE       — connected to a center, assessment, not yet in programming
  3. IN-PROGRAM   — active in a level of care (detox / residential / PHP / IOP / OP)
  4. TRANSITION   — stepping down, discharge planning, aftercare
  5. CONTINUING   — post-discharge alumni, ongoing community + follow-up (indefinite)
```

**PRE-CARE is the differentiator no one has.** A person can join the My Struggle community (via QR giving, outreach center, self-signup, a friend) with zero center affiliation. Their engagement, goals, and community activity accrue from day one. When they later enter a center, that center — with consent — sees the runway that led up to treatment. This is recovery capital measured *before* the episode, which makes the *during* and *after* deltas provable.

## The Care Record (the spine)

```
care_episodes                 -- a person's relationship with ONE center over time (extends enrollments)
  participant_id → participants, org_id → orgs,
  care_phase text check in ('pre_care','intake','in_program','transition','continuing'),
  level_of_care text null check in ('detox','residential','php','iop','op','recovery_maintenance'),
  started_at, phase_changed_at, ended_at null,
  referral_source text null,          -- how they came in (self, community, partner, court, hospital)
  discharge_type text null            -- completed / stepped_down / left_early / transferred

phase_transitions             -- append-only log of every phase/LOC change (the outcomes gold)
  care_episode_id → care_episodes, from_phase text, to_phase text,
  from_loc text null, to_loc text null, changed_by uuid, reason text, at timestamptz

continuum_events              -- the unified activity stream across ALL modules, per person
  participant_id → participants, source text check in
    ('community','lms','goal','giving','mentorship','companion','checkin','session','phase'),
  ref_id uuid, weight int,            -- engagement weighting for scoring
  occurred_at timestamptz, org_context uuid null
```

`continuum_events` is the heartbeat: every meaningful action from every module writes one row (a post, a lesson done, a goal milestone, a donation received, a mentor session, a Companion check-in, a phase change). This single stream powers the engagement score, the risk model, the timeline UI, and the licensed dataset — one write path, many readers. Existing modules get a thin hook to emit here; they are not rewritten.

## Phase-by-phase product behavior

### PRE-CARE
- Full community, giving profile, goals, Companion, self-paced content
- Center visibility: none (person is unaffiliated) until they consent to connect
- Value: builds baseline recovery capital + a warm on-ramp; when a center connects, baseline already exists

### INTAKE
- Center connects the member (invite + member consent, or enroll at outreach center)
- Consent handshake (docs/10): member explicitly grants the center access to their continuum record and future engagement. Granular + revocable. Pre-care history shared only if the member opts in.
- Center assigns intake content, orientation, expectations

### IN-PROGRAM (the clinical communication + programming layer — NEW)
This is what centers asked for: communicate with clients *while in IOP or in-facility*, and deliver programming.

**Center ↔ Client communication (not clinical notes — engagement comms):**
```
care_channels                 -- a communication space per episode or per program group
  org_id, care_episode_id → care_episodes null, group_id null,
  kind text check in ('one_to_one','program_group','announcement'),
  title text
care_messages
  channel_id → care_channels, sender_id → profiles, body text, media jsonb,
  moderation_status, read_at
```
- **Program group channels**: an IOP cohort gets a group space — staff post the schedule, assignments, encouragement; clients discuss (moderated, docs/06 pipeline). This is the "James D / Nancy C / Mark B" group-conversation pattern from the REPrieve dashboard mock.
- **1:1 staff↔client channel**: care-team messaging (appointment reminders, check-ins, "you missed group — you ok?"). Distinct from mentor chat and from the public feed. Staff-auditable per org policy.
- **Announcements**: one-way center broadcasts.
- Hard line (docs/10): these are engagement communications, NOT therapy delivery or clinical documentation. No PHI/clinical notes in messages; UI copy tells staff so. Clinical stays in the EHR.

**Level-of-care programming (extends LMS docs/07):**
- Courses/assignments already exist; add `level_of_care` targeting and **facility vs remote** delivery context so a center can assign an IOP curriculum to the IOP cohort specifically.
- In-facility mode: content consumable on center devices/kiosks; attendance/completion feeds `continuum_events`.
- Group-facilitated sessions (already in docs/07) get schedule + attendance tied to the program group channel.
- Gamification runs the same — streaks/points/badges — so engagement is measured identically inside and outside the facility (that continuity is the whole point).

**Live engagement analytics for staff:** real-time per-cohort and per-client engagement (who's showing up in content, community, check-ins), surfaced on the dashboard (below).

### TRANSITION
- Discharge planning surface: aftercare recovery goals (housing/employment via docs/13), mentor match for post-discharge, "continuing" community circles auto-suggested
- The step-down is logged (`phase_transitions`) — the moment most outcomes tracking dies, and where this platform keeps going

### CONTINUING (post-discharge — the licensed outcomes engine)
- The member keeps everything: community, Companion, goals, giving, mentor. The center keeps *visibility* (consented) indefinitely.
- Automated follow-up cadence (telephone-recovery-support pattern, evidence-backed): Companion/staff check-ins at 30/60/90 days, 6mo, 12mo; each writes a `continuum_event` and can surface a light recovery-capital pulse (optional BARC-10).
- Re-engagement + relapse-risk signals flow to the center's alumni dashboard. A dip in engagement post-discharge is the earliest, cheapest relapse warning that exists — and only this platform sees it.

## The Engagement & Outcomes Data Product (what centers license)

```
mv_continuum_score            -- per participant, rolling: engagement index from weighted continuum_events
mv_care_outcomes              -- per org/cohort: phase-transition rates, completion, retention-in-recovery
                                 at 30/60/90/180/365d post-discharge, recovery-capital deltas pre→during→post
mv_efficacy                   -- engagement-vs-outcome correlation (proves "engagement = efficacy")
```

- **Continuum score**: a single 0–100 engagement index per person, trended over their whole timeline across all phases — the number a case manager watches and a funder trusts.
- **Cohort outcomes**: retention-in-recovery curves post-discharge, completion by LOC, recovery-capital growth pre→during→post (the delta PRE-CARE makes possible), all filterable.
- **Licensing tiers** (business model — see docs/10 for the data-governance guardrails this REQUIRES):
  - *Center tier*: a center's own clients' data, live (included with platform).
  - *Outcomes/research tier*: de-identified, aggregated longitudinal outcomes licensed to centers, networks, payers, or researchers to prove program efficacy. **De-identification + consent + IRB-grade governance are mandatory and gate this tier** (docs/10 §6 additions). Never license identifiable data.
  - *Referral/network tier*: (v2) warm continuum handoffs between partner orgs.

## Dashboard additions (extend docs/08)

- **Continuum view** (new top-level): a person's entire timeline as a horizontal ribbon — pre-care → intake → each LOC → transition → continuing — with engagement sparkline overlaid and every module's events as markers. This is the screen that sells the platform in a demo.
- **Program cockpit** (in-program): per-cohort roster, group channel, live engagement, attendance, assignment completion, at-risk flags for clients going quiet mid-program.
- **Alumni/continuing dashboard**: post-discharge roster (retained by consent), continuum scores, follow-up cadence status, re-engagement queue, relapse-risk early-warning.
- **Outcomes reporting**: extends existing reports with pre→during→post recovery-capital deltas, retention curves, and the efficacy correlation; branded PDF + the Claude narrative summary for grant/licensor packets.

## Website story (extend docs/01 website + docs/12)

Centers are the buyer; the site must tell this story. New/expanded pages under a **"For Recovery Centers"** section:
- Hero: *"Treatment ends. The continuum doesn't."* — the before/during/after ribbon as the hero visual (animated: a dot traveling pre-care → program → years of continuing engagement).
- The three blind spots centers can't see today (before, after, and engagement-as-efficacy) and how the platform fills them.
- Live-looking demo dashboard (seed data) — continuum ribbon + outcomes curves.
- Outcomes/ROI section reusing the New Freedom benchmarks (engagement 40→65, completion 50→65, digital scale 30→80, +20% long-term sobriety, 2 hrs/day saved) as the proof points.
- "How the community follows them into the world" — plain-language explainer connecting the client's Facebook-style community life, goals, and giving to the outcomes the center gets.
- Data & privacy section: how consent, de-identification, and licensing work (trust is the sale).
- CTA: Request a demo / Partner with us.

## The coherence contract (how it ALL ties together — write this into the demo and the site)

One member, one storyline, every system touched:

> **Danielle** joins the community from a QR flyer while still on the street (**PRE-CARE**): she posts, sets a "get stable" goal, the Companion checks in. Weeks later she enters a partner center (**INTAKE**) and consents to connect — the center sees her pre-care runway. In **IOP (IN-PROGRAM)** she's in the cohort group channel, completing the LMS curriculum on facility kiosks, earning streaks, messaging her case manager. At **TRANSITION** she sets housing + job recovery goals, gets matched with a mentor, and her $175/wk hallway-house funding goal goes live to donors. **CONTINUING**: she's housed and employed, still posting wins to her circle, still coached by the Companion, checked in at 30/60/90 days — and her center's alumni dashboard shows her continuum score climbing for 14 months. Her de-identified outcome joins the licensed dataset that proves the center's program works and brings the next center to the platform.

Community actions → continuum events → engagement score → center analytics → licensed outcomes → website proof → more centers → more people helped. That loop is the business and the mission in one.

## Definition of Done
Everything in `requirements/11-CONTINUUM-OF-CARE.md` checked with evidence; all five phases traversable by seed-Danielle end to end; continuum_events emitted by every existing module via hooks (no module rewritten); center comms + program cockpit + alumni dashboard + continuum ribbon built and mobile-checked where applicable; outcomes MVs powering both the dashboard and a de-identified export; website "For Recovery Centers" section live; consent/de-identification governance (docs/10 §6) enforced and negative-tested; zero regressions.
