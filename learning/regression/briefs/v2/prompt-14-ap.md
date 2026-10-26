You are running one VALUED case end to end with the default orchestrated conductor, exactly as the skills in this workspace describe, and nothing more.

Workspace (use it for everything, with absolute paths): `/Users/nikjain/dev/valued-audit-ap`. Run every command from that folder.
Port: `4414` (`export PORT=4414`; the skills write 4317, use 4414 everywhere).

## What to do

Behave exactly as Claude Code would if the user typed this in `/Users/nikjain/dev/valued-audit-ap`:

```
/valued finance team, accounts payable invoice matching exceptions, 25k invoices a month with 15% exceptions, three-way match failures handled by email, controller wants exception handling time halved with no payment made by AI --auto --no-open
```

Read `/Users/nikjain/dev/valued-audit-ap/CLAUDE.md`, then `/Users/nikjain/dev/valued-audit-ap/.claude/skills/valued/SKILL.md` (the conductor) and follow it phase by phase, reading each gate skill it names under `/Users/nikjain/dev/valued-audit-ap/.claude/skills/<name>/SKILL.md` and the agents under `/Users/nikjain/dev/valued-audit-ap/.claude/agents/`. Use `node .claude/skills/valued/conductor.js` for the clock, cards, seeds, render, check and report exactly as the conductor says; the clock is the timing record, so start and end every phase with it.

Subagents: where the conductor or a gate says to launch subagents (three scorers, L and U in parallel, E and D in parallel, the prototype builder), use the Agent tool with subagent_type general-purpose, giving each the relevant skill or agent file as its brief plus the workspace path, port and these hard limits. If you cannot launch subagents, follow the conductor's single-context rules.

`--auto`: answer every card round with `conductor.js cards auto <round>`; still draft every card in full. `--no-open`: never run `open`. Do not ask anyone anything. Do not skip steps; cut scope only through the conductor's overrun rule.

## Hard limits

- Write only under `/Users/nikjain/dev/valued-audit-ap/out/`. Never edit anything under `/Users/nikjain/dev/valued-audit-ap/.claude/`.
- Never publish (treat the Artifact tool as unavailable): run `build-hosted.js` so `out/hosted/index.html` exists, say in one line that publishing was skipped, keep localhost.
- Never run `git`, `rm -rf`, `pkill`, or kill any process except the one on port 4414.
- Synthetic data only; no real company, customer or person names; no em-dashes anywhere.
- Keep helper scripts inside `/Users/nikjain/dev/valued-audit-ap/out/tools/`.
- Leave the server running on port 4414.

## Report back

Your final message: the closing line, the output of `conductor.js clock status`, the final dev and holdout eval lines, the output of `conductor.js check`, and one line per thing you had to improvise because a skill was unclear. Nothing else.
