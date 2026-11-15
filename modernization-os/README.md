# Modernization OS

**A portable skill pack for modernizing legacy code. Agents do the work; a fixed tool guards the gates; a
person approves every slice.**

Separate from VALUED and self-contained: this folder can be copied out and used on its own. It follows
the five stages on Anthropic's [code modernization](https://claude.com/solutions/code-modernization)
page, and adds a conductor, a design track (documents, workflows, data model, saga architecture) and
gate tools so the stages run the same way in any IDE, on any model.

**No MCP, no connectors, no packages.** It needs files, a shell and Python 3.8. Jira and Confluence are
read with a personal token, read-only, or from exports.

## The skills

| Skill | Stage | What it does | Gate it must pass |
|---|---|---|---|
| `modernize` | Conductor | Runs the stages in order, one slice at a time; asks the owner only what the owner owns | `mos.py status`, `check` |
| `modernize-analyze` | Legacy system analysis | Inventory, dependency graph, dead-code candidates, hotspots ranked by complexity and business impact, slice plan | Plan and first slice on record |
| `modernize-sources` | Read what is written down | Word, Excel, PowerPoint, PDF and HTML files; Jira issues and Confluence pages by personal token; an index so large documents are read a part at a time | Sources and findings on record |
| `modernize-discover` | Profile each workflow | Researches each workflow from code and documents, then asks the owner adaptive questions: only what evidence could not answer, each answer choosing the next | `mos_design.py workflow check` |
| `modernize-data-model` | Data model | Deep research of the legacy model; target model; the exact list of new schemas, tables and columns, type changes and drops | `mos_design.py model check` |
| `modernize-architect` | Architecture | Saga design per workflow that crosses services: steps, compensations, point of no return, idempotency, timeouts | `mos_design.py saga check`, `gate` |
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

The installer also puts the three tools in `modernization/` (`mos.py`, `mos_sources.py`,
`mos_design.py`) and adds a short contract to `AGENTS.md`.
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
| Every workflow fact has a source; the owner's calls are never assumed | `mos_design.py workflow check` |
| No legacy column lost silently; a drop needs a named person | `mos_design.py model check`, which writes `data/build-list.md` |
| Every saga step before the point of no return can be undone; every step after it is retried; a step writes only its own service's data | `mos_design.py saga check` |
| Tokens never stored | Read from the environment; GET requests only; `sources/` is git-ignored |

## Reading Jira, Confluence and documents

```
python3 modernization/mos_sources.py add specs/ mapping.xlsx deck.pptx
export JIRA_TOKEN=...        # set by the owner in their own shell
python3 modernization/mos_sources.py jira --base https://jira.yourcompany.example --jql "project = PAY AND type = Incident"
export CONFLUENCE_TOKEN=...
python3 modernization/mos_sources.py confluence --base https://wiki.yourcompany.example --page-id 12345 --depth 2
python3 modernization/mos_sources.py toc
python3 modernization/mos_sources.py find settlement reversal
```

On Atlassian Cloud also set `ATLASSIAN_EMAIL`; on Data Center leave it unset. If the network blocks the
calls, export the pages or issues to Word, HTML or CSV and use `add`.

## What lands in the repository

```
modernization/
  mos.py            the gate tool
  mos_sources.py    document, Jira and Confluence reader
  mos_design.py     workflow, data model and saga checks
  sources/          documents, issues and pages as text, with an index (git-ignored)
  workflows/        one profile per workflow: facts, each with its source
  data/             legacy-schema.json, legacy-notes.md, target-model.json, build-list.md, migration.md
  architecture/     sagas/<name>.json, architecture.md
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
- Legacy schema extraction reads SQL `CREATE TABLE` statements and COBOL copybooks. Entity classes,
  file layouts and schemas built in code are found by the agent reading the code.
- The Jira and Confluence reader is tested against a local stand-in server, not a live Atlassian
  site. It tries the Data Center and Cloud endpoint shapes in turn; if neither answers, use exports.
- PDF needs the `pdftotext` program. Old `.doc`, `.xls` and `.ppt` files must be saved in the newer format first.
- Tested with the unit suite below. Not yet run end to end on a real legacy system in each IDE.

## Tests

```
python3 -m unittest discover modernization-os/tests
```
