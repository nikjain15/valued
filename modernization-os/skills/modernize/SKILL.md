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

**Understand and design** (once, before any code changes)

| # | Stage | Skill | Ends when |
|---|---|---|---|
| 1 | Analyze the code | `modernize-analyze` | Inventory, dependency graph and ranked hotspots exist; the owner has set the target |
| 2 | Read what is written down | `modernize-sources` | Documents, tickets and wiki pages are in `modernization/sources/` with findings |
| 3 | Profile each workflow | `modernize-discover` | `mos_design.py workflow check` passes |
| 4 | Design the data model | `modernize-data-model` | `mos_design.py model check` passes; the build list exists |
| 5 | Design the architecture | `modernize-architect` | `mos_design.py gate` passes; then the slice plan is agreed |

**Build** (repeat per slice)

| # | Stage | Skill | Ends when |
|---|---|---|---|
| 6 | Pin today's behavior | `modernize-test` | `mos.py baseline <slice>` passes on the untouched code |
| 7 | Transform one slice | `modernize-transform` | `mos.py verify <slice>` passes on the new code |
| 8 | Secure and stay compliant | `modernize-secure` | `mos.py secure <slice>` passes |
| 9 | Document | `modernize-document` | `mos.py document <slice>` passes, then a named person approves |

Tests come before transformation on purpose: a behavior nobody pinned is a behavior nobody can prove
was preserved.

**Which design stages to run.** Recommend, and let the owner overrule:

| The modernization | Run |
|---|---|
| Same architecture and database, newer language or framework | 1, then the slice plan. Skip 2 to 5 unless documents exist worth reading |
| New or restructured database | 1 to 4 |
| Splitting into services, or moving off a shared database | 1 to 5 |

**No MCP, no connectors.** Everything here runs on files, a shell and Python. Jira and Confluence are
read with the owner's personal token by `mos_sources.py`, or from exports.

## Start or resume

1. If `modernization/mos.py` is missing, copy every `.py` file from this skill's `scripts/` folder into
   `modernization/`.
2. Run `python3 modernization/mos.py init` (safe to repeat), then `python3 modernization/mos.py status`.
3. No slices yet: run the design stages in order, starting from the first whose output is missing.
   Otherwise pick the earliest slice that is not `approved` and run the skill for its next gate.
4. After every gate, show `mos.py status` and one line on what comes next.

## Ask the owner only what the owner owns

Ask these, one short question each, with your recommendation first and the trade-off of every option.
Record each answer with `mos.py decide "<what>" --by "<name>"`.

| Decision | When |
|---|---|
| Target stack and versions | Before the slice plan |
| Strategy: slice by slice beside the old system, or one cut-over | Before the slice plan |
| Business impact of each area, 1 to 5 (`modernization/impact.json`) | Before ranking is final |
| Which documents, Jira projects and Confluence spaces to read, and whether the token may be used | Before stage 2 |
| Per workflow: how long parts may disagree, and its target shape | Stage 3 |
| Dropping a legacy column; the point of no return in a saga | Stages 4 and 5 |
| Which regulations and internal controls apply | Before the security stage on the first slice |
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
- Never use an MCP server or an outside service. Never ask for, print or store a token.
- Never invent a fact about the system. Mark what you could not verify as (assumed).
- Never push, deploy or run a migration against shared data without the owner asking for it.

## Output style

Tables over prose. Short, verb-first lines. Say what the owner said, cite files as `path:line`.
