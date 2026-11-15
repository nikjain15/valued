---
name: modernize-document
description: Write the documentation a modernized slice needs to be handed over, capturing the business rules and institutional knowledge that lived only in the legacy code. Use after a slice passes the security gate, or when asked to document undocumented legacy code.
---

# Document

Goal: the next engineer, and the next auditor, can understand the slice without reading the legacy
code or finding the person who wrote it.

## Preconditions

Slice is `secured`.

## Write `modernization/docs/<slice>.md`

| Section | Content |
|---|---|
| What this does | Three lines, in the business's words |
| Business rules | Table: rule, condition, outcome, where it lives now (`path:line`), where it lived (`path:line`), test that pins it |
| Interfaces | Inputs, outputs, formats, callers and what they rely on |
| Data | Stores read and written, field meanings that are not obvious, units, encodings |
| Controls | Security and regulatory controls kept (from `security.json`), in plain words |
| What changed | Old stack to new stack, approach taken, anything behaviorally different (should be nothing) |
| Known quirks kept on purpose | Legacy behaviors preserved for compatibility, why, and who to ask before changing one |
| Open items | Suspected defects, accepted risks, things left for a later slice |
| How to run and test | The exact commands, from the repo root |
| Sign-off trail | Decisions for this slice with who made each (from `mos.py status` and `state.json`) |

## Rules

- Every statement traces to code or to something the owner said. Mark the rest (assumed).
- Write rules as the business would say them ("orders over 10,000 need a second approver"), then cite
  the code. Not a line-by-line paraphrase.
- Record the why when the code or the owner reveals it. A rule with no known reason says so.
- Update the docs the repo already has (README, API docs, runbooks, architecture notes) where this
  slice made them wrong. List what you updated.
- Comments in code: only where the reason is not obvious from the code.

## Gate and approval

1. `python3 modernization/mos.py document S1`.
2. Show the owner: the rule mapping, the test evidence, the security findings and the open items, in
   that order. Ask for approval of the slice.
3. Only when they approve: `python3 modernization/mos.py approve S1 --by "<their name>"`.
4. `python3 modernization/mos.py check`, then hand back to `modernize` for the next slice.

## After the last slice

Write `modernization/handover.md`: the system as it now stands, the slice list with status, all
decisions, all accepted risks, legacy code still to retire, and what to watch in the first weeks.
