# VALUED proposals

Changes proposed from the learning log, waiting on Nik's decision. One numbered proposal per change.
Each cites the signals behind it, shows the options with trade-offs, names a preference, and says what
would change our mind. Status: open, accepted, deferred, rejected.

Fields: **Signals** · **Gate** · **Problem** · **Options** · **Preference** · **What would change our mind** · **Status**.

## Proposals

### P-001: the hosted page embeds holdout.json
- Signals: audit runs (hosted prototype cannot score the sealed set) · Gate: app, E
- Problem: the local prototype scores dev and holdout, the hosted copy scores dev only, so the shared link cannot show the number that decides the release.

| Option | Trade-off | |
|---|---|---|
| A: inline both sets into the hosted bundle at build time | holdout scoring works on the link with no server; the sealed set ships inside the page, so it is sealed from the model, not from a reader | **Preferred** |
| B: hosted page scores dev only, holdout stays local | keeps the holdout unreadable; the client link cannot show the release number | |
| C: hosted page fetches the holdout from a tiny endpoint | keeps it sealed and scorable; adds a service to run and secure | |

- Preference: A. The holdout exists to stop the system grading itself, and the rows are synthetic, so a reader seeing them costs nothing while losing the number on the shared link costs the gate.
- What would change our mind: a real client holdout built from `inputs/`, where the rows must not leave the laptop.
- Status: accepted by Nik, 2026-10-26 (option A)

### P-002: field-accuracy and rank metrics in eval.js
- Signals: S-002, S-008 · Gate: L, E
- Problem: eval.js scores outcomes only. The review shape needs per-field accuracy by field and document type; the rank shape needs must-do recall and precision at 3. Both shapes currently pass on a metric that does not describe them.

| Option | Trade-off | |
|---|---|---|
| A: add both metric families to eval.js, selected by shape | every shape is scored by its own number; eval.js grows a third scoring path and the label spec grows per-field rows | **Preferred** |
| B: keep outcome scoring, add field accuracy only | smaller change; the rank shape stays mis-scored | |
| C: separate scorer per shape | clean per shape; three scorers to keep in step, and the golden set splits | |

- Preference: A. One scorer, one golden-set format, with the metric chosen by the shape the A gate already recorded.
- What would change our mind: a fourth shape arriving that neither metric family fits, which would argue for C.
- Status: accepted by Nik, 2026-10-26 (option A)

### P-003: customer chat with an approval step
- Signals: U gate runs where the never list bans unapproved customer contact · Gate: U, B
- Problem: the prototype shows an internal queue only. Cases whose value sits in replying to a customer cannot show the one thing that matters, the person approving the draft before it is sent.

| Option | Trade-off | |
|---|---|---|
| A: add a chat surface with a hold-for-approval state and a visible approver | shows the human decision where the client can see it; a second surface in the app to build and keep | **Preferred** |
| B: keep the queue, mark the draft "would be sent" | no new surface; the approval step stays a claim rather than a thing the client clicks | |
| C: chat without approval, approval in the queue only | one surface; splits one decision across two screens | |

- Preference: A. The U gate is the method's differentiator and should be visible, not described.
- What would change our mind: evidence that the extra surface pushes the build phase past its slice of 28 minutes.
- Status: accepted by Nik, 2026-10-26 (option A)

### P-004: who is asking
- Signals: S-012 · Gate: app, U
- Problem: the app has no notion of the asker's role, region or permissions, so region was forced into the question text. Group-by-group evals and the never list both need the asker as data.

| Option | Trade-off | |
|---|---|---|
| A: an asker object (role, region, permissions) on every request, set by a picker in the app and carried into eval groups | groups become real and the never list can be enforced per role; schema and golden set both gain a field | **Preferred** |
| B: role only, no region or permissions | small change; region stays in the text and permission rules stay unenforceable | |
| C: leave it in the text, parse it | no schema change; parsing the asker out of free text is exactly the fragility the method warns against | |

- Preference: A. The E gate promises group-by-group numbers, which needs the group on the row.
- What would change our mind: a case family where the asker is genuinely uniform, which would make the field dead weight.
- Status: accepted by Nik, 2026-10-26 (option A)

### P-005: two citations per answer
- Signals: S-013 · Gate: L
- Problem: the label spec allows one source per answer. Real answers often rest on two policies, and the guard model already has to pick one and drop the other.

| Option | Trade-off | |
|---|---|---|
| A: sources become a list of one or two, scored as a set | matches how answers are actually sourced; the source-matching backstop and the golden set both move from a value to a set | **Preferred** |
| B: keep one source, add an optional secondary | smallest change; the second source is unscored, so it drifts | |
| C: unbounded list | most faithful; invites citation padding and makes the set score loose | |

- Preference: A. A cap of two keeps the score tight while covering the common two-policy answer.
- What would change our mind: golden-set evidence that three or more sources are common in one shape.
- Status: accepted by Nik, 2026-10-26 (option A)

### P-006: a five-step demo standard for the deep path, with a reference kit
- Signals: S-097, S-098, S-099, S-102, S-103 · Gate: B, app
- Problem: `/valued-deep go build` says how to hand off to a build but nothing about the demo, so UC2's demo was restructured many times (acts, channels, crowded pages, a Control panel unlike today's view, ad hoc colours, an old home on the public link) before it reached a level Nik would show.

| Option | Trade-off | |
|---|---|---|
| A: `demo-standard.md` plus `demo-kit/` (the UC2 scene player, story bar, current and future state page, Prove it page and styles) | the next case starts from working code at this level; the kit carries UC2 content each case must replace | **Preferred** |
| B: the standard only | nothing case-specific in the repo; the next build rebuilds the scene player and Prove it from scratch | |

- Preference: A. The scenes and Prove it took the most rework, and copying working code is faster than following a description.
- What would change our mind: a second case where the kit's structure does not fit, which would argue for a generic template instead.
- Status: accepted by Nik, 2026-11-01 (option A)

### P-007: one eval scorer for the runner and the demo, and a Prove it page that shows misses
- Signals: S-100, S-101 · Gate: E
- Problem: a demo eval page with its own copy of the scoring can drift from the runner, and a page that shows only passes is not believed; UC2's first version did both.

| Option | Trade-off | |
|---|---|---|
| A: require a shared `eval-core.js` (output checked identical when extracted or changed) and a Prove it page with what fails and the fix, observe and feedback, and denominators on every rate | the demo can never disagree with the runner, and the panel sees the improvement loop; one more required page | **Preferred** |
| B: require the shared scorer only | smaller; a later demo may again show only passes | |

- Preference: A. The missing-failures gap was the panel question Nik expected first.
- What would change our mind: a case with no release gate to show.
- Status: accepted by Nik, 2026-11-01 (option A)

### P-008: public and private split with a publish script
- Signals: S-104 · Gate: B
- Problem: the demo repo was public with pages naming the real client and employers; the split was done by hand, and the first script deleted the public repo's .git.

| Option | Trade-off | |
|---|---|---|
| A: a generic publish script (two-stage copy, real-name gate, never touching the public .git) and a go build step that uses it | no real name or private page reaches a public link; the case lists its private files and names | **Preferred** |
| B: the rule only | each case writes its own script | |

- Status: accepted by Nik, 2026-11-02 (option A; deferred on 2026-11-01, then "Yes, apply both")

### P-009: end go build audit-ready, and keep the strategy as the state of record
- Signals: S-105, S-106 · Gate: conductor
- Problem: the stress-audit prompt and the practice of one session owning the decision log and strategy were both done by hand on UC2.

| Option | Trade-off | |
|---|---|---|
| A: write the audit prompt from a template at the end of go build, and add a standing rule that one session owns the log and the strategy while builders relay each decision with the user's words | every deep build ends audit-ready and the strategy never drifts; a template to keep current | **Preferred** |
| B: the audit template only | the strategy can drift during the next long build | |

- Status: accepted by Nik, 2026-11-02 (option A; deferred on 2026-11-01, then "Yes, apply both")

### P-010: the six-step story, click to advance, and Prove it as an honest dashboard
- Signals: S-107, S-108, S-109, S-110, S-111, S-116 · Gate: app, E
- Change: demo-standard.md (six steps plus PRD, click to advance, the Release decision dashboard with meanings, Responsible AI, fairness, amber for inside-bar-above-goal and fixed-but-watched, what went wrong with owners, monitoring, what the demo cannot test yet; a "Questions we never tested" tab; one vocabulary; vendors by kind); demo-kit refreshed from UC2.
- Status: accepted by Nik, 2026-11-12 (Apply)

### P-011: Roadmap, Trade-offs and one build list
- Signals: S-112 · Gate: D, B
- Change: Roadmap phase cards with techniques and tools tagged build, buy or use today's; a who-does-what journey; Trade-offs rows; `out/<case>-build-list.json` proved identical in the Roadmap and PRD by `demo-check.js --build`; the PRD mirrors the pages. Kit gains plan.html, choices.html, flowmap.js, vendors.js.
- Status: accepted by Nik, 2026-11-12 (Apply)

### P-012: a repeatable final audit
- Signals: S-113, S-115 · Gate: B, app
- Change: new `demo-auditor` agent (scopes story, roadmap-prd, talk-hygiene, with the eight failure patterns found on UC2); the audit template's "final sweep before every showing"; `demo-check.js` fails on a rate paired with the wrong count, a shared script loaded with two `?v=` stamps, and em dashes.
- Status: accepted by Nik, 2026-11-12 (Apply)

### P-013: the talk track as a required, checked output
- Signals: S-114 · Gate: B
- Change: `talk-track-template.md`; `demo-kit/talktrack.py` (markdown to PDF); `demo-check.js --talk` fails when a story step or Prove it tab is not mentioned or the tab count is wrong.
- Status: accepted by Nik, 2026-11-12 (Apply)

| P-010 | 2026-11-12 | six-step story, click to advance, Prove it dashboard | S-107 to S-111, S-116 | approved | pending |
| P-011 | 2026-11-12 | Roadmap, Trade-offs, one build list | S-112 | approved | pending |
| P-012 | 2026-11-12 | demo-auditor agent and demo-check.js | S-113, S-115 | approved | pending |
| P-013 | 2026-11-12 | talk track template, PDF script and check | S-114 | approved | pending |
