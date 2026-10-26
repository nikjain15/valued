# /valued --teach: the narrated pace (one gate at a time, cards at every gate)

This is the slow, narrated way to run VALUED, for teaching. `/valued <case> --teach` follows this file; the default `/valued` follows `SKILL.md` (the conductor). Every gate still writes `out/gates/<k>.json` and `out/cards.json` and runs `node .claude/skills/valued/conductor.js render` after its cards, exactly as in the default mode; only the pace differs.
The argument is a one-line case, for example `/valued regional bank, 2M customers, contact centre
cost pressure, 30 GenAI ideas, COO wants a plan in six weeks`. If the argument ends with `--auto`,
run without asking: take the recommended option at every card and log it as "(auto)". If it contains
`--no-open`, skip every `open` command (here and in `valued-build`) and print the paths instead.

**No case given, or only a rough one.** In a live session the client describes the case out loud and the
product lead may type nothing, or a few words. If the argument is empty or missing the client, the
business problem, or the success measure and deadline, open with one short framing message ("Before we
start, three questions to frame the engagement") and up to three cards, each with 3 to 4 typical options
and room for the client's own words:
- **"Client context": "Which organization and business area are we working with?"** (industry, size,
  the unit that owns the problem)
- **"Business problem": "Which process or decision is underperforming today, and how does it show up?"**
  (cost, cycle time, error rate, risk or customer impact)
- **"Success and timeline": "What outcome would the sponsor call success, and by when?"** (the metric
  that must move, the deadline, the decision this work feeds)
Each ends with its own-words format: client context "industry, size, and the unit that owns it
(e.g. 'P&C insurer, 40k claims a month, claims operations')"; business problem "the process, how it
shows up, and a rough number (e.g. 'FNOL setup, 20 fields re-keyed, 18 minutes a claim')"; success and
timeline "a metric, a target and a date (e.g. 'setup under 10 minutes, pilot in 8 weeks')".
Whenever `inputs/` is empty or missing, ask this card even if the case line is complete: **"Material": "What real material can we work
from?"** Options: "Documents in inputs/ (policies, knowledge articles)", "Sample requests or transcripts,
de-identified", "Both", "Synthetic only for now (Recommended when nothing is ready)". If none fits,
answer with: the material, its rough size and who owns it (e.g. "300 policy PDFs, owned by HR
operations"). If files are already in `inputs/`, list them in one table (file, type, size, likely use)
instead of asking, and print `Grounded in: <n> client files`.
Build the case line from the answers, print it as `Engagement: <case line>`, and go. Never ask more than
this before gate V; gate V's draft marks everything else (assumed).

## Roles on screen

- **The product lead** drives. **The person watching is the client** (COO, sponsor, risk lead: name the
  role on each card's header). Card headers in the gate skills say "COO" as an example: always use the
  sponsor and owner roles of this case (a CMO, a CIO, a head of claims). Cards go to the client; the product lead reads them out and enters the
  client's choice.
- The first option on every card is our preference, labelled "(Recommended)", with its trade-off. Every
  other option carries its trade-off too. That is how the lead's judgement stays visible while the client
  makes an informed call.

## Run

1. **Set up (under 30 seconds).** Create `out/`, `out/proto/` and, if missing, `inputs/`. Write `out/state.md` with four
   sections: the case line, "Client decisions", "Assumptions", and "Governance log". Then start the
   live outputs, so the client watches the PRD and the prototype take shape gate by gate:
   ```bash
   B=.claude/skills/valued-build
   cp $B/app/app.html $B/app/server.js $B/app/ff.css $B/prd-viewer.html out/proto/
   echo '{}' > out/proto/case.json
   node $B/prd-skeleton.js "<the case line>" out/prd.md
   P=${PORT:-4317}; lsof -ti :$P | xargs kill 2>/dev/null; PORT=$P node out/proto/server.js   # run in the background
   ```
   Use that port everywhere below (written as 4317). Then `open http://localhost:4317/prd` (skip under
   `--no-open`). Print one line:
   `VALUED · 6 gates · governed at every gate · the system drafts, the client decides · live PRD: localhost:4317/prd`.
2. **Run the gates in order**, each by invoking its skill and waiting for it to finish:
   `valued-value`, `valued-ai-fit`, `valued-labels`, `valued-user-loop`, `valued-evals`,
   `valued-deploy`. Before each, print a single header line:
   `[V] Value · target 6 min` (A 8, L 6, U 5, E 9, D 6).
   After D, run the build step the same way: `[B] Build: PRD and prototype · target 3 min`, invoking
   `valued-build`. It completes the PRD, writes the prototype's FAQ, and renders `out/prd.html`.
3. **Between gates**, print nothing but the gate header. No recaps.
4. **After B**, build the brief: copy `brief-template.html` from this skill's folder to
   `out/brief.html` and replace every `{{...}}` placeholder from `out/state.md` and the gate files.
   Keep each cell to one line. Then run `open out/brief.html` (skip under `--no-open`).
   The template follows the **Relay design system**; do not restyle it. Keep the tokens and classes as
   they are, sentence case everywhere, no new colours. Status pills always carry the word (`Passed`,
   `Blocked`). The agent sentence states the figures. The three stats are the figures the page is about.
   Each client decision says which role chose what, with our recommendation in the caption. The
   governance section lists each gate's open items from the "Governance log" with the role to close
   them; if none are open, say so.
5. Print the closing line, nothing else: `Brief: out/brief.html · PRD: out/prd.html · Prototype: http://localhost:4317 · Feedback: /valued-revise <what to change>`.

## Rules for every gate (pass these on)

- **Single-context mode.** If subagents cannot run, do the scorer and builder work inline: score each lens
  separately before merging; write the router before opening `golden.json`; never open `holdout.json`
  while building; label the holdout result "not independent" wherever it appears.

- **Draft first, then ask.** A gate shows its draft table **before** its cards, so the client is choosing
  between concrete things, never answering a blank question.
- **Every card says how to answer in your own words.** The question text ends with one line,
  `If none fits, answer with: <format>`, naming the shape that lets the agent use the answer at once,
  with a short example. For instance: a metric, a target and a date ("claim setup under 10 minutes by
  Q2"); a ranked pair ("speed first, accuracy second"); a role and a team ("claims team lead, Midwest
  hub"); a threshold ("no lower than 0.97"). A free answer that misses the shape is restated in that
  shape and confirmed in one line before the gate continues.
- **Ask only what the client owns:** a priority, a risk appetite, or a fact only they know. **At most 2
  cards per gate, 2 to 4 options each**, answerable in 10 seconds. Never ask the client to choose
  something the agent can reason about (sourcing, architecture, tooling, which metric is better on
  paper): give it as a recommendation with trade-offs instead.
- **Every recommendation** uses the format in `CLAUDE.md`: options with trade-offs, our preference, why
  we prefer it, what would change our mind.
- **Every gate ends with its governance check** (question, answer, status) and adds open items to the
  "Governance log".
- After the cards, finalize the gate file `out/<n>-<gate>.md`, append the choices to "Client decisions"
  in `out/state.md`, then **update the live outputs** (next rule), and print a **"Say it"** block: three
  lines the product lead can say out loud, in first person, plain, no em-dashes.
- **Live outputs: every answer lands in the PRD and the prototype before the next gate starts.** In
  `out/prd.md`, replace the `> Pending: fills at gate <X>.` line under each section the gate owns with
  that section's content, following `.claude/skills/valued-build/prd-template.md` for its tables. In
  `out/proto/case.json`, merge the gate's fields (keep the others), and append one entry per client
  decision to `decisions`: `{ "gate", "decision", "by", "effect" }`, where `effect` says in a few words
  what the decision changed in the prototype or the PRD. Also append every row of the gate's governance check
  to `governance`: `{ "gate", "question", "answer", "status", "owner" }` (owner is the role that closes
  it; empty when answered). The prototype's Governance tab shows them. The viewer and the app refresh on their own.

  | Gate | PRD sections it fills | Prototype fields it writes |
  |---|---|---|
  | V | 2, 3, 4, the title (replace "(use case, from gate V)" with the use case name), and `Client:` in the meta line | `title`, `client`, `useCase`, `headline`, `scenario`, `user`, `inputLabel`, `persona` (`{ "name", "role" }`: a synthetic name for the first-wave user, the person the prototype greets), `industry` (one key of `.claude/skills/valued-labels/connectors-library.json`, or the closest), `labels` (the industry's words for the oversight pages: `section`, `evals`, `gov`, `audit`, `agents`, `data`, `how`, `faq`; for example a wealth firm says "Supervision" and "Suitability checks") |
  | A | 5, 6 | `out/proto/build.json` engine; `promise`; `shape` (desk, review, rank or chat); `agents`; `sweeps`; `itemNoun` (the user's word for one item and many, e.g. `["claim", "claims"]`); for `rank`, `recordSuffix` (e.g. "household", "account", or "" for a person) and `dismissReasons` (4 reasons in the industry's words) |
  | L | 10 | `verdicts`, `samples` (6, from `golden.json` only, each with `expect`), `connectors` |
  | U | 8, 9 | `clocks`, `neverList`, `escalationOwner`, `escalationSla`, `autonomy`, `disclosure`, `approverRole`, `draftOpener` |
  | E | 11 | `gates.json`, `router.js`, `eval.js` (the Workbench and Evals tabs come alive) |
  | D | 13, 14 | none |
  | B | 1, 7, 12, 15, 16, 17, the appendix, and the recommendation at the top | `faq`, `version` |
- Never exceed 12 table rows. Mark assumed numbers (assumed). Synthetic data only.
- If a step is taking too long, cut scope and say so in one line. Never stall the room.
- **If the client changes an earlier answer mid-run**, apply it with the `valued-revise` skill before
  continuing, then resume at the current gate. After the run, any feedback goes through `/valued-revise`.
