# VALUED

**An AI product lifecycle, run as an agent workflow. The system drafts; the client decides.**

Most AI work starts at the model. VALUED starts before AI is chosen and ends after launch. Every use
case clears six gates, in order:

| Gate | The question it answers |
|---|---|
| **V** Value | Whose decision or work changes, how often, what it costs today, how big the prize is |
| **A** AI-fit | Is it AI-shaped at all? The least-AI ladder (rules, classic ML, retrieval plus a model, an agent); rank on value, feasibility, risk and reuse; a build, buy or partner recommendation; the cost, latency and quality trade |
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
   └─ brief                 one page, out/brief.html
```

- **Seven skills** (`.claude/skills/`): the orchestrator and one per gate.
- **Two agents** (`.claude/agents/`): `use-case-scorer`, run three at once on different lenses so no
  single lens dominates; `prototype-builder`, which writes a deterministic router and an eval runner.
- **Option cards, recommendation first.** Every gate shows a concrete draft before it asks anything, and
  asks at most two questions, each with the product lead's recommendation first. The person in the room
  plays the client and chooses.

## Principles

- **The system drafts, the client decides.** No gate makes a judgement call on the client's behalf.
- **Least AI that works.** Deterministic first; a model only where the rung below fails.
- **Labels before the model.** Otherwise you grade the system against itself.
- **The builder never sees the holdout.** A fix is scored on the rows it learned from and on ten it never
  saw. The second number is the honest one.
- **Metrics by slice.** An average hides a broken language or customer segment; a slice gate does not.

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

## Use it

Runs in Claude Code: the skills and agents load from `.claude/`.

```bash
git clone https://github.com/nikjain15/valued && cd valued && claude
```

```
/valued Medicare Advantage plan, member-service advocates take 40 to 60 calls a shift from members 65+, grievances get missed, the plan wants AI support for advocates
```

Add `--auto` to the end to run without questions (every card takes the recommendation). Output lands in
`out/`: one file per gate, `state.md` with every client decision, `proto/` with the router, golden set,
holdout and eval, and `brief.html`.

## Status

A method harness, not a product. Synthetic data only; no real client, customer or person. The
prototype it builds is deterministic by design: it proves the gates and the evals, and a model would sit
behind them.
