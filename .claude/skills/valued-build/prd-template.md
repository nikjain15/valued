# <Use case name>: product requirements

**Client:** <client> · **Version:** 0.1, draft for client review · **Owner:** product lead · **Date:** <today> · **Source:** VALUED run, every decision traceable to a gate file in `out/`

> **Recommendation.** <One sentence: what we build first, for whom, and the outcome it moves.>
> **Decision asked of the client.** <The one sign-off this document needs, and from which role.>

## 1. Executive summary

| | |
|---|---|
| Problem | <one line, priced, from 1-value.md> |
| Who it serves | <primary user; who benefits downstream> |
| What we build | <first-wave use case, one line> |
| What it never does | <the top never-list item> |
| How we know it works | <the riskiest-miss gate and its bar> |
| First milestone | <shadow or pilot, and when> |

## 2. Problem statement and opportunity

<Two to four lines on where the cost or pain actually sits. Mark every assumed number (assumed).>

| Value driver | Today (baseline) | Target | How measured |
|---|---|---|---|
| <north-star metric> | <x (assumed)> | <y> | <source system, cadence> |

## 3. Target users and personas

| User | Job to be done | Pain today | What changes |
|---|---|---|---|
| <primary user> | <job> | <pain> | <with the product> |

| ID | As a | I want to | So that |
|---|---|---|---|
| US-01 | <primary user> | <capability> | <outcome> |
| US-02 | <approver or escalation owner> | <capability> | <outcome> |

**Journey, future state:** <request arrives> → <escalation check> → <route> → <draft> → <person decides> → <logged>.

## 4. Goals, non-goals and success metrics

**Goals**
- G-01 <goal tied to the north star>
- G-02 <goal tied to risk or quality>

**Non-goals (this release)**
- <what we deliberately do not build, and why; include the customer-facing wave if deferred>

| ID | Metric | Baseline | Target | Guardrail |
|---|---|---|---|---|
| M-01 | <north star> | <(assumed)> | <target> | <the metric that must not get worse> |
| M-02 | Edit rate on approved drafts | n/a | <band> | approval without reading |
| M-03 | Escalation recall in production | n/a | <client's bar> | never below the bar for any group |

## 5. Scope and phasing

| Candidate | Lowest rung that works | Decision | Why |
|---|---|---|---|
| <first-wave use case> | <rung> | **First wave** | <reason> |
| <idea> | Rules | Not GenAI | <what it should be instead> |

## 6. Solution overview

**Engine (gate A, client decision):** <Rules only | Rules decide, model drafts | Model proposes, rules guard>, because <reason>.

| Component | Rung | Build, buy or partner | Why | What would change our mind |
|---|---|---|---|---|
| Escalation guard | Rules | Build | <reason> | <fact> |
| Router | <rung> | <B/B/P> | <reason> | <fact> |
| Drafting | <rung> | <B/B/P> | <reason> | <fact> |
| Knowledge base | Retrieval | <B/B/P> | <reason> | <fact> |

```
request ─▶ escalation guard ─▶ router (one source?) ─▶ draft (cited source only) ─▶ person decides ─▶ audit log
              │ escalate             │ no single source
              ▼                      ▼
        <escalation owner>       person handles
```

**Assistants (agentic design)**

| Assistant | Rules or AI | Job | Never | Measured by |
|---|---|---|---|---|
| Safety guard | Rules | <escalation and never-list check> | <never> | Catches every escalation |
| <assistant> | <AI / rules> | <job> | <never> | <release check> |

**Sweeps (proactive work)**

| Sweep | Rules or AI | Schedule | What it checks | Decision it hands to a person |
|---|---|---|---|---|
| <sweep> | <rules / AI> | <nightly> | <check> | <decision> |

**Alternatives considered**

| Alternative | Why not now | When we would revisit |
|---|---|---|
| <the obvious alternative, e.g. customer chatbot> | <reason tied to risk or value> | <trigger> |

**Latency budget:** <per surface>. **Unit of cost:** cost per resolved task, <estimate (assumed)>.

## 7. Functional requirements

| ID | Requirement | Story | Priority | Acceptance criteria |
|---|---|---|---|---|
| FR-01 | Check every request against escalation triggers before anything else | US-02 | Must | Given a request matching any trigger, when it is processed, then verdict is `escalate` and no draft is produced |
| FR-02 | Answer only when exactly one source clearly matches | US-01 | Must | Given a request matching zero or two sources, then verdict is `human` |
| FR-03 | Every draft cites its source | US-01 | Must | Answers without a source = 0 on the golden set |
| FR-04 | A person approves, edits or hands off every draft | US-01 | Must | No output leaves without an approver recorded in the audit log |
| FR-05 | Log input, source, output, approver, time, version for every action | US-02 | Must | Every action in the workbench creates one audit row |
| FR-06 | <case-specific requirement> | <US id> | <Must/Should> | <testable criterion> |

## 8. AI behavior specification

**Verdicts:** `answer` (<what it requires>), `human` (<when>), `escalate` (<when>).

**Decision order:** escalation triggers first, in every language served; then source match; otherwise a person.

| Escalation trigger | Example phrasing | Goes to | Response time |
|---|---|---|---|
| <trigger> | "<example>" | <owner> | <sla> |

**Never list**
- <item>

**Model contract (one per shape; keep the one that applies):**
- desk and chat: input = the request + one cited source; output = 2 to 4 sentences from that source only, or `NO_ANSWER`.
- review: input = the document + the type's field list; output = each field's value with the exact evidence span, empty when absent; a value without evidence is dropped.
- rank: input = the record's facts + the rule that fired; output = a two-sentence talking point using only those facts.
In every shape, a refusal or error falls back to a person, never to a guess. Model: <id>, low effort, server-side fallback on.

## 9. Human-in-the-loop design

| Action | Autonomy (first 90 days) | Approver | AI shows | On failure |
|---|---|---|---|---|
| <action> | <suggest / draft with approval / act> | <role> | reason and source | route to a person |

**Clocks**

| Outcome | Respond within | Regulatory clock |
|---|---|---|
| Escalate | <hours> | <e.g. complaint acknowledgement> |
| Needs a person | <hours> | <none or name> |
| Prepared for review | <hours> | <none or name> |

**Learning loop:** any reviewer can mark an outcome wrong; it joins the labelled test set with the right answer and every design is re-scored.

**Disclosure (compliance to confirm):** "<drafted line>".

## 10. Data, privacy and labeling

| Data | Owner | Purpose | Personal data | Minimisation | Retention |
|---|---|---|---|---|---|
| <data> | <owner> | <purpose> | <yes/no> | <masked/dropped> | <period> |

**Systems to connect**

| System | Category | Provides | Access | Personal data | Owner | Pilot status |
|---|---|---|---|---|---|---|
| <system (vendor e.g., assumed)> | <channel / knowledge / record / testing / collab> | <what> | <read-only> | <masked> | <role> | <connected / planned> |

**Golden set:** <n> dev rows plus <n> sealed holdout rows; groups: <list with counts>. Labelled <approach>. Synthetic until <client decision>.

## 11. Evaluation and acceptance criteria

| Gate | Metric | Bar | Why this bar | Latest dev | Holdout |
|---|---|---|---|---|---|
| Riskiest miss | Escalation recall | <client bar> | <reason> | <value> | <value> |
| <gate> | <metric> | <bar> | <reason> | <value> | <value> |

**Release status:** <Passes all gates | Blocked on ...>. **LLM judge policy:** <which metrics may use one, only after validation; escalation never does>.

**Reproduce:** `node out/proto/eval.js` (dev) and `node out/proto/eval.js holdout.json` (sealed).

## 12. Model selection, cost and business case

**Model menu (the client chooses; list prices, assumed, confirm at the vendor)**

| Provider | Model | In $/1M | Out $/1M | Latency | Best for |
|---|---|---|---|---|---|
| <provider> | <model> | <price> | <price> | <class> | <use> |

**Multi-purpose default:** <model, why>. **Which model for which job:** <per-assistant mapping>.

**Tier rule:** <start mid, small for simple high-volume steps, large or reasoning only where quality matters>.

**Model types in this use case (not just chat LLMs)**

| Model type | Used here | Model or service | Why |
|---|---|---|---|
| Embeddings / rerankers / multimodal / speech | <yes/no> | <model> | <why> |

**Routing pipeline:** <embedding indexes the docs, a small model routes, a reranker picks passages, the mid model drafts, the large model only for the hardest rows>.

**Run cost:** <per resolved item, per month at pilot volume>.

**Business case (ROI):** <value recovered a year vs build and run cost, payback (assumed)>. **Commercial model:** <per-seat / per-resolved-item / flat, our pick>.

## 13. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-01 | Latency, decision plus draft | <budget> |
| NFR-02 | Cost per resolved task | <ceiling (assumed)> |
| NFR-03 | Availability; fail closed to a person | <target> |
| NFR-04 | Security: no secrets in code, keys from environment, synthetic data in non-production | Always |
| NFR-05 | Audit log retention | <period, from gate U> |
| NFR-06 | Accessibility of the reviewer UI | WCAG 2.2 AA |

## 14. Rollout and operations

| Step | Proves | Exit criterion | Signs |
|---|---|---|---|
| Shadow | <what> | <criterion> | <role> |
| Pilot: <client's scope> | <what> | <criterion> | <role> |

| Drive metric | Why | Alert threshold |
|---|---|---|
| <metric> | <why> | <threshold> |

**Stop rule (client decision):** <criterion>. **Kill switch:** per behaviour, owned by <role>.

**Plan:** <week-by-week table for the client's timeline>

## 15. Governance and approvals

| Approver | Role | Signs off on |
|---|---|---|
| <name to confirm> | <role> | <stage or artifact> |

| Gate | Question | Answer | Status | Closes it |
|---|---|---|---|---|
| <gate> | <question> | <answer> | <answered / assumed / client to confirm> | <role> |

## 16. Risks and mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | <risk> | <L/M/H> | <L/M/H> | <mitigation, tied to a gate> |

## 17. Dependencies, assumptions and open questions

| Dependency | Owner | Needed for | Status |
|---|---|---|---|
| <e.g. policy content export, vendor approval, CRM integration> | <role> | <milestone> | <status> |

| ID | Question or assumption | Owner | Needed by |
|---|---|---|---|
| Q-01 | <question> | <role> | <milestone> |

## 18. Monitoring, observability and cost

**Observability (what we watch once the agents are live)**

| Signal | Group | Source | Alert threshold |
|---|---|---|---|
| <signal> | Quality and safety / Cost and tokens / Speed and volume / Human workload | <where emitted> | <threshold (assumed)> |

**Dashboard:** <the live dashboard the prototype shows>. **Production telemetry:** <what production emits, traces and tooling>.

**Token strategy (tuned per use case)**

| Tactic | Where it applies | Effect |
|---|---|---|
| <prompt caching / retrieval trim / model cascade / max-output caps / structured outputs> | <assistant or step> | <expected saving (assumed)> |

## 19. Implementation plan

This section is written for a coding agent (Claude Code or similar). Hand it this file and the `out/proto/` folder; it should be able to take the prototype to a pilot-ready service task by task, with the evals deciding when each task is done.

**Starting point:** a working prototype in `out/proto/` (router, eval runner, workbench UI, audit log) that passes or is blocked by its own gates.

**Target layout**

```
<repo>/
  src/router        decision order: guard, route, hand off
  src/drafting      model contract and template fallback
  src/api           decide, eval, log endpoints
  web/              reviewer workbench
  eval/             golden.json, holdout.json (sealed), gates.json, run
  docs/prd.md       this file
```

**Kickoff prompt**

```
Read docs/prd.md fully before writing code. You are building <use case> for <client>.
Rules: never edit eval/golden.json to make a gate pass; never open eval/holdout.json;
escalation is checked before anything else; never produce an answer without a cited source;
no secrets in code; synthetic data only. Work task by task from section 19. After each task,
run the eval and show its output. Stop and ask me when a requirement is ambiguous.
Start with T-01.
```

| ID | Task | Implements | Done when |
|---|---|---|---|
| T-01 | Port the prototype into the target layout; keep behaviour identical | FR-01 to FR-03 | `npm test` and the eval give the same result as `out/proto` |
| T-02 | <case-specific task> | <FR ids> | <command and expected output> |
| T-03 | Replace template drafts with the model contract in section 8, with fallback | FR-03, AI behaviour | answers without a source stays 0; refusal routes to a person |
| T-04 | Persist the audit log with retention from section 12 | FR-05, NFR-05 | every workbench action writes one row; export works |
| T-05 | Add production signals: edit rate, escalation recall, drift by group | Section 13 | dashboard shows M-01 to M-03 by group |
| T-06 | Shadow-mode harness: run beside people, touch nothing, compare | Rollout: shadow | shadow report by group against the gates |

**Guardrails for the coding agent**
- The gates in `eval/gates.json` are the definition of done. A red gate blocks the task.
- Fix the general pattern behind a miss, never the exact sentence; the holdout tests the kind.
- Every new behaviour gets golden rows first, labelled before the code exists.
- Ask before adding a dependency, a data source, or any action the never list touches.

## Appendix: client decisions

| Gate | Decision | Chosen by | Our recommendation |
|---|---|---|---|
| <gate> | <decision> | <role> | <recommended option> |

## Appendix: document history

| Version | Date | Change | Requested by | Sections |
|---|---|---|---|---|
| 0.1 | <date> | First draft, built gate by gate in the working session | Product lead | All |
