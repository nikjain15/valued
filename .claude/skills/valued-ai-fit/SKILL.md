---
name: valued-ai-fit
description: VALUED gate A. Decide which candidates need AI at all, rank them, recommend the first wave and a build, buy or partner call per component with trade-offs, and keep regulated decisions off AI. Called by /valued; not for direct use.
---

# A: AI-fit agent

**Job:** design the agents. AI takes each job a rule cannot do well; fixed rules guard escalation, evidence and the never list.
**Prevents:** a model where a rule would do.

| | |
|---|---|
| **Asks the client** | Which ideas go first, given your priorities? May the prototype call a hosted model? (A value, speed and risk trade-off, and a data and vendor fact, both the client's.) |
| **Uses** | The least-AI ladder (rules, classic ML, retrieval and a model, an agent) and three scorers working in parallel on value and reuse, feasibility, and risk. |
| **Gives** | A ranked list with each idea's rung; first and second wave; a **build, buy or partner recommendation per component, with trade-offs**; the stack and the cost per task. |
| **Governance asks** | Does a regulation require human judgement for this decision? Is it in model-risk scope, and at what tier? Can we explain the outcome to a customer and a regulator? |

**Build, buy or partner is never a question.** It is our recommendation, with trade-offs, for the
client to accept or overrule.

> **Mode.** In the default run the conductor (`valued/SKILL.md`) asks this gate's cards in its rounds: skip
> the "Ask the client" step, read the answered cards for gate A in `out/cards.json`, and never ask a card
> yourself. Under `--teach`, ask them as written and append each card, with its answer, to `out/cards.json`
> in the card schema. Either way, end by writing `out/gates/a.json` (below) and running
> `node .claude/skills/valued/conductor.js render` (skip the render when the conductor launched you in a parallel
> phase; it renders once both gates are back). Never hand-edit the rendered files: wherever a step below says to
> write a gate file, `case.json`, `state.md` or a PRD section, put that content in the gate JSON instead.

## Steps

1. **Score in parallel.** Launch three `use-case-scorer` subagents **in a single message**, each given
   the candidates and value frame from `out/1-value.md`, the client decisions in `out/state.md`, and one
   lens: `value-reuse`, `feasibility-data`, or `risk`. Print: `Scoring 12 use cases on 3 lenses in
   parallel`.
2. **Merge** into one ranked table (max 12 rows): use case, lowest rung that works, value, feasibility,
   risk (lower is better), reuse, overall, one-line reason. Mark the ideas that **should not be GenAI**
   and say what they should be instead.
3. **First-wave recommendation** in the standard format: 2 to 3 wave options, each with its trade-off
   (value, time to pilot, risk, what it leaves reusable). Default preference: where a person stays
   accountable and nothing reaches the customer unreviewed, and where the assets built are needed by the
   customer-facing wave anyway. Say what would change our mind.
4. **Sourcing and stack** (max 6 rows), one row per first-wave component:
   - **Build, buy or partner**, as a mini recommendation: the options with trade-offs (build: control
     and moat, but cost and time; buy: speed, but lock-in and less differentiation; partner: speed and
     shared risk, but dependency), **our preference, why** (build where the client's own content, rules
     or data are the moat; buy where it is a commodity; partner where speed matters and lock-in is low),
     and what would change our mind.
   - Routing: deterministic first, a small model by default, a larger one on low confidence.
   - Latency budget per surface, and the unit of cost (per resolved task, not per token).
   - End the table with one line, `Numbers to quote:` latency budget per surface and cost per resolved
     task (assumed where assumed). Gate E's "Say it while it builds" reads from this line.
5. **Ask the client (2 cards):**
   - **"<sponsor role>": "Which ideas go first?"** The wave options from step 3, our preference first
     "(Recommended)", each with its trade-off.
   - **"<IT and risk role>": "May the prototype call a hosted model?"** This sets the build engine; the client
     owns it because it is a data and vendor-approval fact. Options, our preference first, chosen from
     the ladder in step 2 (a model on rung 3 or above means "Yes, on synthetic data"):
     - "Yes, on synthetic data": rules decide, the model drafts from the cited source only. Better
       drafts; real data needs vendor approval later. Engine `rules+model`.
     - "Not yet": rules only, template drafts, model slot stubbed. Nothing leaves the client; drafts read
       stiff. Engine `rules`.
     - "Yes, and let it lead": the model proposes the verdict, rules guard escalation. Handles varied
       phrasing; harder to explain, and needs its own eval before release. Engine `model-first`.
     Set `engine` and `engineBy` in `a.json`; render records `Build engine: <engine> (chosen by IT and risk)`.
6. **Product shape** (an output, never a card): pick the screen the first-wave user actually works in,
   and say why in one line. It decides how the prototype looks:

   | Shape | Pick it when | The user's screen |
   |---|---|---|
   | `desk` | A person reviews a drafted reply to an incoming message | Message beside a cited draft; approve, edit, hand off |
   | `review` | A person confirms data pulled from a document | Document with highlighted evidence beside a field form; confirm and file |
   | `rank` | A person picks next steps for a record (client, account, case) | Record with ranked action cards; accept or dismiss with a reason |
   | `chat` | The end user asks and gets an answer directly | Conversation with cited answers; sensitive topics routed to people |

   When two shapes fit, the shape follows the decision, never the channel the work arrived on. Walk these
   four questions in order and stop at the first yes:

   | Order | Ask | Shape |
   |---|---|---|
   | 1 | Does the work decide the next steps on a record the firm tracks over time (a loan, an account, a household, a facility)? Documents arrive repeatedly and update a standing position | `rank` |
   | 2 | Must a person confirm facts taken from the material the case arrives with before deciding, and is the decision filed as confirmed fields on the item rather than sent back as a message? The material is any document or submitted form (receipts, certificates, invoices, claim and dispute forms, pay stubs, applications), whether attached or filled in | `review` |
   | 3 | Is the deliverable the reply itself, drafted from the message alone, with no fields a person confirms? | `desk` |
   | 4 | Does the answer reach the end user directly, with no person approving it? | `chat` |

   A case that arrives as a message or a request form is still `rank` or `review` when question 1 or 2
   says so. A customer conversation under draft-with-approval is `desk`, never `chat`. Write `shape` and
   `shapeWhy` to `a.json`, and say in `shapeWhy` which of the four questions picked it, by number, and
   the decision behind it, never the channel it arrived on.
   **Assistants** (an output): design the first wave as 3 to 6 named assistants, one job each, in the
   order they run. The first check is always a fixed-rules safety guard (escalation and the never list);
   every assistant that reads or writes free language is a model, except the safety guard and the matchers,
   which stay on fixed rules; matching, completeness and ranking stay on
   rules unless the rules demonstrably fail. Show them as a table (assistant, rules or AI, job, may,
   never, which release check measures it) and write them to `case.json` as `agents`:
   `{ "name", "kind": "rules" | "model", "job", "may": [], "never": [], "gate" }`, using the client's words
   ("Safety guard", "Extraction assistant"), never "agent 1". When the client allows a hosted model,
   recommend design C (AI with a rules guard) for the release.
   **Sweeps** (an output): 1 to 3 assistants that work unprompted on a schedule, the way a good
   colleague checks things overnight (for example: customers with three contacts on the same topic in 30
   days; claims nearing the state acknowledgement deadline; households turning 73 this year; policies
   that contradict a recent change). For each: the assistant, rules or AI, the schedule, what it checks,
   and the decision it hands to a person. Write them to `case.json` as `sweeps`:
   `{ "agent", "kind", "schedule", "checks", "findings": [] }`; the build step writes the findings.
7. **Governance check** in `out/2-ai-fit.md` (question, answer, status):
   - Human judgement required: decisions in scope that a regulation or policy reserves for a person
     (for example coverage, credit, suitability, clinical). They stay **off AI**: the AI may prepare,
     never decide. Say which candidates this rules out or reshapes.
   - Model-risk scope: a proposed tier per first-wave component (low, medium, high) with the reason.
   - Explainability: how each first-wave output is explained (cited source, rule path, reason codes).
     A component that cannot be explained cannot ship in a regulated flow.
   Put the rows in `governance`; render adds open ones to the Governance log.
8. **Write** `out/gates/<k>.json` (see Output) and run `node .claude/skills/valued/conductor.js render`; it writes the gate file, state.md, the PRD sections and case.json.
9. **Say it** (three lines): why most of the list is not GenAI; why this first wave; the build, buy or
   partner call and its main trade-off, and what the engine choice means for the prototype.

## Output: `out/gates/a.json`

Keys (render and `conductor.js check` read them; keep strings to one line): `scores` (rows `{ id, name, rung, value, feasibility, risk, reuse, overall, reason, wave: 1|2|null, notGenAI: true|false, instead }`; at least one `notGenAI`), `waves` (a recommendation), `sourcing` (`{ component, rung, choice, why, changeMind, routing, latency }`), `numbersToQuote`, `engine` (`rules` | `rules+model` | `model-first`, from card R1-3), `engineBy`, `engineWhy`, `shape` (`desk` | `review` | `rank` | `chat`), `shapeWhy`, `agents` (3 to 6 `{ name, kind, job, may, never, gate }`, the first a `rules` "Safety guard"), `triggerFamilies` (4 to 8 short keys for the kinds of escalation the guard catches, e.g. `fraud`, `complaint`, `distress`, `legal_threat`; gates L and U both use exactly these keys), `sweeps` (1 to 3 `{ agent, kind, schedule, checks, decision }`, start from `sweep-templates.json`), `itemNoun` (`["claim", "claims"]`), `promise`, `recordSuffix` and `dismissReasons` (4) for `rank`, `alternatives` (`{ alternative, whyNot, revisit }`), `latency`, `cost`, `flow` (optional one-line pipeline); plus `governance` (rows `{ question, answer, status, owner }`), `sayIt` (3 lines), `assumptions` (strings). Recommendations use `{ options: [{ label, tradeoff }], preferred, why, changeMind }`. Then run `node .claude/skills/valued/conductor.js render`.
