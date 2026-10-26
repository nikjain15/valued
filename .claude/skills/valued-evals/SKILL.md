---
name: valued-evals
description: VALUED gate E. Propose release gates with reasons, put the riskiest-miss bar to the client with trade-offs, build a prototype in the background, run it per group with a sealed holdout, and produce evidence risk and audit can reproduce. Called by /valued; not for direct use.
---

# E: Evals agent

**Job:** let a number decide the release.
**Prevents:** an average hiding the group that breaks.

| | |
|---|---|
| **Asks the client** | What is the bar for the riskiest miss? Ship anyway, or fix first? (Risk appetite, and a release decision only they can make.) |
| **Uses** | Gates set before the build and checked per group; a builder agent that cannot see the answers; a sealed holdout for every fix. |
| **Gives** | Proposed gates with reasons, a prototype, a pass or a block, every remaining miss listed, and an evidence pack. |
| **Governance asks** | Do the tests cover fairness and safety, not just accuracy? Can risk, compliance and audit reproduce the evidence? Who signs the release? |

The agent **proposes** every gate and threshold with its reason. Only the bar for the riskiest miss and
the ship-or-fix decision go to the client, because they trade customer harm against cost.

## Steps

1. **Propose the gates** (max 8 rows): gate, metric, proposed threshold, why that bar. Always include:
   escalation recall (the riskiest miss), escalation precision, answers without a source (0), routing
   accuracy, the **recall gap across groups** (under 0.05), a **fairness gate** (no group below the
   bar), a **safety gate** (no answer on a never-list topic), and verdicts outside the allowed set (0).
   Note which metrics may ever use an LLM judge (only after it is validated against labels) and which
   never do (escalation).
2. **Ask the client (1 card):** **"Risk": "Bar for the riskiest miss?"** Options 0.99 / 0.97 / 0.95, each
   with its trade-off (a higher bar sends more cases to people and costs more; a lower one misses more).
   Our preference first, with why and what would change our mind.
3. Write all thresholds to `out/proto/gates.json`.
4. **Launch the `prototype-builder` subagent in the background** (**single-context mode**, when subagents are
   unavailable: write the router before opening `golden.json`, never open `holdout.json` while building,
   and label the holdout result "not independent" in the eval output, the evidence pack and the PRD from the
   start; otherwise always a separate subagent: the seal on
   the golden set and holdout only means something if the builder is not the agent that wrote them; if
   you ever build it in the same context, say "holdout not independent" in the evidence pack) with the use case, the verdicts,
   `out/proto/sources.json`, `out/proto/gates.json`, and the escalation triggers and never list from
   `out/4-user-loop.md`. Print: `Building the prototype in the background; the answer key is sealed
   until the router exists`.
5. **While it builds**, print the **"Say it while it builds"** block: route first, deterministic first;
   where a small and a larger model would sit; the latency budget per surface; cost per resolved task.
6. When the builder returns, run `node out/proto/eval.js` and show the output as is.
   - **If a gate fails:** print `Release blocked.` and the failing group. Ask **"COO": "Ship anyway, or
     fix first?"** with "Fix first (Recommended)" and its trade-off (time) and "Ship with a person
     reviewing every case in <group>" and its trade-off (cost and review load). Have the builder fix the
     router **without editing golden.json**, rerun, then run the sealed holdout yourself:
     `node out/proto/eval.js holdout.json`. Show both; if the holdout is lower, say so: that gap is how
     much the fix was fitted.
   - **If all gates pass:** say it is a smoke test on 30 rows, not a release; have the builder add four (one round only; after a fix and a holdout pass, do not add more)
     harder rows to the dev set and rerun.
7. **Evidence pack** in `out/5-evals.md`: gates and reasons, the client's bar, every run's output, the
   holdout result, the remaining misses, and **how to reproduce** (exact commands, file names, the
   version of `golden.json`).
8. **Governance check** (question, answer, status):
   - Fairness and safety: which gates cover them, and the per-group results.
   - Reproducibility: can someone outside the team rerun it from the evidence pack alone?
   - Release sign-off: the signer we propose (for example the product owner plus risk); status "client
     to confirm".
   Add open items to the "Governance log" in `out/state.md`.
9. **Say it** (three lines): bars before the build; metrics per group because an average hides a broken
   one; the holdout is the honest number.
