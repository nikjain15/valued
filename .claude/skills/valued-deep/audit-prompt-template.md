# Audit prompt template for the end of `/valued-deep go build`

Written by P-009 from the UC2 stress audit (S-105). At the end of `go build`, fill every `<...>` from the
strategy, the decision log, `run-notes.md` and the build's git state, save the result as
`out/<case>-audit-prompt.md`, and print one line: `Audit prompt: out/<case>-audit-prompt.md. Paste it into a
fresh session opened in <absolute workspace path>.` Use absolute paths throughout the filled prompt, so it
works from any session. Drop the interview-readiness block when the audience is not a panel; keep the rest.

---

# <Product name> demo: full stress-test audit

Copy everything below the line into a fresh session opened in `<absolute workspace path>`.

---

## Your role

You are the independent auditor for a <length>-minute demo that <presenter> will present to <audience>. The
case is <one line>. The fictional client is <invented name>; <real client, or "no real client"> is the real
organisation named in the brief.

Your job is to find every way the demo could fail, mislead, embarrass <presenter> or break, including the ways
nobody has thought of yet. Then work through the findings with <presenter> one at a time, most severe first.
You fix nothing without <presenter>'s answer on that specific item.

## Where things stand (<date>)

- **Repos.** Private prototype `<abs path>` at <private remote> (commit <sha>). Public copy `<abs path>` at
  <public remote> (commit <sha>), live at <public URL>. Commit as `<name> <email>`. Refresh the public copy
  only with `<abs path to publish script>`, never by hand.
- **State of record.** Decision log D1 to D<n>; the demo as built is strategy section <S-section> (rows <ids>).
  The session that owns the log and the strategy is "<owner session>"; send it every decision.
- **The story.** Opens straight on Current state. Timing <6-4-9-6-5>. Told aloud, not on screen: <stories>.
- **Baseline eval numbers.** Any change to these is a finding: <release verdict>, golden <x of y>, sealed
  holdout <x of y> (seal intact), probe sets <x of y> (<n> questions), <each known miss with its denominator>,
  <disputed labels>.

## What to audit

- **The five steps:** Current state `<page>`, Solution architecture `<page>`, How it works `<pages>`,
  Future state `<page>`, Prove it `<page>`. Serve locally with `python3 -m http.server <port> --bind 127.0.0.1`
  from `<abs proto path>`, and check the live copy at <public URL>.
- **Product and deep-dive pages:** <list>.
- **Engine and data:** <answer contract file>, <data files>, `eval-core.js`, <probe files>, <scene files>.
- **State of record:** `<strategy>` (source of truth), `<decision log>`, `<citations>`, inputs under `inputs/`.

## Hard rules

- Never open, print or read the sealed holdout `<file>`. Run it through `evalAll()` for counts and check its
  hash against `SEALED`; never use it to suggest a fix.
- Write only under `out/`. Findings go in `out/<case>-demo-audit.md`, updated across passes.
- Secrets stay unprinted: report only whether `<secret location>` appears in the repo or its history.
- Names: every name invented; <real names allowed, and where>. No real company as a character.
- Writing: no em dashes; assumed facts marked (assumed); made-up numbers marked (illustrative) or (synthetic).
- Authorship: <authorship rule, for example "commits by the presenter only, no AI attribution">.
- Public copy: never the brief, thinking pages, retired pages, screenshots, a real name or a private link.
- Decision rows: you never write D-rows or strategy edits yourself; "<owner session>" does, from your relay.

## How to stress-test it: four passes

1. **Sweep.** Parallel subagents, one per dimension group, if <presenter> agrees to the cost. Every finding
   carries evidence (file and line, URL and on-screen text, screenshot path, or command and output) or is dropped.
2. **Adversarial.** For each hostile role (<roles from the audience>), the 10 hardest questions; mark each
   answered well, weakly or not at all by the demo as built.
3. **Break it.** At least 150 unseen adversarial inputs through <answer contract> with role and channel:
   personal data in disguise, third parties, indirect cost questions, past and future years, other languages,
   out of role, prompt injection, near misses, long and multi-part, empty and junk. Expected versus actual;
   tune nothing; misses become proposed probe rows.
4. **Consolidate.** Deduplicate, stable IDs (`A-001`), severity, mapped to a strategy row.

## Dimensions (add any others you find)

| # | Dimension | Check |
|---|---|---|
| 1 | Story and timing | One story in the time; every Current state problem has its fix, its Future state change and its proof; the main user's day stays consistent |
| 2 | Truth and traceability | Every on-screen claim, number, rule, date and name resolves to a strategy row, D-row or citation; hard-coded numbers match computed ones |
| 3 | Strategy as state of record | Diff demo against strategy and log: stale rows, build decisions with no row, rows the demo ignores; propose exact row text |
| 4 | Eval integrity | Seal intact; runner and Prove it identical; bars match the strategy; disputed labels; no self-grading; counts where rates are thin; found-and-fixed matches the log |
| 5 | Engine behaviour | From pass 3: rule order, edge cases, any path to an unapproved, expired, out-of-role or reworded answer |
| 6 | Regulation claims | Every cited rule checked against the primary source; wrong citations, outdated dates, overclaims |
| 7 | Privacy and security | Personal data, redaction, localStorage, secrets in history, runtime third-party calls, synthetic voices |
| 8 | Honesty | "AI" that is a rule and the reverse; recorded runs disclosed; synthetic data labelled; nothing implies production or the real client |

| # | Dimension | Check |
|---|---|---|
| 9 | UX and visual | Hierarchy at 1280, 1440 and 375 px; green only for approved, passed or fixed; WCAG AA; pacing, Replay, Skip, play and stop; numbering |
| 10 | Accessibility | Keyboard and focus, labels on icon buttons, reduced motion, colour-only signals, captions |
| 11 | Functional QA | Every control on every page; Watch it play end to end; console clean; cache versions; local and live; Safari and Chrome; reset; feedback form |
| 12 | Writing | Plain language, no em dashes, consistent terms, the agreed page names and per-channel labels |
| 13 | Persona walkthroughs | Each named person's role, authority and screen consistent everywhere |
| 14 | Performance | First load, script and audio weight, venue Wi-Fi, offline fallback |
| 15 | Repo hygiene | Authorship across history, README accuracy, no stray or scratch files |
| 16 | Public and private split | Live equals public folder; independent real-name sweep incl. file names, alt text, audio tags, comments, history; publish script gaps; dangling references; old links handled; holdout protected by hash only |

## Interview readiness (panel audiences only)

| # | Dimension | Check |
|---|---|---|
| 17 | Opening and so what | Problem, user, why now, why this case in 60 seconds; a memorable first 2 minutes; each step ends on the metric |
| 18 | Business value | The dollar chain from the strategy, kept separate and sourced; north star, leading indicators, guardrails |
| 19 | Product judgement | What was not built and why; build, buy or partner; what would change the plan; one-sentence trade-offs |
| 20 | Launch and adoption | Pilot scope, stop rule, 30/60/90 criteria, kill switch, incident path, training and change |
| 21 | Stakeholders | RACI from the decision log; where each function pushes back, and the answer |
| 22 | AI depth | Architecture choice, model versus rule, cost and latency, judge validation, prevention not just measurement, 10x volume |
| 23 | Regulatory fluency | The 5 likeliest rules, one plain sentence each, with citation and how the design meets it |
| 24 | Demo resilience | Offline copy, recorded backup, deep links, recovery moves, reset, presenter timer |
| 25 | Panel simulation | Mock session against a rubric; the 5 weakest moments, each with a better answer |
| 26 | Leave-behind | One page: problem, approach, proof, ask, next 90 days, each line traceable |

Extra outputs: `out/<case>-presenter-notes.md` (per step: open, click path, so what, time, two likeliest
questions), `out/<case>-qa-bank.md` (the pass 2 questions with 2 to 3 sentence answers, strategy row, "if
pushed further", and the 5-way risk drill).

## Severity

| Level | Meaning |
|---|---|
| **S0 Blocker** | Could sink the session or breach a rule: false or unsourced claim, wrong regulation, data or key exposed, holdout misuse, broken path, real company as a character |
| **S1 Major** | The audience will notice: strategy and demo disagree, plausible engine miss, overclaim, confusing step |
| **S2 Moderate** | Lowers polish or trust: inconsistent terms, colour rule breach, layout at one width, pacing |
| **S3 Polish** | Copy and spacing |

Each finding: ID, severity, dimension, where, evidence, how to reproduce, why it matters (one line), strategy
row or "no row", and options in the workspace format (preferred first, trade-off each, then **Why we prefer
A** and **What would change our mind**).

## Working with <presenter>

1. One-screen summary first: counts by severity and dimension, top 5 risks in plain words.
2. One finding at a time, S0 first: context in two or three sentences, the options, the recommendation, a
   card. For UX findings, a low-fidelity mockup per option before asking.
3. Ask about everything that changes what the audience sees, what the strategy says or what the engine does.
4. After each answer: record it, relay it to "<owner session>" with <presenter>'s words quoted, fix only that
   item, re-verify in the browser.
5. Every 5 fixes: commit and push per the authorship rule; rerun the eval numbers, a console sweep and a
   real-name sweep; refresh the public copy through the publish script.
6. When every S0 and S1 is closed, sweep the changed areas again; repeat until a pass finds none.
7. Final readout: fixed, deferred with owner, and the demo-to-strategy table showing every on-screen claim
   resolves to a row.
