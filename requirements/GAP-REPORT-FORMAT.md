# GAP-REPORT.md Format

Rewrite `GAP-REPORT.md` from scratch every run using this structure:

```markdown
# Gap Report — run YYYY-MM-DD-N

## Summary
One paragraph: what this run did, overall trajectory.

## Completion by surface
| Surface | % | Verified how |
|---|---|---|
(website, member app, mentor app, dashboard, public giving, system/auth, APIs/data, seed)

## Spot-check results (5 previously-checked items re-verified)
- ✔/✘ item — evidence

## REGRESSIONS
Items that were checked but failed re-verification (unchecked + logged here).

## Closed this run
- item — evidence note

## Open gaps (priority order)
### P0 …
### P1 …
(only areas with open items)

## DECISIONS-NEEDED (batched questions for the human)
- …

## Recommended focus for next run
One short paragraph.
```

Rules: never delete requirement items; evidence notes must cite an executed
verification (route hit, API call, test run) — code existing is not evidence.
