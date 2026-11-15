# Modernization OS

**A portable skill pack for modernizing legacy code. Agents do the work; a fixed tool guards the gates; a
person approves every slice.**

Separate from VALUED and self-contained: this folder can be copied out and used on its own. It follows
the five stages on Anthropic's [code modernization](https://claude.com/solutions/code-modernization)
page, and adds a conductor and a gate tool so the stages run the same way in any IDE, on any model.

## The skills

| Skill | Stage | What it does | Gate it must pass |
|---|---|---|---|
| `modernize` | Conductor | Runs the stages in order, one slice at a time; asks the owner only what the owner owns | `mos.py status`, `check` |
| `modernize-analyze` | Legacy system analysis | Inventory, dependency graph, dead-code candidates, hotspots ranked by complexity and business impact, slice plan | Plan and first slice on record |
| `modernize-test` | Automated testing | Pins today's behavior with characterization tests, lists coverage gaps, adds regression tests after | `mos.py baseline` |
| `modernize-transform` | Systematic transformation | Moves one slice to the target stack in small steps, business rule by business rule | `mos.py verify` |
| `modernize-secure` | Security and compliance | Finds and patches vulnerabilities; proves the legacy controls survived | `mos.py secure` |
| `modernize-document` | Documentation | Writes the handover: business rules, interfaces, controls, quirks kept on purpose | `mos.py document`, `approve` |

Testing runs before transformation, not after as the page lists it: a behavior nobody pinned is a
behavior nobody can prove was preserved.

## Install

Needs Python 3.8 or later. No packages.

```
python3 modernization-os/install.py /path/to/legacy-repo --tool <tool>
```

| Your tool | `--tool` | Skills land in |
|---|---|---|
| VS Code with GitHub Copilot | `copilot` | `.github/skills/` |
| Claude Code (terminal, VS Code, JetBrains) | `claude` | `.claude/skills/` |
| Cursor | `cursor` | `.cursor/skills/` |
| Gemini CLI | `gemini` | `.gemini/skills/` |
| Codex, Amp, Cline and others that read the shared folder (default) | `agents` | `.agents/skills/` |
| Anything else | `--dir <folder>` | the folder you name |

Folder names are each tool's convention at the time of writing; if yours has moved, use `--dir`.

The installer also puts the gate tool at `modernization/mos.py` and adds a short contract to `AGENTS.md`.
A tool or model with no skill support can still follow the method from that file: it names the stage,
the `SKILL.md` to read and the gate to run.

Then open the repository and say: **"modernize this codebase"**.

## How it stays honest on any model

The skills are plain Markdown in the open Agent Skills format (`SKILL.md` with a name and a description).
They assume only that the agent can read files and run a shell command. What must not depend on the
model is in `mos.py`:

| Guard | How |
|---|---|
| Tests pass before the code changes | `baseline` runs the command itself and records exit code, output and commit |
| The same tests pass after | `verify` reruns the recorded command; a different command needs a reason and a person |
| Nothing is "transformed" without a change | File hashes compared with the baseline |
| No open high or critical finding | `secure` reads `security.json`, then reruns the tests |
| A risk is accepted by a person, by name | `accepted_by` required |
| A slice is approved by a person, by name | `approve --by` |
| No gate skipped, no state edited by hand | `check` audits state against evidence; exits 1, so CI can run it |

## What lands in the repository

```
modernization/
  mos.py            the gate tool
  state.json        slices, statuses, decisions and who made them
  inventory.json    languages, size, build and delivery files
  graph.json        dependencies, cycles, dead-code candidates
  hotspots.json     ranked files
  impact.json       the owner's 1 to 5 business impact per area
  plan.md           the slice plan
  evidence/<slice>/ baseline, verify, security, retest
  docs/<slice>.md   handover per slice
```

## Limits

- The dependency graph is static and regex-based: Python, JavaScript and TypeScript, Java, Kotlin, Scala,
  C and C++, Go, Ruby, PHP, COBOL. Other languages and dynamic calls are mapped by the agent reading
  the code (`graph.extra.json`). Dead-code results are candidates, never verdicts.
- Complexity is a branch count, not a full parse. It ranks; it does not measure.
- The security stage is a review plus whatever audit tool the repository already has. It does not
  replace a scanner or a compliance sign-off.
- Tested with the unit suite below. Not yet run end to end on a real legacy system in each IDE.

## Tests

```
python3 -m unittest discover modernization-os/tests
```
