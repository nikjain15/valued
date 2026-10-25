---
name: valued
description: Run a client AI case end to end through the six VALUED gates (Value, AI-fit, Labels, User-in-the-loop, Evals, Deploy and drive), asking the client option-card questions at each gate and producing a one-page brief and an eval-gated prototype. Use when the user types /valued followed by a case.
---

# /valued: the orchestrator

The argument is a one-line case, for example `/valued regional bank, 2M customers, contact centre
cost pressure, 30 GenAI ideas, COO wants a plan in six weeks`. If the argument ends with `--auto`,
run without asking: pick the recommended option at every card and log it as "(auto)".

## Roles on screen

- **The product lead** drives. **The person watching is the client** (COO, sponsor, risk lead: name the role on
  each card's header). Cards go to the client; the product lead reads them out and enters the client's choice.
- The first option on every card is the product lead's recommendation, labelled "(Recommended)", with the reason in
  its description. That is how the lead's judgement stays visible while the client decides.

## Run

1. **Set up (under 30 seconds).** Create `out/`. Write `out/state.md` with: the case line, a
   "Client decisions" section, an "Assumptions" section. Print one line:
   `VALUED · 6 gates · the system drafts, the client decides`.
2. **Run the gates in order**, each by invoking its skill and waiting for it to finish:
   `valued-value`, `valued-ai-fit`, `valued-labels`, `valued-user-loop`, `valued-evals`,
   `valued-deploy`. Before each, print a single header line:
   `[V] Value · target 6 min` (A 8, L 6, U 5, E 9, D 6).
3. **Between gates**, print nothing but the gate header. No recaps.
4. **After D**, build the brief: copy `brief-template.html` from this skill's folder to
   `out/brief.html` and replace every `{{...}}` placeholder from `out/state.md` and the gate files.
   Keep each cell to one line. Then run `open out/brief.html`.
   The template follows the **Relay design system**; do not restyle it. Keep the tokens and classes as
   they are, sentence case everywhere (no uppercase labels), no new colours. Status pills always carry
   the word (`Passed`, `Blocked`). The agent sentence states the figures (for example "I scored 12 use
   cases, put 7 below GenAI, and the prototype passed 6 of 6 gates after one fix"). The three stats are
   the figures the page is about (use cases scored, first-wave pick, gates passed). Each client decision
   says which role chose what, with the recommendation in the caption.
5. Print the closing line, nothing else: `Brief: out/brief.html · Prototype: out/proto/ (node out/proto/eval.js)`.

## Rules for every gate (pass these on)

- Draft first, then ask. A gate shows its draft table **before** its cards, so the client is choosing
  between concrete things, never answering a blank question.
- **At most 2 cards per gate, 2 to 4 options each.** Questions the client can answer in 10 seconds.
  Facts only the client knows (budget, risk appetite, data access, channels) or trade-offs that are
  genuinely theirs (speed versus risk, build versus buy).
- After the cards, finalize the gate file `out/<n>-<gate>.md`, append the choices to "Client
  decisions" in `out/state.md`, and print a **"Say it"** block: three lines the product lead can say out loud,
  in first person, plain, no em-dashes.
- Never exceed 12 table rows. Mark assumed numbers (assumed). Synthetic data only.
- If a step is taking too long, cut scope and say so in one line. Never stall the room.
