# 00 — Vision & Product Thesis

## Mission

End the struggle, build the future together. My Struggle restores dignity and bridges the gap for people experiencing homelessness, addiction, and reentry from incarceration — guiding them toward stability and reintegration with support, understanding, and compassion. The platform's core belief: transformation happens when people connect with mentors who have lived the same journey.

## Why This Platform Has Never Existed

Existing tools each do one slice: GoFundMe does fundraising but not for unbanked individuals with accountability. Facebook does community but is unsafe and unstructured for people in early recovery. Center EHRs do compliance but not engagement after discharge. LMS platforms do content but have no community or giving. **Nobody has connected the donor → participant → mentor → center loop in one place.** That loop is the product:

```
Donor scans QR  →  funds a real person's goals (managed, accountable)
Participant     →  learns (LMS), shares wins (feed), grows (mentor)
Mentor          →  guides, logs sessions, celebrates milestones publicly
Center          →  sees the whole journey — in facility AND after discharge
                →  outcomes data proves impact → attracts more donors/funding
```

Every module feeds the others. A course completion becomes a feed post, which becomes a donor update, which becomes a dashboard outcome metric.

## The Ecosystem This Platform Powers

The platform is the digital layer of a larger physical ecosystem (full detail in docs/11-ECOSYSTEM.md): the **nonprofit** side (outreach centers with basic needs and program access, The Store where credits are redeemed by members and staffed by peer-support-certified graduates, the My Safety peer-employment enterprise, and the Re-Humanization public awareness campaign — "With the community: 82%. Without: 3%") and the **for-profit partnership** side (The Notch detox, Guardians of Grace veterans/first-responders program, residential treatment), which participate as partner orgs on the dashboard. The platform inherits its engagement DNA from REPrieve.ai — "Engagement = Efficacy" — including guided goal tracking, program categories (PON · VOC · IOP · NAV), the friendly AI reentry guide, and alumni follow-up as the defining center-side capability.

## The Two North-Star Journeys

**Danielle's journey (participant):** Danielle enters a partner recovery center. Staff enroll her on the platform (participant #039521464). She gets a QR code. She's matched with a mentor who's been where she is. She works through the Interactive Step Experience courses, earning badges. She posts when she gets her GED — her mentor, her center, and her donors all see it. Donors scanning her QR code fund her hallway house ($175/week) and her driver's license reinstatement. Eighteen months later, her center's dashboard shows her as a success outcome — employed, housed, sober — and her story (with her consent) inspires the next donor.

**The center's journey (organization):** A recovery center signs on as a partner org. They bulk-enroll participants, assign the ISE curriculum, and watch engagement in real time. When a participant discharges, the relationship doesn't end — the dashboard keeps tracking course progress, mentor contact, and milestone check-ins. Six months post-discharge, the center pulls a report showing retention-in-recovery rates it could never measure before, and uses it for grant applications.

## Principles

1. **Dignity first.** Participants control their story, their photo, their visibility. Nothing is public without explicit consent.
2. **Lived experience is the engine.** Mentors with lived experience are the platform's differentiator, and the product treats them as first-class users, not volunteers bolted on.
3. **Accountability creates trust.** Donors give more when they can see managed, transparent use of funds. The restricted-fund ledger model is a feature, not a compromise.
4. **The relationship outlives the program.** The platform's biggest value to centers is the post-discharge window that no EHR covers.
5. **Celebrate everything.** Gamification here isn't points for points' sake — every streak, badge, and milestone is a recovery-relevant moment worth marking.

## v1 Scope Fence

IN: PWA (participant + mentor), center dashboard, QR giving with Stripe, feed, mentorship matching + chat, LMS with gamification, org multi-tenancy, My Struggle admin role.
OUT (v2+): native iOS/Android, housing marketplace, employer job board, in-app fund disbursement cards, multi-nonprofit white-label, video calling (use links to external in v1), Position of Neutrality deep integration (v1 hosts content manually).
