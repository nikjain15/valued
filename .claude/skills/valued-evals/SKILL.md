---
name: valued-evals
description: VALUED gate E. Set release thresholds, build a small prototype in the background, and run it against the golden set so a missed gate blocks the release. Called by /valued; not for direct use.
---

# E: Evals

Goal: evals decide the release, not opinions. Thresholds first, then the build.

1. Draft the **gates table** (max 7 rows): gate, metric, threshold, why that bar. Always include:
   escalation recall (high, for example 0.97), escalation precision, answers without a source (must
   be 0), routing accuracy, the **recall gap across the riskiest slice** (for example across
   languages, under 0.05), and verdicts outside the allowed set (0). Note which metrics may ever use
   an LLM judge (only after it is validated against human labels) and which never do (escalation).
2. Ask the client (1 card):
   - **Header "Risk": "Escalation recall bar for release?"** Options 0.99 / 0.97 / 0.95 with the cost of
     each in the description (higher bar, more over-escalation to humans). Recommend 0.97.
3. Write the chosen thresholds to `out/proto/gates.json`.
4. **Launch the `prototype-builder` subagent in the background** with: the use case, the verdicts,
   `out/proto/sources.json`, `out/proto/gates.json`, and the escalation triggers from
   `out/4-user-loop.md`. Print one line: `Building the prototype in the background; golden set is
   sealed until the router exists`.
5. **While it builds**, print the **"Say it while it builds"** block: route first, deterministic first;
   where a small model and a larger model would sit; the latency budget per surface; cost per resolved
   task. Five lines.
6. When the builder returns, run `node out/proto/eval.js` and show its output as is.
   - **If a gate fails**: print `Release blocked.` and the failing slice. Then ask the client one card,
     **Header "COO": "Ship anyway or fix first?"** with "Fix first (Recommended)" and "Ship with a
     human reviewing every <slice> case". Then ask the builder to fix the failure **without editing
     golden.json**, and rerun the eval.
   - **Then run the sealed holdout yourself**: `node out/proto/eval.js holdout.json`. Show both results
     side by side: dev set after fix, holdout never seen. If the holdout is lower, say so plainly: that
     gap is how much the fix was fitted to the rows it saw, and it is the honest number.
   - **If all gates pass**: say it is a smoke test on 40 rows, not a release, and add 4 harder rows
     (implicit complaints without the keyword) to `golden.json` through the builder, then rerun.
7. Finalize `out/5-evals.md` with the gates table, the eval output before and after, and what
   changed. Update `out/state.md`.
8. **Say it**: thresholds before the build; metrics by slice because an average hides a broken
   segment; a missed gate blocks the release.
