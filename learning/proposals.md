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
