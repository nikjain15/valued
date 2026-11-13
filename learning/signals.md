# VALUED learning log

Append-only. One numbered signal per piece of feedback: every `/valued-revise`, every "This is wrong" flag,
interviewer pushback, Nik's notes after a run, every audit failure. Never edit or delete a signal; when a
change addresses it, add a line under "Status updates" at the end. `/valued-learn` reads this file, groups
signals into patterns and proposes changes, citing signal IDs.

Fields: **Source** (revise, flag, pushback, note, stress test, audit) · **Scenario** · **Gate** at fault
(V, A, L, U, E, D, B, app, conductor) · **Evidence** (what was seen, with the file) · **Status** (open,
addressed by <change>, rejected: <reason>).

## Signals

### S-001
- Source: stress test, 2026-10-25 · Scenario: document extraction (claims) · Gate: A
- Evidence: engine "rules+model" means "rules decide, model drafts a reply"; for extraction the model is the extractor and rules validate. No engine value fits.
- Status: addressed by the per-shape model contract (2fc04c3); verify on the review-shape audits.

### S-002
- Source: stress test, 2026-10-25 · Scenario: document extraction · Gate: L
- Evidence: the label spec forces answer, human, escalate with one source; extraction needs per-field labels (value plus evidence span) scored as field accuracy by field and document type.
- Status: open (eval.js still scores outcomes only).

### S-003
- Source: stress test, 2026-10-25 · Scenario: document extraction · Gate: L
- Evidence: "source" meant a knowledge source to cite; for extraction it became an intake rule. Wrong concept.
- Status: addressed by `fields` per document type in sources.json for the review shape (2fc04c3).

### S-004
- Source: stress test, 2026-10-25 · Scenario: document extraction · Gate: U
- Evidence: case.json has draftOpener and disclosure for a customer reply; intake has no reply, the output is a pre-filled form (fields, values, evidence, confidence).
- Status: addressed by the review shape (01c3494).

### S-005
- Source: stress test, 2026-10-25 · Scenario: document extraction and recommendation · Gate: app
- Evidence: "Approve and send" and "Draft for review" wording is reply-specific; wrong for extraction and ranking.
- Status: addressed by per-shape wording (01c3494).

### S-006
- Source: stress test, 2026-10-25 · Scenario: document extraction · Gate: app
- Evidence: Workbench showed the intake rule as "Cited source" and echoed it as a draft; needed an extracted-fields form with Confirm or Correct per field and "Confirm and file".
- Status: addressed by the review shape (01c3494).

### S-007
- Source: stress test, 2026-10-25 · Scenario: document extraction · Gate: app
- Evidence: nav pill "Rules decide, AI drafts" is wrong for extraction.
- Status: addressed by the engine label per shape (2fc04c3).

### S-008
- Source: stress test, 2026-10-25 · Scenario: document extraction and recommendation · Gate: E
- Evidence: the shared eval.js scores outcomes only; no field accuracy (review) and no must-do recall or precision at 3 (rank).
- Status: open.

### S-009
- Source: stress test, 2026-10-25 · Scenario: recommendation (advisor) · Gate: app
- Evidence: input is a structured record, not free text; the app only took a text box.
- Status: addressed by the rank shape (01c3494).

### S-010
- Source: stress test, 2026-10-25 · Scenario: recommendation · Gate: L
- Evidence: one outcome and one source per row; ranking needs all applicable actions per record.
- Status: open (labels still single-outcome).

### S-011
- Source: stress test, 2026-10-25 · Scenario: recommendation · Gate: app
- Evidence: Workbench showed only the top action; dismiss reasons and dismiss rate (a drive metric) not captured.
- Status: addressed by ranked cards with dismissReasons (01c3494, 2fc04c3).

### S-012
- Source: stress test, 2026-10-25 · Scenario: internal copilot · Gate: app
- Evidence: no notion of who is asking (role, region, permissions); region was forced into the text as "[US]".
- Status: open.

### S-013
- Source: stress test, 2026-10-25 · Scenario: internal copilot · Gate: L
- Evidence: one citation only; real answers often need two policies.
- Status: open.

### S-014
- Source: stress test, 2026-10-25 · Scenario: internal copilot · Gate: app
- Evidence: autonomy was "answer employees directly" but the app's Approve and send step assumed a person approves every answer.
- Status: addressed by the chat shape (01c3494).

### S-015
- Source: note (Nik, after watching), 2026-10-25 · Scenario: all three · Gate: app
- Evidence: the prototype opened on a test bench, not on the user's workplace; CureCue and Relay open on the user's day (greeting, worst-first queue, triggers, status chips, trust pages in their own section).
- Status: addressed by the product shell (01c3494); measured by standard 3 in every audit.

<!-- Audit failures from the 18-scenario re-audit follow from S-016. -->

### S-016
- Source: audit, 2026-10-26 · Scenario: card-dispute · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-017
- Source: audit, 2026-10-26 · Scenario: card-dispute · Gate: E
- Evidence: standard 6: holdout eval does not pass all gates (out/proto/router.js)
- Status: open

### S-018
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: U
- Evidence: standard 3: clocks missing hours for escalate, human or answer (out/proto/case.json)
- Status: open

### S-019
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: L
- Evidence: standard 3: a connector names a vendor without (assumed) (out/proto/case.json)
- Status: open

### S-020
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-021
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: E
- Evidence: standard 6: holdout eval does not pass all gates (out/proto/router.js)
- Status: open

### S-022
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: app
- Evidence: standard 3: local: Close to their clock shows nothing (out/proto/case.json)
- Status: open

### S-023
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: A
- Evidence: standard 3: shape review, expected rank (out/gates/a.json)
- Status: open

### S-024
- Source: audit, 2026-10-26 · Scenario: underwriting · Gate: A
- Evidence: standard 2: first assistant is not a fixed-rules safety guard (out/proto/case.json)
- Status: open

### S-025
- Source: audit, 2026-10-26 · Scenario: underwriting · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-026
- Source: audit, 2026-10-26 · Scenario: underwriting · Gate: app
- Evidence: standard 3: local: Close to their clock shows nothing (out/proto/case.json)
- Status: open

### S-027
- Source: audit, 2026-10-26 · Scenario: portal · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-028
- Source: audit, 2026-10-26 · Scenario: portal · Gate: E
- Evidence: standard 6: holdout eval does not pass all gates (out/proto/router.js)
- Status: open

### S-029
- Source: audit, 2026-10-26 · Scenario: portal · Gate: L
- Evidence: standard 6: golden 28 rows, holdout 12; expected 30+ and 10+ (out/proto/golden.json)
- Status: open

### S-030
- Source: audit, 2026-10-26 · Scenario: pharmacy · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-031
- Source: audit, 2026-10-26 · Scenario: pharmacy · Gate: E
- Evidence: standard 6: holdout eval does not pass all gates (out/proto/router.js)
- Status: open

### S-032
- Source: audit, 2026-10-26 · Scenario: utility · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-033
- Source: audit, 2026-10-26 · Scenario: airline · Gate: L
- Evidence: standard 3: a connector names a vendor without (assumed) (out/proto/case.json)
- Status: open

### S-034
- Source: audit, 2026-10-26 · Scenario: airline · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-035
- Source: audit, 2026-10-26 · Scenario: returns · Gate: L
- Evidence: standard 3: a connector names a vendor without (assumed) (out/proto/case.json)
- Status: open

### S-036
- Source: audit, 2026-10-26 · Scenario: returns · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-037
- Source: audit, 2026-10-26 · Scenario: saas · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-038
- Source: audit, 2026-10-26 · Scenario: benefits · Gate: L
- Evidence: standard 3: a connector names a vendor without (assumed) (out/proto/case.json)
- Status: open

### S-039
- Source: audit, 2026-10-26 · Scenario: benefits · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-040
- Source: audit, 2026-10-26 · Scenario: benefits · Gate: app
- Evidence: standard 3: local: Close to their clock shows nothing (out/proto/case.json)
- Status: open

### S-041
- Source: audit, 2026-10-26 · Scenario: contracts · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-042
- Source: audit, 2026-10-26 · Scenario: contracts · Gate: L
- Evidence: standard 6: golden set has fewer than 3 never-list rows (out/proto/golden.json)
- Status: open

### S-043
- Source: audit, 2026-10-26 · Scenario: contracts · Gate: app
- Evidence: standard 3: local: Close to their clock shows nothing (out/proto/case.json)
- Status: open

### S-044
- Source: audit, 2026-10-26 · Scenario: recruiting · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-045
- Source: audit, 2026-10-26 · Scenario: recruiting · Gate: V
- Evidence: standard 8: real company name "Salesforce" in out/proto/case.json (out/proto/case.json)
- Status: open

### S-046
- Source: audit, 2026-10-26 · Scenario: recruiting · Gate: L
- Evidence: standard 8: real company name "Salesforce" in out/proto/golden.json (out/proto/golden.json)
- Status: open

### S-047
- Source: audit, 2026-10-26 · Scenario: recruiting · Gate: app
- Evidence: standard 3: local: Close to their clock shows nothing (out/proto/case.json)
- Status: open

### S-048
- Source: audit, 2026-10-26 · Scenario: maintenance · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-049
- Source: audit, 2026-10-26 · Scenario: ap · Gate: L
- Evidence: standard 3: a connector names a vendor without (assumed) (out/proto/case.json)
- Status: open

### S-050
- Source: audit, 2026-10-26 · Scenario: ap · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-051
- Source: audit, 2026-10-26 · Scenario: university · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-052
- Source: audit, 2026-10-26 · Scenario: university · Gate: E
- Evidence: standard 6: dev eval does not pass all gates (out/proto/router.js)
- Status: open

### S-053
- Source: audit, 2026-10-26 · Scenario: university · Gate: E
- Evidence: standard 6: holdout eval does not pass all gates (out/proto/router.js)
- Status: open

### S-054
- Source: audit, 2026-10-26 · Scenario: university · Gate: E
- Evidence: standard 6: gates.json lacks one of the 8 gates or riskiest_slice (out/proto/gates.json)
- Status: open

### S-055
- Source: audit, 2026-10-26 · Scenario: university · Gate: E
- Evidence: standard 6: eval output lists fewer than 8 gates (out/proto/eval.js)
- Status: open

### S-056
- Source: audit, 2026-10-26 · Scenario: university · Gate: E
- Evidence: standard 6: eval output has no per-group line (out/proto/eval.js)
- Status: open

### S-057
- Source: audit, 2026-10-26 · Scenario: surveillance · Gate: L
- Evidence: standard 3: a connector names a vendor without (assumed) (out/proto/case.json)
- Status: open

### S-058
- Source: audit, 2026-10-26 · Scenario: surveillance · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-059
- Source: audit, 2026-10-26 · Scenario: surveillance · Gate: app
- Evidence: standard 3: local: Close to their clock shows nothing (out/proto/case.json)
- Status: open

### S-060
- Source: audit, 2026-10-26 · Scenario: nocase · Gate: L
- Evidence: standard 3: a connector names a vendor without (assumed) (out/proto/case.json)
- Status: open

### S-061
- Source: audit, 2026-10-26 · Scenario: nocase · Gate: L
- Evidence: standard 3: 4 samples, expected 6 with expect (out/proto/case.json)
- Status: open

### S-062
- Source: audit, 2026-10-26 · Scenario: nocase · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-063
- Source: audit, 2026-10-26 · Scenario: nocase · Gate: E
- Evidence: standard 6: holdout eval does not pass all gates (out/proto/router.js)
- Status: open

### S-064
- Source: audit, 2026-10-26 · Scenario: rules · Gate: L
- Evidence: standard 3: a connector names a vendor without (assumed) (out/proto/case.json)
- Status: open

### S-065
- Source: audit, 2026-10-26 · Scenario: rules · Gate: B
- Evidence: standard 5: fewer than 3 Given / When / Then acceptance criteria (out/prd.md)
- Status: open

### S-066
- Source: audit runner note, 2026-10-26 · Scenario: all single-context runs · Gate: E
- Evidence: the same context wrote golden.json, holdout.json and the router; the seal is nominal and dev passed on the first run in most cases (reported by 12 of 18 runners)
- Status: open

### S-067
- Source: audit runner note, 2026-10-26 · Scenario: all runs · Gate: L
- Evidence: labels skill says 40 rows with 12 to the holdout but calls the rest 30 dev rows; 40 minus 12 is 28 (reported by 9 runners)
- Status: open

### S-068
- Source: audit runner note, 2026-10-26 · Scenario: rules, nocase · Gate: conductor
- Evidence: Material framing card lists 'Synthetic only' last but marks it Recommended; the first-option rule contradicts it
- Status: open

### S-069
- Source: audit runner note, 2026-10-26 · Scenario: rules · Gate: B
- Evidence: build-hosted.js embeds holdout.json in the hosted page; publishing it would unseal the holdout
- Status: open

### S-070
- Source: audit runner note, 2026-10-26 · Scenario: utility · Gate: B
- Evidence: an earlier cut-off left literal $1 in place of eight PRD section headers
- Status: open

### S-071
- Source: audit runner note, 2026-10-26 · Scenario: airline, saas, contracts, recruiting, university, ap · Gate: L
- Evidence: connectors-library.json in the copies lacked the case's industry (copies predate the library update); runners wrote connectors by hand
- Status: open

### S-072
- Source: audit runner note, 2026-10-26 · Scenario: utility, university · Gate: app
- Evidence: the chat shape answers end users directly; a customer-facing chat under draft-with-approval falls back to desk. No customer chat with approval mode
- Status: open

### S-073
- Source: audit runner note, 2026-10-26 · Scenario: covenant · Gate: A
- Evidence: covenant monitoring came out as review (certificates) where rank was expected; the shape table does not say which wins when documents feed a next-step decision
- Status: open

### S-074
- Source: audit runner note, 2026-10-26 · Scenario: all runs · Gate: conductor
- Evidence: card headers in the gate skills say COO, Sponsor, Risk; every runner had to remap them to the case's roles
- Status: open

### S-075
- Source: audit, 2026-10-26 · Scenario: university, nocase, rules, v2 runs · Gate: conductor
- Evidence: the `guard-model` agent type is not registered in the harness, so every run fell back to a general-purpose haiku agent reading `.claude/agents/guard-model.md`. The skill names a subagent_type that does not resolve
- Status: open

### S-076
- Source: audit, 2026-10-26 · Scenario: university, nocase, rules, v2 runs · Gate: conductor
- Evidence: the lean briefs state that `out/` is empty, but a refreshed workspace has no `out/` at all; every runner improvised a mkdir and reported it
- Status: open

### S-077
- Source: audit, 2026-10-26 · Scenario: nocase · Gate: V
- Evidence: the empty case argument leaves framing cards with nothing to frame; the runner synthesized a case line and auto-answered the framing cards, so the no-case path is unspecified rather than handled
- Status: open

### S-078
- Source: audit, 2026-10-26 · Scenario: university, nocase, rules · Gate: E
- Evidence: holdout runs pass at recall 1.00 but are marked `independent=false`, because one context wrote the golden set, the holdout and the router. A perfect holdout score on a non-independent run proves little
- Status: open

### S-079
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: E, L
- Evidence: the holdout is blocked at routing 0.80. The guard model names no source for 4 covenant status notes (H17 to H20), so the backstop routes them to a person and the rows score as mis-routed. Status notes are a document type with no entry in sources.json
- Status: open

### S-080
- Source: audit, 2026-10-26 · Scenario: card-dispute, portal · Gate: B
- Evidence: the generated router runs 460 to 500 lines against the 160-line guideline in the build skill. Every runner logged it as an improvisation rather than cutting it, so the guideline is advisory in practice
- Status: open

### S-081
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: conductor
- Evidence: the dev run was blocked at routing 0.82 and the "Ship anyway, or fix first?" card auto-answered "Fix first", which spent a repair round inside the 28 minutes. The overrun rule does not price a repair round
- Status: open

### S-082
- Source: audit, 2026-10-26 · Scenario: card-dispute, benefits · Gate: A
- Evidence: both runs chose the desk shape where scenarios.json expects review. Disputes and benefits claims arrive as documents but are decided as requests, and the shape table does not say which reading wins. Same gap as S-073, now seen on two more cases
- Status: open

### S-083
- Source: audit, 2026-10-26 · Scenario: saas · Gate: B
- Evidence: "Acme" reached out/prd.md and out/proto/case.json and failed the real-name check. The runner reported no real names remaining, so the gate skills treat placeholder names as synthetic while the checker counts them as real
- Status: open

### S-084
- Source: audit, 2026-10-26 · Scenario: covenant · Gate: E
- Evidence: on the fix re-run the holdout was scored once before the router fix and once after, so the sealed set was seen against two router versions. Nothing in the conductor stops a second holdout run after a router change
- Status: open

### S-085
- Source: audit, 2026-10-26 · Scenario: returns, card-dispute · Gate: conductor, E
- Evidence: `conductor.js render` scores the sealed holdout every time it runs, so a single run scores it 3 to 6 times, against whatever router version is current. The seal is procedural only; nothing in the conductor scores the holdout once and records that score
- Status: open

### S-086
- Source: audit, 2026-10-26 · Scenario: ap, returns · Gate: A
- Evidence: the sharpened shape test moved both from desk to review. Both expectations allow either, so the suite stays green, but the shape of a case is not stable across skill wordings, which makes the shape expectation a weak check
- Status: open

### S-090
- Source: review, 2026-10-26 · Scenario: credit-union member messages · Gate: A
- Evidence: PRD s6 and case.json call the safety guard "Rules", "deterministic", "stays rules", but the eval shows a cached guard model changed 9 dev and 4 holdout rows. The guard is rules-first plus a label-validated model backstop whenever the engine is rules+model; the template should say so rather than "pure rules". (reviewer REV-02)
- Status: open

### S-091
- Source: review, 2026-10-26 · Scenario: credit-union member messages · Gate: E
- Evidence: "Passes all gates" wording omits that holdout routing sits exactly at the 0.85 bar and that there are a few holdout misses, with only 12 holdout escalation rows. The release line should state the thin margins, not just "passes". (reviewer REV-03)
- Status: open

### S-092
- Source: review, 2026-10-26 · Scenario: credit-union member messages · Gate: L
- Evidence: "each language and family is gated" / "enough rows to score" overstates: thin groups (e.g. adversarial, with under 2 escalation rows) are reported, not gated, and dev has only 8 Spanish rows. goldenNote should say which groups are actually gated. (reviewer REV-04)
- Status: open

### S-093
- Source: review, 2026-10-26 · Scenario: credit-union member messages · Gate: B
- Evidence: "100% of drafts cite a source" is backed only by the router's answers-without-source gate (0), not by evaluating the model-written draft text. The claim should scope to the router requirement plus rep review of the wording. (reviewer REV-05)
- Status: open

### S-094
- Source: review, 2026-10-26 · Scenario: credit-union member messages · Gate: conductor
- Evidence: clocks (1 h / 24 h / 4 h), the adoption alert (under 50%), the "halved" re-keying target and the latency budgets render without an (assumed) tag, though they are invented. Gates should tag these, or render should. state.md already marks the escalation SLAs as proposed (assumed). (reviewer REV-06)
- Status: open

### S-095
- Source: review, 2026-10-26 · Scenario: credit-union member messages · Gate: conductor
- Evidence: the PRD document-history row read "built gate by gate in the working session" (internal/session framing in a client-facing doc). (reviewer note) Status: addressed in this change (conductor history line reworded).


### S-096
- Source: note, 2026-10-28 · Scenario: Humana take-home, six use cases to choose from (real public company, research allowed) · Gate: A
- Evidence: gate A scores candidates on the facts it is handed; a separate deep audit (out/humana-usecase-audit.md) found 3 of 20 supplied figures wrong or unsourced and 8 mislabelled (a 240 bps move attributed to one of three stated causes; provider-side CAQH costs quoted as plan-side; an analyst note presented as current; a $500 to 700M figure with no source). The pick flipped once gross dollars were replaced by attributable dollars and the audience's rubric was read as evidence.
- Status: addressed by `valued-select` (new skill: parallel fact-checkers against primary sources, chain stress tests, sourced sizing with unit economics, five fixed lenses under client-set weights, audience-fit lens, decision log and citations register); gate A seeds from `out/select/select.json` when present.

### S-090
- Source: note, 2026-10-30 · Scenario: a regulated-insurer knowledge-and-search case prepared for a technical panel · Gate: E, conductor
- Evidence: the 28-minute run could not carry what the case needed: a 700-row citations register with P/S/A/J tags, a 26-row decision log, eval bars that a panel would call unrealistic until each was defended against published AI-product, research and analogue anchors (155 rows with a kind column), two independent eval reviews plus an opus verification pass that found self-grading, wrong denominators and rates on thin groups, and a consolidated strategy with stable IDs for repeated revalidation. The work was done by hand in one long session and nearly lost at context compaction.
- Addressed by: `/valued-deep` (`.claude/skills/valued-deep/`) with agents `gate-defender`, `eval-reviewer`, `strategy-writer`, `strategy-reviewer` and `check.js`; the standing "no build until go build" rule is the default.
- Tested 30 Oct 2026: check.js on a defect fixture (all three defects caught); each agent on the real case files (eval-reviewer 7 blocks, strategy-reviewer 4 blocks, strategy-writer 658 rows and 18 contradictions, gate-defender honest tags on a 20-minute budget); a full `start` run on a fresh synthetic credit-union case by an agent holding only SKILL.md (64 register rows, 34 P, nothing built, check clean). Its test report produced 10 wording fixes and 8 gaps, all applied.
- Status: addressed by valued-deep

### S-097
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: B
- Evidence: The demo had no fixed story order: acts, channels and pages mixed, and Nik could not follow it. Nik: "basically act is 'how it will work' and under that each steps"; "how it works should be before Future State". Settled on five steps: Current state, Solution architecture, How it works, Future state, Prove it (D114 to D116). Nothing in valued-deep go build or valued-build defines a demo story.
- Status: open

### S-098
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: B
- Evidence: How it works pages showed every artefact at once and were "super crowded". Nik: "make it more like how it will work in real life - like we are actually uploading or reading documents ... one thing should come one after other". Fixed by scenes: a person acts, the AI reads and proposes with results one at a time, a person decides, then the result (out/uc2-proto/how-engine.js, how-scenes.js).
- Status: open

### S-099
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: B
- Evidence: Future state used a different panel (Control) from Current state, so the before and after could not be compared. Nik: "shouldn't we show like how we showed in current state - more like that visual but from graphrag perspective"; then "why do we need green ... we can follow same color/ design system like how we had for current state". Fixed: the same step flow, same colours, the fixing step marked "fixed here".
- Status: open

### S-100
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: E
- Evidence: The demo's eval page showed only passes. Nik: "there is nothing that's getting failed/ how thats possible and we need to show how are we improving / working on it and we need observability page over here ... and add some feedback". Fixed with a Prove it page: live misses, found-and-fixed items from the decision log, weekly checks, and feedback routed to owners (prove.html). The strategy session also caught a rate shown without its denominator (D126).
- Status: open

### S-101
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: E
- Evidence: The evals runner and the demo's Prove it page would have scored the same sets with two copies of the code, so their numbers could drift apart. Fixed by extracting eval-core.js, shared by both, and checking the runner's output byte-for-byte before and after.
- Status: open

### S-102
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: app
- Evidence: Visual rules were set ad hoc and then corrected: green used for navigation and progress; numbers removed then restored; a crowded top bar on demo pages; text buttons for play and stop. Nik: "lets make sure we use green appropriately"; "we should add numbers in sub-tabs ... as its hard to read"; "why we need anything else - lets remove that"; "instead of stop - lets have icon"; "can that move slightly slower".
- Status: open

### S-103
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: B
- Evidence: The public site opened on the old home and the old 13-step story. Nik: "but this knowledge has old demo/ prototype"; "it should start with this page directly". Fixed: index.html redirects to step 1, the old home became product.html, old pages retired (D129, D130).
- Status: open

### S-104
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: B
- Evidence: The demo repo was public with a brief and thinking pages that name the real client and employers. Split into a private repo with full history and a public repo with fresh history, built by out/uc2-publish.sh with a real-name gate (D128). The first version of the script used rsync --delete-excluded and deleted the public repo's .git; fixed with a two-stage copy.
- Status: open

### S-105
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: conductor
- Evidence: Nik asked for a stress-test audit before the interview: "main job is to make sure it stress test it across so many different dimensions that we cant think" and "what can we add here to make my interview amazing". Written by hand as out/uc2-demo-audit-prompt.md (26 dimensions, including interview readiness). The framework has no such template for the deep path.
- Status: open

### S-106
- Source: note, 2026-11-01 · Scenario: UC2 Knowledge and Search (deep path, demo build) · Gate: conductor
- Evidence: Nik: "we need to make sure our strategy doc is our state of record, so update if we have done changes". Worked by a peer session that owns the decision log and the strategy, while the build session relays each decision with Nik's words quoted (D114 to D130). valued-deep says to log decisions the same day but has no rule for keeping the strategy current during a long build.
- Status: open

### S-107
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: app, B
- Evidence: Story grew from five to six steps plus a PRD link: Current state, Solution architecture (builds one layer per arrow press), How it works (its step list mirrors the architecture's 'How it runs' list, with a record card and a real example on every step), Future state, Roadmap, Trade-offs. demo-standard.md still says five steps. Evidence: out/uc2-proto story-shared.js STORY5, plan.html, choices.html.
- Status: open

### S-108
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: app, E
- Evidence: Nik asked for click-to-advance on How it works and every Prove it tab ('so that i control movement'); auto-play ran ahead of the talk. Evidence: how-engine.js clickToGo, prove.html beat() gate.
- Status: open

### S-109
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: E
- Evidence: The Prove it release tab was rebuilt as a dashboard (Summary tiles with one-line meanings, Responsible AI at a glance, accuracy by group, red-team sets, fairness, gates, what went wrong with owners, monitoring after launch, what the demo cannot test yet). Nik: 'more like observability and eval performance'; 'it looks everything is good but realistic we know things go wrong'. Inside-bar-but-above-goal items must show amber, not green.
- Status: open

### S-110
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: E
- Evidence: Nik asked how unknown scenarios are handled; a fifth Prove it tab now runs questions from no test set live through answer() and shows three layers (limit damage, find what we missed, close the loop). demo-standard has no such tab.
- Status: open

### S-111
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: E, L
- Evidence: Bias mitigation had no eval. Added a fairness set: the same question asked in plain words, misspelt, in a hurry, casually or in Spanish must get the same approved unit or the right hand-off; a different answer fails. Result 8 of 11 same, 0 wrong. Evidence: eval-core.js FAIR, D243.
- Status: open

### S-112
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: D, B
- Evidence: Roadmap page needed per-phase techniques and tools tagged build, buy or use today's, plus a 14-step 'who does what' journey (AI, person or system per step; what exactly we build or buy; how it is built). Green on a whole job overstated what we build. The single build list had to be identical in the page, PRD 14, PRD 15 and the strategy (D239 conflict, settled by D240).
- Status: open

### S-113
- Source: review, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: B
- Evidence: Final three-reviewer audit found recurring misstatements: a count paired with another set's rate ('4 of 253 (3.3%)' where 3.3% is 4 of 121); two bars with different denominators merged; holdout described as 'run once' beside 'run every test again'; a cache claim contradicting the role-check decision; a red-team line naming test sets that do not exist; vendor-led Q&A. Evidence: audit reports A1 to A7, B1 to B15, C1 to C10, 3 Nov 2026.
- Status: open

### S-114
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: B
- Evidence: The talk track (out/uc2-final-story.md and its PDF) drifted from the site after every page change (tab counts, numbers, click paths). It was kept by hand; nothing regenerates or checks it.
- Status: open

### S-115
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: app
- Evidence: A changed eval-core.js was served stale because its ?v= stamp did not change, breaking the dashboard locally (TypeError on E.fair). Any shared script change needs a version bump on every page that loads it.
- Status: open

### S-116
- Source: note, 2026-11-03 · Scenario: uc2-knowledge-search · Gate: app
- Evidence: Labels drifted across pages ('Fixed rule' on Roadmap vs 'System' on How it works; 'False refusals' vs plain 'Wrongly refused'). Nik asked for one plain vocabulary everywhere, industry terms with a one-line meaning beside each.
- Status: open

### S-117
- Source: regression, 2026-11-12 · Scenario: R-001 (report-2026-11-12.md) · Gate: conductor · Severity: High
- Evidence: nocase asks 17 cards, std 1 fails. Root cause: Framing "0 to 4" plus the always-on "Product name" card plus 11 rounds plus "Ship anyway" can reach 17; the cap is 16. Where: `.claude/skills/valued/SKILL.md:73,127`.
- Proposed fix: Count "Product name" inside the 0 to 4 framing cards, or raise the cap to 17 in `check.js:42-43` and the SKILL together.
- Status: open

### S-118
- Source: regression, 2026-11-12 · Scenario: R-002 (report-2026-11-12.md) · Gate: E, build · Severity: High
- Evidence: Router unchanged, yet holdout counts as attempt 2 (card-dispute, portal). Root cause: Fingerprint hashes `router.js` plus the whole `model-cache.json`; adding dev rows reruns the guard model and changes the cache. Where: `.claude/skills/valued-build/eval.js:35`.
- Proposed fix: Hash only cache entries for holdout texts, or hash router plus holdout-keyed cache slice.
- Status: open

### S-119
- Source: regression, 2026-11-12 · Scenario: R-003 (report-2026-11-12.md) · Gate: E, build · Severity: High
- Evidence: university: a blank-line trim made a 3rd router version and failed std 6. Root cause: Fingerprint is over raw source, whitespace and comments included. Where: `.claude/skills/valued-build/eval.js:35`.
- Proposed fix: Normalise source (strip comments and blank lines) before hashing; tell the builder not to touch router.js after the seal.
- Status: open

### S-120
- Source: regression, 2026-11-12 · Scenario: R-004 (report-2026-11-12.md) · Gate: conductor, audit · Severity: High
- Evidence: rules: an agent hand-edited `provenance.json` to delete a wrong entry and the audit passed. Root cause: Provenance is self-reported and editable (open S-089). Where: `.claude/skills/valued/conductor.js` seal, `valued-audit/check.js:118-122`.
- Proposed fix: Append-only: `seal` writes a hash chain or also logs to `holdout-log.jsonl`; checker refuses edited files.
- Status: open

### S-121
- Source: regression, 2026-11-12 · Scenario: R-005 (report-2026-11-12.md) · Gate: valued-deep · Severity: High
- Evidence: A missing or mistyped `--talk` or `--build` warns and prints Clean, exit 0; missing plan.html or prd-data.js also skipped. Root cause: Absent inputs treated as nothing to compare. Where: `.claude/skills/valued-deep/demo-check.js:22,34,38,41,50`.
- Proposed fix: Fail when a flag names a missing file; require `--talk` and `--build` (demo-standard.md:94 says both).
- Status: open

### S-122
- Source: regression, 2026-11-12 · Scenario: R-006 (report-2026-11-12.md) · Gate: valued-deep · Severity: High
- Evidence: Heading says six steps, table has seven (Prove it its own row). Root cause: Prove it moved inside How it works in code, not in the standard. Where: `.claude/skills/valued-deep/demo-standard.md:6-20` vs `SKILL.md:202-203`, `story-shared.js` STORY5.
- Proposed fix: Make Prove it job 4 under How it works in the table.
- Status: open

### S-123
- Source: regression, 2026-11-12 · Scenario: R-007 (report-2026-11-12.md) · Gate: valued-deep · Severity: High
- Evidence: Says "The five steps", lists five; Roadmap and Trade-offs never audited. Root cause: Template not updated for P-011. Where: `.claude/skills/valued-deep/audit-prompt-template.md:41`.
- Proposed fix: List the six steps plus Prove it as job 4.
- Status: open

### S-124
- Source: regression, 2026-11-12 · Scenario: R-008 (report-2026-11-12.md) · Gate: valued-deep · Severity: High
- Evidence: Talk track that never says "Prove it" or "PRD" passes coverage. Root cause: Coverage reads STORY5 names only. Where: `.claude/skills/valued-deep/demo-check.js:43-44`.
- Proposed fix: Add Prove it and PRD to required names.
- Status: open

### S-125
- Source: regression, 2026-11-12 · Scenario: R-009 (report-2026-11-12.md) · Gate: valued-deep · Severity: Med
- Evidence: Stamp check skips how2, how3 and other job pages, and paths with "/" (fonts/fonts.css). Root cause: Scans STORY5 pages only; regex `[\w.-]+`. Where: `.claude/skills/valued-deep/demo-check.js:26-27`.
- Proposed fix: Scan every .html; allow "/" in the path class.
- Status: open

### S-126
- Source: regression, 2026-11-12 · Scenario: R-010 (report-2026-11-12.md) · Gate: valued-deep · Severity: Med
- Evidence: The kit fails its own stamp check (v=42 vs 45, flowmap v=5 vs 49); `out/uc2-proto` inherits it. Root cause: Kit copied from a mid-edit build. Where: `.claude/skills/valued-deep/demo-kit/day.html:3,106`, `how1.html:3,83`.
- Proposed fix: Bump the kit to one stamp per file; run demo-check on the kit in the suite.
- Status: open

### S-127
- Source: regression, 2026-11-12 · Scenario: R-011 (report-2026-11-12.md) · Gate: valued-deep · Severity: Med
- Evidence: Tab names matched on prefix only; tab count only if the talk says "N tabs"; em dashes not checked in talk, build, subfolders. Root cause: Loose checks. Where: `.claude/skills/valued-deep/demo-check.js:46,48,53`.
- Proposed fix: Match full labels; fail with no count; scan `--talk`, `--build`, `--prd` and subfolders.
- Status: open

### S-128
- Source: regression, 2026-11-12 · Scenario: R-012 (report-2026-11-12.md) · Gate: valued-deep · Severity: Med
- Evidence: Auditor says the scorer runs "never loading the holdout"; Prove it loads `holdout.js` in the browser. Root cause: Wording contradicts the kit. Where: `.claude/skills/valued-deep/demo-kit/prove.html:50` vs `.claude/agents/demo-auditor.md:18`.
- Proposed fix: Say the page loads the holdout for counts only and the auditor never prints rows.
- Status: open

### S-129
- Source: regression, 2026-11-12 · Scenario: R-013 (report-2026-11-12.md) · Gate: valued-deep · Severity: Med
- Evidence: No `out/deep` exists; UC2 used `out/uc2-*` so `check.js` cannot run on the only real deep case; on a copy it flags 94 real-name hits for the real client. Root cause: Layout drift plus no client-name allowlist for real-client runs. Where: `.claude/skills/valued-deep/check.js:5`, `SKILL.md:18`.
- Proposed fix: Enforce `--out` layout in go build; add `--client <name>` allowlist to check.js.
- Status: open

### S-130
- Source: regression, 2026-11-12 · Scenario: R-014 (report-2026-11-12.md) · Gate: valued-select · Severity: Med
- Evidence: README says select.json and cards.json "must validate", no validator exists; `--out` ignored by hard-coded `out/select/`; gate enum has no "S"; quick-mode counts undefined. Root cause: Skill and README out of step. Where: `learning/regression/README.md:29`, `.claude/skills/valued-select/SKILL.md:30,83,112`.
- Proposed fix: Ship `select/validate.js`; route every path through `--out`; add "S" to the enum; print "n/a" in quick mode.
- Status: open

### S-131
- Source: regression, 2026-11-12 · Scenario: R-015 (report-2026-11-12.md) · Gate: conductor · Severity: Med
- Evidence: Card labels print "(Recommended) (Recommended)" (saas). Root cause: Printer appends the suffix even when the label already has it, as CLAUDE.md tells drafters to write it. Where: `.claude/skills/valued/conductor.js:480`.
- Proposed fix: Append only if the label lacks it.
- Status: open

### S-132
- Source: regression, 2026-11-12 · Scenario: R-016 (report-2026-11-12.md) · Gate: conductor, E · Severity: Med
- Evidence: In 4 of 6 runs the conductor, not the builder, wrote the harder dev rows. Root cause: Under `--lean` the builder has already returned when harder rows are due. Where: `.claude/skills/valued/SKILL.md:80`, `.claude/agents/prototype-builder.md:67`.
- Proposed fix: Make harder rows part of the builder's single pass, before it returns.
- Status: open

### S-133
- Source: regression, 2026-11-12 · Scenario: R-017 (report-2026-11-12.md) · Gate: E, audit · Severity: Med
- Evidence: Routers reach 189 lines by packing several phrases per line. Root cause: Line count is gameable. Where: `.claude/agents/prototype-builder.md` (160/200 limit).
- Proposed fix: Count statements or bytes, or move lexicons to `sources.json` and lint for it.
- Status: open

### S-134
- Source: regression, 2026-11-12 · Scenario: R-018 (report-2026-11-12.md) · Gate: B, conductor · Severity: Med
- Evidence: PRD decisions appendix drops the "(auto)" mark and omits 3 cards. Root cause: Renderer filters cards it should list. Where: rules `out/review.md` REV-01 (render).
- Proposed fix: Render every card in `cards.json` with its answer source.
- Status: open

### S-135
- Source: regression, 2026-11-12 · Scenario: R-019 (report-2026-11-12.md) · Gate: regression suite · Severity: Med
- Evidence: rsync with `--exclude out` into an existing workspace keeps the old `out/`, so "fresh" runs are not fresh; 18 stale rows look like regressions. Root cause: README step 1 and no staleness flag. Where: `learning/regression/README.md:15`, `run.js`.
- Proposed fix: Use a new folder or `--delete` with an `out` move-aside; `run.js` marks rows whose `prd.md` predates `check.js` as STALE.
- Status: open

### S-136
- Source: regression, 2026-11-12 · Scenario: R-020 (report-2026-11-12.md) · Gate: regression suite · Severity: Low
- Evidence: "at most 6 at once" vs "at most 3 at once". Root cause: Two edits. Where: `learning/regression/README.md:16` vs `:28`.
- Proposed fix: Pick one (3).
- Status: open

### S-137
- Source: regression, 2026-11-12 · Scenario: R-021 (report-2026-11-12.md) · Gate: regression suite · Severity: Low
- Evidence: Refers to `audit.js --no-browser`; suite and SKILL use `check.js`. Root cause: Naming drift. Where: `learning/regression/README.md:25`.
- Proposed fix: Name one entry point.
- Status: open

### S-138
- Source: regression, 2026-11-12 · Scenario: R-022 (report-2026-11-12.md) · Gate: regression suite · Severity: Low
- Evidence: Scorecard holdout line shows the replay notice, not the verdict (university shows the notice while blocked). Root cause: Picks the last line. Where: `run.js` holdoutLine.
- Proposed fix: Store the verdict line separately.
- Status: open

### S-139
- Source: regression, 2026-11-12 · Scenario: R-023 (report-2026-11-12.md) · Gate: valued-deep · Severity: Low
- Evidence: Timing placeholder has 5 values vs 8; talk sections number Prove it as step 4; provenance cited twice. Root cause: Follow-on drift from R-006. Where: `audit-prompt-template.md:34`, `talk-track-template.md:30-32`, `demo-standard.md:4,9`.
- Proposed fix: Align after R-006.
- Status: open

### S-140
- Source: regression, 2026-11-12 · Scenario: R-024 (report-2026-11-12.md) · Gate: valued-deep · Severity: Low
- Evidence: Missing proto dir or story-shared.js throws a stack trace instead of a FAIL. Root cause: No guards. Where: `demo-check.js:11,42`.
- Proposed fix: Check existence, exit 2 with a message.
- Status: open

## Status updates

### S-079
- Fixed by the source-coverage rule in `valued-labels/SKILL.md`: every document type and request family in golden.json or holdout.json needs a source whose match phrases carry its wording. Covenant re-run passes the holdout at routing 1.00 with 11 sources.

### S-082
- Fixed by the ordered four-question shape test in `valued-ai-fit/SKILL.md`. The first prose version of the fix regressed covenant from rank to desk, which is why the rule became an ordered table with rank asked first.

### S-083
- Fixed by the "Invent every name" rule in `CLAUDE.md` and `valued/SKILL.md`, with Contoso, Globex, Initech and Example Corp added to the real-name check in `valued-audit/check.js`.

### S-078
- Fixed by splitting authorship. `out/proto/holdout.json` is now written by a new `holdout-sealer` subagent (`.claude/agents/holdout-sealer.md`) from the label spec, the trigger lexicon, the sources and the 30 dev rows; the L gate never opens it and passes no row on. Every writer records itself with `conductor.js seal holdout|router <by>` into `out/proto/provenance.json`, and both `conductor.js check` and `valued-audit/check.js` fail the run when one name appears on both sides. Single-context mode seals `holdout single-context` and fails as not independent, which is the honest record rather than a workaround.

### S-080
- Fixed by a limit with a named remedy. `prototype-builder` now reads "under 160 lines of code, 200 a hard limit", and both checkers fail standard 7 above 200 lines, telling the builder to move wording into `sources.json` match lists or the trigger lexicon instead of adding branches.

### S-085
- Fixed in `valued-build/eval.js`. A sealed run is stored under a fingerprint of the router plus the model cache in `out/proto/holdout-runs/<fp>.txt`; a later run on an unchanged router replays that output and says so, instead of re-scoring. A changed router is a new attempt, numbered in the output, and both checkers fail a run scored against more than two router versions. Verified: two runs on one router produce one log line, and a touched router produces "Attempt 2".

### S-086
- Mitigated, not closed, and sharpened. `learning/regression/shape-eval.js` scores the shape decision on its own: `brief` prints the A gate's shape table verbatim plus the 17 case lines that have one, `baseline <answers>.json` records today's shapes, and `score <answers>.json` reports what moved. Drift is the verdict, because a shape that moves is exactly the S-086 failure; the baseline is `learning/regression/shape-baseline.json` with a hash of the shape table, so a reworded rule is visible next to the drift it caused. One Haiku agent replaces 18 runs.
- Sharpened: read cold against a one-line case, the table settles 13 of 17 and cannot settle airline, returns, maintenance or surveillance (it reads all four as chat or rank, where the expectation wants desk or review). Full runs get those right because the A gate arrives with the value gate, the three lenses and the systems behind it. So the shape rule is under-determined by the case line alone, which is why shape is a weak regression check and why the micro-eval gates drift rather than correctness.
- Status: open, with drift now detectable

### S-087
- Gate: app, B. The hosted bundle inlines `golden.json` and `holdout.json` (P-001, accepted on the stated trade-off that the seal is from the model, not from a reader). That trade-off holds only while the rows are synthetic, and nothing checked. A run that read real client material from `inputs/` would have published it on the shared link, against the rule in `CLAUDE.md`.
- Fixed: `build-hosted.js` refuses to build when any golden or holdout row carries an `origin` under `inputs/`, naming the file and the count, and tells you to de-identify the rows or pass `--client-confirmed-deidentified` once the client has confirmed the published copy. Verified both ways on a test workspace.

### S-088
- Gate: B, E. On the card-dispute verification run the `review` router returned the right field names with every `value` and `evidence` empty, so the item screen showed 0 confirmed fields. The dev and holdout evals both passed anyway, at recall 1.00 and routing 0.97, because `eval.js` scores verdicts only. Standard 3 in the browser was the only thing that caught it.
- Evidence: a shape can satisfy its whole contract structurally and extract nothing, and the number that decides the release will not notice. This is direct evidence for P-002 (field-accuracy and rank metrics in eval.js, accepted, not implemented).
- Status: open, and the reason P-002 should be the next thing built

### S-089
- Gate: conductor. Extends S-075. None of `holdout-sealer`, `prototype-builder` or `guard-model` resolves as a registered agent type in this harness, so the verification run launched each as a general-purpose agent told to follow its definition file and to seal under that name.
- Evidence: independence still held in substance, because each ran in its own context, and `provenance.json` recorded two distinct writers. But the name in `provenance.json` is self-reported by the orchestrator, so the check proves that two names were declared, not that two contexts existed. The check is worth having and is not proof against a careless or dishonest orchestrator.
- Status: open
- S-097, S-098, S-099, S-102, S-103: addressed by P-006
- S-100, S-101: addressed by P-007
- S-104: P-008 deferred (no preference given)
- S-105, S-106: P-009 deferred (no preference given)
- S-104: addressed by P-008 (applied 2026-11-02)
- S-105, S-106: addressed by P-009 (applied 2026-11-02)
- S-107, S-108, S-109, S-110, S-111, S-116: addressed by P-010 (applied 2026-11-12)
- S-112: addressed by P-011 (applied 2026-11-12)
- S-113, S-115: addressed by P-012 (applied 2026-11-12)
- S-114: addressed by P-013 (applied 2026-11-12)
- S-117 to S-140: addressed by P-014 to P-017 (applied 2026-11-13; R-001 and the seal round trip await a fresh run)

## Rehearsal 2026-11-13 (insurance claims intake, persona, valued-live clone at PR 14)

### S-141
- Renumbered from S-117 on merge (2026-11-13): the local P-014 to P-017 work had already used S-117 to S-140.
- Gate: conductor (renderer). Source: review (REV-05) and QC phase 5.
- Evidence: PRD section 11 matches eval rows to `e.gateTable` on the first 10 characters of the metric, so "Escalation precision" takes the "Escalation recall" row's why-text and calls an assumed 0.80 bar "the client's bar (R2-4)".
- Status: addressed and merged 2026-11-13 (PR 29: gateWhy, holdoutCell, repair-count sentence, assumptionText)

### S-142
- Renumbered from S-118 on merge (2026-11-13): the local P-014 to P-017 work had already used S-117 to S-140.
- Gate: conductor (renderer). Source: review (REV-01) and QC phase 6.
- Evidence: section 11 always prints "passed after one disclosed repair" plus `e.fixes[0]` when `e.repaired`, though this run had two repair rounds; contradicts the PRD's own summary.
- Status: addressed and merged 2026-11-13 (PR 29: gateWhy, holdoutCell, repair-count sentence, assumptionText)

### S-143
- Renumbered from S-119 on merge (2026-11-13): the local P-014 to P-017 work had already used S-117 to S-140.
- Gate: conductor (renderer). Source: review (REV-04).
- Evidence: section 11 fairness row shows the dev worst group (lang=en) with a blank holdout cell when the holdout fails a different group (register=implied 0.67), hiding the failure.
- Status: addressed and merged 2026-11-13 (PR 29: gateWhy, holdoutCell, repair-count sentence, assumptionText)

### S-144
- Renumbered from S-120 on merge (2026-11-13): the local P-014 to P-017 work had already used S-117 to S-140.
- Gate: conductor (renderer). Source: gate V, gate B, review (REV-06).
- Evidence: `renderState` prints r.json assumptions (objects with text, card, confirmedIf, as SKILL.md specifies) as "[object Object]" under Assumptions in state.md.
- Status: addressed and merged 2026-11-13 (PR 29: gateWhy, holdoutCell, repair-count sentence, assumptionText)

### S-145
- Renumbered from S-121 on merge (2026-11-13): the local P-014 to P-017 work had already used S-117 to S-140.
- Gate: E. Source: QC phase 5 and review (REV-01, REV-02).
- Evidence: after holdout attempt 1 blocked, the E sub-agent ran a second "family-level" router repair using the holdout's printed family and groups; holdout result unchanged, but the holdout is spent. The skill allows one dev repair, then the holdout; it should forbid any repair informed by holdout output.
- Status: open

### S-146
- Renumbered from S-122 on merge (2026-11-13): the local P-014 to P-017 work had already used S-117 to S-140.
- Gate: conductor (rehearsal). Source: QC phase 0.
- Evidence: the conductor passed the persona's private backstory (chatbot pilot misrouted claims) to the AI researcher and into r.json as fact before the client said it. Under --persona, the conductor must only use the case line and answered cards.
- Status: open

### S-147
- Renumbered from S-123 on merge (2026-11-13): the local P-014 to P-017 work had already used S-117 to S-140.
- Gate: conductor (round 2 drafting). Source: QC phase 3.
- Evidence: round-2 cards carried no `why` or `branch`, R2-1 options restated settled answers (C-3, R1-4, R1-3), R2-3 overlapped C-4, and urgent-claim tolerance was set in three cards. Round 2 needs the same hypothesis-led and no-repeat rules as round 1.
- Status: open

### S-148
- Renumbered from S-124 on merge (2026-11-13): the local P-014 to P-017 work had already used S-117 to S-140.
- Gate: conductor (clock). Source: run report.
- Evidence: 52m of 30m. V then A 13m 46s (budget 7), L and U 11m 51s (5), E and D 13m 26s (6), Build 6m 7s (3); each gate sub-agent took 4 to 13 minutes re-reading skill files and inputs. Phase budgets are not met in the default sub-agent mode.
- Status: open
