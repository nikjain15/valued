---
name: modernize-architect
description: Design the target architecture for workflows that will cross service boundaries, as sagas, each step with its compensation, its point of no return, its retries and its idempotency, derived from where the legacy system holds its transactions today. Use when a monolith or mainframe transaction is being split across services or databases, or when asked for a saga, a distributed transaction design or a workflow architecture.
---

# Architect: saga workflows

In the legacy system one database transaction keeps a workflow's steps together. Split the data across
services and that guarantee is gone. A saga replaces it: a sequence of local transactions, each with a
way to undo it, so the workflow either completes or is put back. This skill designs one saga per
workflow that needs it, and says plainly when a workflow does not.

## Preconditions

Workflow profiles pass `mos_design.py workflow check`. The target model passes `model check`.

## 1. Find today's transaction boundaries

For each workflow, locate where the legacy code begins and commits or rolls back: explicit
transactions, commit and rollback statements, syncpoints, units of work in a batch step, framework
transaction annotations. List what is written inside each one, with `path:line`. That list is the
guarantee the owner has today and may not know they rely on.

## 2. Decide whether it needs a saga at all

| Situation | Recommend |
|---|---|
| All writes land in one service's schema in the target model | A local transaction. No saga |
| Writes cross schemas but the owner said they must succeed together and nothing forces the split | Move the boundary: keep those tables in one service |
| Writes cross services and the owner accepts brief disagreement | A saga |
| A step calls an outside system that cannot be undone | A saga with that step as the point of no return, or after it |

A saga adds states, messages and failure paths. Recommend the simplest shape that holds.

## 3. Design each saga

| Decide | Guidance |
|---|---|
| Steps | One local transaction in one service each. Order them so the reversible, cheap, likely-to-fail steps come first |
| Kind of each step | **Compensatable**: can be undone. **Pivot**: the point of no return, at most one. **Retriable**: after the pivot, must be repeated until it succeeds |
| Compensation | The business undo, not a database rollback: release the reservation, post a reversal entry, send the cancellation. Take it from how people repair this today (runbooks, tickets) |
| Coordination | **Orchestration**: one coordinator drives the steps. Fits many steps, branching, a need to see where each case is. **Choreography**: services react to each other's events. Fits two or three steps and independent teams; hard to follow beyond that |
| Idempotency | Every step and every compensation safe to repeat, keyed on a business identifier |
| Timeouts | Per step, with what happens on expiry: retry, compensate or hand to a person |
| What others see mid-flight | Pending states, and which reads must hide or show them |
| Publishing | Write the state change and the outgoing message in one local transaction (an outbox table), so neither is lost |
| When compensation itself fails | Retry, then a named queue a person works. Say who |

## 4. Write `modernization/architecture/sagas/<name>.json`

```json
{
  "name": "take-a-payment",
  "workflow": "take-a-payment",
  "style": "orchestration",
  "legacy_transaction": "src/pay/flow.py:12",
  "steps": [
    {"id": "reserve-funds", "service": "accounts", "action": "place a hold",
     "kind": "compensatable", "compensation": "release the hold",
     "writes": ["accounts.hold"], "idempotency_key": "payment_id", "timeout": "5s",
     "on_timeout": "compensate"},
    {"id": "charge", "service": "payments", "action": "charge the provider",
     "kind": "pivot", "writes": ["payments.payment"], "idempotency_key": "payment_id",
     "timeout": "30s", "on_timeout": "query the provider, then decide"},
    {"id": "post-ledger", "service": "ledger", "action": "post the entry",
     "kind": "retriable", "writes": ["ledger.entry"], "idempotency_key": "payment_id",
     "timeout": "10s", "on_timeout": "retry"}
  ]
}
```

## 5. Run the gate

`python3 modernization/mos_design.py saga check`, then `python3 modernization/mos_design.py gate`.

It fails when a step before the point of no return has no compensation, a step after it is not
retriable, there are two points of no return, a step lacks an idempotency key or a timeout, a step
writes a table its service does not own in the target model, or a workflow marked as a saga has no
design. It notes a saga that touches one service only.

## 6. Write `modernization/architecture/architecture.md`

| Section | Content |
|---|---|
| Services and what each owns | From the target model's schemas |
| Per workflow | Today's transaction (cited), target shape, why, the trade-off accepted, who decided |
| Per saga | Step table: step, service, kind, compensation, timeout; a state list; what a user sees in each state |
| Failure walk-through | For each step: it fails, it times out, it succeeds twice. What happens |
| Coexistence | How each saga behaves while the legacy system still runs part of the workflow |
| Tests this design demands | Compensation tests, repeat-delivery tests, timeout tests: handed to `modernize-test` |
| Slices | The order to build in, handed to the slice plan |

## Ask the owner

Only these, each with your recommendation and trade-offs: how long two services may disagree; which
step is the point of no return; orchestration or choreography where it is a close call; who works the
queue when an undo fails. Record with `mos.py decide`.

## Never

- Never design a saga for a workflow that fits in one service.
- Never use a distributed two-phase commit to avoid the design work, unless the owner asks for it
  knowing the availability cost.
- Never describe a compensation as "roll back". Name the business action.
- Never choose the point of no return for the owner.
