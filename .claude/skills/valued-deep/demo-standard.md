# Demo standard for `/valued-deep go build`

The level a deep-path demo must reach before it is shown. The reference implementation is in `demo-kit/`;
start from it.

## The story: six steps, in this order

One story bar on every demo page, plus a PRD link at its right; no other navigation. The site opens on step 1.
Learned on UC2 (S-097 to S-103, then S-107 to S-116; P-006, P-007, P-010 to P-013).

| Step | What it shows | Rules |
|---|---|---|
| **Current state** | The main user's day across every channel the case touches, one tab per channel, plus a Key takeaway tab | Real artefacts on screen, the approved wording beside what was delivered; dated, composite and synthetic stories; takeaways MECE (no overlap, nothing missing), at most two lines each |
| **Solution architecture** | The design as jobs on a map, with sources, channels and feedback loops | Builds one layer per press of the right arrow (headline, sources, each job, channels, loops); clicking a job reveals only up to that job; each job has a "How it runs" step list, techniques (by kind, never vendor) and its checks |
| **How it works** | One page per job; its step list is the architecture's "How it runs" list, row for row. Job 4, the last job (Test), is **Prove it**, its own page `prove.html`, as tabs (see "Prove it" below) | A real example and a record card on every step; the AI's part beside the system's part; the window title says whose screen it is; a "Meet the people" strip; **advances on click** (Next, the right arrow or space), never on a timer |
| **Future state** | The same day, same tabs, same layout as Current state | The step that removes today's break is marked; model runs said aloud as "recorded ahead of time, replayed" |
| **Roadmap** | Phases from prototype to production, one card at a time | See "Roadmap and Trade-offs" below |
| **Trade-offs** | Ranked choices where we chose safety over speed | See "Roadmap and Trade-offs" below |

Default timing for 30 minutes: Current state 5, Solution architecture 4, How it works 8 (including Prove it 4),
Future state 2, Roadmap 4, Trade-offs 1, PRD 2. Personal stories are told aloud, never put in the prototype.

## Prove it

1. **One scorer.** The evals runner and Prove it import the same `eval-core.js`; neither keeps its own copy
   of the scoring. When you change it, bump its `?v=` on every page that loads it (`demo-check.js` fails
   otherwise) and confirm the runner's output before and after.
2. **Tabs, in order:** Release decision (the dashboard); Accuracy: golden set and held-out test; Red-team
   testing; Release gate and monitoring; Questions we never tested. Each tab has "What it means" (industry
   term, one plain line) and "How it checks" as four numbered step cards, and advances on click.
3. **The Release decision dashboard,** computed live, in numbered sections with a sticky section bar:
   Summary (six tiles, each with a one-line meaning: golden set, held-out test, must-refuse caught, wrongly
   refused, no approved answer, disputed labels); Responsible AI at a glance (governance, safety, sensitive
   data, fairness, responsible AI, each with what is tested and its live result); Accuracy by group; Red-team
   sets; Fairness; Release gates; What went wrong and what we improve (each with an owner); Monitoring after
   launch (observability tiles); What this demo cannot test yet (in plain words, never "not provable").
4. **Show what goes wrong.** Green only at target; **amber** where a rate is inside its bar but above its goal,
   for "not yet" counts and disputed labels, and for every found-and-fixed item from the decision log; red
   only for a fail. A dashboard that is all green is not believed.
5. **Fairness set.** Paired questions over approved answers: the same question asked in plain words,
   misspelt, in a hurry, casually and in another language must get the same approved unit or the correct
   hand-off. A different answer fails; a "not yet" is amber. Shown and tracked; whether it gates release is
   a client decision, logged.
6. **Questions we never tested.** Three or more questions from no test set, run live through the engine, then
   the three layers: limit the damage (built), find what we missed (signals after launch), close the loop
   (every miss becomes a test).
7. **Every rate names its own denominator** ("4 of 253, 1.6%; all 4 in personal records, 4 of 121, 3.3%").
   Never pair a count with another set's rate, and never merge two bars that count different questions.
   Counts, not rates, where the sample is small. The held-out set is "never tuned to", not "run once".
8. **Honest limits.** Name what a prototype cannot test and say it is tested in the pilot.

## Roadmap and Trade-offs

- **Roadmap:** a timeline of phases (Discovery first), one card at a time with the arrow keys. Each card:
  What we do, Success looks like, Delivers, Biggest risk and how we handle it, **Techniques we use**, **Tools,
  and build or buy** (tags: We build, We buy, Use today's; a build item carries one plain line on why),
  the jobs it builds and links to its PRD requirements. No owners or dates unless they are decided.
- **Who does what:** above the phases, behind a link, one answer followed end to end as a clickable journey
  (one dot per step, one detail card at a time): who does it (AI, Person, System), the tool, how it is built
  (one technical line) and exactly what we build or buy. A step that mixes both shows both tags.
- **One build list.** Keep `out/<case>-build-list.json` (`build`, `buy`, `today`). The Roadmap, the PRD's
  roadmap and build-or-buy sections and the strategy use it word for word; `demo-check.js --build` proves it.
- **Trade-offs:** ranked rows, each "We chose X instead of Y", the cost today, how we keep it small now, and
  how later builds fix it, as bullets. Taken from the decision log.
- **PRD mirrors the pages:** functional requirements grouped by roadmap phase, an edge-case table, the
  roadmap with a techniques-and-tools column, build or buy with a "How we build it, technically" table, the
  Prove it dashboard sections. Every change to a page is made to the PRD in the same commit.

## Talk track

Keep `out/<case>-final-story.md` (template: `talk-track-template.md`): per step On screen, Say, Click and
Q&A; a Never say list; a timing line. Rebuild the PDF with `demo-kit/talktrack.py` after every change, and run
`demo-check.js --talk` so its step names, "Prove it", "PRD", full tab names, the tab count (always stated) and
rates match the site.

## Visual and interaction rules

- **Green means approved, or passed at target.** Fixed-but-watched items are amber. Navigation, progress and selection use neutral ink. Amber for a
  break or a warning, red for wrong.
- **Numbers on steps and sub-steps**, so the presenter can say "step 3"; none in headlines.
- **Demo pages carry only the logo and the story bar.** Play and stop are icon buttons with labels for
  screen readers.
- **Pacing:** reveal one item at a time, slow enough to read aloud (about 0.5 seconds per row, 1 to 2
  seconds per beat).
- **Voices**, if any, are stock synthetic voices, never a clone of a real person.
- **Plain language**, the case's own page names, no "proposed vs built" labels: it is presented as the
  author's approach. One vocabulary on every page (for example "System", not "Fixed rule" on one page and
  "System" on another); industry terms always carry a one-line meaning.
- **Vendors by kind only** on screen (a knowledge tool, managed search); real names, if at all, said aloud as
  market examples, never as recommendations.

## Before showing it

- `node .claude/skills/valued-deep/demo-check.js <proto> --talk out/<case>-final-story.md --build
  out/<case>-build-list.json` prints `Clean`. Both flags are required; a missing file, Roadmap or PRD file fails.
- The final audit (three `demo-auditor` passes, see `audit-prompt-template.md`) has no High or Med finding open.

- Play every step end to end with Watch it play; zero console errors.
- The runner and Prove it show the same numbers.
- The live (hosted) copy opens on step 1 and matches the local one.
- Every decision taken during the build is in the decision log, and the strategy describes the demo as
  built.
- A public copy, if any, was built by `demo-kit/publish.sh` and its gate printed `Clean`.
- `out/<case>-audit-prompt.md` exists, filled from `audit-prompt-template.md`, with the current baseline.
