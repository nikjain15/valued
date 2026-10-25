---
name: valued-user-loop
description: VALUED gate U. Design where the human sits for every action before the AI is built. Called by /valued; not for direct use.
---

# U: User-in-the-loop

Goal: the human stays accountable; the AI drafts and prepares.

1. Draft the **autonomy table** for the first wave (max 8 rows): action, autonomy level (suggest /
   draft / act with approval / act), who approves, what the AI shows as its reason and source, fail
   behaviour (fail closed: route to a human).
2. **Never list**, max 5 lines: what the AI must never do (for example speak to the customer on a
   high-stakes path, decide a dispute, send without approval, answer without a source).
3. **Escalation triggers**, max 6 rows: trigger, example phrasing, who it goes to, response time.
   Escalation wins every race: if any trigger fires, nothing else is drafted.
4. Ask the client (max 2 cards):
   - **Header "Risk": "How much autonomy in the first 90 days?"** Options from suggest-only to act with
     approval on low-risk actions. Recommend draft-with-approval.
   - Optionally **"Ops lead": "Who owns an escalation?"** Recommend the existing supervisor path.
5. Finalize `out/4-user-loop.md`, update `out/state.md`.
6. **Say it**: the system drafts, a person decides; the one thing it never does; why escalation beats
   everything.
