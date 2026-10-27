---
name: valued-build
description: VALUED build step, after gate D. Completes the live PRD (summary, requirements, NFRs, risks, dependencies, and the plan for a coding agent), writes the prototype's FAQ, checks the prototype runs, and renders a standalone PRD. Both use the founderfirst.one design system. Called by /valued; not for direct use.
---

# B: Build agent

**Job:** turn the decisions into something a team, or a coding agent, can build from, and something the
client can click.
**Prevents:** a strategy that stops at slides.

| | |
|---|---|
| **Asks the client** | Nothing. Every input is already a recorded decision. |
| **Uses** | The six gate files, `out/state.md`, the PRD sections the gates already filled, `out/proto/`. |
| **Gives** | A complete PRD (live at `localhost:4317/prd`, standalone in `out/prd.html`) and a working prototype with Workbench, Evals, Audit log, How it works and FAQ. |

The gates have already filled most of the PRD and the prototype as they went (see the live-outputs rule
in the orchestrator). This step fills what needs every gate at once. Target: 3 minutes.

> **Mode.** In the default run the conductor (`valued/SKILL.md`) asks this gate's cards in its rounds: skip
> the "Ask the client" step, read the answered cards for gate B in `out/cards.json`, and never ask a card
> yourself. Under `--teach`, ask them as written and append each card, with its answer, to `out/cards.json`
> in the card schema. Either way, end by writing `out/gates/b.json` (below) and running
> `node .claude/skills/valued/conductor.js render` (skip the render when the conductor launched you in a parallel
> phase; it renders once both gates are back). Never hand-edit the rendered files: wherever a step below says to
> write a gate file, `case.json`, `state.md` or a PRD section, put that content in the gate JSON instead.

## Steps

1. **Check the prototype.** `curl -s localhost:4317/api/status` must show `"ready":true`; if the server is
   not running, start it in the background (`PORT=4317 node out/proto/server.js`). `router.js` must be
   self-contained CommonJS ending `module.exports = { decide }` (no `require`, no `import`).
2. **Write `out/gates/b.json`** (keys under Output), reading every gate JSON, the answered cards and the
   latest eval output:
   - `sweepFindings`: for each sweep in `a.json`, in order, 2 to 3 findings from this run's synthetic world:
     `why` states the facts the sweep read, `cite` names the rule or source, `due` is a clock when one applies.
   - `faq`: 7 to 8 pairs, each answer two sentences at most, from this run's decisions, not generic. Cover:
     why this first; what it never does; what happens when it is unsure; how we know it is safe (the
     client's bar and the latest result); the model and what happens if it is down or declines; who approves
     and what is logged; what data it uses and what is masked; what would make us stop. `from` names the
     gate, the decision and who made it ("Gate U: draft with approval (Risk)").
   - `requirements` with IDs, each naming its story and a Given / When / Then acceptance; `nfrs`, `risks`,
     `dependencies`, `openQuestions`, and `tasks` for section 18 (concrete, in order, each with the
     requirement it implements and the command that proves it done). Every number comes from a gate file or
     is marked (assumed). No em-dashes. `version`: `proto-0.1`.
   - `businessCase`: the client-facing economics for PRD section 12. `valuePerYear` from gate V's value
     frame (volume times time saved times a loaded rate, marked (assumed)); `buildCost` one-time and
     `runCostPerYear` from gate A's `pricing.runCost` scaled to annual volume; `paybackMonths` roughly
     build cost over the monthly net saving. Then `commercialModel`, a recommendation on how the solution
     could be priced to the business (per-seat, per-resolved-item, flat), our preference first with
     trade-offs. Every figure (assumed) until the client gives real volumes and a rate.
3. **Render and check.** `node .claude/skills/valued/conductor.js render` writes every PRD section,
   `case.json` (connectors topped up to 6 from the library, sweeps with findings, FAQ, samples, decisions,
   governance), `out/prd.html` and `out/brief.html`. Then `node .claude/skills/valued/conductor.js check`;
   fix what it names in the JSON and render again until it prints `All checks pass.`. A failing eval stays
   red in section 11: never edit labels to turn it green.
4. **Hosted page.** Always run `node .claude/skills/valued-build/build-hosted.js out` so
   `out/hosted/index.html` exists.
5. **Publish the hosted versions** (about a minute), so the client sees a real product and a real document:
   1. `node .claude/skills/valued-build/build-hosted.js out` and publish `out/hosted/index.html` with the
      Artifact tool, `capabilities: {"sample": {}}`. Note its URL (the prototype).
   2. `node .claude/skills/valued-build/render-prd.js out/prd.md out/hosted/prd.html --artifact <prototype URL>`
      and publish `out/hosted/prd.html` (no capabilities). Note its URL (the PRD).
   3. `node .claude/skills/valued-build/build-hosted.js out <PRD URL>` and publish `out/hosted/index.html`
      again to the same path, so the prototype's PRD button opens the PRD.
   The prototype runs the same router in the browser, lets the client pick Claude Haiku, Sonnet or Opus,
   and measures latency and estimated cost on every AI call, with no API key. Print both links and add
   them to `out/state-notes.md`. If publishing is unavailable, say so in one line and keep localhost.
6. Write `out/proto/CLAUDE.md` with three lines: read `../prd.md` first; work from section 18; never
   edit `golden.json` or read `holdout.json`.
7. Append to `out/state-notes.md` (render copies it into state.md): `Build: PRD complete (localhost:4317/prd, out/prd.html); prototype on
   localhost:4317 (engine <x>)`. Then `open http://localhost:4317` (skip under `--no-open`).
8. **Say it** (three lines): this is the decisions turned into a spec a team or a coding agent can build
   from; every requirement has a test, and the evals are the definition of done; the prototype is the
   same rules, clickable, with every action logged.

## Output: `out/gates/b.json`

Keys (render and `conductor.js check` read them; keep strings to one line): `summary` `{ problem, who, build, never, works, milestone }`, `recommendation`, `decisionAsked`, `agentSentence` (one sentence with the figures), `requirements` (6+ `{ id, requirement, story, priority, acceptance }`, Given/When/Then), `nfrs` (`{ id, requirement, target }`), `risks` (`{ id, risk, likelihood, impact, mitigation }`), `dependencies` (`{ dependency, owner, neededFor, status }`), `openQuestions` (`{ id, question, owner, neededBy }`), `tasks` (5+ `{ id, task, implements, doneWhen }` for section 18), `section17Intro` (optional, the intro to the build section), `guardrails` (optional strings), `faq` (7 to 8 `{ q, a, from }`), `sweepFindings` (one array per sweep, in order, 2 to 3 `{ title, why, cite, due }` each), `stats` (optional, 3 `{ value, label }`), `evalCaption`, `version`, `businessCase` (`{ valuePerYear, buildCost, runCostPerYear, paybackMonths, note, commercialModel }` for PRD section 12: value recovered a year taken from gate V's value frame, set against a one-time build cost and a yearly run cost from gate A's `pricing.runCost` at the client's volumes, and payback in months, all figures (assumed) until the client confirms; `commercialModel` is a recommendation on how the solution could be priced to the business, per-seat vs per-resolved-item vs flat, in the standard `{ options, preferred, why, changeMind }` shape); plus `governance` (rows `{ question, answer, status, owner }`), `sayIt` (3 lines), `assumptions` (strings). Recommendations use `{ options: [{ label, tradeoff }], preferred, why, changeMind }`. Then run `node .claude/skills/valued/conductor.js render`.
