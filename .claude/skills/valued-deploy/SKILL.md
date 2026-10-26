---
name: valued-deploy
description: VALUED gate D. Plan the launch and the life after it, recommend pilot scope and stop rule with trade-offs, with named sign-offs, an audit trail, a kill switch and incident reporting. Called by /valued; not for direct use.
---

# D: Deploy and drive agent

**Job:** plan the launch, and the life after it.
**Prevents:** quiet decay after launch.

| | |
|---|---|
| **Asks the client** | What is the pilot scope? What would make you stop? (Their appetite for exposure, and their own red line.) |
| **Uses** | Shadow, then canary, then signed promotion, then watch: drift by group, edit rate, a kill switch per behaviour. |
| **Gives** | A rollout plan, pilot and stop-rule recommendations with trade-offs, what to watch after launch, and a week-by-week plan that feeds the PRD and the one-page brief. |
| **Governance asks** | Who signs each stage of the rollout? Is there an audit trail, and a kill switch with a named owner? How are incidents, complaints and model changes reported? |

> **Mode.** In the default run the conductor (`valued/SKILL.md`) asks this gate's cards in its rounds: skip
> the "Ask the client" step, read the answered cards for gate D in `out/cards.json`, and never ask a card
> yourself. Under `--teach`, ask them as written and append each card, with its answer, to `out/cards.json`
> in the card schema. Either way, end by writing `out/gates/d.json` (below) and running
> `node .claude/skills/valued/conductor.js render` (skip the render when the conductor launched you in a parallel
> phase; it renders once both gates are back). Never hand-edit the rendered files: wherever a step below says to
> write a gate file, `case.json`, `state.md` or a PRD section, put that content in the gate JSON instead.

## Steps

1. **Deploy table** (max 7 rows): step, what it proves, exit criterion, **who signs**. Steps: shadow
   (runs beside people, touches nothing), pilot cohort, governance sign-offs (risk, compliance, model
   risk, privacy, security), training and change management, rollback and a kill switch per behaviour,
   phased rollout.
2. **Drive table** (max 7 rows): metric, why, alert threshold. Include the north-star metric from V,
   online eval drift by group, adoption, **edit rate on approved drafts** (catches approval fatigue),
   escalation recall in production, cost per resolved task. Add the loop: production misses become new
   labels (back to L), and a scale, fix or retire review cadence.
3. **Pilot and stop-rule recommendations** in the standard format:
   - Pilot scope: one team, one site, one channel; each with its trade-off (speed of learning, coverage
     of the riskiest group, blast radius). Our preference: the smallest scope that still covers the
     riskiest group.
   - Stop rule: candidate kill criteria, each with its trade-off (sensitivity against false alarms). Our
     preference: the one tied to escalation recall in production.
4. **The plan for the client's timeline** (max 6 rows), week by week.
5. **Ask the client (max 2 cards):** **"<sponsor role>": "What is the pilot scope?"** and **"<sponsor role>": "What would
   make you stop?"**, each with the options from step 3, our preference first "(Recommended)", every
   option with its trade-off.
6. **Governance check** in `out/6-deploy.md` (question, answer, status):
   - Sign-offs: the signer we propose for each stage, by role; status "client to confirm".
   - Audit trail and kill switch: what is retained (from gate U's logging spec) and the named owner of
     each kill switch, proposed by role.
   - Reporting: how incidents, complaints, drift alerts and model or rule changes are reported, to whom,
     how fast; every change goes back through gate E before release.
   Put the rows in `governance`; render adds open ones to the Governance log.
7. **Write** `out/gates/<k>.json` (see Output) and run `node .claude/skills/valued/conductor.js render`; it writes the gate file, state.md, the PRD sections and case.json.
8. **Say it** (three lines): shadow before pilot; edit rate; every change re-enters the eval gate, and
   misses become labels.

## Output: `out/gates/d.json`

Keys (render and `conductor.js check` read them; keep strings to one line): `deploy` (`{ step, proves, exit, signs }`), `drive` (`{ metric, why, alert }`), `pilot` and `stop` (recommendations; preferred = cards R2-5 and R2-6), `plan` (`{ week, work }`, up to 6 rows), `timeline` (one line), `signoffs` (`{ name, role, signs }`, name "to confirm"), `killSwitchOwner`; plus `governance` (rows `{ question, answer, status, owner }`), `sayIt` (3 lines), `assumptions` (strings). Recommendations use `{ options: [{ label, tradeoff }], preferred, why, changeMind }`. Then run `node .claude/skills/valued/conductor.js render`.
