# GAP-REPORT-FORMAT.md — Required structure for GAP-REPORT.md (rewritten every run)

```markdown
# GAP REPORT — Run NNN — YYYY-MM-DD HH:MM
Model: <model> · Branch: <branch> · Commits this run: <n>

## Scoreboard
| Surface | Items | Done | % | Δ since last run |
|---|---|---|---|---|
| 00 Global/System      | n | n | n% | +n |
| 01 Website            | ... |
| 02 Member App         | ... |
| 03 Mentor App         | ... |
| 04 Dashboard          | ... |
| 05 QR Giving          | ... |
| 06 Community Feed     | ... |
| 07 Mentorship         | ... |
| 08 LMS & Gamification | ... |
| 09 Seed Data          | ... |
| TOTAL                 | ... |

## Closed this run
- [requirement id] one-line evidence

## Regressions found (previously checked, now failing)
- [requirement id] what broke, fix status

## Top 10 open gaps (next run starts here)
1. [priority] [requirement id] — why it's next

## Blocked
- item — what it's blocked on (env var, external account, human decision)

## DECISIONS-NEEDED (for Brian — never blocks other work)
- question, context, recommended default

## Verification spot-checks performed (5 minimum)
- item → PASS/FAIL

## Next-run recommendation
One paragraph: where the next session should focus and why.
```

Rules: honest percentages only — an item counts as done ONLY if its checkbox has an evidence note. If the report and the checklists ever disagree, the checklists win and the report must be corrected.
