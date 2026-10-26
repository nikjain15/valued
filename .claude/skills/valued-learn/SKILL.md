---
name: valued-learn
description: Make VALUED better from its own use. Reads the learning log (learning/signals.md), groups signals into patterns, proposes concrete changes to skills, libraries, templates or the app with the signal IDs that justify each, asks Nik to approve or reject each with option cards, applies the approved ones, records rejections with the reason, and runs the regression suite before anything is pushed. Use when the user types /valued-learn, or to log a signal with /valued-learn log <feedback>.
---

# /valued-learn: the self-improving loop

Works in the framework repo (`~/dev/valued`), never in a case workspace. Nik approves every change.

## Logging a signal

`/valued-learn log <feedback>`, and automatically at the end of every run and revision:
- After every `/valued-revise`: one signal (source "revise"), gate = the owning gate, evidence = old and new decision.
- After every run: read `out/run-report.json`; one signal per item flagged "This is wrong" (source "flag"),
  per eval block (source "eval block", with the fix), per conductor cut (source "overrun"), and per
  `checks` entry still open (source "check").
- Interviewer pushback or Nik's notes: source "pushback" or "note", in his words.

Append to `learning/signals.md` under `## Signals`, before the "Status updates" heading, with the next
free number (`S-NNN`), never editing earlier signals:

```
### S-NNN
- Source: <source>, <date> · Scenario: <case or slug> · Gate: <V|A|L|U|E|D|B|app|conductor>
- Evidence: <what was seen, the file at fault>
- Status: open
```

## Learning (`/valued-learn` with no argument)

1. **Read** `learning/signals.md` and `learning/proposals.md` (create it if missing). Work only on signals
   whose status is `open`.
2. **Group** them into patterns by gate and cause (not by scenario): one pattern = one root cause that
   explains two or more signals, or one signal that breaks a standard outright. Print a table: pattern,
   signals, gate, standard it breaks.
3. **Propose** one concrete change per pattern, the most general fix that removes the cause: a schema or
   required key in a skill's Output, a rule in a skill, a library entry (`connectors-library.json`,
   `golden-seeds.json`, `sweep-templates.json`), a renderer or checker change in `conductor.js`, or an app
   change. Never a per-case patch. Each proposal: id (`P-NNN`), the change in one line, files it touches,
   the signal IDs it cites, the risk, and how the regression suite will show it worked.
4. **Ask** with option cards, at most 4 at a time, one card per proposal: "Apply (Recommended)" with its
   trade-off, "Apply a narrower version" when one exists, "Reject" (ask for the reason in one line).
5. **Apply** each approved change in `~/dev/valued`. Record every outcome in `learning/proposals.md`:
   `| P-NNN | date | change | signals | decision (approved / rejected: <reason>) | commit |`. Under
   "Status updates" in `signals.md`, add `S-NNN: addressed by P-NNN` (or `rejected in P-NNN: <reason>`).
6. **Regression gate.** Before any push: `node learning/regression/run.js --static` on the existing
   audit copies, and for skill changes a fresh run of the affected scenarios (see `learning/regression/README.md`).
   The suite must stay all pass and every run within 28 minutes. Report the table; never push on red.
7. **Commit** locally with a message listing the proposals and signals. Ask before pushing.
