# Re-audit final report (2026-10-26)

Branch `reaudit-28min`, local commits only. All 18 scenarios run on the latest skills with the lean
briefs, one Sonnet agent per run in single context, the guard model as the only subagent (Haiku),
at most 3 runs at once.

## 18-row scorecard

| # | Scenario | Shape | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Cards | Minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | card-dispute | desk | pass | pass | FAIL | pass | pass | pass | pass | pass | 11 | 9.0 |
| 2 | covenant | rank | pass | pass | pass | pass | pass | FAIL | pass | pass | 12 | 7.1 |
| 3 | underwriting | review | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 6.9 |
| 4 | portal | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 7.5 |
| 5 | pharmacy | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.0 |
| 6 | utility | desk | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 7.7 |
| 7 | airline | desk | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 10.0 |
| 8 | returns | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 5.7 |
| 9 | saas | rank | pass | pass | pass | pass | pass | pass | pass | FAIL | 12 | 6.3 |
| 10 | benefits | desk | pass | pass | FAIL | pass | pass | pass | pass | pass | 11 | 6.7 |
| 11 | contracts | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 14.8 |
| 12 | recruiting | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 9.3 |
| 13 | maintenance | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 9.2 |
| 14 | ap | desk | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 9.4 |
| 15 | university | chat | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 7.3 |
| 16 | surveillance | desk | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 22.2 |
| 17 | nocase | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.5 |
| 18 | rules | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 7.4 |

15 of 18 all pass, against 0 of 18 at part 1. Every run is inside 28 minutes.

## Still failing

| Scenario | Standard | Root cause | Fix | Signal |
|---|---|---|---|---|
| card-dispute | 3 shape | shape table does not say whether a case that arrives as documents but is decided as a request is review or desk | add a tie-break line to the shape table in the A gate: the shape follows the decision, not the arrival format | S-082 |
| benefits | 3 shape | same tie-break gap | same | S-082 |
| covenant | 6 holdout eval | guard model names no source for 4 covenant status notes, so the backstop routes them to a person and they score as mis-routed. Status notes are a document type with no entry in sources.json | widen each source's match list in sources.json, send ties to a person, rerun both evals, never touch labels | S-079 |
| saas | 8 real names | gate skills treat placeholder names as synthetic, the checker counts "Acme" as real | add the placeholder list to the real-name check in the gate skills, so a run fails at the gate rather than at the audit | S-083 |

## Time per phase against 28 minutes

| Measure | Value |
|---|---|
| Median run | 7.5 min |
| Fastest | returns, 5.7 min |
| Slowest | surveillance, 22.2 min |
| Over 28 min | none |
| Runs needing a repair round | covenant (dev routing 0.82), saas (dev precision 0.79) |

Minutes come from the run agents' wall time. The conductor clock under-counts, because it does not
charge the file writing between phases.

## Learning log

Nine new signals, S-075 to S-083.

| Signal | Gate | What it says |
|---|---|---|
| S-075 | conductor | the `guard-model` agent type does not resolve; every run fell back to a general-purpose Haiku agent reading the agent file |
| S-076 | conductor | the lean briefs claim `out/` is empty, but a refreshed workspace has no `out/` at all |
| S-077 | V | the empty case argument leaves framing cards with nothing to frame; the no-case path is unspecified |
| S-078 | E | holdout runs pass at recall 1.00 but are marked not independent, because one context wrote the labels and the router |
| S-079 | E, L | covenant status notes have no source entry, so the holdout is blocked at routing 0.80 |
| S-080 | B | the generated router runs 460 to 500 lines against the 160-line guideline |
| S-081 | conductor | the overrun rule does not price a repair round |
| S-082 | A | the shape table has no tie-break for documents decided as requests |
| S-083 | B | placeholder names pass the gates and fail the audit |

S-078 is the one that matters most. Single-context runs are cheap, and they make every holdout
non-independent, so a perfect holdout score proves less than the number suggests. Separate-context
holdout scoring is the next thing to price.

## Proposals

All five accepted by Nik, 2026-10-26, each on option A. Details and trade-offs in `learning/proposals.md`.

| ID | Change | Signals |
|---|---|---|
| P-001 | the hosted page embeds holdout.json, both sets inlined at build time | audit runs |
| P-002 | field-accuracy and rank metrics in eval.js, selected by shape | S-002, S-008 |
| P-003 | customer chat with a hold-for-approval state and a named approver | S-072 |
| P-004 | an asker object (role, region, permissions) on every request, carried into eval groups | S-012 |
| P-005 | sources become a list of one or two, scored as a set | S-013 |

None of the five is implemented. They are decisions, not code.
