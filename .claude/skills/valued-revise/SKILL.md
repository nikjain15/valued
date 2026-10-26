---
name: valued-revise
description: Apply the client's feedback or a changed decision to a VALUED run, mid-session or after it. Finds the gate that owns the change, confirms it with the client, updates that gate and everything downstream of it (evals rerun when they are affected), versions the PRD with a document-history entry, and refreshes the prototype. Use when the user types /valued-revise followed by feedback, or when the client changes an earlier answer during /valued.
---

# /valued-revise: change a decision without starting over

The argument is the feedback in the client's words, for example `/valued-revise COO wants the pilot on
two teams, not one` or `/valued-revise Risk will accept 0.97 on escalation recall`. It may also be a
comment on a PRD section ("section 7 is missing a requirement for complaints by email").

## Rules

- **The client owns the change; we own its consequences.** Restate the change, show what it touches,
  and confirm before editing anything.
- **Change the owning gate, then only what depends on it.** Never rerun a gate the change cannot affect.
- **Nothing silently disappears.** The old decision stays in the record, marked revised, with the new one
  beside it.
- Same output rules as `/valued`: tables, at most 12 rows, no em-dashes, mark assumptions (assumed).

## Where a change lands, and what it ripples into

| Owning gate | Typical feedback | Also refresh |
|---|---|---|
| V Value | different north star, user, constraint, numbers | PRD 1 to 4; prototype `headline`, `promise`, `scenario`, `user`; A if the constraint rules out the first wave |
| A AI-fit | different first wave, sourcing, engine (hosted model or not) | PRD 5, 6; `build.json`; if the first wave changes, L to E must be redone (say so, and offer it as a fresh run) |
| L Labels | a group to add, a data source, a labelling approach | PRD 10; golden rows labelled first, then rerun E's eval (the builder may need a fix) |
| U User-in-the-loop | autonomy, owner, never list, escalation trigger, disclosure | PRD 8, 9; `case.json` fields; router triggers, then rerun E's eval |
| E Evals | a different bar, a new gate, ship or fix | PRD 11; `gates.json`; rerun the eval on dev and holdout |
| D Deploy | pilot scope, stop rule, timeline, signers | PRD 13, 14 |
| PRD only | wording, a missing requirement, a risk, a dependency | that PRD section; if it implies a decision, treat it as that gate's change |

## Steps

1. **Read** `out/state.md`, the owning gate file, and the PRD section the feedback names.
2. **Show the change** (one table): owning gate, what was decided, what is proposed now, who asked, and
   what it will touch (PRD sections, prototype parts, whether the eval reruns). If the feedback is vague,
   restate it as a concrete change in the format the gate's card used, and ask **one card**:
   **"<role>": "Apply this change?"** with "Apply (Recommended)" and its consequence, "Apply and also
   <the natural follow-on>" if there is one, and "Leave as is".
3. **Apply**, in order:
   - Update the owning gate file `out/<n>-<gate>.md`: change the decision, keep the old one in a
     "Revisions" table at the end (date, old, new, requested by).
   - In `out/state.md`, add a row to "Client decisions" with the new choice and `(revised)` after the
     role; leave the original row in place.
   - In `out/proto/case.json`, find the decision in `decisions`, set `"was"` to the old decision and
     `"revised": true`, and update `decision` and `effect`. Update any field the change touches
     (see the table) and any FAQ answer whose `from` names this gate.
   - Refresh each downstream item from the table above, and only those. If the eval reruns, show its
     output and say in one line whether the release status changed.
   - Update the PRD sections the change touches, keeping the rest of the document as it is. Then bump
     `Version` in the meta line (0.1 to 0.2, and so on) and add a row to `## Appendix: document history`:
     `| <version> | <date> | <what changed, one line> | <requested by> | <sections> |`.
4. **Republish** when the run was published: rerun the three publish commands from `valued-build` step 5
   to the same file paths, so the links stay the same.
5. **Print** a short summary: what changed, what moved (for example "Release still passes; recall 0.97
   bar now met with margin"), the new PRD version, and three "Say it" lines: what the client asked,
   what it changed, and what it did not change.
