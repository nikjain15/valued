---
name: valued-ai-fit
description: VALUED gate A. Decide which candidates are AI-shaped, rank them, pick the first wave, and set the stack and its cost, latency and quality trade. Called by /valued; not for direct use.
---

# A: AI-fit

Goal: the least AI that works, on the use case that pays back and leaves reusable assets behind.

1. **Score in parallel.** Launch three `use-case-scorer` subagents **in a single message** so they run
   at once, each given the candidates and value frame from `out/1-value.md` plus the client
   decisions in `out/state.md`, and one lens each:
   - lens `value-reuse`: value against the chosen metric; reuse (does it leave a knowledge base, golden
     set, eval harness or data contract that later use cases inherit).
   - lens `feasibility-data`: data available and allowed, integration effort, time to a pilot.
   - lens `risk`: cost and reversibility of a wrong answer, customer exposure, regulatory exposure.
   Print one line while they run: `Scoring 12 use cases on 3 lenses in parallel`.
2. **Merge** into one ranked table (max 12 rows): use case, ladder rung (rules / classic ML /
   retrieval + model / agent), value, feasibility, risk (lower is better), reuse, overall, one-line
   reason. Mark which candidates **should not be GenAI** and say what they should be instead.
3. Propose a **first wave of 1 or 2** and a **second wave**. Default stance: start where the human
   stays accountable and nothing reaches the customer unreviewed, and where the assets built are
   needed by the customer-facing wave anyway.
4. **Stack and cost**, max 6 rows: each component of the first wave with build / buy / partner, the
   routing (deterministic first, small model by default, larger model on low confidence), the latency
   budget per surface, and the unit of cost (per resolved task, not per token).
5. Ask the client (max 2 cards):
   - **Header "COO": "Which first wave?"** Options: your recommended wave first, then the two
     strongest alternatives, each with its trade-off in the description.
   - **Header "CTO": "Build, buy or partner for <the component that matters most>?"** Recommend by
     where the client's own content is the moat.
6. Finalize `out/2-ai-fit.md`, update `out/state.md`.
7. **Say it**: why most of the list is not GenAI; why this first wave; the cost, latency and quality
   trade in one sentence.
