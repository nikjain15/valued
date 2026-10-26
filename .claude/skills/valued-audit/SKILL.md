---
name: valued-audit
description: Audit a finished VALUED use case the same way every time. Scores the PRD and the prototype against the eight standards (questions, agentic design, product shape, traceability, PRD, evals, runs in a browser, writing), drives the local and hosted prototype in a headless browser, lists every issue with an ID, the file at fault, the gate that owns it and the fix, keeps the issue list across re-audits, and renders the run's observability page (out/observe.html). Runs automatically at the end of /valued; use /valued-audit any time after, and again after each fix.
---

# /valued-audit: the same audit after every use case

Works in the case workspace (the folder with `out/` and `.claude/`). Prints only tables and one closing line.

## Run

1. `node .claude/skills/valued-audit/audit.js --port <the run's port>` (add `--no-browser` only when no
   Chrome is installed, and say so). It:
   - runs `check.js` on the run: every standard, both evals, the local server and `out/hosted/index.html`
     driven in headless Chrome (Today, Queue, one item per outcome, assistants, quality page Design A, Data
     and tools, controls, console errors);
   - gives each issue a stable ID (`I-001`), its standard, the file at fault, the gate and skill that own
     it, and the fix; an issue keeps its ID across audits and closes when an audit no longer finds it;
   - writes `out/audit/report.md`, `out/audit/issues.json` and `out/audit/audit-<n>.json`, adds an event to
     `out/trace.jsonl`, appends one line to `learning/runs.jsonl` (the ledger across runs), and renders
     `out/observe.html`.
2. Print the standards row and the open-issue table exactly as the script prints them. Then one line:
   `Audit <n>: <k> open, <m> closed · out/audit/report.md · out/observe.html`.
3. If issues are open, offer the fixes with option cards, at most 4 at a time, worst standard first:
   "Fix now (Recommended)" applies the issue's fix through its owning gate (change the gate JSON or use
   `/valued-revise`, then `conductor.js render`), never by hand-editing a rendered file and never by editing
   labels; "Leave open" keeps it on the list with the reason. After fixes, run the audit again.
4. Log every open issue as a learning signal (`/valued-learn log`), source "audit", with the issue ID, the
   gate and the evidence, so the framework fixes the cause and not only this run.

## What it checks

| Standard | Checks |
|---|---|
| 1 Questions | 11 to 16 cards; recommended first with its trade-off; "If none fits, answer with"; case roles on headers |
| 2 Agentic | 3 to 6 named assistants, the first a rules safety guard; 1 to 3 sweeps with 2+ findings each |
| 3 Product shape | Today (greeting, tiles, readiness, overnight, "While you were away", "Close to their clock", top 3), Queue tabs, the right detail shape, trail and "This is wrong" on every item, 6+ systems, industry labels |
| 4 Traceability | decisions with gate, who and effect; FAQ "from" tags; governance rows with owners; app.html unchanged |
| 5 PRD | 0 "Pending:", gate V title, IDs, Given/When/Then, the four tables, eval results, history, section 17 |
| 6 Evals | 30+ dev and 12 holdout rows, 8 gates, per-group line, dev and sealed holdout pass; `provenance.json` names both writers and no name wrote both the holdout and the router; the sealed set scored against at most 2 router versions |
| 7 Browser | local and hosted pages load with no console errors, full queue, self-contained router of at most 200 lines |
| 8 Writing | no em-dashes, no real company or person, no employer names |

## Observability

`node .claude/skills/valued-audit/observe.js` re-renders `out/observe.html` at any time: run time and phases
against the 28-minute budget, scope cuts, the eight standards and every issue (open and closed), eval gates
on dev and holdout and the release status at each render, every client decision (auto and overruled marked),
what people did in the prototype (including "This is wrong" flags), and the full event log from
`out/trace.jsonl`. Across runs, `learning/runs.jsonl` holds one line per audit for `/valued-learn`.
