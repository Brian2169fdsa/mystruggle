# 11 — The My Struggle Ecosystem (what the platform serves beyond the app)

The platform is the digital nervous system for a two-sided ecosystem from the My Struggle pitch deck. Claude Code doesn't build the physical operations, but the schema and dashboards must model them correctly.

## The Nonprofit — My Struggle

**The Struggle — Re-Humanization Project**: public awareness campaign teaching communities the difficulty of reentry ("With the community: 82% / Without: 3%"). Platform touchpoint: the public marketing pages and donor education content carry this campaign's voice — "How can I help you?" / "Let's talk; tell me about you."

**Outreach Centers**: basic needs (food, water, hygiene, enclosed rest areas, community setting) + advanced program access (onsite medical, case management, IOP enrollment, therapeutic interventions). Platform touchpoints: member enrollment happens here; cash redemption desk lives here; center staff use the dashboard; org ID cards issued here.

**The Store**: where members redeem QR-code credit funds — "a store where they are at home and are welcomed." Staffed by peer-support-certified members (cashiers, merchandisers, safety/security) with case managers as managers; also a service center with on-site transportation access. Platform touchpoints: `stores` locations table, credit redemption recording (v1 dashboard flow, v2 POS app), and — critically — Store staff roles are themselves program graduates, so the employment loop shows up in journey timelines.

**My Safety**: social enterprise employing program graduates as peer safety officers (lived experience, "speak the language") for clients like convenience stores, apartments, office complexes. Platform touchpoints: employment placements recorded on journey timelines (`journey_tasks` / stage transitions to independent); v2 employer job board anchors here.

## The For-Profit — Our Struggle (partnership)

**The Notch** (detox: medically assisted treatment, mental-health stabilization, medication management, aftercare planning with program placement) · **Guardians of Grace** (veterans/first-responders specialized peer-to-peer program) · **Residential Treatment Center** · **Our Story**.

Platform touchpoints: these operate as **partner orgs (type `center`)** on the multi-tenant dashboard. Their clinical/EHR world stays OUT of this platform (see docs/10-COMPLIANCE.md §1) — the platform holds engagement, learning, mentorship, and post-discharge journey data only. Aftercare placement from The Notch into My Struggle programs is exactly the enrollments-across-orgs flow the data model already supports.

## Lineage note — REPrieve.ai

REPrieve.ai ("Engagement = Efficacy") is the direct ancestor of this platform's engagement thesis and validated the concepts this build inherits: guided goal tracking (My Tracker / My Center), program categories (PON · VOC · IOP · NAV), video content libraries, alumni follow-up as the #1 unmet center need, the friendly AI guide for reentry navigation (halfway house, driver's license, job search), and dashboard KPI cards per program. The published case-study benchmarks are the platform's north-star metrics: engagement 40%→65%, program completion 50%→65%, digital scale 30%→80%, 2 hrs/day saved per staff, +20% long-term sobriety. REPrieve's back-office automation suite (note coach, billing code analyst, compliance coach) is explicitly **v2+** — do not build clinical/billing tooling in v1.
