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

> **Mode.** In the default run the conductor (`valued/SKILL.md`) asks this gate's cards in its rounds: skip
> the "Ask the client" step, read the answered cards for gate L in `out/cards.json`, and never ask a card
> yourself. Under `--teach`, ask them as written and append each card, with its answer, to `out/cards.json`
> in the card schema. Either way, end by writing `out/gates/l.json` (below) and running
> `node .claude/skills/valued/conductor.js render` (skip the render when the conductor launched you in a parallel
> phase; it renders once both gates are back). Never hand-edit the rendered files: wherever a step below says to
> write a gate file, `case.json`, `state.md` or a PRD section, put that content in the gate JSON instead.

## Steps

1. **Draft the label spec** for the first-wave use case: the verdicts the system can return (for an
   assist use case usually `answer`, `human`, `escalate`), what each requires (for `answer`, the source
   it must cite), and the **groups** to split by: language, register (calm, frustrated, implied
   complaint), vulnerability, channel, adversarial phrasing, and any group a fairness review would ask
   about.
2. **Labelling-approach recommendation** in the standard format: for example two labellers with
   adjudication, one expert labeller with spot checks, or synthetic now and real data later; each with
   its trade-off (quality, cost, speed, privacy). Our preference, why, what would change our mind.
Schemas the prototype reads: `verdicts` in `case.json` is
   `{ "answer": { "label", "desc" }, "human": { ... }, "escalate": { ... } }` in the client's words; an
   assistant's `gate` is one of "Catches every escalation", "Keeps false alarms low", "Never acts without
   approved knowledge", "Sends each item the right way", "Works equally across groups", "No group falls
   below the bar", "Stays off forbidden topics", "Only allowed outcomes".
3. Write `out/proto/sources.json`: 6 to 8 short source items, each with an `id`, a plain `title` the user would recognise (for example "Wire transfers", "US paid time off") and `text`.
   For the `review` shape, each source is a document type and also carries `fields`: the exact list of
   field names the extraction must fill (for example `["Member ID", "Drug and dose", "Diagnosis code"]`). **If `inputs/`
   holds client documents, build the sources from them** (one item per policy or article that the
   first-wave use case needs, quoting the governing passage, with `"origin": "inputs/<file>"`); read PDFs
   directly and Word files via `textutil -convert txt -stdout <file>`. Otherwise write synthetic items.
4. **If `inputs/` holds sample requests or transcripts**, draw the golden rows from them first:
   de-identify (names, account and card numbers, addresses, dates of birth), keep the phrasing, and set
   `"origin"`. Propose each row's label from the label spec and mark it `"label": "proposed"` until the
   client's labeller confirms it; fill the remaining rows synthetically and say how many are real.
   Write `out/proto/golden.json` **now, before any system exists**: 42 rows (30 dev after the split), each
   `{ "id", "text", "expected": "answer|human|escalate", "source": "<id or null>", "slices": {...} }`.
   At least 8 rows in a second language the client serves, at least 6 implied complaints or distress
   without the obvious keyword, at least 5 adversarial rows. Hand-written variety.
   Each row's `slices` uses short keys the eval can group by, for example
   `{ "lang": "es", "register": "implied", "adversarial": "yes" }`. Rows asking for something on the
   never list carry `"never": true`; at least 3 of them.
   Then **split it**: move 12 rows covering every group, at least 6 of them escalations, into
   `out/proto/holdout.json`. Say plainly that with this few escalation rows a 0.99 bar means zero misses. The builder may
   learn from the 30 dev rows; the holdout is never shown to it, not even while fixing.
5. **Systems to connect** (an output, specific to the industry). **Start from the industry list** in
   `connectors-library.json` in this skill's folder (key = `industry` from gate V, or the closest):
   keep every system the first wave touches (at least 6), rewrite `provides` and `usedFor` for this
   case, and add any system the case needs that the list lacks. These are the systems the first wave reads
   from or hands off to, grouped as where work arrives (`channel`), approved knowledge (`knowledge`),
   systems of record (`record`), test and labelling data (`testing`), and people and alerts (`collab`).
   Name each by what it is ("Claims system", "Contact-centre platform"); put vendor names only as
   examples marked (assumed), never as the client's actual stack. Write them to `case.json` as
   `connectors`: `{ "name", "vendor", "category", "provides", "usedFor", "access": "read" | "read-write",
   "writeBack": false, "pii": "masked" | "none" | "yes", "owner", "status": "connected" | "planned",
   "scopes": [], "never": [] }`. Channels, knowledge and test data the pilot needs start `connected` (simulated on
   synthetic data); everything else `planned`. Write-back stays off in the pilot.
6. **Data and privacy table** (max 6 rows): data needed, owner, purpose, personal or health data
   involved, minimisation (dropped, masked or tokenised), retention.
7. **Ask the client (max 2 cards):**
   - **"<operations owner role>": "Which group worries you most?"** Groups from step 1, our preference first (the one
     whose silent failure would hurt most), each with why it matters.
   - **"<data owner role>": "What can the pilot connect to?"** Options such as: read-only channels and knowledge
     with synthetic test labels (Recommended for a first pilot); read-only including systems of record
     with personal data masked; file uploads only for now. Each with its trade-off. The labelling
     source follows from the answer and is stated as a recommendation, not asked.
8. **Governance check** in `out/3-labels.md` (question, answer, status):
   - Purpose: is this use covered by the consent or policy the data was collected under? Status "client
     to confirm" unless the client said so.
   - Minimisation: what personal or health data the labels need, and what is masked or excluded.
   - Fairness: which groups the golden set covers, and the minimum rows per group for a gate to mean
     something. Flag any group too thin to evaluate.
   Put the rows in `governance`; render adds open ones to the Governance log.
9. **Write** `out/gates/<k>.json` (see Output) and run `node .claude/skills/valued/conductor.js render`; it writes the gate file, state.md, the PRD sections and case.json.
10. **Say it** (three lines): labels before the model; the group you split by and why; why the holdout
   stays sealed.

## Output: `out/gates/l.json`

Keys (render and `conductor.js check` read them; keep strings to one line): `verdicts` (`{ answer: { label, desc }, human: {...}, escalate: {...} }`), `groups` (`{ key, values, why }`, keys matching the golden `slices`), `labelling` (a recommendation), `goldenNote`, `connectors` (6+ in the connector schema, starting from the library), `dataPrivacy` (`{ data, owner, purpose, personal, minimisation, retention }`), `samples` (optional; 6 from golden.json, otherwise render picks them). Every escalation row carries `slices.family` with one of `a.json` `triggerFamilies`; every family has 2+ escalation rows in dev, and the holdout's 6+ escalations test new wordings of families dev has, never a family dev lacks (not every family must appear in the holdout). Groups with fewer than 2 holdout escalations are reported, not gated. Rewrite seed slices to this case's group keys and drop seeds off-topic for the case. Each source in `sources.json` carries `match`: 6 to 10 phrases and synonyms a user might use for it. Also write `out/proto/golden.json` (30+ dev rows after the split), `out/proto/holdout.json` (12 rows, 6+ escalations) and `out/proto/sources.json`. Start the golden set from `golden-seeds.json` for the industry (`node .claude/skills/valued/conductor.js seed <industry>`): rewrite each seed for this case, then add rows; never copy a seed into the holdout unchanged.; plus `governance` (rows `{ question, answer, status, owner }`), `sayIt` (3 lines), `assumptions` (strings). Recommendations use `{ options: [{ label, tradeoff }], preferred, why, changeMind }`. Then run `node .claude/skills/valued/conductor.js render`.
