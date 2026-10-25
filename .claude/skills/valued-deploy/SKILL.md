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
5. **Ask the client (max 2 cards):** **"COO": "What is the pilot scope?"** and **"Sponsor": "What would
   make you stop?"**, each with the options from step 3, our preference first "(Recommended)", every
   option with its trade-off.
6. **Governance check** in `out/6-deploy.md` (question, answer, status):
   - Sign-offs: the signer we propose for each stage, by role; status "client to confirm".
   - Audit trail and kill switch: what is retained (from gate U's logging spec) and the named owner of
     each kill switch, proposed by role.
   - Reporting: how incidents, complaints, drift alerts and model or rule changes are reported, to whom,
     how fast; every change goes back through gate E before release.
   Add open items to the "Governance log" in `out/state.md`.
7. **Finalize** `out/6-deploy.md`, update `out/state.md`.
8. **Say it** (three lines): shadow before pilot; edit rate; every change re-enters the eval gate, and
   misses become labels.
