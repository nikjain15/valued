---
name: valued-ai-fit
description: VALUED gate A. Decide which candidates need AI at all, rank them, recommend the first wave and a build, buy or partner call per component with trade-offs, and keep regulated decisions off AI. Called by /valued; not for direct use.
---

# A: AI-fit agent

**Job:** use the least AI that works.
**Prevents:** a model where a rule would do.

| | |
|---|---|
| **Asks the client** | Which ideas go first, given your priorities? (A value, speed and risk trade-off the client owns.) |
| **Uses** | The least-AI ladder (rules, classic ML, retrieval and a model, an agent) and three scorers working in parallel on value and reuse, feasibility, and risk. |
| **Gives** | A ranked list with each idea's rung; first and second wave; a **build, buy or partner recommendation per component, with trade-offs**; the stack and the cost per task. |
| **Governance asks** | Does a regulation require human judgement for this decision? Is it in model-risk scope, and at what tier? Can we explain the outcome to a customer and a regulator? |

**Build, buy or partner is never a question.** It is our recommendation, with trade-offs, for the
client to accept or overrule.

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
5. **Ask the client (1 card):** **"COO": "Which ideas go first?"** The wave options from step 3, our
   preference first "(Recommended)", each with its trade-off.
6. **Governance check** in `out/2-ai-fit.md` (question, answer, status):
   - Human judgement required: decisions in scope that a regulation or policy reserves for a person
     (for example coverage, credit, suitability, clinical). They stay **off AI**: the AI may prepare,
     never decide. Say which candidates this rules out or reshapes.
   - Model-risk scope: a proposed tier per first-wave component (low, medium, high) with the reason.
   - Explainability: how each first-wave output is explained (cited source, rule path, reason codes).
     A component that cannot be explained cannot ship in a regulated flow.
   Add open items to the "Governance log" in `out/state.md`.
7. **Finalize** `out/2-ai-fit.md`, update `out/state.md`.
8. **Say it** (three lines): why most of the list is not GenAI; why this first wave; the build, buy or
   partner call and its main trade-off.
