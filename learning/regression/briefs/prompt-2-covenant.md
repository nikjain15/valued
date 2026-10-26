You are running one VALUED case end to end, exactly as the skills in this repository describe, and nothing more.

Working directory (use it for everything, with absolute paths): `/Users/nikjain/dev/valued-audit-covenant`
Port for this run: `4402` (export PORT=4402 before starting the server; the skills write the port as 4317, use 4402 everywhere instead).

## What to do

Behave exactly as Claude Code would if the user typed this in `/Users/nikjain/dev/valued-audit-covenant`:

```
/valued commercial lender, relationship managers miss covenant breaches across 1,200 loans, credit decisions stay with credit officers, chief credit officer wants early warning in a quarter --auto --no-open
```

That means: read `/Users/nikjain/dev/valued-audit-covenant/CLAUDE.md`, then `/Users/nikjain/dev/valued-audit-covenant/.claude/skills/valued/SKILL.md` (the orchestrator), and follow it step by step. When it says to invoke a gate skill (`valued-value`, `valued-ai-fit`, `valued-labels`, `valued-user-loop`, `valued-evals`, `valued-deploy`, `valued-build`), read that skill's `SKILL.md` under `/Users/nikjain/dev/valued-audit-covenant/.claude/skills/<name>/` and carry out every step it lists, writing every file it names. `--auto` means take the recommended option on every card and log it as "(auto)"; still write every card into the gate file exactly as it would have been shown (header role, question, "If none fits, answer with:" line, every option with its trade-off, recommended first). `--no-open` means never run `open`.

Where a skill says to launch a subagent (`use-case-scorer` three in parallel at gate A, `prototype-builder` at gate E) use the Agent tool with that subagent type if you have it; if you cannot, follow the skill's single-context rules (score each lens separately before merging; write the router before opening golden.json; never open holdout.json while building or fixing; label the holdout result "not independent" wherever it appears).

Do not stop to ask anyone anything. Every decision follows the recommended option. Do not shorten or skip any step because it looks long; the whole point is to see what the skills produce on their own.

## Hard limits

- Write only under `/Users/nikjain/dev/valued-audit-covenant/out/`. Never edit anything under `/Users/nikjain/dev/valued-audit-covenant/.claude/`.
- Never publish anything (treat the Artifact tool as unavailable: at the build step, still run `build-hosted.js` so `out/hosted/index.html` exists, then say in one line that publishing was skipped and keep localhost).
- Never run `git`, `rm -rf`, `pkill`, or kill any process except the one on your own port 4402 (the `lsof -ti :4402 | xargs kill` line in the orchestrator is fine).
- Synthetic data only. No real company, customer or person names. No em-dashes anywhere in anything you write.

## Measure yourself

Before you start, and right before each gate header (`[V]`, `[A]`, `[L]`, `[U]`, `[E]`, `[D]`, `[B]`) and at the very end, run `date +%s` and keep the numbers. At the end write `/Users/nikjain/dev/valued-audit-covenant/out/audit-meta.json`:

```json
{ "case": "commercial lender, relationship managers miss covenant breaches across 1,200 loans, credit decisions stay with credit officers, chief credit officer wants early warning in a quarter", "started": <epoch>, "ended": <epoch>,
  "phases": { "setup": <seconds>, "V": <seconds>, "A": <seconds>, "L": <seconds>, "U": <seconds>, "E": <seconds>, "D": <seconds>, "B": <seconds> },
  "questionsAsked": <number of cards shown, framing cards included>,
  "subagents": "<used | single-context>",
  "evalBlocks": <number of times the dev eval printed RELEASE BLOCKED>,
  "notes": ["<anything you had to improvise because a skill was unclear or contradictory, one line each>"] }
```

Leave the server running on port 4402 when you finish (do not kill it at the end).

## Report back

Your final message: the closing line the orchestrator prints, the phases table from audit-meta.json, the final eval and holdout lines, and the `notes` list. Nothing else.
