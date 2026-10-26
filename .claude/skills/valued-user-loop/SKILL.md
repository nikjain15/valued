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
   - **"Risk": "How much autonomy in the first 90 days?"** Options from step 2, our preference first
     "(Recommended)", each with its trade-off.
   - **"Operations": "Who owns an escalation?"** Options from their likely structure (supervisor path, a
     specialist team, the risk desk), each with its trade-off; our preference is the existing path.
7. **Governance check** in `out/4-user-loop.md` (question, answer, status):
   - Accountable decisions: each regulated decision, its accountable role, and confirmation that the AI
     only prepares it.
   - Disclosure: a drafted customer-facing line, if any, saying AI assisted, and where it appears.
     Recommend; compliance confirms.
   - Logging: what is recorded for every action (input, sources, output, the approver, time, version),
     and how long it is kept.
   Add open items to the "Governance log" in `out/state.md`.
8. **Finalize** `out/4-user-loop.md`, update `out/state.md`.
9. **Say it** (three lines): the system drafts and a person decides; the one thing it never does; why
   every action is logged with who approved it.
