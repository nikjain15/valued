---
name: modernize-sources
description: Gather the knowledge that lives outside the code into the workspace, with no MCP servers and no connectors. Reads Word, Excel, PowerPoint, PDF and HTML files, and Jira issues and Confluence pages using a personal access token, then indexes them so large documents can be read a part at a time. Use when a modernization has specifications, runbooks, data dictionaries, mapping sheets, tickets or wiki pages to draw on.
---

# Sources: read what is written down

Half of a legacy system is in documents, tickets and wiki pages. This skill brings them into
`modernization/sources/` as plain text, using one script and nothing else.

## Ask the owner first (one round)

| Ask | Why |
|---|---|
| Which documents, spaces and projects describe this system | Only they know where the knowledge is |
| May the token be used for read-only calls to Jira and Confluence from this machine | It is their access; if no, use exports |
| Does any of it hold personal or restricted data | Decides what may be quoted in deliverables |

## Three ways in, pick per source

| Source | Command | Needs |
|---|---|---|
| Files: `.docx .xlsx .pptx .pdf .html .csv .txt .md` | `python3 modernization/mos_sources.py add <file or folder>` | Nothing. PDF needs `pdftotext` on the machine; otherwise save as Word |
| Jira issues | `python3 modernization/mos_sources.py jira --base <url> --jql "<query>"` or `--keys ABC-1 ABC-2` | `JIRA_TOKEN` in the environment |
| Confluence pages | `python3 modernization/mos_sources.py confluence --base <url> --page-id <id> --depth 2` or `--cql "<query>"` | `CONFLUENCE_TOKEN` in the environment |
| Anything the token cannot reach | Export it (Confluence: export to Word or HTML; Jira: export to CSV or HTML), then `add` | Nothing |

Token rules: the owner sets it in their own shell (`export JIRA_TOKEN=...`). On Atlassian Cloud also set
`ATLASSIAN_EMAIL`; on Data Center leave it unset. Never ask for a token in chat, never print one, never
write one to a file. The script makes GET requests only.

## Reading large material

1. `python3 modernization/mos_sources.py toc` lists every source with its sections and line numbers.
2. `python3 modernization/mos_sources.py find <words>` shows where terms appear, as `source:line`.
3. Read only the line range you need. Never load a whole large source to answer one question.
4. For a spreadsheet, read the header row and the first rows of each sheet first, then decide what
   matters. Mapping sheets and data dictionaries are worth reading in full.

## What to pull, and what to look for

| Source | Look for |
|---|---|
| Functional and technical specifications | Workflows, rules, interfaces, the reasons behind odd behavior |
| Data dictionaries, mapping sheets | Field meanings, allowed values, units, owners, earlier migration attempts |
| Runbooks, operations pages | Manual fixes, restart steps, batch order: today's real failure handling |
| Jira: incidents and bugs on this system | Which workflow fails, how often, how it was repaired. Useful queries: `project = X AND type in (Bug, Incident) AND created >= -730d`, `text ~ "rollback OR reprocess OR manual fix"` |
| Jira: open change requests | Requirements the new design must not block |
| Architecture decks | Intended design, so you can see where the code departed from it |

## Write `modernization/sources/findings.md`

A table of what the sources established, one row per fact: fact, workflow or area, source as
`doc:<source name>:<line>`, and whether the code agrees (yes, no, not checked). Where a document and the
code disagree, the code is what runs: record both and raise it with the owner.

## Never

- Never use an MCP server, a connector or any service other than the owner's own Jira and Confluence.
- Never write to Jira or Confluence.
- Never commit `modernization/sources/`. The script adds a `.gitignore` there; leave it.
- Never copy personal data from a source into a deliverable. Refer to roles, not people.
- Never treat a document as true because it is written down. Check it against the code.
