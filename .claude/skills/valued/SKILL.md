---
name: valued
description: Run a client AI case end to end through the six VALUED gates (Value, AI-fit, Labels, User-in-the-loop, Evals, Deploy and drive) plus Build, governed at every gate, in about 28 minutes. A conductor runs the gates in phases on a clock, asks the client's cards in two rounds, runs independent gates in parallel, and renders the PRD, prototype and brief from each gate's JSON. Use when the user types /valued, with or without a case. Add --teach for the slow, narrated pace.
---

# /valued: the conductor

The argument is a one-line case, for example `/valued regional bank, 2M customers, contact centre cost
pressure, 30 GenAI ideas, COO wants a plan in six weeks`. Flags:
- `--teach`: stop reading here and follow `teach.md` in this folder (one gate at a time, cards at every gate).
- `--auto`: take the recommended option on every card (`conductor.js cards auto <round>`), logged "(auto)".
- `--no-open`: never run `open`; print paths instead.

Below, `$C` stands for `node .claude/skills/valued/conductor.js`: type it in full every time (a shell variable holding a command with a space does not run in zsh). Run it from the workspace root, with the
port `P=${PORT:-4317}` (written as 4317 in the skills).

## How a run is built

**Structured first.** Every gate writes one JSON file, `out/gates/<v|a|l|u|e|d|b>.json`, with the keys its
skill lists under "Output". Cards live in one file, `out/cards.json`. `$C render` turns them into the gate
files `out/1-value.md` to `out/6-deploy.md`, `out/state.md`, `out/prd.md` (every section), `out/proto/case.json`,
`out/prd.html` and `out/brief.html`. **Never hand-edit those rendered files**: change the JSON and render again.
The model writes judgement only: drafts, options and trade-offs, reasons, the summary, the recommendation and
section 17. `$C check` lists what is still missing, by standard; a run is done when it prints `All checks pass.`

**The client decides; the system drafts.** The rules in `CLAUDE.md` hold in every phase: ask only what the
client owns, every recommendation shows its trade-offs, mark every assumed fact (assumed), synthetic data
only, no em-dashes, tables of at most 12 rows.

**Card schema** (`out/cards.json`, an array; append, never rewrite answered cards):
`{ "id": "R1-1", "round": 0|1|2|3, "gate": "Frame|V|A|L|U|E|D", "role": "<this case's sponsor or owner role>",
"question": "...", "format": "<own-words answer shape, with an example>", "options": [{ "label", "tradeoff" }],
"decision": null, "by": null, "effect": "<what the answer changes, a few words>" }`. The first option is our
recommendation. Roles are this case's people (head of card operations, chief nursing officer, controller),
never a generic "COO" unless the case says COO. 2 to 4 options per card.

## The run plan (28 minutes)

| Phase | Work | Budget | Who |
|---|---|---|---|
| 0 Frame | framing cards only for what is missing; workspace, server, live PRD | 3 min | you |
| 1 Round 1 | 5 cards: outcome, hard constraint, hosted model, autonomy, escalation owner | 2 min | client |
| 2 V then A | value frame; then assistants, shape, sweeps, three scorers in parallel | 7 min | `valued-value`, `valued-ai-fit` |
| 3 Round 2 | 6 cards: first wave, riskiest group, what to connect, release bar, pilot scope, stop rule | 2 min | client |
| 4 L and U in parallel | golden set, holdout, systems; autonomy table, never list, clocks | 5 min | `valued-labels` and `valued-user-loop` |
| 5 E and D in parallel | builder writes the router, evals run; rollout and drive | 6 min | `valued-evals` and `valued-deploy` |
| 6 B | PRD and prototype rendered from gate data; hosted page; run report | 3 min | `valued-build` |

Cards in total: 11 in the two rounds, plus framing (0 to 4) and E's "Ship anyway, or fix first?" only when a
release is blocked: 11 to 16. Start and end every phase with `$C clock <phase> start|end`; the start prints
the header line (`[2] V then A · budget 7 min`). Between phases print nothing else.

**Graceful overrun.** Before each phase starts and whenever a phase feels long, run `$C clock status`. If the
running phase is past its budget, cut the next item in its cut order (`$C clock status` prints it), record it
with `$C cut <phase> <what>`, which prints the one line to say, and keep going. Cut order: fewer candidates,
fewer wave options, a smaller golden set (never under 30 dev rows and 12 holdout rows), the harder-rows
round, shorter prose. **Never cut** governance checks, the evals, the holdout or the never list.

**Parallel work.** Where a phase runs two gates in parallel, launch both as subagents **in one message**
(each reads its own gate skill, writes only its own files, and does not run `render`), then wait for both and run `$C render` once. If you cannot launch
subagents, run them one after the other without stopping for cards, and follow the single-context rules:
score each lens separately before merging; write the router before opening `golden.json`; never open
`holdout.json` while building or fixing; set `"independent": false` in `e.json` so every place that shows the
holdout says "not independent".

## Phase 0: Frame (3 min)

1. `$C clock 0 start`. If the argument is empty or lacks the client, the business problem, or the success
   measure and deadline, ask only the missing framing cards (round 0), each 3 to 4 typical options:
   **"Client context"** (industry, size, the unit that owns the problem; format "industry, size, and the unit
   that owns it (e.g. 'P&C insurer, 40k claims a month, claims operations')"), **"Business problem"** (format
   "the process, how it shows up, and a rough number (e.g. 'FNOL setup, 20 fields re-keyed, 18 minutes a
   claim')"), **"Success and timeline"** (format "a metric, a target and a date (e.g. 'setup under 10
   minutes, pilot in 8 weeks')"). Whenever `inputs/` is empty, also ask **"Material": "What real material
   can we work from?"** ("Synthetic only for now" recommended when nothing is ready; "Documents in inputs/";
   "Sample requests or transcripts, de-identified"; "Both"; format "the material, its rough size and who
   owns it (e.g. '300 policy PDFs, owned by HR operations')"). If files are in `inputs/`, list them in one
   table instead and print `Grounded in: <n> client files`. Under `--auto` take the first option of each.
   Print `Engagement: <case line>` when you built it from answers.
2. Set up:
   ```bash
   B=.claude/skills/valued-build; mkdir -p out/proto out/gates inputs
   cp $B/app/app.html $B/app/server.js $B/app/ff.css $B/prd-viewer.html $B/eval.js out/proto/
   echo '{}' > out/proto/case.json; echo '[]' > out/cards.json
   echo "<the case line>" > out/case-line.txt; echo "orchestrated" > out/mode.txt
   node $B/prd-skeleton.js "<the case line>" out/prd.md
   P=${PORT:-4317}; lsof -ti :$P | xargs kill 2>/dev/null; PORT=$P node out/proto/server.js   # in the background
   ```
   `open http://localhost:4317/prd` (skip under `--no-open`). Print:
   `VALUED · 6 gates · governed at every gate · the system drafts, the client decides · live PRD: localhost:4317/prd`.
3. Pick the industry key now: `$C seed <industry>` (a key of `.claude/skills/valued-labels/connectors-library.json`,
   or the closest) prints the systems, golden-set seeds and sweep templates every later gate starts from.
   `$C clock 0 end`.

## Phase 1: Round 1 (2 min)

`$C clock 1 start`. Draft five cards from the case line alone (no gate has run yet, so options come from
the case, the industry and the seed library), append them to `out/cards.json` with `"round": 1`, then
`$C cards print 1` (or `$C cards auto 1` under `--auto`) and record each answer as `decision` and `by`:

| Card | Gate | Header role | Question | Options come from |
|---|---|---|---|---|
| R1-1 | V | sponsor | Which outcome must move first? | 2 to 3 north-star metrics with what each rewards and can hide |
| R1-2 | V | sponsor | What is the hard constraint? | e.g. nothing customer-facing unreviewed, existing platform only, data stays in; each with what it rules out |
| R1-3 | A | IT and risk | May the prototype call a hosted model? | "Yes, on synthetic data" (`rules+model`), "Not yet" (`rules`), "Yes, and let it lead" (`model-first`), with the trade-offs in `valued-ai-fit` |
| R1-4 | U | risk owner | How much autonomy in the first 90 days? | suggest only, draft with approval, act on low-risk actions |
| R1-5 | U | operations owner | Who owns an escalation? | the existing path, a specialist team, the risk desk |

Recommend: the outcome tied to the sponsor's stated goal; the constraint that de-risks a first wave; a hosted
model on synthetic data whenever a free-text job exists (rules only when the case is mostly rules); draft with
approval; the existing escalation path. `$C clock 1 end`.

## Phase 2: V then A (7 min)

`$C clock 2 start`. Run `valued-value` (it reads round 1, never asks), then `valued-ai-fit` (three
`use-case-scorer` subagents in parallel, then the merge, shape, assistants and sweeps). Each writes its JSON
and runs `$C render`. `$C clock 2 end`.

## Phase 3: Round 2 (2 min)

`$C clock 3 start`. Draft six cards from the rendered gate files (V's priced problem, A's waves and
assistants, the seed groups), append with `"round": 2`, print or auto, record answers:

| Card | Gate | Header role | Question |
|---|---|---|---|
| R2-1 | A | sponsor | Which ideas go first? (A's wave options) |
| R2-2 | L | operations owner | Which group worries you most? |
| R2-3 | L | data owner | What can the pilot connect to? |
| R2-4 | E | risk owner | Bar for the riskiest miss? (0.99 / 0.97 / 0.95) |
| R2-5 | D | sponsor | What is the pilot scope? |
| R2-6 | D | sponsor | What would make you stop? |

If the client picks a different first wave than A recommended, update `a.json` (`waves.preferred`, the
`wave` field on scores) and render before phase 4. `$C clock 3 end`.

## Phase 4: L and U in parallel (5 min)

`$C clock 4 start`. Launch `valued-labels` and `valued-user-loop` together. Both read `out/gates/v.json`,
`a.json` and the answered cards; neither asks the client anything. L writes `l.json`, `golden.json`,
`holdout.json`, `sources.json`; U writes `u.json`. When both are back, `$C render`. `$C clock 4 end`.

## Phase 5: E and D in parallel (6 min)

`$C clock 5 start`. Launch `valued-evals` (which launches `prototype-builder` and runs the evals) and
`valued-deploy` together. If the dev eval is blocked, E asks the one extra card **"Ship anyway, or fix
first?"** (round 3; "Fix first" recommended), fixes the router, never the labels, and runs the holdout. When
both are back, `$C render`. `$C clock 5 end`.

## Phase 6: B (3 min)

`$C clock 6 start`. Run `valued-build`: it writes `b.json` (summary, recommendation, requirements, FAQ, sweep
findings, section 17), runs `$C render`, `$C check` until it prints `All checks pass.` (fix the JSON, never
the rendered files), builds the hosted page, and publishes (or, if publishing is unavailable or not allowed,
says so in one line and keeps localhost). Then `$C clock 6 end`, `$C report` (writes
`out/run-report.json`: time per phase, questions, revisions, flags, eval blocks and fixes, cuts), and the
audit: `node .claude/skills/valued-audit/audit.js --port 4317` (the `valued-audit` skill: the eight standards,
every issue with its owner and fix, `out/observe.html`). Print `$C clock status`, the audit's standards row
and open issues, and the closing line, nothing else:

`Brief: out/brief.html · PRD: out/prd.html · Prototype: http://localhost:4317 · Run: out/observe.html · Audit: /valued-audit · Feedback: /valued-revise <what to change>`

Under `--no-open` skip every `open`; otherwise `open out/brief.html`.

## Rules for every gate (pass these on)

- **Output contract.** Write `out/gates/<k>.json` with every key the gate's skill lists; keep each string one
  line; then `$C render`. `$C check` names any key you missed.
- **Cards only in the rounds.** A gate never asks a card itself in the default mode; it reads the answered
  cards in `out/cards.json`. The one exception is E's ship-or-fix card on a blocked release.
- **Draft first.** Every recommendation is a table of options with trade-offs, our preference, why, and what
  would change our mind (`{ "options": [{ "label", "tradeoff" }], "preferred", "why", "changeMind" }`).
- **Governance at every gate.** `governance`: rows `{ "question", "answer", "status": "answered" | "assumed" |
  "client to confirm", "owner": "<role that closes it>" }`. Render puts open rows in the Governance log.
- **Say it.** `sayIt`: three first-person lines the product lead can say out loud.
- **Assumptions.** `assumptions`: one-line strings, each fact marked (assumed).
- **Revisions.** If the client changes an earlier answer mid-run, use `valued-revise`, then resume. After the
  run, all feedback goes through `/valued-revise`, and each revision is a learning signal (see
  `.claude/skills/valued-learn/SKILL.md`).
