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
- `--lean`: the low-token mode for regression runs. Do every gate in this context (score the three lenses one after
  another, run L, U and D inline) and launch only three subagents: `holdout-sealer` (Sonnet),
  `prototype-builder` (Sonnet) and `guard-model` (Haiku). Those three are never cut, in any mode: the
  sealer is the only reason the holdout number means anything, because this context must never hold both
  the holdout rows and the router. Read each gate skill once; keep printed output to the phase headers,
  the eval result lines and the closing line; write any notes to `out/run-notes.md`.

Below, `out/tools/c` is the conductor (`node .claude/skills/valued/conductor.js`), a two-line wrapper phase 0 writes; run it from the workspace root, with the
port `P=${PORT:-4317}` (written as 4317 in the skills).

## How a run is built

**Structured first.** Every gate writes one JSON file, `out/gates/<v|a|l|u|e|d|b>.json`, with the keys its
skill lists under "Output". Cards live in one file, `out/cards.json`. `out/tools/c render` turns them into the gate
files `out/1-value.md` to `out/6-deploy.md`, `out/state.md`, `out/prd.md` (every section), `out/proto/case.json`,
`out/prd.html` and `out/brief.html`. **Never hand-edit those rendered files**: change the JSON and render again.
The model writes judgement only: drafts, options and trade-offs, reasons, the summary, the recommendation and
section 19. `out/tools/c check` lists what is still missing, by standard; a run is done when it prints `All checks pass.`

**The client decides; the system drafts.** The rules in `CLAUDE.md` hold in every phase: ask only what the
client owns, every recommendation shows its trade-offs, mark every assumed fact (assumed), synthetic data
only, no em-dashes, tables of at most 12 rows.

**Talk to the client, not about them.** The client is watching the shared screen, so everything printed
addresses them as "you" and the team as "we". Never narrate "let me ask the client", "the client decides"
or "asked North-star": say "a couple of quick ones for you", "your call", "let's capture this". Round
headers are warm and short ("A few quick steers from you", "Now let's shape the first step"), never
"Round 1, five cards". Present each round's cards with the AskUserQuestion tool (that is the card view the
client sees); set `multiSelect: true` on any card where several options can hold together (constraints to
design around, systems to connect, groups to watch), single-select where the answer is one choice
(autonomy level, release bar, first wave). Record a multi-select answer as the chosen labels joined with
", " in `decision`.

- **Invent every name.** A placeholder is not synthetic: never write Acme, Contoso, Globex, Initech or
  Example Corp, and never a real company, insurer, bank, airline, retailer, hospital or platform. Build
  names from the case's own words (for example "Northbank Card Services", "Harborline Utilities"). The
  audit's real-name check fails a run on any of them, so check `prd.md`, `case.json`, `sources.json`,
  `golden.json`, `holdout.json` and `state.md` before the closing line.

**Card schema** (`out/cards.json`, an array; append, never rewrite answered cards):
`{ "id": "R1-1", "round": 0|1|2|3, "gate": "Frame|V|A|L|U|E|D", "role": "<this case's sponsor or owner role>",
"question": "...", "format": "<own-words answer shape, with an example>", "options": [{ "label", "tradeoff" }],
"multi": false, "decision": null, "by": null, "effect": "<what the answer changes, a few words>" }`. Set
`"multi": true` for a card whose options can hold together (constraints, systems to connect, groups to
watch); ask it with `multiSelect: true` and store the chosen labels joined with ", ". The first option is our
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
release is blocked: 11 to 16. Start and end every phase with `out/tools/c clock <phase> start|end`; the start prints
the header line (`[2] V then A · budget 7 min`). Between phases print nothing else.

**Graceful overrun.** Before each phase starts and whenever a phase feels long, run `out/tools/c clock status`. If the
running phase is past its budget, cut the next item in its cut order (`out/tools/c clock status` prints it), record it
with `out/tools/c cut <phase> <what>`, which prints the one line to say, and keep going. Cut order: fewer candidates,
fewer wave options, a smaller golden set (never under 30 dev rows and 20 holdout rows), the harder-rows
round, shorter prose. **Never cut** governance checks, the evals, the holdout or the never list.

**Parallel work.** Where a phase runs two gates in parallel, launch both as subagents **in one message**
(each reads its own gate skill, writes only its own files, and does not run `render`), then wait for both and run `out/tools/c render` once. If you cannot launch
subagents, run them one after the other without stopping for cards, and follow the single-context rules:
score each lens separately before merging; write the router before opening `golden.json`; never open
`holdout.json` while building or fixing. `holdout-sealer` is still launched as a subagent even here: it
is the one thing single-context mode may not absorb, because a holdout written by the context that
fixes the router grades its own author. If subagents are genuinely unavailable, seal it as
`holdout single-context` and let the audit fail the run as not independent; that failure is the
honest record of what the number is worth, not a thing to work around.

**Thin context, and always say what is running (the default).** The quality lives in the gate JSON files on
disk, not in this conversation: `render` rebuilds the PRD and prototype from `out/gates/*.json`, so trimming
what the conductor holds never costs quality. So **run every gate as a sub-agent**, not with the `Skill` tool
in the conductor's own context: for each of V, A, L, U, E, D and B launch a `claude` sub-agent (parallel
phases launch their two together) told to "read `.claude/skills/valued-<gate>/SKILL.md` and follow it, read
the answered cards and the gate files it names, write only `out/gates/<k>.json` and its own `out/proto/*`
files, do not run `render`, and reply in one line." The gate skill's full text then stays in the sub-agent's
context, never the conductor's; the conductor renders once when the gate(s) return. Use the `Skill` tool in
the conductor's own context only under `--teach` or `--lean`.
**Say what each agent is doing, with its real time.** On launching each gate or sub-agent, print one short
line naming its job ("Writing the answer key and sealing the holdout", "Scoring 12 use cases on 3 lenses").
The harness shows each sub-agent's `· took Xs` when it returns, and `out/tools/c clock <phase> end` now prints
the phase's real elapsed ("[4] L and U · done in 4m 10s"); for E, also emit the `step` sub-updates above. So
the run always shows what is happening and how long it took, in one line each, without filling the context.

## Phase 0: Frame (3 min)

1. Write the wrapper first (step 2's first two lines), then `out/tools/c clock 0 start`. If the argument is empty or lacks the client, the business problem, or the success
   measure and deadline, ask only the missing framing cards (round 0), each 3 to 4 typical options.
   Phrase every card the way a consultant opens the conversation on a shared screen: a warm, low-stakes
   question the client can answer by pointing at an option, never a form field. Keep the format hint so a
   client who prefers their own words still has the shape.
   **"Client context": "Just so I'm picturing it right, tell me a bit about your world and which team lives
   closest to this."** (format "industry, size, and the unit that owns it (e.g. 'P&C insurer, 40k claims a
   month, claims operations')"), **"Business problem": "Help me understand where things get clunky today.
   No need to be precise, roughly what happens and how often?"** (format "the process, how it shows up, and
   a rough number (e.g. 'FNOL setup, 20 fields re-keyed, 18 minutes a claim')"), **"Success and timeline":
   "If we are celebrating in a few months, what would have changed for you? A ballpark is great."** (format
   "a metric, a target and a date (e.g. 'setup under 10 minutes, pilot in 8 weeks')"). Whenever `inputs/`
   is empty, also ask **"Material": "Totally fine either way, do you have examples we could look at, or
   should we start with stand-ins and bring yours in later?"** ("Synthetic only for now" recommended when
   nothing is ready; "Documents in inputs/"; "Sample requests or transcripts, de-identified"; "Both";
   format "the material, its rough size and who owns it (e.g. '300 policy PDFs, owned by HR operations')"). If files are in `inputs/`, list them in one
   table instead and print `Grounded in: <n> client files`.
   **Always ask one more framing card, even when the case line is complete: "Product name": "What would you
   like to call this, so your team recognizes it on screen?"** (3 to 4 short, human product names built from
   the case in the client's own words, e.g. "MemberReply", "Harbor Claims Copilot", plus "Other"; format "a
   short product name (e.g. 'MemberReply')"). This name is the title of the prototype and the PRD, so it is
   shown everywhere instead of the generic use-case label. Append it to `out/cards.json` with `"round": 0`
   and `"gate": "Frame"`; render reads it as the title. Under `--auto` take the first option of each.
   Print `Engagement: <case line>` when you built it from answers.
2. Set up:
   ```bash
   B=.claude/skills/valued-build; mkdir -p out/proto out/gates out/tools inputs
   printf '#!/bin/sh\nexport PORT=${PORT:-%s}\nexec node .claude/skills/valued/conductor.js "$@"\n' "${PORT:-4317}" > out/tools/c; chmod +x out/tools/c
   cp $B/app/app.html $B/app/server.js $B/app/ff.css $B/prd-viewer.html $B/eval.js out/proto/
   echo '{}' > out/proto/case.json; echo '[]' > out/cards.json
   echo "<the case line>" > out/case-line.txt; echo "orchestrated" > out/mode.txt
   node $B/prd-skeleton.js "<the case line>" out/prd.md
   P=${PORT:-4317}; lsof -ti :$P | xargs kill 2>/dev/null; PORT=$P node out/proto/server.js   # in the background
   ```
   `open http://localhost:4317/prd` (skip under `--no-open`). Print:
   `VALUED · 6 gates · governed at every gate · we draft, you decide · live PRD, filling as we go: localhost:4317/prd`.
3. Pick the industry key now: `out/tools/c seed <industry>` (a key of `.claude/skills/valued-labels/connectors-library.json`,
   or the closest) prints the systems, golden-set seeds and sweep templates every later gate starts from.
   `out/tools/c clock 0 end`.

## Phase 1: Round 1 (2 min)

`out/tools/c clock 1 start` before drafting anything. Draft five cards from the case line alone (no gate has run yet, so options come from
the case, the industry and the seed library), append them to `out/cards.json` with `"round": 1`, then
`out/tools/c cards print 1` (or `out/tools/c cards auto 1` under `--auto`) and record each answer as `decision` and `by`.
If the client would rather not answer a round, run `out/tools/c cards skip 1`: it takes the recommended option on
every card of the round, logs each as skipped, and lets you move on at once. Say the one line it prints.

| Card | Gate | Header role | Question | Options come from |
|---|---|---|---|---|
| R1-1 | V | sponsor | If we could move just one thing, what would you most want it to be? | 2 to 3 north-star metrics with what each rewards and can hide |
| R1-2 | V | sponsor | Anything that is off the table for you, something we should design around from the start? | e.g. nothing customer-facing unreviewed, existing platform only, data stays in; each with what it rules out |
| R1-3 | A | IT and risk | Where are you comfortable having this run, can we let it try a hosted model on synthetic data? | "Yes, on synthetic data" (`rules+model`), "Not yet" (`rules`), "Yes, and let it lead" (`model-first`), with the trade-offs in `valued-ai-fit` |
| R1-4 | U | risk owner | How hands-on do you want to stay in the first 90 days? | suggest only, draft with approval, act on low-risk actions |
| R1-5 | U | operations owner | When it is a tougher call, who should it loop in? | the existing path, a specialist team, the risk desk |

Recommend: the outcome tied to the sponsor's stated goal; the constraint that de-risks a first wave; a hosted
model on synthetic data whenever a free-text job exists (rules only when the case is mostly rules); draft with
approval; the existing escalation path. Then `out/tools/c render` so the PRD and the prototype fill in the round-1
answers at once, before any gate has run: the client sees the outcome, the constraint and the autonomy choice
land in the document the moment they decide them. `out/tools/c clock 1 end`.

## Phase 2: V then A (7 min)

`out/tools/c clock 2 start`. Run `valued-value` (it reads round 1, never asks), then `valued-ai-fit` (three
`use-case-scorer` subagents in parallel, then the merge, shape, assistants and sweeps). Each writes its JSON
and runs `out/tools/c render`. `out/tools/c clock 2 end`.

## Phase 3: Round 2 (2 min)

`out/tools/c clock 3 start`. Draft six cards from the rendered gate files (V's priced problem, A's waves and
assistants, the seed groups), append with `"round": 2`, print or auto, record answers:

| Card | Gate | Header role | Question |
|---|---|---|---|
| R2-1 | A | sponsor | Of these, which feels like the natural place to start? (A's wave options) |
| R2-2 | L | operations owner | Is there a type of case you would want us to be extra careful with? |
| R2-3 | L | data owner | For a first run, what is worth plugging in, and what can stay manual? |
| R2-4 | E | risk owner | How confident would you need to feel before you are comfortable going live? (0.99 / 0.97 / 0.95) |
| R2-5 | D | sponsor | Who would be a good small group to try this with first? |
| R2-6 | D | sponsor | If it is not landing, what would be your sign to pause? |

`out/tools/c cards skip 2` takes the recommended option on every round-2 card and logs it as skipped if the
client would rather move on. If the client picks a different first wave than A recommended, update `a.json`
(`waves.preferred`, the `wave` field on scores). Always `out/tools/c render` before phase 4, so the PRD and the
prototype reflect round 2 at once. `out/tools/c clock 3 end`.

## Phase 4: L and U in parallel (5 min)

`out/tools/c clock 4 start`. Launch `valued-labels` and `valued-user-loop` together. Both read `out/gates/v.json`,
`a.json` and the answered cards; neither asks the client anything. L writes `l.json` and `out/proto/golden.json`,
`holdout.json`, `sources.json`; U writes `u.json`. When both are back, `out/tools/c render`. `out/tools/c clock 4 end`.

## Phase 5: E and D in parallel (6 min)

`out/tools/c clock 5 start`. Launch `valued-evals` (which launches `prototype-builder` and runs the evals) and
`valued-deploy` together. If the dev eval is blocked, E asks the one extra card **"Ship anyway, or fix
first?"** (round 3; "Fix first" recommended), fixes the router, never the labels, and runs the holdout. When
both are back, `out/tools/c render`. `out/tools/c clock 5 end`.

**E is the longest and most opaque gate, so narrate its sub-steps.** Before each sub-step of E, run
`out/tools/c step "<what it is doing>"`: it updates the live "Building now:" line on the PRD and prototype
and prints one line in the run. Emit, in order: `step "building the router"`, `step "scoring the guard model
over <n> texts"`, `step "running the dev eval"` (then print the eval's gate lines), `step "running the sealed
holdout"` (then its lines), and, only on a block, `step "repairing the router, round 1"` then
`step "re-running dev, then the sealed holdout"`. Each `step` is one line, so the run stays lean while you
always know where E is. The other gates get their sub-agent `· took Xs` from the harness; E gets these
sub-steps on top because it alone runs long enough to look stuck.

## Phase 6: B (3 min)

`out/tools/c clock 6 start`. Run `valued-build`: it writes `b.json` (summary, recommendation, requirements, FAQ, sweep
findings, section 19), runs `out/tools/c render`, `out/tools/c check` until it prints `All checks pass.` (fix the JSON, never
the rendered files), builds the hosted page, and publishes (or, if publishing is unavailable or not allowed,
says so in one line and keeps localhost). Then `out/tools/c clock 6 end`, `out/tools/c report` (writes
`out/run-report.json`: time per phase, questions, revisions, flags, eval blocks and fixes, cuts), and the
audit: `node .claude/skills/valued-audit/audit.js --port 4317` (the `valued-audit` skill: the eight standards,
every issue with its owner and fix, `out/observe.html`).

**Review, fix and learn (the self-improving loop).** The audit checks the run is structurally complete; the
reviewer checks it does not misrepresent what was built.
1. **Review.** Launch the `valued-reviewer` subagent (independent context, reports only). It reads the PRD,
   the gate files, the prototype and the **fresh** eval output, and writes `out/review.md`: every claim the
   evidence does not support, every overstatement, every unmarked assumption, every number that does not
   match the gate data, each with a severity (blocker, should-fix, note), where it is, and the fix.
2. **Fix.** For each blocker and should-fix, change the **owning gate JSON** (never the rendered PRD,
   `case.json` or prototype files) and `out/tools/c render` so the PRD and the prototype update together;
   a number is fixed at its source, never by hand-editing `prd.md`. Then launch the reviewer once more to
   confirm. A finding that still stands is reported in one line, never hidden or edited away in the
   rendered file.
3. **Learn.** Append each confirmed finding to `learning/signals.md` (source "review", the gate it named,
   the evidence), so `/valued-learn` can turn a repeated misrepresentation into a change to the skill that
   caused it, and the next run does not make it. A finding the reviewer raised and the fix closed is still
   logged: the pattern, not the one instance, is what learning removes.

Print `out/tools/c clock status`, the audit's standards row and open issues, the reviewer's verdict line, and
the closing line, nothing else:

`Brief: out/brief.html · PRD: out/prd.html · Prototype: http://localhost:4317 · Run: out/observe.html · Review: out/review.md · Audit: /valued-audit · Feedback: /valued-revise <what to change>`

Under `--no-open` skip every `open`; otherwise `open out/brief.html`.

## Rules for every gate (pass these on)

- **Output contract.** Write `out/gates/<k>.json` with every key the gate's skill lists; keep each string one
  line; then `out/tools/c render`. `out/tools/c check` names any key you missed.
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
