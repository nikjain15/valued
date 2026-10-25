---
name: valued-value
description: VALUED gate V. Price the problem before talking about AI, recommend a north-star metric with trade-offs, and check regulatory exposure. Called by /valued; not for direct use.
---

# V: Value agent

**Job:** price the problem before anyone talks about AI.
**Prevents:** AI nobody can prove paid back.

| | |
|---|---|
| **Asks the client** | Which outcome must move first? What is the hard constraint? (Their priorities and limits.) |
| **Uses** | A value frame: how often each piece of work happens, its cost per item, and the cost of getting it wrong, leading to one north-star metric. |
| **Gives** | Priced problems, twelve candidate use cases, a north-star recommendation with trade-offs. |
| **Governance asks** | Is any part of this a regulated activity? What is the exposure if it goes wrong? Who is the accountable owner? |

## Steps

1. **Draft the value frame** (max 10 rows): work item or decision, who does it, volume per month, cost or
   time per item, cost of a wrong or slow outcome, today's metric, and **regulated? (yes / no /
   unsure)**. Mark every number (assumed). Sort by total cost.
2. **List twelve candidate use cases** (U1 to U12), deliberately mixed: some rules or self-service, some
   classic ML, some GenAI, one or two agentic. Write them to `out/1-value.md` under "Candidates".
3. **North-star recommendation** in the standard format: 2 to 3 candidate metrics (for example cost per
   resolved request, handle time, first-contact resolution), each with its trade-off (what it rewards,
   what it can hide or be gamed by). Our preference, why, and what would change our mind.
4. **Ask the client (max 2 cards):**
   - **"Sponsor": "Which outcome must move first?"** The metrics from step 3, our preference first
     "(Recommended)", each option with its trade-off.
   - **"Sponsor": "What is the hard constraint?"** Options such as nothing customer-facing this year,
     must use the existing platform, data cannot leave the organization; each with what it rules out.
     Our preference is the one that de-risks the first wave.
5. **Governance check** in `out/1-value.md` (question, answer, status):
   - Regulated activity: the work items marked regulated, and the rule family that likely applies
     (assumed until compliance confirms).
   - Exposure: the worst plausible outcome per regulated item (fine, complaint, conduct finding, harm).
   - Accountable owner: the role we propose should own the outcome; status "client to confirm".
   Add open items to the "Governance log" in `out/state.md`.
6. **Finalize** `out/1-value.md`; append the client's choices to "Client decisions" in `out/state.md`.
7. **Say it** (three lines): why the problem was priced before any idea was ranked; the metric and why;
   which items are regulated and what that changes.
