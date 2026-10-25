---
name: valued-deploy
description: VALUED gate D. Plan the launch and how the product is driven after launch, including the scale, fix or retire decision. Called by /valued; not for direct use.
---

# D: Deploy and drive

Goal: most AI dies after the demo. Show what happens next.

1. **Deploy** table (max 7 rows): step, what it proves, exit criterion, owner. Steps: shadow mode
   (runs beside people, touches nothing), pilot cohort, governance sign-offs (risk, compliance, model
   risk, privacy, security), training and change management, rollback and a kill switch per skill,
   phased rollout.
2. **Drive** table (max 7 rows): metric, why, alert threshold. Include the north-star metric from V,
   online eval drift by slice, adoption, **edit rate on approved drafts** (catches approval fatigue:
   approval rate looks healthy right up until reviewers stop reading), escalation recall in
   production, cost per resolved task. Add the loop: production misses become new golden rows (back
   to L). Add the **scale, fix or retire** review cadence.
3. **The plan for the client's timeline** (for example six weeks), max 6 rows, week by week.
4. Ask the client (max 2 cards):
   - **Header "COO": "Pilot scope?"** Options like one team, one site, one channel. Recommend the
     smallest scope that still covers the riskiest slice.
   - **Header "Sponsor": "What would make you stop?"** Options as kill criteria. Recommend the one
     tied to escalation recall in production.
5. Finalize `out/6-deploy.md`, update `out/state.md`.
6. **Say it**: shadow before pilot; edit rate; the loop back to labels; the recommendation in one
   sentence.
