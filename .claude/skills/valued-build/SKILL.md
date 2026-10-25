---
name: valued-build
description: VALUED build step, after gate D. Turns the six gate files into a detailed, AI-build-ready PRD (out/prd.md and out/prd.html) and a working prototype app (workbench, evals, audit log) running on localhost, both in the founderfirst.one design system. Called by /valued; not for direct use.
---

# B: Build agent

**Job:** turn the decisions into something a team, or a coding agent, can build from, and something the
client can click.
**Prevents:** a strategy that stops at slides.

| | |
|---|---|
| **Asks the client** | Nothing. Every input is already a recorded decision. |
| **Uses** | The six gate files, `out/state.md`, `out/proto/` (router, eval, golden set), the engine chosen at gate A. |
| **Gives** | A working prototype on `http://localhost:4317` and a PRD with requirement IDs, acceptance criteria and a task-by-task build plan for a coding agent. |

This step must finish in about 3 minutes. Do the app first (it is mechanical), then the PRD.

## Steps

1. **App (under 1 minute).** Copy `app/app.html`, `app/server.js` and `app/ff.css` from this skill's
   folder into `out/proto/`. Do not restyle them; the design system is founderfirst.one.
   - Write `out/proto/build.json`: `{ "engine": "rules" | "rules+model" | "model-first" }` from the engine
     decision in `out/state.md` (default `rules` if none was recorded).
   - Write `out/proto/case.json` from the gate files. Fields, all strings unless noted:
     `title` (use case name, 2 to 5 words), `client`, `useCase`, `headline` (an outcome in under 9 words),
     `promise` (one sentence: who it helps and what a person still decides), `user` (who reviews drafts),
     `inputLabel`, `draftOpener` (one polite opening line in the client's voice), `approverRole`,
     `escalationOwner`, `escalationSla`, `autonomy`, `disclosure` (from gate U), `version` ("proto-0.1"),
     `neverList` (array, from gate U), `verdicts` (object keyed `answer`, `human`, `escalate`, each
     `{ "label", "desc" }` in plain words), `samples` (array of 6 `{ "label", "text" }`: two that
     answer, one that needs a person, two that escalate including one implied complaint, one in the
     second language; take them **from `golden.json` only, never from `holdout.json`**).
   - Make sure `router.js` exports with `module.exports = { decide }`. If it uses `export`, convert it.
   - Start it in the background: `node out/proto/server.js` (run in background), then `open
     http://localhost:4317` (skip `open` under `--no-open`). If port 4317 is busy, stop the old server
     first. The server also serves the PRD at `http://localhost:4317/prd` once it exists.
2. **PRD (about 2 minutes).** Write `out/prd.md` following `prd-template.md` in this skill's folder:
   every heading, in order, every table shape. Fill it only from the gate files, `out/state.md` and
   the eval output. Rules:
   - Requirement IDs everywhere (G-, M-, FR-, NFR-, R-, Q-, T-). Each FR has a testable acceptance
     criterion, written Given / When / Then where it fits.
   - Every number either comes from a gate file or is marked (assumed). Never invent client facts.
   - Section 11 shows the real latest dev and holdout results, including any gate that is still red.
     Quote holdout misses by id only, never their text. Row counts are the current counts (the dev set
     grows when harder rows are added).
   - Section 17 is written for a coding agent: concrete tasks in order, each with the requirement it
     implements and a command that proves it is done. Fill the kickoff prompt with the real use case.
   - Tables at most 12 rows. Telegraphic, verb-first. No em-dashes.
3. **Render:** `node .claude/skills/valued-build/render-prd.js out/prd.md out/prd.html`, then
   `open http://localhost:4317/prd` (skip under `--no-open`).
4. Write `out/proto/CLAUDE.md` with three lines: read `../prd.md` first; work from section 17; never
   edit `golden.json` or read `holdout.json`.
5. Append to `out/state.md`: `Build: prototype on http://localhost:4317 (engine <x>); PRD out/prd.md`.
6. **Say it** (three lines): this is the decisions turned into a spec a team or a coding agent can build
   from; every requirement has a test, and the evals are the definition of done; the prototype is the
   same rules, clickable, with every action logged.
