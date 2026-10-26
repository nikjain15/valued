You are running one VALUED case end to end with the default orchestrated conductor, exactly as the skills in this workspace describe, and nothing more.

Workspace (use it for everything, with absolute paths): `/Users/nikjain/dev/valued-audit-university`. Run every command from that folder.
Port: `4415` (`export PORT=4415`; the skills write 4317, use 4415 everywhere).

## What to do

Behave exactly as Claude Code would if the user typed this in `/Users/nikjain/dev/valued-audit-university`:

```
/valued university, student support questions to an assistant, 80k a year across admissions, financial aid and wellbeing, some students are minors, dean of students wants faster answers with wellbeing escalated to people --auto --no-open --lean
```

Read `/Users/nikjain/dev/valued-audit-university/CLAUDE.md`, then `/Users/nikjain/dev/valued-audit-university/.claude/skills/valued/SKILL.md` (the conductor) and follow it phase by phase, reading each gate skill it names under `/Users/nikjain/dev/valued-audit-university/.claude/skills/<name>/SKILL.md` and the agents under `/Users/nikjain/dev/valued-audit-university/.claude/agents/`. Use `node .claude/skills/valued/conductor.js` for the clock, cards, seeds, render, check and report exactly as the conductor says; the clock is the timing record, so start and end every phase with it.

Subagents: follow `--lean`: only `holdout-sealer`, `prototype-builder` and `guard-model`, launched in the foreground (wait for each; never hand back before the closing line). The sealer is not optional: this context must never read `out/proto/holdout.json`, and the audit fails the run if the context that wrote the holdout also wrote the router.

`--auto`: answer every card round with `conductor.js cards auto <round>`; still draft every card in full. `--no-open`: never run `open`. Do not ask anyone anything. Do not skip steps; cut scope only through the conductor's overrun rule.

## Hard limits

- Write only under `/Users/nikjain/dev/valued-audit-university/out/`. Never edit anything under `/Users/nikjain/dev/valued-audit-university/.claude/`.
- Never publish (treat the Artifact tool as unavailable): run `build-hosted.js` so `out/hosted/index.html` exists, say in one line that publishing was skipped, keep localhost.
- Never run `git`, `rm -rf`, `pkill`, or kill any process except the one on port 4415.
- Synthetic data only; no real company, customer or person names; no em-dashes anywhere.
- Keep helper scripts inside `/Users/nikjain/dev/valued-audit-university/out/tools/`.
- Leave the server running on port 4415.

## Report back

At most 10 lines: the closing line, total clock time, the final dev and holdout result lines, the `check` result, and the count of improvisations (write each one to `out/run-notes.md`, not in the report).
