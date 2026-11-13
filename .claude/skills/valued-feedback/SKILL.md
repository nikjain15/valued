---
name: valued-feedback
description: Apply the client's feedback or a changed decision to a VALUED run, mid-session or after it. Finds the decision that owns the change, confirms it with the client, updates it at the source and everything downstream (evals rerun when affected), versions the PRD, and refreshes the approach page, PRD and prototype together. Use when the user types /valued-feedback (or the older /valued-revise) followed by feedback, or when the client changes an earlier answer during /valued.
---

# /valued-feedback: change a decision without starting over

The argument is the feedback in the client's words, for example `/valued-feedback COO wants the pilot on
two teams, not one` or `/valued-feedback Risk will accept 0.97 on escalation recall`. It may also be a
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
3. **Apply, at the source only**, in order. Never hand-edit a rendered file (`prd.md`, `case.json`, the gate
   pages, the approach or research page): every view renders from the gate JSON and `cards.json`, and editing
   the source is what keeps them aligned.
   - **The answer.** In `out/cards.json`, on the card that holds the decision, set `"was"` to the old decision,
     `"decision"` to the new one, `"revised": true` and `"by"` to who asked. If no card holds it, append one with
     `"round": 9` and the owning gate.
   - **The owning gate.** Change the decision in `out/gates/<k>.json`, keep the old one in its `revisions` array
     (`{ date, old, new, by }`), and update every key the change touches (see the table).
   - **The approach card.** Update the stage card in `out/gates/approach.json` that the change touches (the
     option, the reasons, the trade-off, what we heard) and set `current` to that stage, so the page the client
     is looking at shows the change. Same soft voice and length rules as the conductor.
   - **Downstream gates**, from the table above, and only those. If the eval reruns, show its result lines and
     say in one line whether the release status changed.
   - **The case line.** If the change touches anything in `out/case-line.txt` (volume, timeline, outcome, team),
     rewrite that line too, so the PRD header, state and gate files agree.
   - **The approach page.** Put the change on the current stage's card as one `recap` line ("Now: first result within
     six months"), and update the stage row that owns it (`pilot` on Launch, `prize` on Frame, and so on).
   - **The PRD version.** In `out/gates/b.json` (or the owning gate when B has not run), add a `history` row
     `{ version, date, change, by, sections }`; render bumps the version. Before B exists, put it in the owning gate's
     JSON, or in `v.json` if that is the only gate written; render reads history from every gate.
   - Then `out/tools/c render` and `out/tools/c verify <current phase>`. Fix anything the consistency check
     names (a number, a name or a decision that still differs between views) at the source, render again.
4. **Republish** when the run was published: rerun the three publish commands from `valued-build` step 5
   to the same file paths, so the links stay the same.
5. **Print** a short summary, to the client, in their language: what changed, what moved (for example "Release still passes; recall 0.97
   bar now met with margin"), the new PRD version, and three "Say it" lines: what the client asked,
   what it changed, and what it did not change.
