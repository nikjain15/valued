---
name: valued-select
description: Pick one AI use case from several, on verified facts. Reads the options and the audience, verifies every supplied figure against primary sources in parallel, stress-tests each option's causal chain, sizes each lever on sourced inputs only, runs five fixed lenses under client-set weights, scores audience fit, lists what would embarrass you in Q&A, and recommends one option with trade-offs, a decision log and a citations register. Use when the user types /valued-select with a list or file of options, before /valued, or whenever several use cases compete.
---

# /valued-select: pick one use case on facts

**Job:** turn "we have N options" into one defensible pick, with every number traceable to a primary source
and every judgment labelled as judgment.
**Prevents:** choosing the biggest headline number with the weakest chain from product to number; a
framework's weighting quietly picking the winner; an unverified figure reaching a decision-maker.

| | |
|---|---|
| **Asks the client** | Which matters most (dollars, feasibility, strategic leverage, audience fit)? Which risk would you rather carry: the bigger number with the weaker chain, or the smaller number with the sourced chain? (Their priorities and risk appetite.) |
| **Uses** | A fact register verified in parallel by `fact-checker` agents; stress tests on each option's causal chain; sourced sizing with unit economics; five fixed lenses under several weightings; audience-fit signals read from the brief or rubric; a decision log and a citations register. |
| **Gives** | `out/select/select.md` (the memo), `out/select/citations.md`, `out/select/decision-log.md`, `out/select/select.json` (ranked options gate A can seed from), `out/select/cards.json`. |
| **Governance asks** | Does any option sit inside an active regulatory dispute or litigation? Which option's wrong output reaches a customer or regulator? Which facts are inferred rather than sourced, and who must confirm them? |

## Arguments and modes

`/valued-select <options>` where `<options>` is a path (PDF, Markdown or text under `inputs/` or `out/`) or an
inline list. Flags:
- `--audience "<who evaluates and what they grade>"`: a panel, a sponsor, an investment committee, a rubric. Without it, audience fit is scored from the options document alone and marked (assumed).
- `--quick`: no web verification; lenses run on stated facts, every input marked (assumed). Default is **deep**: every key figure is web-verified against primary sources.
- `--top N`: verify only the N finalists after a quick first pass (default: verify all options with a stated dollar lever).
- `--strengths "<what the chooser is good at>"`: used by the audience-fit lens; omit to skip that signal.
- `--auto`: take the recommended option on both cards, logged "(auto)"; for regression runs and dry runs.
- `--out <dir>`: write outputs there instead of `out/select/` (for example `examples/<slug>-select/` to keep a
  de-identified selection with the repository; `out/` is git-ignored). Never write real client material there.

Budget: deep, 60 to 90 minutes with web access; quick, 10 minutes. Print one header line per step; write
notes to `out/select/run-notes.md`, not to the screen.

## Sourcing standard (binding)

Reputable means: the organisation's own documents (filings, releases, call transcripts, careers postings); a
regulator or government body (CMS, eCFR, Federal Register, GAO, OIG, MedPAC, BLS, FDA, NIST, SEC); a standards
body or accreditor (NCQA, ISO, FINRA, URAC); a peer-reviewed journal; an established research institute (KFF,
Health Affairs, Commonwealth Fund, MedPAC); or a vendor's technical documentation for claims about that vendor's
product. Trade press may locate a primary document or stand in when the primary is unreachable, tagged **S**.
Vendor marketing, consultant blogs, Wikipedia and aggregators are not sources; they may appear only as
"upper bound, vendor claim" and never support a number in the memo.

Tags: **P** primary read · **S** secondary · **A** assumption · **J** judgment · **I** inferred (say from what).
Every fact in the memo carries a key like `[H-01]` that resolves in `citations.md` to title, publisher, date,
URL, the quoted sentence or cell, access date and tag. Derived numbers show the formula and input keys.
"Not found" is a result: record what was searched. Never cite a document that was not opened.

## Steps

1. **Intake (print `Select · N options · audience: …`).** Read the options document. Build the options
   register (max 12 rows): id, name, business area, what the AI does, deliverables or rubric rows the
   option carries, sample data supplied, the dollar lever the option implies, the "why now" claimed.
   Record the audience and the chooser's strengths if given. Write `out/select/run-notes.md`.
2. **Fact register.** List every quantitative or factual claim the user supplied, plus the facts each option
   needs to be sized (the lever's dollar pool, the why-now date, incumbents, regulatory state). One row per
   claim: id, claim, why it matters to which option, the source the user gave if any. Max 40 rows; prioritise
   the ones a decision turns on.
3. **Verify in parallel (deep mode).** Launch `fact-checker` agents **in a single message**, 6 to 10 claims
   each, with the sourcing standard above and the primary-source list for this industry. Each returns, per
   claim: verdict (exact, right number wrong label or base, wrong, stale, unsourced, not found), what the
   source actually says (quoted), URL, date, tag. Merge into `out/select/citations.md`. Print
   `Verified X of Y claims · wrong N · relabel M · not found K`. In `--quick` mode skip this step and mark
   every claim (assumed). **Prior register:** if a citations register from an earlier run exists (any
   `citations.md` under `out/` or a path the user names), reuse its keys and tags instead of re-verifying;
   say which run they came from in `run-notes.md`. Facts a checker read only as a tool summary rather than
   page text are tagged S, never P.
4. **Stress-test each option's chain** (one table, max 12 rows): for each option, the claimed lever, the
   thing that must be true for the product to move it, whether that is true in the sources (with keys),
   the trend direction (is the lever growing or shrinking), the incumbent already doing it, and a chain
   strength 1 to 5 (J). The standard tests: Is this the biggest lever or merely the biggest quoted number?
   Did the thing that broke match the thing this product fixes? Does the premise survive the data trend?
   Who already does this inside the organisation? Is the why-now dated and sourced?
5. **Sourced sizing** (one table per option, max 8 rows): the dollar pool (P), each unit of value as
   "$ per unit" from sourced inputs only (derived, with keys), a priced range only where every input is
   sourced, a bounded tail where a risk is real but a probability is not estimable, and a **no published
   benchmark** list naming the inputs only the organisation holds (these become discovery questions).
   Never sum units into a total unless every input is sourced; label any total "illustrative".
6. **Ask the client (2 cards, AskUserQuestion, our preference first "(Recommended)").**
   - **"<sponsor or chooser role>": "Which matters most?"** Options: dollars at stake; speed and feasibility;
     strategic leverage (what it enables); audience fit (what the evaluator rewards). The answer sets the
     client weighting in step 7. Record in `out/select/cards.json` using the card schema in `valued/SKILL.md`
     with `gate: "S"`.
   - **"<same role>": "Which risk would you rather carry?"** Options: the bigger number with the weaker
     chain; the smaller number with the sourced chain; a platform bet whose value lands in other products'
     results. Each with its trade-off.
7. **Five lenses, fixed.** Read `templates.json` for the weightings. Scores 1 to 5 are J and say so.
   - **A, 2×2**: attractiveness (risk-adjusted lever plus strategic) × feasibility (build time plus defensibility).
   - **B, weighted scorecard** under four weightings: the client's (from the card), direct impact, platform, pure platform. Report the winner under each; **no single weighting picks**.
   - **C, expected value** = attributable $ × P(success) ÷ effort, shown twice: on attributable $ and on gross $. If the ranking flips between the two, say so; that flip is the finding.
   - **D, platform leverage**: enables other options or captures value itself; a true data dependency or an architectural sibling.
   - **E, audience fit**: rubric rows the option carries, signals of care in the brief (supplied test cases, named grounding hierarchy, named deliverables), panel composition, the chooser's strengths. Mark (assumed) where the audience was not given.
   Print one cross-lens line: which option wins which lens.
8. **Q&A exposure** per option (max 6 bullets each): the questions that would embarrass the chooser, each
   tagged verified or "verify before citing", with the one-line answer where one exists.
9. **Recommendation** in the standard format: 2 to 3 options with trade-offs, preferred "(Recommended)", why
   (one sentence tied to the client's weighting or constraint), what would change our mind, and, if the top
   two are close, say so and name the single tie-breaker fact.
9b. **Validate the pick (deep mode).** Three tables, facts only, for the recommended option: (i) regulator
    or standards evidence that the problem is real (rule text quoted, enforcement findings, test-call or
    audit results); (ii) how regulated peers and vendors already address it (vendor technical documentation,
    industry standards), with what each provides; (iii) what no retrieved documentation provides, stated as
    an absence in the documents read, never as a vendor statement. End with "proven" and "not proven" lines;
    the "not proven" items become discovery questions.
10. **Decision log** `out/select/decision-log.md`: one row per decision (the pick, why not each other option,
    any framing choice): decision, alternatives, why, evidence keys with tags, what would change it, one
    line to say in the room. Mark who decided and the date; mark recommendations awaiting the client.
11. **Governance check** (question, answer, status) at the end of `select.md`: active disputes or
    litigation touching any option; which option's wrong output reaches a customer or regulator; the inferred
    or secondary facts and who must confirm them. Open rows go to the Governance log when `/valued` runs next.
12. **Write** `out/select/select.md`, `citations.md`, `decision-log.md`, `select.json`, `cards.json`. Then
    print the citations count: facts P / S / A-J-I, and the closing line: `Pick: <option>. Chain strength
    <n>/5. <k> facts verified, <m> relabelled, <w> wrong. Decision log: out/select/decision-log.md`.
13. **Say it** (three lines, to the client): why verification ran before any lens; which lens each option
    won and why no single weighting decided; what the pick costs and what would change our mind.

## Output: `out/select/select.json`

`{ "audience": "...", "options": [ { "id", "name", "lever": { "pool", "poolKey", "units": [ { "unit", "value", "formula", "keys" } ], "pricedRange", "tail", "noBenchmark": [] }, "chainStrength", "scores": { "attractiveness", "feasibility", "financial", "member", "strategic", "audience" }, "lensWins": [], "qaExposure": [], "rubricRows" } ], "weightings": { "client": {}, "direct": {}, "platform": {}, "purePlatform": {} }, "recommendation": { "options": [ { "label", "tradeoff" } ], "preferred", "why", "changeMind", "tieBreaker" }, "citations": { "P", "S", "AJI" }, "governance": [ { "question", "answer", "status", "owner" } ], "assumptions": [] }`.
Gate A (`valued-ai-fit`) seeds its candidates and scores from this file when it exists.

## Memo format: `out/select/select.md`

Sections, in order, tables of at most 12 rows: 0 The answer (pick, one-line reason per option, tie-breaker) ·
1 Verification (claim, verdict, what the source says, key) · 2 Stress tests · 3 Sourced sizing · 4 Lenses
(A to E, cross-lens line) · 5 Q&A exposure · 6 Recommendation · 7 Governance check · Sources (primary first).
Status key in section 1: ✅ exact to primary · ⚠️ right number, wrong label or base · ❌ wrong or unsourced ·
⏳ not found. No em-dashes. Every number in prose carries its key.

## Principles this skill adds

- **Verify, don't trust.** The chooser's own numbers are claims until a primary source says otherwise. The
  common failures: a total attributed to one cause (a 240 bps move with three stated drivers); a
  provider-side cost quoted as the plan's; a stale year; an analyst estimate presented as the company's.
- **Gross versus attributable.** The biggest quoted number rarely survives attribution. Show both and say
  which one each lens used.
- **Chain strength beats pool size.** A smaller pool with a sourced chain from product to dollar beats a
  larger pool the product cannot reach.
- **Read the brief as evidence.** Rubric rows, supplied test cases and named hierarchies show where the
  evaluator invested; that is a signal about what will be graded.
- **Not found is a result.** Record what was searched; an input with no published benchmark becomes a
  discovery question, never a placeholder in a deliverable.
