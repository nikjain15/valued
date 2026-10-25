---
name: valued
description: Run a client AI case end to end through the six VALUED gates (Value, AI-fit, Labels, User-in-the-loop, Evals, Deploy and drive), governed at every gate. Each gate's agent drafts first, recommends with trade-offs, asks the client only what the client owns, answers its governance questions, and the run ends with a one-page brief and an eval-gated prototype. Use when the user types /valued followed by a case.
---

# /valued: the orchestrator

The argument is a one-line case, for example `/valued regional bank, 2M customers, contact centre
cost pressure, 30 GenAI ideas, COO wants a plan in six weeks`. If the argument ends with `--auto`,
run without asking: take the recommended option at every card and log it as "(auto)". If it contains
`--no-open`, skip every `open` command (here and in `valued-build`) and print the paths instead.

## Roles on screen

- **The product lead** drives. **The person watching is the client** (COO, sponsor, risk lead: name the
  role on each card's header). Cards go to the client; the product lead reads them out and enters the
  client's choice.
- The first option on every card is our preference, labelled "(Recommended)", with its trade-off. Every
  other option carries its trade-off too. That is how the lead's judgement stays visible while the client
  makes an informed call.

## Run

1. **Set up (under 30 seconds).** Create `out/`. Write `out/state.md` with four sections: the case
   line, "Client decisions", "Assumptions", and "Governance log". Print one line:
   `VALUED · 6 gates · governed at every gate · the system drafts, the client decides`.
2. **Run the gates in order**, each by invoking its skill and waiting for it to finish:
   `valued-value`, `valued-ai-fit`, `valued-labels`, `valued-user-loop`, `valued-evals`,
   `valued-deploy`. Before each, print a single header line:
   `[V] Value · target 6 min` (A 8, L 6, U 5, E 9, D 6).
   After D, run the build step the same way: `[B] Build: PRD and prototype · target 3 min`, invoking
   `valued-build`. It writes `out/prd.md`, `out/prd.html`, and starts the prototype app on
   `http://localhost:4317`.
3. **Between gates**, print nothing but the gate header. No recaps.
4. **After B**, build the brief: copy `brief-template.html` from this skill's folder to
   `out/brief.html` and replace every `{{...}}` placeholder from `out/state.md` and the gate files.
   Keep each cell to one line. Then run `open out/brief.html`.
   The template follows the **Relay design system**; do not restyle it. Keep the tokens and classes as
   they are, sentence case everywhere, no new colours. Status pills always carry the word (`Passed`,
   `Blocked`). The agent sentence states the figures. The three stats are the figures the page is about.
   Each client decision says which role chose what, with our recommendation in the caption. The
   governance section lists each gate's open items from the "Governance log" with the role to close
   them; if none are open, say so.
5. Print the closing line, nothing else: `Brief: out/brief.html · PRD: out/prd.html · Prototype: http://localhost:4317 · Evals: node out/proto/eval.js`.

## Rules for every gate (pass these on)

- **Draft first, then ask.** A gate shows its draft table **before** its cards, so the client is choosing
  between concrete things, never answering a blank question.
- **Ask only what the client owns:** a priority, a risk appetite, or a fact only they know. **At most 2
  cards per gate, 2 to 4 options each**, answerable in 10 seconds. Never ask the client to choose
  something the agent can reason about (sourcing, architecture, tooling, which metric is better on
  paper): give it as a recommendation with trade-offs instead.
- **Every recommendation** uses the format in `CLAUDE.md`: options with trade-offs, our preference, why
  we prefer it, what would change our mind.
- **Every gate ends with its governance check** (question, answer, status) and adds open items to the
  "Governance log".
- After the cards, finalize the gate file `out/<n>-<gate>.md`, append the choices to "Client decisions"
  in `out/state.md`, and print a **"Say it"** block: three lines the product lead can say out loud, in
  first person, plain, no em-dashes.
- Never exceed 12 table rows. Mark assumed numbers (assumed). Synthetic data only.
- If a step is taking too long, cut scope and say so in one line. Never stall the room.
