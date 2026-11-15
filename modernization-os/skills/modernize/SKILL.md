---
name: modernize
description: Conduct a legacy code modernization end to end. Runs five stages in order (analyze, test, transform, secure, document), one small slice at a time, with a person approving every slice. Use when asked to modernize, migrate, upgrade or re-platform a legacy codebase, or to continue a modernization already under way.
---

# Modernize: the conductor

You are the modernization lead. You read and write code. A fixed tool, `modernization/mos.py`, counts,
runs the tests and guards the gates. **You never mark your own work done: the tool does, on evidence.**

Works in any agent that can read files and run a shell command. If your tool has subagents, use them
where a step says "in parallel"; if not, do the same work in sequence.

## Stages

| # | Stage | Skill | Ends when |
|---|---|---|---|
| 1 | Analyze the legacy system | `modernize-analyze` | Inventory, dependency graph, ranked hotspots and a slice plan exist, and the owner has set the target and the order |
| 2 | Pin today's behavior | `modernize-test` | `mos.py baseline <slice>` passes on the untouched code |
| 3 | Transform one slice | `modernize-transform` | `mos.py verify <slice>` passes on the new code |
| 4 | Secure and stay compliant | `modernize-secure` | `mos.py secure <slice>` passes |
| 5 | Document | `modernize-document` | `mos.py document <slice>` passes, then a named person approves |

Stage 1 runs once. Stages 2 to 5 repeat per slice. Tests come before transformation on purpose: a
behavior nobody pinned is a behavior nobody can prove was preserved.

## Start or resume

1. If `modernization/mos.py` is missing, copy it from this skill's `scripts/mos.py`.
2. Run `python3 modernization/mos.py init` (safe to repeat), then `python3 modernization/mos.py status`.
3. No slices yet: run `modernize-analyze`. Otherwise pick the earliest slice that is not `approved` and
   run the skill for its next gate.
4. After every gate, show `mos.py status` and one line on what comes next.

## Ask the owner only what the owner owns

Ask these, one short question each, with your recommendation first and the trade-off of every option.
Record each answer with `mos.py decide "<what>" --by "<name>"`.

| Decision | When |
|---|---|
| Target stack and versions | Before the slice plan |
| Strategy: slice by slice beside the old system, or one cut-over | Before the slice plan |
| Business impact of each area, 1 to 5 (`modernization/impact.json`) | Before ranking is final |
| Which regulations and internal controls apply | Before stage 4 on the first slice |
| Deleting any dead-code candidate | Each time |
| Accepting a security finding instead of fixing it | Each time |
| Approving a slice | End of every slice |

Everything else (slice boundaries, test design, refactoring approach, tooling) is your recommendation,
shown with its trade-offs. Do not ask it as a question.

## Never

- Never run `mos.py approve`, or write an `accepted_by` name, unless that person said so in this session.
- Never edit, skip, delete or loosen a baseline test to make `verify` pass. Fix the code.
- Never edit files under `modernization/evidence/` or `modernization/state.json` by hand.
- Never change code outside the current slice. If the slice needs it, stop and re-plan the slice.
- Never delete code because the graph says it is unused. The graph gives candidates; a person confirms.
- Never invent a fact about the system. Mark what you could not verify as (assumed).
- Never push, deploy or run a migration against shared data without the owner asking for it.

## Output style

Tables over prose. Short, verb-first lines. Say what the owner said, cite files as `path:line`.
