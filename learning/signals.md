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


## Status updates
