# Demo standard for `/valued-deep go build`

The level a deep-path demo must reach before it is shown. Learned on UC2 (signals S-097 to S-103,
proposals P-006 and P-007). The reference implementation is in `demo-kit/`; start from it.

## The story: five steps, in this order

One story bar on every demo page, no other navigation. The site opens straight on step 1.

| Step | What it shows | Rules |
|---|---|---|
| **Current state** | The main user's day across every channel the case touches, one tab per channel, plus a Key takeaway tab | Real artefacts on screen (the document, the screen, the message), the approved wording beside what the channel actually said (green: approved words missing; red: words not approved), and how the channel gets its answer today as a step flow, labelled "our assumption". Per channel: "The problem / What it does to <user> / What it leads to". Every problem traces to the strategy or a cited source; the evidence lines stay in the strategy, not on screen |
| **Solution architecture** | The design in four steps from the strategy, with the feedback loops | One headline and one line per step; tap a step for its key takeaway ("What it does / Why it matters / How we know"); parts, owners and techniques one tap below. No Detail switch |
| **How it works** | One page per architecture step, each with numbered sub-steps that are the lead person's tasks, not channels | Each sub-step plays as a scene: a person adds something or an event happens; the AI reads it (a scan over the real document) and proposes, results appearing one at a time; a named person decides (button pressed, stamp); then the result and what it means for the main user. Replay, Skip to result, and Watch it play through every sub-step and on to the next page |
| **Future state** | The same day, same tabs, same layout as Current state | The same step flow as today, in the same colours, showing how the channel gets its answer now; the step that removes today's break is marked "fixed here". Per channel: "What changes / What it means for <user> / What it means for the plan". The knowledge graph sits below, one tap away |
| **Prove it** | The evals, played as scenes and computed live | See "Prove it" below |

Default timing for 30 minutes: 6, 4, 9, 6, 5. Personal stories are told aloud, never put in the prototype.
The old product pages (one workspace per person) stay reachable for questions, linked from the end of
Prove it, never from the story bar.

## Prove it

1. **One scorer.** The evals runner and Prove it import the same `eval-core.js`; neither keeps its own copy
   of the scoring. When you extract or change it, record the runner's full output before and after and
   confirm it is identical.
2. **Tabs, in order:** Golden set (by group, never one average); Independent probes (each set against its
   bar); Sealed holdout (check the seal, run once, counts only, questions never shown); Release gate (every
   rule row, any red row blocks, the owner signs); What fails, and the fix; Observe and feedback; Key
   takeaway.
3. **What fails, and the fix.** Show the live misses from this run, any disputed labels, and where a rate
   is above its goal though inside its bar. Then the found-and-fixed list, taken from the decision log
   (what failed, why, the fix), never invented. A demo that shows only passes is not believed.
4. **Observe and feedback.** One week of questions by outcome, the weekly checks against the same bars
   (computed, with any synthetic source labelled on the row), and feedback with an owner for each type
   (wrong becomes a test row; missing goes to the gap queue; unclear goes back to the author), plus a
   working feedback form.
5. **Every rate names its denominator** ("4 of 120 general questions, 3.3%"). Counts, not rates, where the
   sample is small.
6. **Honest limits.** Name what a prototype cannot prove (for example, a model judge checked against human
   reviewers), as such.

## Visual and interaction rules

- **Green means approved, passed or fixed.** Navigation, progress and selection use neutral ink. Amber for a
  break or a warning, red for wrong.
- **Numbers on steps and sub-steps**, so the presenter can say "step 3"; none in headlines.
- **Demo pages carry only the logo and the story bar.** Play and stop are icon buttons with labels for
  screen readers.
- **Pacing:** reveal one item at a time, slow enough to read aloud (about 0.5 seconds per row, 1 to 2
  seconds per beat).
- **Voices**, if any, are stock synthetic voices, never a clone of a real person.
- **Plain language**, the case's own page names, no "proposed vs built" labels: it is presented as the
  author's approach.

## Before showing it

- Play every step end to end with Watch it play; zero console errors.
- The runner and Prove it show the same numbers.
- The live (hosted) copy opens on step 1 and matches the local one.
- Every decision taken during the build is in the decision log, and the strategy describes the demo as
  built.
- A public copy, if any, was built by `demo-kit/publish.sh` and its gate printed `Clean`.
- `out/<case>-audit-prompt.md` exists, filled from `audit-prompt-template.md`, with the current baseline.
