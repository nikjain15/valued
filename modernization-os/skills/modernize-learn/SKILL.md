---
name: modernize-learn
description: Make the modernization better from its own run. Reviews gate refusals and owner corrections, finds the patterns, proposes a lesson for each, and adds the ones the owner approves to a playbook every skill reads. Also checks whether earlier lessons are working. Use after every approved slice, after any correction from the owner, and when the same gate has refused twice.
---

# Learn: the same mistake is not made a third time

Every refused gate and every correction is recorded as a signal. This skill turns repeated signals into
rules, with a person's approval, and checks that the rules work.

## What is recorded, without you doing anything

| Signal | Recorded by |
|---|---|
| A gate refused (baseline, verify, secure, document, approve, slice) | `mos.py` |
| A design check failed (workflow, data model, saga) | `mos_design.py` |

## What you record

When the owner corrects you, pushes back, or says how they want something done:
`python3 modernization/mos_memory.py signal "<what they said, in their words>" --by "<name>" --where "<skill or stage>"`

Record it then, not later. Record your own observation too when a review finds a defect that a gate
let through (`--by` your role, `--where` the stage that should have caught it).

## The loop

1. `python3 modernization/mos_memory.py lessons`
   Shows patterns with no lesson yet (the same refusal twice or more, and anything the owner said),
   and each existing lesson with how often its pattern came back since.
2. For each pattern, find the cause. Read the signals (`mos_memory.py recall <words>`), the evidence
   and the journal around them. A cause is specific: "characterization tests asserted on log
   timestamps", not "tests were flaky".
3. Propose a lesson. Show the owner a table:

   | Pattern | Seen | Cause | Proposed rule | Applies to |
   |---|---|---|---|---|

   A good rule is one sentence, says what to do and when, and can be checked. "Before `baseline`,
   run the tests three times; freeze the clock in any test that reads a date." Not "be careful".
4. For each one the owner approves:
   `python3 modernization/mos_memory.py lesson add --rule "<rule>" --applies-to <skill> --signals G-3 G-7 --by "<name>"`
5. For each lesson marked "not working": the rule was wrong or too vague. Propose a sharper one and
   retire the old: `mos_memory.py lesson retire L-2 --by "<name>"`.
6. For each lesson marked "holding" across several slices: leave it.

## How lessons are used

`modernization/memory/playbook.md` is rebuilt on every change. The resume brief lists the active
lessons. Every skill reads the lessons under its own name, and under `modernize`, before it starts,
and follows them as if they were written in the skill.

## Scope of a lesson

| Fits | Does not fit |
|---|---|
| How to work in this codebase (its test quirks, its naming, its build) | Loosening a gate, a never rule or an approval |
| What this owner wants (format, level of detail, what to ask) | Anything that removes a person from a decision |
| A check to run before a gate so it passes first time | A fact about the system: that goes in the docs or a workflow profile |

A lesson can add care. It cannot remove a guard. If the pattern says a gate is wrong, say so to the
owner; changing the tool is their call.

## Carrying lessons to the next project

Lessons that are about the method, not this codebase, are worth keeping. At the end, list them for the
owner; with their yes, copy those lines into the skill pack's own `SKILL.md` files so every later
project starts with them.

## Never

- Never add a lesson without signals behind it and a named approver.
- Never edit `playbook.json` or `playbook.md` by hand.
- Never record a signal that names or blames a person. Record what happened.
