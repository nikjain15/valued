---
name: valued-user-loop
description: VALUED gate U. Design where a person decides for every action, recommend the autonomy level with trade-offs, and set the never list, disclosure and logging. Called by /valued; not for direct use.
---

# U: User-in-the-loop agent

**Job:** decide where a person decides, and what AI never does.
**Prevents:** AI doing more than anyone agreed.

| | |
|---|---|
| **Asks the client** | How much autonomy in the first 90 days? Who owns an escalation? (Their risk appetite, and their organization.) |
| **Uses** | The autonomy ladder (suggest, draft, act with approval, act), a never list, and escalation that wins every race. |
| **Gives** | An autonomy table with a recommendation and trade-offs, the never list, stop triggers and owners, and a disclosure and logging spec. |
| **Governance asks** | Which decisions must an accountable person make? What do we disclose to the customer? Is every action logged with who approved it? |

> **Mode.** In the default run the conductor (`valued/SKILL.md`) asks this gate's cards in its rounds: skip
> the "Ask the client" step, read the answered cards for gate U in `out/cards.json`, and never ask a card
> yourself. Under `--teach`, ask them as written and append each card, with its answer, to `out/cards.json`
> in the card schema. Either way, end by writing `out/gates/u.json` (below) and running
> `node .claude/skills/valued/conductor.js render` (skip the render when the conductor launched you in a parallel
> phase; it renders once both gates are back). Never hand-edit the rendered files: wherever a step below says to
> write a gate file, `case.json`, `state.md` or a PRD section, put that content in the gate JSON instead.

## Steps

1. **Draft the autonomy table** for the first wave (max 8 rows): action, proposed autonomy level, who
   approves, what the AI shows as its reason and source, and what happens on failure (fail closed: route
   to a person).
2. **Autonomy recommendation** in the standard format: suggest only, draft with approval, act on
   low-risk actions; each with its trade-off (time saved, error exposure, review load, approval
   fatigue). Our preference, why, what would change our mind.
3. **Never list** (max 5 lines): what the AI must never do, including every decision gate A reserved for
   a person.
4. **Escalation triggers** (max 6 rows): trigger, example phrasing, who it goes to, response time. If any
   trigger fires, nothing else is drafted.
5. **Clocks** (an output): the response deadline for each outcome, in hours, naming the regulatory
   clock where one applies (complaint acknowledgement, CMS 72-hour urgent prior authorization, state
   claim acknowledgement). Write to `case.json` as `clocks`: `{ "escalate": { "hours", "label" },
   "human": { "hours", "label" }, "answer": { "hours", "label" } }`. The prototype counts each item down
   from arrival and shows "Close to their clock" on its home screen.
6. **Ask the client (max 2 cards):**
   - **"<risk owner role>": "How much autonomy in the first 90 days?"** Options from step 2, our preference first
     "(Recommended)", each with its trade-off.
   - **"<operations owner role>": "Who owns an escalation?"** Options from their likely structure (supervisor path, a
     specialist team, the risk desk), each with its trade-off; our preference is the existing path.
7. **Governance check** in `out/4-user-loop.md` (question, answer, status):
   - Accountable decisions: each regulated decision, its accountable role, and confirmation that the AI
     only prepares it.
   - Disclosure: a drafted customer-facing line, if any, saying AI assisted, and where it appears.
     Recommend; compliance confirms.
   - Logging: what is recorded for every action (input, sources, output, the approver, time, version),
     and how long it is kept.
   Put the rows in `governance`; render adds open ones to the Governance log.
8. **Write** `out/gates/<k>.json` (see Output) and run `node .claude/skills/valued/conductor.js render`; it writes the gate file, state.md, the PRD sections and case.json.
9. **Say it** (three lines): the system drafts and a person decides; the one thing it never does; why
   every action is logged with who approved it.

## Output: `out/gates/u.json`

Keys (render and `conductor.js check` read them; keep strings to one line): `autonomyTable` (`{ action, level, approver, shows, onFailure }`), `autonomyRec` (a recommendation; preferred = card R1-4), `autonomy` (the chosen level, one line), `neverList` (3 to 5 lines), `triggers` (`{ family, trigger, definition, example, goesTo, responseTime, phrasings, cues, weakCues }`; `definition` is one line "Is: ... Is not: ..." that the guard model reads, one per family in `a.json` `triggerFamilies`; `phrasings`: 5 to 8 example sentences (the obvious one, two implied with no keyword, one per other language in `v.json` `languages`, one indirect or adversarial); `cues`: an object keyed by language (`{ "en": [...], "es": [...] }`), 15 to 30 single words or stems per language that signal the family in any wording (synonyms, everyday and formal register, e.g. legal: lawyer, solicitor, attorney, claim, sue, court, regulator, ombudsman, abogado, demanda), and `weakCues` (same shape) that only count in pairs. This is the router's lexicon, written before any router exists), `clocks` (`{ escalate|human|answer: { hours, label } }`), `escalationOwner` (card R1-5), `escalationSla`, `disclosure`, `approverRole`, `draftOpener`, `logging`; plus `governance` (rows `{ question, answer, status, owner }`), `sayIt` (3 lines), `assumptions` (strings). Recommendations use `{ options: [{ label, tradeoff }], preferred, why, changeMind }`. Then run `node .claude/skills/valued/conductor.js render`.
