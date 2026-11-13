---
name: valued
description: Run a client AI case end to end through the six VALUED gates (Value, AI-fit, Labels, User-in-the-loop, Evals, Deploy and drive) plus Build, governed at every gate, in about 18 minutes to a full PRD and prototype, then improves it in the background. A conductor runs the gates in phases on a clock, asks the client's cards in two rounds, runs independent gates in parallel, and renders the PRD, prototype and brief from each gate's JSON. Use when the user types /valued, with or without a case. Add --teach for the slow, narrated pace.
---

# /valued: the conductor

The argument is a one-line case, for example `/valued regional bank, 2M customers, contact centre cost
pressure, 30 GenAI ideas, COO wants a plan in six weeks`. Flags:
- `--teach`: stop reading here and follow `teach.md` in this folder (one gate at a time, cards at every gate).
- `--auto`: take the recommended option on every card (`conductor.js cards auto <round>`), logged "(auto)".
- `--no-open`: never run `open`; print paths instead.
- `--persona "<who the client is>"`: rehearsal and regression mode. Every card round (framing, each Round 1
  screen, Round 2, E's ship-or-fix) goes to a `client-persona` sub-agent instead of AskUserQuestion: give it
  the persona, the case line, the answers so far and the screen's cards as printed, and record its answers with
  `"by": "<role>"` and `"persona": true` (never write "(persona)" into `by` or `decision`: they reach the client's PRD). Ask exactly as you would a person; the persona may answer in its own words, push
  back, or choose a non-recommended option, and the run must adapt.
- `--lean`: the low-token mode for regression runs. Do every gate in this context (score the three lenses one after
  another, run L, U and D inline) and launch only these subagents: the three background `discovery-researcher`s, the `client-persona` under `--persona`, `holdout-sealer` (Sonnet),
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

**The chat is client-facing, always.** The client reads this window on a shared screen. Every line you
print is addressed to them, in a product lead's voice, about their problem. Never narrate your own process
("checking which fields the page reads", "recording that", "reading how research merges", "let me look at the
file"): do that work silently and say only what it means for them ("Research is in: claims cycle time is the
lever; I've added it to the brief"). Tool calls are fine; the commentary between them is for the client.

**Start the server only one way.** Always with the command in phase 0 step 2 (`node out/proto/server.js` on the
port), run in the background from this workspace. Never use a preview tool, a `launch.json` or any other
launch configuration: a parent folder's config can start a different product's server.

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
"multi": false, "decision": null, "by": null, "effect": "<what the answer changes, a few words>", "why": "<round 1: the hypothesis it tests and the fact key>", "branch": "<round 1: tree branch id>" }`. Set
`"multi": true` for a card whose options can hold together (constraints, systems to connect, groups to
watch); ask it with `multiSelect: true` and store the chosen labels joined with ", ". The first option is our
recommendation. Roles are this case's people (head of card operations, chief nursing officer, controller),
never a generic "COO" unless the case says COO. 2 to 4 options per card.

## The run plan (about 18 minutes to a full PRD and prototype, then improved in the background)

The client's answering time hides the compute: each gate launches in the background the moment the answers it
needs exist, while you keep talking. Present the PRD and prototype as soon as Build finishes; the deep checks
keep running and land through the same revise path.

| Phase | Work | Budget | Who, and what launches in the background |
|---|---|---|---|
| 0 Frame | workspace, server, the four pages; framing (who and what hurts, product name); first tree and assumptions; Discover card | 2 min | you; `discovery-researcher` × 3 |
| 1 Round 1 | 10 hypothesis-led cards in three screens; research read out between screens | 4 min | client; **V after screen 1** (needs R1-1, C-1, C-2, C-3), **A after screen 2** once V is back (needs R1-2, R1-3, C-4), **U after screen 3** (needs R1-4, R1-5) |
| 2 V then A | collect V and A, render, write the Frame and Shape cards | 1 min | usually already done |
| 3 Round 2 | 6 cards | 2 min | client; **L starts its golden set from A** while you ask; **D launches** once R2-5 and R2-6 are answered |
| 4 L and U | L applies the round-2 groups, seals the holdout; U finishes | 3 min | `holdout-sealer` once `u.json` exists |
| 5 E and D | router, evals, at most **one** repair live; D finishes | 4 min | `prototype-builder`, `guard-model` |
| 6 Build | three writers in parallel, then merge and render; present | 2 min | three `valued-build` writers |
| 7 Improve | reviewer, audit, `gate-qc` sweep, a second repair if needed; fixes land via `valued-revise` | background | after you present; never blocks |

**Background launches are non-blocking.** Launch with `run_in_background: true`, keep asking, and collect at the
phase that needs the result. If a gate is not back when its phase starts, give the client the one-line status
("Pricing the problem from your answers, about a minute") and continue with what does not depend on it.

Cards in total: 16 in the two rounds, plus framing (1 to 3)
and E's "Ship anyway, or fix first?" only when a release is blocked: 17 to 20. Start and end every phase with `out/tools/c clock <phase> start|end`; the start prints
the header line (`[2] V then A · budget 1 min`). Between phases print nothing else.

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

## Our approach page (what the product lead reads out loud)

`localhost:4317/approach` is the page the product lead speaks from. The client may see it, so it is written for
them. It shows the six lifecycle stages and one card for the current stage, which refreshes itself as you write it.
After each phase, write or update that stage's card in `out/gates/approach.json`, then `out/tools/c render`:

| After phase | Stage card | It covers |
|---|---|---|
| 1 (Round 1) | `discover` | what we heard and where we think the problem sits |
| 2 (V then A) | `frame` and `shape` | the priced problem and our early hypothesis; where AI could fit and where rules or people stay |
| 3 (Round 2) | `align` | who might own it, who signs off, what it should never do |
| 5 (E and D) | `prove` and `launch` | how we would know it works before launch; a pilot, what we watch, when we pause |

Schema: `{ "current": "<stage>", "stages": [{ "stage", "headline", "heard", "breaks", "evidence": [{ "text", "fact" }],
"rule", "option", "reasons": [3], "tradeoff", "checkIn" }] }`. Write the `discover` card right after framing, from
the case and the first answers, and update it after each Round 1 screen: `heard` (their words and numbers),
`breaks` (where today's process breaks, from their answer or the research's process steps), `evidence` (one or
two research facts as they land, `fact` = the fact key; the page cites the source), and the page adds the three
lead assumptions from `r.json` with their live status. Use `rule` on the `align` card for the one regulation
that shapes the design most. Every field is optional; leave out what you do not have yet.

**Tweaks during the session.** When the client (or interviewer) asks to change anything, at any point, run
`valued-revise` with their words: it changes the answer and the owning gate at the source, updates the approach
card, re-renders every view and checks they agree. Never patch one view by hand. Set `current` to the stage just written. **How it sounds:** a senior consultant thinking out
loud with the client, never telling them.
- **Soft, never assertive.** Offer options and early thinking: "One option might be ...", "Our early read is ...",
  "It may make sense to ...", "We'd suggest exploring ...". Never "we will", "you must", "clearly", "the right answer".
- **Answer first, still soft.** The headline is the recommendation as an option: "One option: start with assisted
  intake, keeping coverage decisions with your adjusters".
- **Readable in one breath.** `heard`, `option`, each of the three `reasons` and `tradeoff` are at most 12 words;
  mark the two or three words that matter with `**bold**`.
- **"What we heard" is their words and numbers**, from their answers, never ours.
- **Always name what they would give up**, and end with an open check-in that invites pushback: "Does that match
  where you'd want to start, or is there a reason to begin elsewhere?"
`out/tools/c verify` and `check` flag assertive wording, long bullets and a missing third reason.

## Quality check after every phase (built in, never skipped)

Every phase ends the same way, right after its `out/tools/c clock <n> end`:
1. **`out/tools/c verify <n>`** (one second, mechanical): open checks this phase owns, sections still pending,
   numbers with no source, em-dashes, and whether `/discovery`, `/prd` and `/` are serving. Fix every line it
   prints now, in the owning gate JSON, then `out/tools/c render` and `verify` again. Never hand-edit a rendered file.
2. **Launch `gate-qc` in the background** for that phase (`run_in_background: true`; workspace and phase number).
   It checks the judgement calls: every client answer honoured, every number traced to an answer, a cited
   fact or (assumed), no contradictions, PRD sections that read like a senior PM wrote them, questions that
   do not repeat or overlap. Do not wait for it.
3. **At the start of the next phase, read `out/qc/<n-1>.json`.** Fix each blocker and major in the owning gate
   JSON, render, and mark it `"fixed": true` in that file. Say one line to the client, in their language:
   `Checked the value and AI-fit work: two figures now carry their source.` or `Checked: nothing to fix.`
`verify` and `check` also run a consistency check across every view: the approach card's numbers must come from
an answer, the case line or a cited fact; the product name, the client name and every decision must match across
the PRD, the prototype and the pages. All four views render from the same gate JSON and `cards.json`, so a fix
always goes into that source, never into one view.
The discovery page shows a "Checked" badge per phase, so the client sees the quality loop working.

## Phase 0: Frame (2 min)

**Research never blocks the run.** It starts in the first minute, runs in the background through Round 1
and gate V, and joins wherever it lands: a finding that arrives makes the next question sharper, the tree
better supported, the value frame better anchored. Nothing waits for it.

**Order in this phase:** step 2 (setup), step 1's framing cards only if the case line lacks them, step 4
(launch research in the background), step 3, step 5 (the first tree, from the case), then hand to Round 1.

1. Write the wrapper first (step 2's first two lines), then `out/tools/c clock 0 start`. If `out/select/select.json` exists (a `/valued-select` run), take the preferred option as the use case, its audience and assumptions as framing, and print `Case from out/select/select.json: <option>`; ask no framing card that file already answers.
   **Framing asks only what research needs to start: who the client is and what hurts.** Success measures,
   timelines, data and constraints belong to Round 1, so never ask them here (asking them twice is the most
   common way a session feels scripted). If the case line lacks them, ask at most two cards (round 0):
   **"Client context": "So I'm picturing this right, which part of the business are we talking about, and
   roughly how big is it?"** (format "industry, size, and the unit that owns it (e.g. 'P&C insurer, 40k claims a
   month, claims operations')"), and **"Business problem": "Where does it hurt today? A rough sense is plenty."**
   (format "the process and how it shows up (e.g. 'FNOL setup is slow and error-prone')"). No numbers here;
   Round 1 asks for them and refers back to this answer instead of re-asking it.
   **Always ask one more framing card: "Product name": "What would you like to call this, so your team
   recognizes it on screen?"** (3 to 4 short, human names built from the case in the client's own words, e.g.
   "MemberReply", "Harbor Claims Copilot"; format "a short product name (e.g. 'MemberReply')"). It is the
   title of the prototype and the PRD. Append framing cards to `out/cards.json` with `"round": 0` and
   `"gate": "Frame"`. Under `--auto` take the first option of each; under `--persona`, the persona answers.
   Whenever `inputs/` is empty, the "Material" question is asked later, as a Round 1 data card, never here.
   If files are in `inputs/`, list them in one table and print `Grounded in: <n> client files`.
2. Set up:
   ```bash
   B=.claude/skills/valued-build; mkdir -p out/proto out/gates out/tools out/research inputs
   printf '#!/bin/sh\nexport PORT=${PORT:-%s}\nexec node .claude/skills/valued/conductor.js "$@"\n' "${PORT:-4317}" > out/tools/c; chmod +x out/tools/c
   cp $B/app/app.html $B/app/server.js $B/app/ff.css $B/app/marked.min.js $B/prd-viewer.html $B/eval.js out/proto/
   echo '{}' > out/proto/case.json; echo '[]' > out/cards.json
   echo "<the case line>" > out/case-line.txt; echo "orchestrated" > out/mode.txt
   node $B/prd-skeleton.js "<the case line>" out/prd.md
   P=${PORT:-4317}; lsof -ti :$P | xargs kill 2>/dev/null; PORT=$P node out/proto/server.js   # in the background
   ```
   Open all four views in the browser, in this order so the discovery brief ends up in front (skip under
   `--no-open`): `open http://localhost:4317/research ; open http://localhost:4317/ ; open http://localhost:4317/prd ; open http://localhost:4317/approach`
   (the approach page last, so it is in front). All four fill in live as the session goes. Print:
   `VALUED · we draft, you decide · our approach: localhost:4317/approach · research, live: localhost:4317/research · PRD: localhost:4317/prd · prototype: localhost:4317`.
3. Pick the industry key now: `out/tools/c seed <industry>` (a key of `.claude/skills/valued-labels/connectors-library.json`,
   or the closest) prints the systems, golden-set seeds and sweep templates every later gate starts from.
4. **Research, in the background.** Launch three `discovery-researcher` sub-agents **in one message, with
   `run_in_background: true`**, one per strand (`process`, `regulation`, `ai`), each given the case line, the
   framing answers, the industry and the region if known. Do not wait for them, now or later. Say one line,
   to the client: `While we talk, three research agents are reading the published evidence on your world: how
   this work runs, the rules around it, and where AI has worked. I'll bring in what they find as it lands.`
5. **The first tree, from the case.** Write `out/gates/r.json` now, before any research is back: `title` (the
   client's problem in their industry's words, one line), `summary` (two sentences: where we think the value
   sits and why), `tree` `{ "problem", "branches": [{ "id": "B1", "driver", "hypotheses": [{ "text", "facts": [] }],
   "questions": ["C-2", ...] }] }` with three or four branches that split the problem **MECE** (mutually
   exclusive, together exhaustive: for example volume, cost per item, quality or risk, readiness), every round-1
   card id on exactly one branch, and `assumptions`: 3 to 6 rows `{ "text", "facts": [], "card": "<the round-1
   card that tests it>", "confirmedIf": "<a regex over the answer that would confirm it>" }`, each a plain
   statement the client can correct ("Most of the cycle time is lost before an adjuster is assigned"). Then
   `out/tools/c research` (it merges whatever has landed, which may be nothing, and renders the live page) and
   If no research has landed by the end of Round 1, write `terms` yourself (6 to 8 of the industry's terms used in
   the cards, each with a plain one-line meaning) so every term is still glossed; never write `facts` yourself.
   `out/tools/c render`. Say: "Here's how I'm thinking about it: the problem splits into these branches, here is
   what I'm assuming, and every question I ask tests one of them." `out/tools/c clock 0 end`.

## Phase 1: Round 1, discovery (4 min)

`out/tools/c clock 1 start`. **Before each screen, run `out/tools/c research`.** It prints only what is new
since the last call, already in client language (`Just confirmed · 30 days · ...`); read those lines out as
part of the conversation ("While we were talking, we confirmed ..."), then fold them in: attach the new fact
keys to the hypotheses and assumptions they support in `r.json`, and sharpen the next screen's cards with them.
Facts and sources stay exactly as the researchers wrote them: never add, round or combine a figure yourself.

**Launch gates while you ask (background, never waited on here).** After screen one is answered, launch
`valued-value`. After screen two, launch `valued-ai-fit` once `v.json` exists (if V is still running, launch A
the moment it lands). After screen three, launch `valued-user-loop`. Each runs as a sub-agent with
`run_in_background: true`, reads the answered cards, writes its own JSON and does not render; render after each
screen as usual and once more when each gate lands.

**How a consultant asks.** These are the rules that make every round (framing, Round 1, Round 2 and E's card)
sound like a strong partner from a top firm, not a form:
- **Soft, never assertive.** "My early read is ...", "One possibility is ...", "Would it be fair to say ...?" Never
  tell the client what is true about their world.
- **No recommendation on a fact card.** When a card asks for a fact only the client knows (a volume, where the
  data lives, what was tried), no option is marked "(Recommended)"; recommend only on choices.
- **Hypothesis-led.** Open with what you think and let them correct it: "My working assumption is that most of
  the delay sits before an adjuster picks it up. Is that what you see?" Never a blank "tell me about ...".
- **One question per card.** Never double-barrelled ("who owns it and how clean is it" is two cards or one
  sharper question). At most about 25 words, plain and warm, no internal ids in the text.
- **MECE across the round.** The ten cards cover ten different things. Options inside a card are mutually
  exclusive and together cover the realistic space (ranges that do not overlap; roles that do not overlap).
- **Drop or pre-fill what is already settled.** Before showing a screen, check every card against the case line
  and all earlier answers. If an answer already settles it, do not ask it: record it with `"decision"` taken from
  that answer and `"by": "<role> (earlier answer)"`, and say "You mentioned X, so I've noted that." instead.
- **Never repeat.** Never ask what the case line, a framing answer or an earlier card already told us. Build on
  it instead: "You mentioned FNOL is slow. Roughly how many claims a month go through it?" `check` fails the run
  on any two cards that share most of their words.
- **The industry's words, glossed once.** Use the terms the research found and the industry's own step names.
  The first time a technical term appears, gloss it inline in at most eight plain words: "your FNOL (first
  notice of loss, the first report of a claim) cycle time".
- **Anchored on evidence when it has landed.** "Published figures put this near 30 days (Source 2). Where are
  you?" Options are ranges around that benchmark, this industry's named roles, the real steps of this process.
  A generic option ("another team", "other systems") fails the round. Before research lands, anchor on the
  case and say "(our assumption)".
- **Shows the thinking.** Every card carries `why` (one line: the branch and hypothesis it tests, and the fact
  key if any) and `branch`. Before each screen print its header, then one line per card, in client language:
  `This tests whether most of the delay sits at intake (B1).` The discovery page shows the same thing live.

Append all ten cards to `out/cards.json` with `"round": 1`, then `out/tools/c cards print 1` (or
`out/tools/c cards auto 1` under `--auto`; under `--persona` the persona answers each screen). Ask them as three
screens (AskUserQuestion takes at most four at a time), each with its own warm header. Record each answer as
`decision` and `by`, then **`out/tools/c render` after every screen**, so the discovery page, the PRD and the
prototype all show the answers within seconds. If the client would rather not answer a round, run
`out/tools/c cards skip 1` and say the one line it prints.

**Screen one: "Let's make sure we're solving the right problem"**

| Card | Gate | Header role | What it establishes | Options come from |
|---|---|---|---|---|
| C-2 | V | operations owner | the size of today's problem, building on the framing answer: volume, time per item or rework, as one number the client can point at | 3 to 4 non-overlapping ranges anchored on a benchmark or the case |
| R1-1 | V | sponsor | the one outcome that must move | 2 to 3 north-star metrics with what each rewards and can hide |
| C-1 | V | sponsor | who must say yes for this to go live, and who could slow it down (multi) | this industry's named owner, approver and blocker roles |
| C-3 | D | sponsor | the commitment window: how soon they need to see something working | 6 to 8 weeks; a quarter; this fiscal year; each with what it allows |

**Screen two: "And the boundaries we design around"**

| Card | Gate | Header role | What it establishes | Options come from |
|---|---|---|---|---|
| R1-2 | V | sponsor | hard limits on data, platform, scope or channel (multi); never review or autonomy, which R1-4 owns | e.g. data stays in-house, existing platform only, one channel first, one product line first; each with what it rules out |
| C-4 | L | data owner | where the data for this lives today, and whether we can start from it or need stand-ins | one system of record; spread across systems; mostly documents and email; start with synthetic stand-ins |
| R1-3 | A | IT and risk | whether a hosted model may run on synthetic data | "Yes, on synthetic data" (`rules+model`), "Not yet" (`rules`), "Yes, and let it lead" (`model-first`), with the trade-offs in `valued-ai-fit` |
| C-5 | D | operations owner | what happened the last time something like this was tried | stalled on adoption; stalled on data; stalled on risk sign-off; new territory; each with what it means for the plan |

**Screen three: "Last two, on how hands-on you want to be"**

| Card | Gate | Header role | What it establishes | Options come from |
|---|---|---|---|---|
| R1-4 | U | risk owner | how much it may do on its own in the first 90 days | suggest only, draft with approval, act on low-risk actions |
| R1-5 | U | operations owner | who it loops in on a hard call | the existing path, a specialist team, the risk desk, named for this industry |

Where the answers go: C-1 becomes V's `stakeholders`; C-2 anchors V's value frame (the client's baseline
beats our assumption); C-3 bounds A's first wave and sets D's `roadmap`; C-4 sets A's data feasibility and
L's systems; C-5 sets D's `adoption`. After each screen, set `status` on every assumption that screen tested, judged on the meaning of the answer,
never on a keyword: `"confirmed"` or `"challenged"` (with the client's words in `heardAs`). After the last screen, say in one line which assumptions the client changed, and pass all of it on when you
launch each gate.

Recommend: the outcome tied to the sponsor's stated goal; the constraint that de-risks a first wave; a hosted
model on synthetic data whenever a free-text job exists (rules only when the case is mostly rules); draft with
approval; the existing escalation path. Then `out/tools/c render` so the PRD and the prototype fill in the round-1
answers at once, before any gate has run: the client sees the outcome, the constraint and the autonomy choice
land in the document the moment they decide them. `out/tools/c clock 1 end`.

## Phase 2: V then A (1 min, launched during Round 1)

`out/tools/c clock 2 start`. Run `valued-value` (it reads round 1, never asks), then `valued-ai-fit` (three
`use-case-scorer` subagents in parallel, then the merge, shape, assistants and sweeps). Each writes its JSON
and runs `out/tools/c render`. `out/tools/c clock 2 end`.

## Phase 3: Round 2 (2 min)

`out/tools/c clock 3 start`. Draft six cards from the rendered gate files (V's priced problem, A's waves and While you ask this round, launch `valued-labels` in the background as soon as `a.json` exists (it drafts the
golden set from A and applies the round-2 groups when they land), and launch `valued-deploy` the moment R2-5 and
R2-6 are answered.
Round 2 follows the same consultant rules as Round 1: build on what they already said and never re-ask it (R2-3
asks what to connect *first* from the systems they named in C-4; it never asks again where the data lives), gloss
every technical term the first time ("a separate bar (a pass mark just for that group)"), soft wording, one
question per card.
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

## Phase 4: L and U in parallel (3 min)

`out/tools/c clock 4 start`. Launch `valued-user-loop` and `valued-labels` together, and tell `valued-labels` to launch `holdout-sealer` only once `out/gates/u.json` exists (the sealer reads the never list and triggers from it); L writes its golden set meanwhile. Both read `out/gates/v.json`,
`a.json` and the answered cards; neither asks the client anything. L writes `l.json` and `out/proto/golden.json`,
`holdout.json`, `sources.json`; U writes `u.json`. When both are back, `out/tools/c render`. `out/tools/c clock 4 end`.

## Phase 5: E and D in parallel (4 min, one repair live)

`out/tools/c clock 5 start`. Launch `valued-evals` (which launches `prototype-builder` and runs the evals) and
`valued-deploy` together. If the dev eval is blocked, E asks the one extra card **"Ship anyway, or fix
first?"** (round 3; "Fix first" recommended), fixes the router, never the labels, and runs the holdout.
**Live, at most one repair round:** if it is still blocked after that, say so plainly ("Blocked on routing; a
second fix is running in the background"), present, and run the next round in phase 7. `valued-deploy` was
launched in phase 3; collect it here. When both are back, `out/tools/c render`. `out/tools/c clock 5 end`.

**E is the longest and most opaque gate, so narrate its sub-steps.** Before each sub-step of E, run
`out/tools/c step "<what it is doing>"`: it updates the live "Building now:" line on the PRD and prototype
and prints one line in the run. Emit, in order: `step "building the router"`, `step "scoring the guard model
over <n> texts"`, `step "running the dev eval"` (then print the eval's gate lines), `step "running the sealed
holdout"` (then its lines), and, only on a block, `step "repairing the router, round 1"` then
`step "re-running dev, then the sealed holdout"`. Each `step` is one line, so the run stays lean while you
always know where E is. The other gates get their sub-agent `· took Xs` from the harness; E gets these
sub-steps on top because it alone runs long enough to look stuck.

## Phase 6: B (2 min, three writers in parallel)

`out/tools/c clock 6 start`. Run `valued-build`: it writes `b.json` (summary, recommendation, requirements, FAQ, sweep
**Three writers in parallel.** Write `summary`, `recommendation` and `decisionAsked` yourself, then launch three
`valued-build` writers in one message, each writing one part file: `out/gates/b-req.json` (`requirements`,
`nfrs`, `tasks`), `out/gates/b-faq.json` (`faq`, `sweepFindings`, `agentSentence`, `stats`), `out/gates/b-risk.json`
(`risks`, `dependencies`, `openQuestions`). Merge the three parts and your keys into `out/gates/b.json`, render,
and present. The hosted page, audit and reviewer move to phase 7.
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

## Phase 7: Improve, in the background (after you present)

Say: "That's the first full version. While we talk it through, the quality checks keep running, and anything they
find will update here." Then launch in the background: the audit, the `valued-reviewer`, a `gate-qc` sweep over
every phase, and any second repair round E deferred. Apply each confirmed finding through `valued-revise` (source
first, then render and `verify`), so every page updates together while the client watches. Never hand-edit a
rendered file. Close with the closing line once they are done.

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
