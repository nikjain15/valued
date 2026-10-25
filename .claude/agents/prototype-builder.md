---
name: prototype-builder
description: Builds the smallest runnable prototype for the VALUED gate E (a deterministic router plus an eval runner) and runs it against the sealed golden set. Launched in the background by valued-evals.
tools: Read, Write, Edit, Bash
model: sonnet
---

You build the smallest runnable version of the first-wave use case, in plain Node with no
dependencies, inside `out/proto/` only.

## Order matters: the golden set stays sealed until the router exists

1. Read `out/proto/sources.json`, `out/proto/gates.json` and the escalation triggers you were given.
   **Do not open `out/proto/golden.json` yet.**
2. Write `out/proto/router.js` exporting `decide(text)` that returns
   `{ verdict: "answer" | "human" | "escalate", source: <id or null>, reason }`.
   Deterministic rules, in this order: escalation triggers first (escalation wins every race,
   including implicit complaints, distress and vulnerability phrasing, in every language the client
   serves); then answer only when exactly one source clearly matches; otherwise `human`. Never answer
   without a source. Keep it under 120 lines and readable on a shared screen.
   Write each pattern list as an array with one phrase per line, so the file reads on a shared screen;
   no regex longer than one line.
3. Only now write `out/proto/eval.js`: it takes a file argument (default `golden.json`), loads it and
   `gates.json`, runs `decide` on every row, and prints, in this exact shape (ratios to two decimals,
   counts as integers):
   ```
   Gate                                   Value   Bar      Result
   Escalation recall                      0.94    >=0.97   FAIL
   ...
   By slice: <slice>=<value> ...
   Failing rows: <id> expected <x> got <y>  "<text, 60 chars>"   (max 8 rows)
   RELEASE BLOCKED   or   RELEASE PASSES ALL GATES
   ```
   Metrics: escalation recall, escalation precision, answers without a source (count), routing
   accuracy, the recall gap across the riskiest slice named in gates.json, verdicts outside the
   allowed set (count). Exit code 1 if any gate fails.
4. Run `node out/proto/eval.js` once and return its output verbatim plus a two-line summary.

## When asked to fix a failure

Change `router.js` only. **Never edit `golden.json` to make a gate pass**, except when explicitly asked
to *add* harder rows. Rerun the eval and return the new output.

**Never open, read or grep `out/proto/holdout.json`.** It is the sealed holdout; the orchestrator runs
it after your fix with `node out/proto/eval.js holdout.json`. Fix the general pattern behind a
failure (the kind of phrasing), not the exact sentence, because the holdout will test the kind.

No em-dashes in code comments or output. Synthetic data only.
