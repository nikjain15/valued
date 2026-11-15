---
name: modernize-transform
description: Transform one baselined slice of legacy code to the target stack while preserving its business logic, in small reviewable steps, then prove it with the baseline tests. Use when a slice has a passing baseline and is ready to be migrated, refactored, upgraded or rewritten.
---

# Transform one slice

Goal: the same behavior on the target stack. Nothing more in this slice: no new features, no fixes to
suspected defects, no drive-by cleanup outside the slice.

## Preconditions

`python3 modernization/mos.py status` shows the slice as `baselined`. If not, run `modernize-test` first.

## Steps

1. **Read before writing.** Reread the slice, the behaviors table from the test stage, and what
   depends on the slice (`modernization/graph.json`, `fan_in`).
2. **Pick the approach** and show it as a recommendation with trade-offs:

   | Approach | Fits when | Costs |
   |---|---|---|
   | Refactor in place | Same language, newer framework or version | Old and new mixed for a while |
   | New module beside the old, switch callers | New language or runtime; slice has a clean seam | Two copies until the switch |
   | Wrap, then replace | No clean seam yet | An adapter to maintain, removed later |

3. **Work in small steps.** One mechanical change at a time (rename, extract, replace an API, port a
   function), each leaving the code buildable. Commit per step if the repo is under version control and
   the owner wants commits.
4. **Carry the business rules across one by one.** For each row in the behaviors table, point to the
   new `path:line` that implements it. A rule with no new home is a bug you have not written yet.
5. **Keep the interface the callers use,** or change the callers inside this slice. Never leave a
   caller outside the slice broken.
6. **Preserve the unglamorous parts:** rounding and number types, date and timezone handling, character
   encodings, sort order, null and empty handling, error codes, log lines other systems parse,
   transaction boundaries, file formats.
7. **Record the change:** `python3 modernization/mos.py transformed S1 --files <any new files>`.
8. **Run the gate:** `python3 modernization/mos.py verify S1`. It reruns the exact baseline command.

## If verify fails

The new code is wrong, or it exposed a behavior the baseline pinned and you did not carry across. Fix
the code. If the tests cannot run against the new code at all (new language, new entry point), port the
test harness without changing a single expected value, then run
`mos.py verify S1 --reason "<why the command changed>" -- <new command>`. That reason goes on record and
a person must confirm it before approval.

## Report

| Table | Columns |
|---|---|
| Rule mapping | Business rule, legacy `path:line`, new `path:line` |
| Changes | File, what changed, why |
| Left for later | Anything noticed and deliberately not done, with the slice that should take it |

## Never

- Never transform a slice that has no passing baseline.
- Never touch a baseline test or its expected values.
- Never fold a behavior change into a transformation. Raise it; the owner decides; it gets its own slice.
- Never remove the legacy code in the same slice that introduces its replacement, unless the owner
  chose a one cut-over strategy.
