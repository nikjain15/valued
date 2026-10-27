# VALUED

**An AI product lifecycle, run as an agent workflow. The system drafts; the client decides.**

Most AI work starts at the model. VALUED starts before AI is chosen and ends after launch. Every use
case clears six gates, in order:

| Gate | The question it answers |
|---|---|
| **V** Value | Whose decision or work changes, how often, what it costs today, how big the prize is |
| **A** AI-fit | Which jobs do agents take, and which stay on fixed rules? The ladder (rules, classic ML, retrieval plus a model, an agent) for each job; rank on value, feasibility, risk and reuse; a build, buy or partner recommendation; the cost, latency and quality trade |
| **L** Labels | Ground truth before the model: a golden set, the slices that matter, a sealed holdout |
| **U** User-in-the-loop | Per action: suggest, draft, act with approval, or act. What the AI never does. Escalation wins every race |
| **E** Evals | Release thresholds set first, metrics by slice, a missed gate blocks the release |
| **D** Deploy and drive | Shadow mode, pilot, sign-off, rollback; drift, adoption, edit rate; scale, fix or retire |

Production misses become new labels, so D loops back to L.

## How it runs

```
/valued <one-line case>
   │
   ├─ V  valued-value       draft the value frame, 12 candidate use cases      → card to the client
   ├─ A  valued-ai-fit      3 × use-case-scorer in parallel (value and reuse,
   │                        feasibility, risk), ranked, ladder rung per case    → card to the client
   ├─ L  valued-labels      golden set written before any system exists,
   │                        10 rows sealed as holdout                           → card to the client
   ├─ U  valued-user-loop   autonomy per action, never list, escalation         → card to the client
   ├─ E  valued-evals       thresholds first, then prototype-builder in the
   │                        background; eval blocks or releases; holdout last    → card to the client
   ├─ D  valued-deploy      launch steps, drive metrics, the plan               → card to the client
   ├─ B  valued-build       a PRD a coding agent can build from, and the
   │                        prototype as a working app on localhost:4317         (no questions)
   └─ brief                 one page, out/brief.html
```

- **Eight skills** (`.claude/skills/`): the orchestrator, one per gate, and the build step after D.
- **Two agents** (`.claude/agents/`): `use-case-scorer`, run three at once on different lenses so no
  single lens dominates; `prototype-builder`, which writes the router and an eval runner without
  seeing the answer key.
- **The engine is the client's call.** Gate A asks whether the prototype may call a hosted model (a data
  and vendor fact only the client knows). The answer sets how it thinks: rules only, rules decide and a
  model drafts from the cited source, or a model proposes and rules guard escalation.
- **Option cards, recommendation first.** Every gate shows a concrete draft before it asks anything, and
  asks at most two questions, each with the product lead's recommendation first. The client makes the
  call; the system drafts and records who decided.

## Principles

- **The system drafts, the client decides.** No gate makes a judgement call on the client's behalf.
- **Ask only what the client owns.** Priorities, risk appetite and facts only they know are questions. Everything else (sourcing, architecture, thresholds) is a recommendation: the options, their trade-offs, our preference, why, and what would change our mind.
- **Governed at every gate.** Each gate answers its own governance questions (regulatory exposure, data rights, human accountability, signable evidence, sign-off and audit trail), and open items appear in the brief.
- **Agentic by design, deterministic where it must be.** Agents do the work; fixed rules guard escalation, evidence and the never list; a model takes each job a rule cannot do well.
- **Labels before the model.** Otherwise you grade the system against itself.
- **The builder never sees the holdout.** A fix is scored on the rows it learned from and on ten it never
  saw. The second number is the honest one.
- **Metrics by slice.** An average hides a broken language or customer segment; a slice gate does not.
- **Decisions become a spec.** The run ends in a PRD where every requirement has an acceptance test and
  the evals are the definition of done, so a team or a coding agent can build from it task by task.

## VALUED in practice

The gates came out of how these two products were built. Each gate points at something real in their repos:

| Gate | [CureCue](https://github.com/nikjain15/CureCue): beside a member-service advocate | [Relay](https://github.com/nikjain15/relay): the step after the insight, for advisors |
|---|---|---|
| **V** | One advocate's whole shift studied before any AI was picked | One flagged opportunity to a signed, documented action; detection coverage measured |
| **A** | Advocate-side first; rules as a graph over vector search; three verdicts by type | The model never decides: verdicts, ranking and refusal are code |
| **L** | 195 turns labelled by intent, independent of the rules; English, Spanish, interpreter | 300 households, hand-reviewed labels; the expected side imports no engine code |
| **U** | Never speaks to the member; anything no rule covers goes to a person | Never sends; nothing clears its own findings |
| **E** | The first golden set was English only; adding Spanish exposed a release that missed every Spanish-language escalation | Caught 53 of 85 retirement candidates missed before the fix |
| **D** | Designed: shadow, 5% canary, a kill switch per skill | Tighten-only learning loop; loosening needs a person |

One-page briefs in the workflow's own format: [`examples/curecue-brief.html`](examples/curecue-brief.html),
[`examples/relay-brief.html`](examples/relay-brief.html). They use the design tokens of Relay.

## Repository layout

| Path | What it holds |
|---|---|
| `.claude/skills/valued*` | The method itself: the conductor and the seven gate skills (V, A, L, U, E, D, Build) plus audit, revise and learn |
| `.claude/agents` | The sub-agents a gate launches (use-case scorers, prototype builder, guard model) |
| `index.html` | The public landing page (what you see on the hosted site) |
| `examples/` | Finished sample runs, to show the output without running one live |
| `assets/` | Images and static files for the landing page |
| `learning/` | The learning log: signals from real use that feed `/valued-learn` |
| `inputs/` | Where a client drops real material to ground a run (git-ignored, never committed) |
| `out/` | The current run's output: gate files, PRD, prototype (git-ignored, regenerated each run) |

Only the first six are committed. `inputs/`, `out/` and any `out-*/` are working folders, ignored by git,
so the repository itself stays clean for review.

## Use it

Runs in Claude Code: the skills and agents load from `.claude/`.

```bash
git clone https://github.com/nikjain15/valued && cd valued && claude
```

```
/valued Medicare Advantage plan, member-service advocates take 40 to 60 calls a shift from members 65+, grievances get missed, the plan wants AI support for advocates
```

Add `--auto` to the end to run without questions (every card takes the recommendation), and
`--no-open` to skip opening the browser. Output lands in `out/`:

| File | What it is |
|---|---|
| `1-value.md` to `6-deploy.md` | One file per gate, each ending in its governance check |
| `state.md` | Every client decision, assumption and open governance item |
| `prd.md`, `prd.html` | The PRD: goals and metrics, requirements with acceptance criteria, AI behaviour spec, human-in-the-loop, data and labels, release gates with real results, rollout, governance, risks, and "Build it with AI" (a kickoff prompt and tasks for a coding agent) |
| `proto/` | Router, golden set, sealed holdout, gates, eval runner, and the app: a workbench (decision, cited source, draft, approve or edit or hand off), the evals tab, and an audit log of every action with its approver |
| `brief.html` | One page for the sponsor |

The prototype runs with `node out/proto/server.js` on `http://localhost:4317`; the PRD is also served at
`/prd`. Model drafting needs `ANTHROPIC_API_KEY` in the environment; without it the app says so and drafts
from the cited source by template.

## Status

A method harness, not a product. Synthetic data only; no real client, customer or person. The release
gates evaluate the deterministic decision layer; a model, when the client allows one, drafts behind it
and never overrides an escalation. A model that leads the decision needs its own eval before release,
and the PRD says so.
