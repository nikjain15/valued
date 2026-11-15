<!-- modernization-os:start -->
## Modernization OS

This repository is being modernized with the Modernization OS. Follow this contract in any agent or
model. If your tool loads skills, the full instructions are in the `modernize*` skills; if it does not,
read the matching `SKILL.md` under the skills folder before each stage.

| # | Stage | Skill to read | Gate (run from the repo root) |
|---|---|---|---|
| 0 | Conduct | `modernize` | `python3 modernization/mos.py status` |
| 1 | Analyze the code | `modernize-analyze` | `inventory`, `graph`, `rank` |
| 2 | Read documents, Jira, Confluence | `modernize-sources` | `python3 modernization/mos_sources.py add / jira / confluence` |
| 3 | Profile each workflow, adaptive questions | `modernize-discover` | `python3 modernization/mos_design.py workflow check` |
| 4 | Data model: new schemas and columns | `modernize-data-model` | `mos_design.py schema extract`, `model check` |
| 5 | Architecture: saga workflows | `modernize-architect` | `mos_design.py saga check`, `gate`, then `mos.py slice add` |
| 6 | Pin behavior | `modernize-test` | `baseline <slice> -- <test command>` |
| 7 | Transform | `modernize-transform` | `transformed <slice>`, `verify <slice>` |
| 8 | Secure | `modernize-secure` | `secure <slice>` |
| 9 | Document | `modernize-document` | `document <slice>`, `approve <slice> --by <person>` |

Rules that hold in every stage:

- No MCP servers, no connectors: files, a shell and Python only. Tokens stay in the environment.
- Design before code: stages 2 to 5 apply when the database or the architecture changes.
- One slice at a time, gates in order. `mos.py` decides whether a gate passed, not the agent.
- Tests pass on the legacy code before it changes, and the same tests pass after.
- Never edit a baseline test, `modernization/state.json` or `modernization/evidence/` by hand.
- Only a named person approves a slice, accepts a risk or agrees to delete code.
- Ask the owner only for decisions they own. Everything else is a recommendation with trade-offs.
- Mark anything unverified (assumed).
<!-- modernization-os:end -->
