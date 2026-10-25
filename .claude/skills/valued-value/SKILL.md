---
name: valued-value
description: VALUED gate V. Price the pain before talking about AI. Called by /valued; not for direct use.
---

# V: Value

Goal: find the decisions or tasks that happen most often and cost the most. Not ideas, not models.

1. Draft a **value frame** table for the case (max 10 rows): work item or decision, who does it,
   volume per month (assumed), cost or time per item (assumed), what a wrong or slow outcome costs,
   current metric. Sort by total cost.
2. Below it, list **12 candidate use cases** the business would plausibly propose (one line each,
   numbered U1 to U12), deliberately mixed: some that are rules or self-service, some classic ML, some
   GenAI, one or two agentic. Write them to `out/1-value.md` under "Candidates": gate A scores them.
3. Ask the client (one call, max 2 cards):
   - **Header "Sponsor": "Which outcome does this have to move first?"** Options built from the
     table's metrics (for example cost per contact, handle time, resolution, customer satisfaction).
     Recommend the one tied to the most costly rows.
   - Optionally **"Constraint"**: the hard limit you most need (for example "nothing customer-facing
     this year", "must use existing platform", "data cannot leave the bank"). Recommend the one that
     de-risks the first wave.
4. Finalize `out/1-value.md`: the frame, the chosen north-star metric with its assumed baseline, the
   constraint, the candidates. Update `out/state.md`.
5. **Say it**: why you priced the problem before ranking ideas; the one metric; what you would
   replace with real data in week one.
