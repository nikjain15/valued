# Regression suite

The 18 audit scenarios, kept as a gate every approved change must pass before a push.

| File | What it is |
|---|---|
| `scenarios.json` | each scenario's case line, port and expected properties (shape, systems, cards, gates, no pending sections, no console errors, dev and holdout pass, 28 minutes) |
| `briefs/prompt-<n>-<slug>.md` | the brief a fresh subagent follows to run one scenario end to end in its own workspace |
| `check.js` | (wrapper for `.claude/skills/valued-audit/check.js`) scores one workspace against the eight standards (static checks, both evals, headless Chrome on the local and hosted prototype) |
| `run.js` | scores every workspace with `check.js` plus `scenarios.json`, writes `results/scorecard.md` |

## Run it

1. Fresh workspaces: `rsync -a --exclude out --exclude 'out-*' --exclude .git ~/dev/valued/ ~/dev/valued-audit-<slug>/`
   for each scenario a change can affect (all 18 for a change to `valued/SKILL.md`, the app or a gate skill).
2. Launch one subagent per workspace with its brief, at most 6 at once.
3. `node learning/regression/run.js` (add `--only slug,slug` for a subset, `--static` to skip the browser).

The suite passes when every row is all pass and every run is within 28 minutes. Never push on red.
