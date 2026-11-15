---
name: modernize-memory
description: Keep a long modernization on track across sessions, context limits and hand-overs between people, agents or models. Provides the resume brief to read first, a work journal, structured checkpoints and recall. Use at the start of every session, after any context reset or summary, before stopping, and whenever unsure what was already done or decided.
---

# Memory: nothing important lives only in the conversation

A modernization runs for weeks. A conversation does not. Assume at every moment that your context may
be cut, summarised or handed to a different agent or model, and that whoever continues knows only what
is on disk.

## Two kinds of memory

| Kind | Where it lives | Who writes it |
|---|---|---|
| Facts: slice status, test results, decisions, approvals, what to do next | `modernization/state.json`, `evidence/`, and the output of `mos_memory.py next` | The tools. Never recalled, always computed |
| Understanding: intent, reasoning, dead ends, what to watch for | `modernization/memory/` journal and checkpoints | You, in the fixed shape below |

If what you remember disagrees with what the tools report, the tools are right.

## Every session starts the same way

1. `python3 modernization/mos_memory.py resume`
2. Read it fully: next action, state, lessons to apply, last checkpoint, what happened since.
3. Do the next action it names. Do not re-plan work the brief shows as done.

Run `resume` again whenever your context was compacted or you notice you are unsure of the state.

## While working

| When | Do |
|---|---|
| You finish a meaningful step | `mos_memory.py journal did "<what, and where the result is>"` |
| You learn something not obvious from the code | `mos_memory.py journal found "<fact, with path:line>"` |
| The owner decides something | `mos.py decide "<what>" --by "<name>"`, and `journal decided` with the reason |
| You are stuck | `mos_memory.py journal blocked "<on what, what you tried>"` |
| You need something from earlier | `mos_memory.py recall <words>` before asking the owner again or redoing work |

Gates journal themselves. Keep entries to one or two lines; point to files instead of pasting content.

## Checkpoints

Write one after every gate, before stopping for any reason, when `resume` or `journal` says one is
due, and before a long risky step. Write it to a file, then:
`python3 modernization/mos_memory.py checkpoint --from <file>`

The shape is fixed, and the tool refuses anything else:

```
## Goal
What this modernization is for, in two lines. The current slice or stage and its purpose.

## Where we are
The stage, the slice, what state the code is in right now (builds? tests pass? half-edited files?).

## Done since last checkpoint
- Verb-first lines, each pointing at a file or evidence.

## In progress
What is half done, exactly where it stopped, and what the next keystroke would have been.

## Next actions
1. The very next thing.
2. Then.

## Decisions and why
- Decision, who made it, the reason. Include choices you made yourself and what you rejected.

## Open questions
- For the owner, or still to investigate. Say who can answer.

## Watch out
- Traps, dead ends already tried, things that look wrong but are intentional.
```

Rules for a good checkpoint:

- **Write for a stranger.** No "as discussed", no "the earlier approach". Name things.
- **150 lines at most.** It is a summary. Detail stays in the journal and the workspace files.
- **Paths, not content.** `src/billing/rates.py:40`, not the code.
- **Say what failed.** A dead end recorded is a day saved.
- **Do not restate tool facts.** The tool stamps slice status and the computed next action on top.

## Working with limited context

- Read large files and sources by line range (`mos_sources.py toc`, `find`), never whole.
- Put intermediate results in files under `modernization/`, not in the conversation.
- One slice, one workflow or one table group at a time. Finish, checkpoint, move on.
- If your tool has subagents, give each one a narrow task and the paths to read; take back a short
  result and journal it.

## Never

- Never continue from memory after a context reset. Run `resume`.
- Never edit files under `modernization/memory/` by hand, except the draft file you pass to `checkpoint`.
- Never stop without a checkpoint.
- Never put secrets, tokens or personal data in the journal or a checkpoint.
