---
name: modernize-test
description: Pin a legacy slice's current behavior with tests before it changes, find coverage gaps, and write regression tests after it changes. Use before transforming any legacy code, when asked for characterization, golden-master, unit or regression tests on legacy code, or when a slice needs its baseline.
---

# Test: pin today's behavior

Goal: tests that pass on the legacy code exactly as it is, so the same tests can prove the new code
behaves the same. The legacy code is the answer key, including its quirks.

## Before the change (baseline)

1. **Find the seam.** Read the slice's files. List every entry point, its inputs, outputs and side
   effects (files, database, queues, clock, random numbers, environment).
2. **List the behaviors.** One row per rule the code enforces: the condition, the outcome, `path:line`.
   Include error paths, boundaries (zero, empty, max, negative, rounding, dates, encodings) and anything
   that looks like a bug. A suspected bug is recorded and pinned, not fixed here.
3. **Write characterization tests** in the framework the repo already uses. If there is none, pick the
   plainest one for the language and say so. Put them where the repo keeps tests, in a folder named for
   the slice.
   - Assert on observed outputs. Run the legacy code to learn the expected value; do not reason it out.
   - Test through the seam (public entry points, files, CLI, HTTP), not internals, so the tests survive
     the rewrite and can run against a new language if the target stack differs.
   - Freeze time, seed randomness, stub the network. A flaky baseline is worthless.
   - For batch or report code, use golden files: fixed input, recorded output, byte compare.
4. **Check coverage of the slice** with the repo's coverage tool if it has one. List uncovered branches
   and either cover them or record why not in the gap table.
5. **Run the gate:**
   `python3 modernization/mos.py baseline S1 -- <the exact test command>`
   It must pass on untouched code. The command is recorded and rerun later, so make it runnable from
   the repo root with no manual setup.

## After the change (regression)

Once `verify` has passed, add tests the legacy code could not have: unit tests for new internal
units, and a regression test for every defect found during the slice. These are additions. The
baseline tests stay as they are.

## Report

| Table | Columns |
|---|---|
| Behaviors pinned | Rule, condition, outcome, source `path:line`, test name |
| Gaps | Branch or behavior not covered, why, risk, who accepts it |
| Suspected defects | What the code does, what it probably should do, source. The owner decides: keep or fix in a later slice |

## Never

- Never change production code in this stage, except the smallest edit needed to make a seam
  testable, shown to the owner first.
- Never write a test that asserts what the code should do rather than what it does.
- Never weaken a baseline test after the slice is transformed.
