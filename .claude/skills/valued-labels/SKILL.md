---
name: valued-labels
description: VALUED gate L. Define ground truth before any model is built, and write the golden set the prototype will be judged against. Called by /valued; not for direct use.
---

# L: Labels

Goal: decide what "right" means before anything is built, so the system is never graded against
itself.

1. Draft the **label spec** for the first-wave use case: the verdicts the system can return (for an
   assist use case usually `answer`, `human`, `escalate`), what each requires (for `answer`, the
   source or policy it must cite), and the **slices** to stratify on: language, customer register
   (calm, frustrated, implicit complaint), vulnerability, channel, adversarial phrasing.
2. Write `out/proto/sources.json`: 6 to 8 short synthetic source items the use case answers from
   (policies, rules or knowledge articles for this client), each with an `id` and `text`.
3. Write `out/proto/golden.json` **now, before any system exists**: 40 rows, each
   `{ "id", "text", "expected": "answer|human|escalate", "source": "<id or null>", "slices": {...} }`.
   Required mix: at least 8 rows in a second language the client serves, at least 6 implicit
   complaints or distress without the obvious keyword, at least 5 adversarial rows. Hand-written
   variety; no templated repetition.
   Then **split it**: move 10 rows, covering every slice, into `out/proto/holdout.json`. The 30 left in
   `golden.json` are the dev set the builder may learn from; the holdout is never shown to the builder,
   not even while fixing, so the score after a fix stays honest.
4. Data and privacy, max 5 rows: what data the real version needs, who owns it, PII handling, what
   may not be used.
5. Ask the client (max 2 cards):
   - **Header "Ops lead": "Which slice worries you most?"** Options from the slices; recommend the one
     whose failure would hurt most (often a second language or vulnerable customers).
   - **Header "Data": "What can we label from?"** Options like real transcripts with consent, synthetic
     only for now, a sample with PII stripped. Recommend the fastest safe one.
6. Finalize `out/3-labels.md` (spec, slices, counts by slice, data table), update `out/state.md`.
7. **Say it**: labels before the model; the slice you stratify on and why; how disagreements between
   labellers get adjudicated.
