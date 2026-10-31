---
name: valued-deep
description: Take one chosen AI use case to a build-ready strategy over days, not minutes. Researches the case in parallel strands against primary sources, writes a long-form plan with a decision log and a citations register (every number keyed, tagged P, S, A, J, I, computed or not found), designs evals as rule gates plus model metrics per group with a hashed holdout, defends every eval bar against published industry evidence with a kind column, has the eval design reviewed twice by independent contexts on a second model, consolidates everything into one strategy document with stable row IDs, and re-validates that document on demand until it is solid. Nothing is built until the user types go build. Use when the user types /valued-deep with a case, a brief under inputs/, or after /valued-select; also /valued-deep defend, review, consolidate, revalidate and go build.
---

# /valued-deep: one use case, researched until it is solid

**Job:** turn one chosen use case into a strategy a technical panel or an investment committee cannot knock
over: every number sourced, every decision logged with who made it, every eval bar defended against what the
industry actually publishes, and the whole thing re-read as many times as it takes before anything is built.
**Prevents:** a bar nobody can defend ("No, that never happens"); a number nobody can trace; an eval that
grades itself; a strategy that lives in a chat and gets lost; code written before the thinking is finished.

| | |
|---|---|
| **Asks the user** | Priorities, risk appetite, scope calls, and facts only they hold. Every eval bar, architecture choice and vendor call is a recommendation with trade-offs, never a question. |
| **Uses** | Parallel research strands; the `fact-checker` agent for supplied figures; the `gate-defender` agent for eval bars; the `eval-reviewer` agent twice, once on a second model; the `holdout-sealer` agent for the sealed set; the `strategy-writer` agent for consolidation; the `strategy-reviewer` agent for each revalidation pass. |
| **Gives** | Under `out/deep/` (or exactly the `--out <dir>` given, with nothing appended): `plan.md`, `decision-log.md`, `citations.md`, `strategy.md`, `run-notes.md`, `strands/<PREFIX>.md`, `reviews/`, `revalidation/pass-N.md`, `handoff.json`. Markdown and JSON only until `go build`. |
| **Governance asks** | Which wrong output reaches a customer or a regulator? Which facts are assumed and who must confirm them? Who signs the release, and is every bar a rule a person can audit or a rate a person must read? |

Pace: days. Each command below is one sitting of 30 to 120 minutes. The user runs them in any order after
`start`, and may run `revalidate` as many times as they like.

## Standing rules (binding for every command)

1. **No build until typed.** Until the user types `/valued-deep go build`, write only `.md` and `.json`
   under `out/deep/` (or `--out <dir>`). No app, no scripts, no prototype, no PRD. If asked to "show" something,
   show it as a table or a mock screen in Markdown.
2. **Register discipline.** Tags: **P** primary document opened, quoted verbatim · **S** secondary, or a
   primary seen only as a tool summary, snippet or blocked page · **A** assumption (a client fact nobody
   published) · **J** judgment (a design choice) · **I** inferred (say from what) · **computed** (show the
   formula and the input keys). Every number in prose carries a key like `[DF-A-10]`; the number must appear
   in the quote stored under that key when the tag is P or S; an A, J, I or computed row carries the number in
   its claim column and its quote column holds the reason, the formula or the inferred-from. A quote may be a
   fragment of up to 25 words when the fetch truncated the page; write "fragment" in the note. Never cite a
   document that was not opened. "Not found" is a row, with the search terms. Keys match
   `[A-Z]{1,3}-[A-Z]?-?\d+` and the tag is the last column of every register row, because `check.js` reads
   both. Prefixes: BR, PE, FM, RO, EV, UN for the strands, PL for rows the plan itself adds (A, J, I,
   computed), DF for the defensibility study, TQ for computed statistics. A `Counts` section at the end of `citations.md` gives the
   total per tag; recount it after every change.
3. **Decision log.** Columns, in this order: `| id | decision | alternatives | why | keys | what would change it | status |`.
   One row per decision; status is `decided by <name>, <date>`, `decided (auto), <date>` or
   `recommended, awaiting <name>`. A revised decision gets a
   new row that names the old one (`D22 (bars revised by D24)`); never overwrite the old row.
4. **Invent every name** for the client, its people, its products and any competitor stand-in; `check.js`
   fails on a placeholder (Acme, Contoso, Globex, Initech, Example Corp) and on the real companies the audit
   lists. Regulators, courts, standards bodies, laws and vendors may be named in prose as what they are
   (sources, rules, products on the market), never as the client.
   When the real organisation is the audience rather than the client (a hiring panel, a regulator reading the
   plan), write `Allowed real names: <name>, <name>` on one line in `run-notes.md`; `check.js` then exempts
   exactly those names and prints that it did. No em-dashes anywhere except inside a verbatim
   quote. Tables of at most 12 rows; split with a second table when longer.
5. **Rule gates versus model metrics.** A rule gate is a code path checked exactly on labelled questions and
   probes, and it passes or fails (0 violations, 100% resolve). A model metric is a rate per group, read only
   when the group has at least 40 questions in production; in a prototype the readout shows counts, never
   rates. Never present a rate on fewer than 40 as a pass.
6. **Human in the loop is measured, never assumed.** Where a person reviews, the design names the person's
   metrics (override rate, catch rate, queue age) and the weekly feedback path that grows the golden set.
   Rule gates do not relax because a person is watching; model bars may differ per channel.
7. **"Print" means say it.** In a live session the line goes to the screen; when an agent runs a command, it
   writes the same line under `## Printed lines` in `run-notes.md`.
8. **Audience in every table.** The named audience (a panel, a sponsor, a regulator) decides the "one line for
   the room" column and the Q&A exposure list; write for the hardest reader in it.

## Commands

### `/valued-deep start <case>` (also `/valued-deep <case>`)

`<case>` is a one-line case, a path under `inputs/` (brief, rubric, job description, sample data), or empty
when `out/select/select.json` exists (take the preferred option, its audience and its assumptions, and reuse
every key from `out/select/citations.md`). Flags: `--audience "<who reads it and what they grade>"`,
`--out <dir>` (files go directly there), `--strands <n>` (default 6; fewer keeps them in the order a, c, e, b,
d, f, and the plan sections a dropped strand would feed are written from the case alone, every fact marked
(assumed), with the gap listed in `run-notes.md`), `--auto` (every card is still written out in
`run-notes.md` under `## Cards` with its options; the recommended one is taken and logged
`decided (auto), <date>`; for tests and dry runs only, never for a real case).

1. **Intake.** Read everything under `inputs/` that the user names. Write `run-notes.md` with these headings:
   `## Case` (case, audience, the brief's rubric rows and sample data as evidence of what will be graded),
   `## Standing rules` (with the line `Nothing built. Build starts on "go build".`), `## Searches with no
   result` (term, date, where), `## Cards` (under `--auto`), `## Gaps` (dropped strands, blocked fetches),
   `## Hashes` (holdout), `## Passes` (revalidation), `## Printed lines`. Print `Deep · <case> · audience: …`.
2. **Research strands in parallel** (general-purpose agents with WebSearch and WebFetch, **one message**, each
   writing `strands/<PREFIX>.md` under the out directory and returning only its register block of 8 to 15
   rows; give each the sourcing standard, its prefix, the key regex and the tag-last-column rule from rule 2,
   and the 25-word fragment rule). Default strands: (a) the brief and rubric, quoted;
   (b) personas and journeys with the failure each one feels; (c) documented failure modes of this kind of
   system, each with a primary source; (d) ROI inputs that a government, regulator or filing publishes,
   with the inputs only the client holds listed as "no published benchmark"; (e) evaluation literature for
   this kind of system (benchmarks, model cards, abstention, citation faithfulness, retrieval, judge
   agreement); (f) the unit of work and the vendor landscape (what each vendor documents, and what no
   documentation provides). Each strand returns rows `| key | claim | quote | URL | date | tag |` with its own
   prefix (BR, PE, FM, RO, EV, UN). Merge into `citations.md`. Print `Register: <n> rows · P <p> · S <s>`.
3. **Plan.** Write `plan.md` with these sections, every number keyed: 1 the ask and the audience; 2 the use
   case in the brief's words; 3 personas; 4 failure modes and the design answer to each; 5 the unit model;
   6 architecture (the governed layer, the read contract, what is deterministic and what is a model);
   7 evals (see `review` below; a first draft here); 8 ROI in layers, never summed unless every input is
   sourced; 9 roadmap; 10 build, buy or partner with trade-offs; 11 demo plan; 12 assumptions, each marked;
   13 FAQ for the hardest reader; 14 register summary. Every recommendation uses the standard format
   (options with trade-offs, preferred, why, what would change our mind).
4. **Cards.** Ask only what the user owns, in rounds of at most 4 (AskUserQuestion, preference first,
   "(Recommended)"): scope (which stretch items are in), the riskiest-miss bar, the audience's weighting,
   any fact only they know. Log each answer in `decision-log.md` as `decided by <name>, <date>`. Everything
   not asked stays `recommended, awaiting <name>`.
5. **Governance check** at the end of `plan.md` (question, answer, status) and the Q&A exposure table
   (question the audience will ask, our answer, key, verified or "verify before citing").
6. Print the closing line: `Plan: out/deep/plan.md · decisions <d> (<k> decided) · register <n> rows ·
   nothing built`.

### `/valued-deep review`

The eval design, hardened. Runs on `plan.md` section 7 and rewrites it.

1. **Golden set.** Development questions (20 to 30) written to cover every failure mode in section 4 and every
   group (role, product line, channel, language), each tagged with its group, its expected behaviour (answer,
   abstain, refuse out of scope) and the rule or metric it exercises; plus non-question tests (drift, dedup,
   gap log, redaction) as `T` rows. Launch `holdout-sealer` in its own context to write 10 more; record the
   SHA-256 of the holdout file in `run-notes.md` before any run and say "separated, not independent" if one
   author wrote both. List the denominators per group (how many answerable, abstain, scope rows each group
   has) so nobody divides by the wrong number later.
2. **Metric definitions** in one table: name, numerator, denominator, who labels it, rule or model, read at
   what n.
3. **Gates in two tables.** Rule gates (identical in every channel): the check, how it is enforced in code,
   what is machine-checked on every request, the incident path when it fires. Model metrics per channel: the
   bar, the pilot bar, the path from one to the other, the group split, the human sample that validates it.
   Mark every bar `J` with its anchor key from `defend` when one exists.
4. **Judge protocol.** Two human reviewers, a minimum labelled sample per group, prevalence-adjusted agreement
   (give the statistic and the threshold), the judge triages only until it is validated, revalidation triggers.
   Put the exact binomial bounds for the sample size in the register as a `computed` row.
5. **Human in the loop.** Per channel: who sees the answer first, what they can override, the human metrics,
   the weekly promotion of real queries into the golden set until each group reaches 40, which personas get
   answer evals and which get workflow metrics.
6. **Regression rule.** What reruns on every change to the model, the prompt, the rubric or the unit model,
   and what blocks a release.
7. **Two independent reviews, then a verification pass.** Launch `eval-reviewer` twice in one message with
   section 7 and the register only, no chat history: one on the default model, one with `model: opus` (or
   the strongest model available that differs from the one that wrote the section). Merge findings by row,
   apply the ones that hold, list the ones rejected with the reason, then launch `eval-reviewer` once more on
   the rewritten section as a verification pass. Record all three outputs under `out/deep/reviews/`. Log the
   rewrite as a decision row.
8. Print: `Evals: <r> rule gates · <m> model metrics · golden <g> + holdout <h> (hash recorded) · review
   findings <f> applied, <x> rejected`.

### `/valued-deep defend`

The gate-defensibility study: for every bar in section 7, what the industry publishes.

1. Split the bars into strands of 3 to 6 (for example: leaks and redaction; abstention and refusal; citation
   and grounding; retrieval; dedup and drift; QA sampling, judges and monitoring; named practice at peers and
   regulators). Launch one `gate-defender` per strand **in one message** with the bars, the audience's
   industry and the sourcing standard. Each returns rows with a `kind` column: **AI product** (a named system
   in production or its vendor documentation), **AI research** (benchmark, model card, study), **analogue**
   (a non-AI field, used only where no AI number exists), **not found**. Prefix `DF-<strand>-<nn>`.
2. **Verdict table** (one row per bar, max 12 per table): bar, our threshold, best anchor (key, kind, tag), the
   anchor's number, verdict: `at anchor` / `above anchor` / `below anchor` / `no anchor`, and the
   recommended action with its trade-off. A bar above every anchor is not wrong, but it must show the path
   (pilot bar, production bar, what moves it) or be restated as a rule.
3. **Named-organisation table**: who publishes what, with key and kind; and the honest line for the room
   when nobody does, worded as a recorded search: "As of <date> we found no <peer type> that publishes <the
   number>", with the search terms in `run-notes.md`.
4. Put the recommended revisions to the user as cards (at most 4 per round), each with its trade-off; log
   the answers as decision rows; rewrite the bars in section 7; append the DF rows to `citations.md` and
   recount.
5. Print: `Defend: <b> bars · at anchor <a> · above <v> · below <w> · no anchor <z> · DF rows <n> (P <p>, S <s>)`.

### `/valued-deep consolidate`

One document to revalidate against. Launch `strategy-writer` with `plan.md`, `decision-log.md` and
`citations.md`; it writes `out/deep/strategy.md`: section 0 how to use (tags, kinds, the review prompt, the
writing rules), then every decision, the use case, personas, failure modes, unit model, architecture, evals in
full, ROI, roadmap, build or buy, build plan, demo, assumptions, residual risks and contradictions, source
quality, open items. Every row carries a stable ID `S<section>.<row>`. Then run
`node .claude/skills/valued-deep/check.js out/deep` and fix until it prints `0 unresolved keys · 0 em-dashes ·
0 placeholder names`. Print the section count, the row count and the check line.

### `/valued-deep revalidate [--section N] [--model <name>] [--focus "<what to look for>"]`

One independent pass over `strategy.md`. Launch `strategy-reviewer` (default `model: opus`; a different
model each time the user asks for "another model") with the document, the register and the log, no chat
history. It returns a findings table: ID, finding, severity (blocks, weakens, cosmetic), fix. Write it to
`out/deep/revalidation/pass-<n>.md` with the model name and the date. Then, for each finding: apply it in
`plan.md`, `decision-log.md`, `citations.md` and `strategy.md` together, or reject it with a one-line reason;
record both under the pass file. Rerun `check.js`. A pass with zero `blocks` findings is recorded as `clean`
in `run-notes.md`; the user decides how many clean passes they want before `go build`. Print:
`Pass <n> (<model>): <b> block · <w> weaken · <c> cosmetic · applied <a> · rejected <r>`.

### `/valued-deep go build`

The only command that writes code. Confirm the latest pass is `clean` and the decision log has no
`recommended, awaiting` row the user wanted closed; list any that remain and ask once. Then hand the case to
the build path: write `out/deep/handoff.json` (case, audience, personas, unit model, rule gates, model
metrics, golden and holdout file names and hashes, never list, decisions) and run `/valued` from gate L
onwards with that file as its seed, or follow section 12 of the strategy when the user wants the prototype
built directly. Log `D<n>: build approved, decided by <name>, <date>`.

## Output: `out/deep/handoff.json`

`{ "case", "audience", "decisions": [ { "id", "decision", "by", "date" } ], "personas": [], "unitModel": {},
"ruleGates": [ { "check", "enforcement", "incident" } ], "modelMetrics": [ { "metric", "channel", "bar",
"pilotBar", "group", "anchorKey" } ], "golden": { "file", "sha256", "groups": {} }, "holdout": { "file",
"sha256", "author" }, "neverList": [], "humanLoop": [ { "channel", "reviewer", "metrics": [] } ],
"citations": { "P", "S", "A", "J", "I", "computed", "notFound" }, "revalidation": [ { "pass", "model", "date", "blocks" } ] }`

## Principles this skill adds

- **Defend the bar, not the number.** A threshold earns its place with an anchor (where someone published
  one), a path (pilot bar to production bar) or a restatement as a rule. "Nobody publishes this" is said as a
  recorded search, never as a guess.
- **Two readers, two models.** The context that wrote the evals never reviews them alone. One review on a
  different model catches the errors the first model is blind to.
- **Stable IDs make revalidation cheap.** A reviewer points at `S8.14`; a fix touches four files together;
  the next pass checks the same ID again.
- **Counts before rates.** A prototype shows 6 of 6; production shows 95% at n of 73 or more. Mixing the two
  is the most common way an eval misleads a room.
- **The person is part of the system.** Measure the reviewer; grow the golden set from what they catch; keep
  the compliance rules fixed whoever is watching.
- **Write it down the day it is decided.** The log and the register are updated in the same sitting as the
  change, or the next revalidation pass will find the contradiction.
