<!-- modernization-os:start -->
## Modernization OS

This repository is being modernized with the Modernization OS. Follow this contract in any agent or
model. If your tool loads skills, the full instructions are in the `modernize*` skills; if it does not,
read the matching `SKILL.md` under the skills folder before each stage.

| # | Stage | Skill to read | Gate (run from the repo root) |
|---|---|---|---|
| 0 | Conduct | `modernize` | `python3 modernization/mos.py status` |
| 1 | Analyze | `modernize-analyze` | `inventory`, `graph`, `rank`, `slice add` |
| 2 | Pin behavior | `modernize-test` | `baseline <slice> -- <test command>` |
| 3 | Transform | `modernize-transform` | `transformed <slice>`, `verify <slice>` |
| 4 | Secure | `modernize-secure` | `secure <slice>` |
| 5 | Document | `modernize-document` | `document <slice>`, `approve <slice> --by <person>` |

Rules that hold in every stage:

- One slice at a time, gates in order. `mos.py` decides whether a gate passed, not the agent.
- Tests pass on the legacy code before it changes, and the same tests pass after.
- Never edit a baseline test, `modernization/state.json` or `modernization/evidence/` by hand.
- Only a named person approves a slice, accepts a risk or agrees to delete code.
- Ask the owner only for decisions they own. Everything else is a recommendation with trade-offs.
- Mark anything unverified (assumed).
<!-- modernization-os:end -->
