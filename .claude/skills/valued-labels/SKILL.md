---
name: valued-labels
description: VALUED gate L. Define ground truth before any model is built, recommend the labelling approach with trade-offs, write the golden set and a sealed holdout, and check data rights, privacy and fairness. Called by /valued; not for direct use.
---

# L: Labels agent

**Job:** write the answer key before anything is built.
**Prevents:** the system grading itself.

| | |
|---|---|
| **Asks the client** | Which group worries you most? What can we label from? (Their knowledge of their customers, and the data they can actually use.) |
| **Uses** | An answer key labelled by intent, split by group, with a sealed holdout. |
| **Gives** | A label spec, a golden set, a holdout, a data and privacy table, and a labelling-approach recommendation with trade-offs. |
| **Governance asks** | Are we allowed to use this data for this purpose? Is personal or health data minimised and protected? Do the labels check fairness across groups? |

## Steps

1. **Draft the label spec** for the first-wave use case: the verdicts the system can return (for an
   assist use case usually `answer`, `human`, `escalate`), what each requires (for `answer`, the source
   it must cite), and the **groups** to split by: language, register (calm, frustrated, implied
   complaint), vulnerability, channel, adversarial phrasing, and any group a fairness review would ask
   about.
2. **Labelling-approach recommendation** in the standard format: for example two labellers with
   adjudication, one expert labeller with spot checks, or synthetic now and real data later; each with
   its trade-off (quality, cost, speed, privacy). Our preference, why, what would change our mind.
3. Write `out/proto/sources.json`: 6 to 8 short synthetic source items, each with an `id` and `text`.
4. Write `out/proto/golden.json` **now, before any system exists**: 40 rows, each
   `{ "id", "text", "expected": "answer|human|escalate", "source": "<id or null>", "slices": {...} }`.
   At least 8 rows in a second language the client serves, at least 6 implied complaints or distress
   without the obvious keyword, at least 5 adversarial rows. Hand-written variety.
   Then **split it**: move 10 rows covering every group into `out/proto/holdout.json`. The builder may
   learn from the 30 dev rows; the holdout is never shown to it, not even while fixing.
5. **Data and privacy table** (max 6 rows): data needed, owner, purpose, personal or health data
   involved, minimisation (dropped, masked or tokenised), retention.
6. **Ask the client (max 2 cards):**
   - **"Ops lead": "Which group worries you most?"** Groups from step 1, our preference first (the one
     whose silent failure would hurt most), each with why it matters.
   - **"Data owner": "What can we label from?"** Options such as real interactions with consent, a sample
     with personal data removed, synthetic only for now; each with its trade-off. Our preference is the
     fastest safe option.
7. **Governance check** in `out/3-labels.md` (question, answer, status):
   - Purpose: is this use covered by the consent or policy the data was collected under? Status "client
     to confirm" unless the client said so.
   - Minimisation: what personal or health data the labels need, and what is masked or excluded.
   - Fairness: which groups the golden set covers, and the minimum rows per group for a gate to mean
     something. Flag any group too thin to evaluate.
   Add open items to the "Governance log" in `out/state.md`.
8. **Finalize** `out/3-labels.md` (spec, groups, counts per group, data table, recommendation); update
   `out/state.md`.
9. **Say it** (three lines): labels before the model; the group you split by and why; why the holdout
   stays sealed.
