You are running one VALUED case end to end with the default orchestrated conductor, exactly as the skills in this workspace describe, and nothing more.

Workspace (use it for everything, with absolute paths): `/Users/nikjain/dev/valued-audit-airline`. Run every command from that folder.
Port: `4407` (`export PORT=4407`; the skills write 4317, use 4407 everywhere).

## What to do

Behave exactly as Claude Code would if the user typed this in `/Users/nikjain/dev/valued-audit-airline`:

```
/valued airline, disruption rebooking requests during irregular operations, 40k a day on bad days, agents miss compensation rules and time limits, VP customer care wants a pilot before summer --auto --no-open --lean
```

Read `/Users/nikjain/dev/valued-audit-airline/CLAUDE.md`, then `/Users/nikjain/dev/valued-audit-airline/.claude/skills/valued/SKILL.md` (the conductor) and follow it phase by phase, reading each gate skill it names under `/Users/nikjain/dev/valued-audit-airline/.claude/skills/<name>/SKILL.md` and the agents under `/Users/nikjain/dev/valued-audit-airline/.claude/agents/`. Use `node .claude/skills/valued/conductor.js` for the clock, cards, seeds, render, check and report exactly as the conductor says; the clock is the timing record, so start and end every phase with it.

Subagents: follow `--lean`: only `prototype-builder` and `guard-model`, launched in the foreground (wait for each; never hand back before the closing line).

`--auto`: answer every card round with `conductor.js cards auto <round>`; still draft every card in full. `--no-open`: never run `open`. Do not ask anyone anything. Do not skip steps; cut scope only through the conductor's overrun rule.

## Hard limits

- Write only under `/Users/nikjain/dev/valued-audit-airline/out/`. Never edit anything under `/Users/nikjain/dev/valued-audit-airline/.claude/`.
- Never publish (treat the Artifact tool as unavailable): run `build-hosted.js` so `out/hosted/index.html` exists, say in one line that publishing was skipped, keep localhost.
- Never run `git`, `rm -rf`, `pkill`, or kill any process except the one on port 4407.
- Synthetic data only; no real company, customer or person names; no em-dashes anywhere.
- Keep helper scripts inside `/Users/nikjain/dev/valued-audit-airline/out/tools/`.
- Leave the server running on port 4407.

## Report back

At most 10 lines: the closing line, total clock time, the final dev and holdout result lines, the `check` result, and the count of improvisations (write each one to `out/run-notes.md`, not in the report).
