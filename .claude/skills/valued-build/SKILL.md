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

## Steps

1. **Check the prototype.** `curl -s localhost:4317/api/status` must show `"ready":true`. If the server
   is not running, start it in the background: `node out/proto/server.js`. If `router.js` uses `export`,
   convert it to `module.exports = { decide }`. Fill any `case.json` field a gate left empty (fields
   listed in the orchestrator's table). If `connectors` is missing or has fewer than 6, fill it from
   `.claude/skills/valued-labels/connectors-library.json` for the case's `industry`: channels and
   knowledge `connected`, the rest `planned`. The Data and tools page must never be empty.
   For each sweep in `sweeps`, write 2 to 3 `findings` from the synthetic world of this run:
   `{ "title", "why", "cite", "due" }`, where `why` states the facts the sweep read, `cite` names the
   rule or source, and `due` is a clock when one applies ("Due in 2 days"). If `clocks` is missing,
   set it from gate U's response times.
2. **Write the FAQ** into `case.json` as `faq`: 7 to 8 `{ "q", "a" }` pairs, each answer two sentences
   at most, written from this run's decisions, not generic. Cover: why this first (and not the obvious
   alternative); what it never does; what happens when it is unsure; how we know it is safe to launch
   (the client's bar and the latest result); whether it uses a model, and what happens if the model is
   down or declines; who approves and what is logged; what data it uses and what is masked; what would
   make us stop. Each pair also has `"from"`: the gate, the decision and who made it (for example
   "Gate U: draft with approval (Risk)"), so every answer traces to the session. Set `version` to
   `proto-0.1`.
3. **Complete the PRD** in `out/prd.md`, following `prd-template.md`: replace every remaining
   `> Pending: fills at gate B.` line (sections 1, 7, 12, 15, 16, 17 and the appendix), add the
   Recommendation and Decision-asked quote under the meta line, and update `Version` to `0.1, draft for
   client review`. Rules:
   - Requirement IDs everywhere (G-, M-, US-, FR-, NFR-, R-, Q-, T-). Each FR has a testable acceptance
     criterion, Given / When / Then where it fits, and names the user story it serves.
   - Every number comes from a gate file or is marked (assumed). Never invent client facts.
   - Re-read sections the gates wrote; fix contradictions with later decisions (for example a bar
     changed at E). The PRD must agree with itself and with the prototype.
   - Section 11 shows the real latest dev and holdout results, including any gate still red. Holdout
     misses by id only, never their text. Row counts are current counts.
   - Section 17 is for a coding agent: concrete tasks in order, each with the requirement it implements
     and a command that proves it is done. Fill the kickoff prompt with the real use case.
   - Tables at most 12 rows. Telegraphic, verb-first. No em-dashes.
4. **Render the standalone copy:** `node .claude/skills/valued-build/render-prd.js out/prd.md
   out/prd.html`.
5. **Publish the hosted versions** (about a minute), so the client sees a real product and a real document:
   1. `node .claude/skills/valued-build/build-hosted.js out` and publish `out/hosted/index.html` with the
      Artifact tool, `capabilities: {"sample": {}}`. Note its URL (the prototype).
   2. `node .claude/skills/valued-build/render-prd.js out/prd.md out/hosted/prd.html --artifact <prototype URL>`
      and publish `out/hosted/prd.html` (no capabilities). Note its URL (the PRD).
   3. `node .claude/skills/valued-build/build-hosted.js out <PRD URL>` and publish `out/hosted/index.html`
      again to the same path, so the prototype's PRD button opens the PRD.
   The prototype runs the same router in the browser, lets the client pick Claude Haiku, Sonnet or Opus,
   and measures latency and estimated cost on every AI call, with no API key. Print both links and add
   them to `out/state.md`. If publishing is unavailable, say so in one line and keep localhost.
6. Write `out/proto/CLAUDE.md` with three lines: read `../prd.md` first; work from section 17; never
   edit `golden.json` or read `holdout.json`.
7. Append to `out/state.md`: `Build: PRD complete (localhost:4317/prd, out/prd.html); prototype on
   localhost:4317 (engine <x>)`. Then `open http://localhost:4317` (skip under `--no-open`).
8. **Say it** (three lines): this is the decisions turned into a spec a team or a coding agent can build
   from; every requirement has a test, and the evals are the definition of done; the prototype is the
   same rules, clickable, with every action logged.
