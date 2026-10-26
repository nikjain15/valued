# Re-audit final report (2026-10-26)

Branch `reaudit-28min`, local commits only. All 18 scenarios run on the latest skills with the lean
briefs, one Sonnet agent per run in single context, the guard model as the only subagent (Haiku),
at most 3 runs at once.

## 18-row scorecard

All 18 after the fixes. Every row all pass, every run inside 28 minutes.

| # | Scenario | Shape | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Cards | Minutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | card-dispute | review | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 8.9 |
| 2 | covenant | rank | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 8.0 |
| 3 | underwriting | review | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 6.9 |
| 4 | portal | desk | pass | pass | pass | pass | pass | pass | pass | pass | 12 | 8.6 |
| 5 | pharmacy | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.0 |
| 6 | utility | desk | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 7.7 |
| 7 | airline | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.2 |
| 8 | returns | review | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 8.7 |
| 9 | saas | rank | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.0 |
| 10 | benefits | review | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.4 |
| 11 | contracts | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 14.8 |
| 12 | recruiting | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 9.3 |
| 13 | maintenance | review | pass | pass | pass | pass | pass | pass | pass | pass | 14 | 9.2 |
| 14 | ap | review | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.9 |
| 15 | university | chat | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 7.3 |
| 16 | surveillance | desk | pass | pass | pass | pass | pass | pass | pass | pass | 13 | 22.2 |
| 17 | nocase | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 6.5 |
| 18 | rules | desk | pass | pass | pass | pass | pass | pass | pass | pass | 11 | 7.4 |

18 of 18 all pass, against 0 of 18 at part 1 and 15 of 18 before the fixes. The first-pass scorecard is
kept at `results/scorecard-part2.md`, this one at `results/scorecard-part2-final.md`.

## What was failing, and the fix

| Scenario | Standard | Root cause | Fix | Signal |
|---|---|---|---|---|
| card-dispute | 3 shape | the shape rule was prose, and a dispute arriving on a form read as a reply | the ordered four-question shape test in `valued-ai-fit/SKILL.md`; question 2 covers submitted forms and asks whether the decision is filed as confirmed fields | S-082 |
| benefits | 3 shape | same | same | S-082 |
| covenant | 6 holdout eval | covenant status notes had no source, so the backstop routed them to a person and they scored as mis-routed | the source-coverage rule in `valued-labels/SKILL.md`: every document type and request family in either set needs a source whose match phrases carry its wording. The re-run needed 3 extra sources, 11 in all | S-079 |
| saas | 8 real names | gates treated the placeholder "Acme" as synthetic | the "Invent every name" rule in `CLAUDE.md` and `valued/SKILL.md`, plus Contoso, Globex, Initech and Example Corp added to the check in `valued-audit/check.js` | S-083 |

The shape fix took three attempts, which is worth recording. The first version was prose and knocked
covenant from `rank` to `desk`. The second was an ordered table, which fixed covenant but let
card-dispute fall through to `desk`, because a dispute form is not an attachment. The third ties
question 2 to how the decision is filed. Control runs on portal and airline, both `desk` only, held at
`desk`; `ap` and `returns` moved from `desk` to `review`, which their expectations already allowed.

## Nothing still failing

The suite was green under the checker as it stood. Four things were open:

| Open | Why it matters |
|---|---|
| S-078 holdouts are not independent | one context writes the answer key and the router, so recall 1.00 on the sealed set proves less than it reads |
| S-085 render re-scores the holdout | `conductor.js render` scores the sealed set every time it runs, 3 to 6 times per run, so the seal is procedural only |
| S-086 shape is not stable | the sharpened rule moved two scenarios, so the shape expectation is a weak check |
| S-080 router length | the generated router runs 200 to 500 lines against a 160-line guideline |

## Second round: what the eval number is worth (2026-10-26)

The two that decide whether the eval numbers mean anything, S-078 and S-085, are now fixed in the
method rather than noted in a report. S-080 is enforced and S-086 is detectable.

| Was | Now | Where |
|---|---|---|
| One context wrote the answer key and then fixed the router | `holdout-sealer` writes `holdout.json` in its own context; the L gate never opens it; every writer records itself in `provenance.json` and both checkers fail a run where one name wrote both | `.claude/agents/holdout-sealer.md`, `valued-labels/SKILL.md`, `conductor.js seal`, `check.js` |
| `render` re-scored the sealed set 3 to 6 times a run | a sealed run is stored under a fingerprint of the router and replayed on an unchanged router; a changed router is a numbered attempt; more than two versions fails the audit | `valued-build/eval.js`, `conductor.js`, `check.js` |
| Router length was a guideline nothing read | 200 lines of code is a hard limit on standard 7, with the remedy named: wording belongs in `sources.json` match lists or the trigger lexicon | `prototype-builder.md`, `conductor.js`, `check.js` |
| A reworded shape rule cost 18 runs to notice | `shape-eval.js` scores the shape decision alone against a recorded baseline, for one Haiku agent | `learning/regression/shape-eval.js`, `shape-baseline.json` |
| The hosted page inlined both label sets with nothing checking they were synthetic | `build-hosted.js` refuses to build when a golden or holdout row carries an `origin` under `inputs/` | `valued-build/build-hosted.js` |

### What the shape micro-eval found

Read cold against a one-line case, the shape table settles 13 of the 17 cases that have one and cannot
settle airline, returns, maintenance or surveillance: it reads all four as `chat` or `rank` where the
expectation wants `desk` or `review`. Full runs get them right because the A gate arrives with the value
gate, the three lenses and the systems behind it. So the rule is under-determined by a case line alone.
The micro-eval therefore gates drift, not correctness: a shape that moves since the baseline is the
S-086 failure, and the four unsettled cases are reported next to it, never gated.

### Verified end to end

One full lean run on card-dispute, on the sealed path, 7m 15s of 28:

| Check | Result |
|---|---|
| `provenance.json` | holdout by `holdout-sealer`, router by `prototype-builder`, no overlap |
| `holdout-log.jsonl` | one line, one attempt; one file in `holdout-runs/`, so the sealed set was scored once |
| Dev | passes all gates, 35 rows, recall 1.00, precision 1.00, routing 0.97, after one router fix |
| Sealed holdout | passes all gates, 20 rows, 12 escalations, recall 1.00, precision 1.00, routing 0.95, never repaired |
| `conductor.js check` | all checks pass |
| Audit standards 6 and 7 | pass, confirmed by re-running the audit independently |
| Audit standard 3 | FAIL, I-001, and not about any of this: see below |

The one failure is worth more than the passes. The `review` router returned the right field names with
every `value` and `evidence` empty, so the item screen showed no confirmed fields, and both evals passed
anyway because `eval.js` scores verdicts only. A shape can satisfy its whole contract structurally,
extract nothing, and the number that decides the release will not notice. That is S-088, and it is
direct evidence for P-002, which is accepted and not built. The run agent left it open rather than
change the router and spend a second sealed attempt, which is the right call under the new rule.

One more thing the run exposed, as S-089: none of the three agents resolves as a registered agent type
in this harness, so each was launched as a general-purpose agent told to follow its definition file and
seal under that name. Independence held in substance, because each ran in its own context, but the name
in `provenance.json` is written by the orchestrator. The check proves two names were declared, not that
two contexts existed. It is worth having and it is not proof against a careless orchestrator.

### The cost of the fix, stated plainly

The 18 recorded runs were made in single context. Under the checker that now enforces independence,
every one of them fails standard 6, because every one of them genuinely was not independent. That is
the correct result, not a regression in the checker: the scorecard above records what those runs were
worth under the old rule. The suite is red until the 18 are re-run on the sealed path, and re-running
them is its own spend.

## Time per phase against 28 minutes

| Measure | Value |
|---|---|
| Median run | 7.5 min |
| Fastest | pharmacy and saas, 6.0 min |
| Slowest | surveillance, 22.2 min |
| Over 28 min | none |
| Runs needing a repair round | covenant, saas, portal |

Minutes come from the run agents' wall time. The conductor clock under-counts, because it does not
charge the file writing between phases.

## Learning log

Twelve new signals, S-075 to S-086. S-079, S-082 and S-083 are closed by the fixes above.

| Signal | Gate | What it says | Status |
|---|---|---|---|
| S-075 | conductor | the `guard-model` agent type does not resolve; every run fell back to a general-purpose Haiku agent reading the agent file | open |
| S-076 | conductor | the lean briefs claim `out/` is empty, but a refreshed workspace has no `out/` at all | open |
| S-077 | V | the empty case argument leaves framing cards with nothing to frame | open |
| S-078 | E | holdout runs pass at recall 1.00 but are not independent | open |
| S-079 | E, L | covenant status notes had no source entry | fixed |
| S-080 | B | the generated router runs 200 to 500 lines against the 160-line guideline | open |
| S-081 | conductor | the overrun rule does not price a repair round | open |
| S-082 | A | the shape rule had no ordered tie-break | fixed |
| S-083 | B | placeholder names passed the gates and failed the audit | fixed |
| S-084 | E | a router fix mid-run led to the holdout being scored against two router versions | open |
| S-085 | conductor, E | `render` re-scores the sealed holdout every time it runs | open |
| S-086 | A | the shape of a case is not stable across skill wordings | open |

S-078 and S-085 are the pair that matters. Single-context runs are cheap and they make every holdout
non-independent, and the renderer scores the sealed set on every render, so the seal is a convention
rather than a mechanism. That is the next thing to price.

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
