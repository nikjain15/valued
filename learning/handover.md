# Re-audit handover (2026-10-26)

Repo `~/dev/valued`, branch `reaudit-28min` (local commits only, nothing pushed). Brief: `~/dev/nik-os/interview/technical/valued-reaudit-prompt.md` (read-only).

## Done
- Part 1: 18 baseline runs scored, 0 of 18 all pass. Scorecard `learning/regression/results/scorecard-part1.md`, signals S-016 to S-074 in `learning/signals.md`.
- Part 3: `/valued` is the 28-minute conductor (`.claude/skills/valued/SKILL.md`, `conductor.js`; old flow in `teach.md`). Gates write `out/gates/*.json`; render builds everything.
- Part 2 fixes (all committed): shared `eval.js`, trigger lexicon (families, cues, definitions), cached guard model (`.claude/agents/guard-model.md`) that escalates what rules miss and checks or supplies the one source, 50-row golden set with a 20-row holdout, holdout runs logged with a router fingerprint, vendor and ID normalisation, real-name checks.
- Part 4: `learning/signals.md`, `/valued-learn`, `learning/regression/{scenarios.json,run.js,README.md,briefs/v2/}`.
- New: `/valued-audit` (`.claude/skills/valued-audit/`: check.js, audit.js with issue IDs and fixes, observe.js writes `out/observe.html`, ledger `learning/runs.jsonl`).

## Orchestrated runs (workspaces `~/dev/valued-audit-<slug>`, ports 4401 to 4418)
- All eight standards pass on the latest skills: underwriting, utility, airline, contracts, recruiting, maintenance, ap, surveillance. Wall time 10 to 16 min each.
- Stopped by the usage limit, partial `out/`; resume from where they stopped: university, nocase, rules, card-dispute, covenant, portal.
- Not started on the latest skills (`out/` empty, older attempt in `out-v2a/`): pharmacy, returns, benefits, saas. The older attempts failed only on holdout routing, before the source-matching backstop.

## Left to do
1. Finish the 10 runs above. To save tokens, use one agent per run on model sonnet, at most 3 at once. Tell it: single context, except the guard model as one haiku subagent; never hand back before the closing line. Brief: `learning/regression/briefs/v2/prompt-<n>-<slug>.md`.
2. In each finished workspace, run `node ~/dev/valued/.claude/skills/valued-audit/audit.js --port <port>`; then run `node learning/regression/run.js` for the 18-row scorecard. Minutes come from the run agents' wall time; the conductor clock under-counts rounds.
3. Log v2 failures as signals. Write `learning/proposals.md` with the first proposals:
   - P-001: the hosted page embeds holdout.json.
   - P-002: field-accuracy and rank metrics in eval.js (S-002, S-008).
   - P-003: customer chat with an approval step.
   - P-004: who is asking (S-012).
   - P-005: two citations per answer (S-013).
   Ask Nik with option cards, at most 4 at a time.
4. Commit (no Claude attribution). Final report: 18-row scorecard, root causes and fixes, time per phase against 28 minutes, learning log and proposals, anything still failing.
5. After it lands, remind Nik to update the site to mention the checker, the 28-minute default, /valued-learn and /valued-audit.

## Rules
Never modify `~/dev/nik-os` or the reference outputs. Never push or publish without asking Nik. No em-dashes. Synthetic data only. Never name Nik's employers.
