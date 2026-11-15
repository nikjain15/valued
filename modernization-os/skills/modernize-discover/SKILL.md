---
name: modernize-discover
description: Profile each business workflow in a legacy system and tailor the modernization to it by asking the owner adaptive questions, only the ones the code and documents could not answer, with follow-ups that depend on each answer. Use after analysis and before designing the data model or architecture, or when asked to understand, map or scope a workflow.
---

# Discover: one profile per workflow, questions that adapt

No two workflows modernize the same way. A nightly settlement job and an order screen need different
designs, tests and cut-over plans. This skill finds the workflows, learns each from evidence first,
and asks the owner only what is left.

## Steps

1. **Find the workflows.** From entry points (`modernization/graph.json`), job schedules, screens,
   queues and the documents in `modernization/sources/`. A workflow is one business outcome from trigger
   to finish ("take a payment", "close the month"). Show the list; the owner confirms, merges or adds.
2. **Research each one before asking anything.** Trace it through the code end to end. Read its
   documents and its tickets. Fill what you can in `modernization/workflows/<name>.json`.
3. **Ask adaptively** (rules below) until the remaining unknowns would not change the design.
4. **Run the gate:** `python3 modernization/mos_design.py workflow check`.

## The profile

```json
{
  "name": "take-a-payment",
  "facts": {
    "trigger":                {"value": "...", "source": "code:src/pay/api.py:41"},
    "actors":                 {"value": ["customer", "payments clerk"], "source": "doc:payments-spec:120"},
    "steps":                  {"value": ["..."], "source": "code:src/pay/flow.py:12"},
    "data_touched":           {"value": {"PAYMENT": "CU", "LEDGER": "C"}, "source": "code:src/pay/dao.py:30"},
    "consistency_need":       {"value": "...", "source": "owner:Name"},
    "volume":                 {"value": "...", "source": "assumed"},
    "failure_handling_today": {"value": "...", "source": "doc:jira-pay-881:14"},
    "target_shape":           {"value": "saga across payments and ledger", "source": "owner:Name"}
  },
  "open_questions": []
}
```

Every fact carries one source: `code:path:line`, `doc:source:line`, `owner:Name` or `assumed`.
`consistency_need` and `target_shape` are the owner's call and can never stay assumed. Add any other
fact the workflow needs; the eight above are the minimum.

## How to ask

- **Evidence first.** Never ask what the code or a document already answers. Show what you found and
  ask the owner to correct it instead: "the code retries three times then writes to an error table;
  is that still how it is handled?"
- **At most four questions a round.** Plain words, their terms, no method jargon.
- **A choice comes with a recommendation** and the trade-off of each option, yours first.
- **Each answer picks the next question.** Use the table below; skip every branch whose signal is absent.
- **Go deeper where it is risky** (money, regulated data, many dependents, frequent incidents), stay
  shallow where it is not.
- **Stop** when the next question would not change the data model, the architecture, the tests or the
  cut-over. Park the rest in `open_questions`.
- **Record** who answered. Never ask the same thing twice; read the profile first.

## Signals and the questions they open

| Signal in the code, documents or an answer | Ask | It shapes |
|---|---|---|
| Writes to more than one database, or will cross a service boundary once split | Must every part succeed together, or may they disagree briefly? For how long? What may a customer see in between? | Saga or single transaction |
| The answer was "may disagree briefly" | Which step is the point of no return? What is the undo for each earlier step in business terms (refund, release, reversal entry)? | Compensations, pivot |
| The answer was "must succeed together" | Can these stay in one service and one database? What forces them apart? | Service boundary |
| Money, stock, entitlements or balances | How is it reconciled today, how often, and who acts on a mismatch? | Control totals, audit trail |
| Calls an outside system (payment provider, partner, mainframe) | Can the call be undone? Is a repeat safe? What happens today when it times out? | Idempotency, retries |
| A person approves or a step waits | How long may it wait? What happens on expiry? Who can override? | Timeouts, escalation |
| Batch job | What is the window? Can it restart midway? What must run before and after? Who consumes its files? | Batch or events, ordering |
| A field with flags, codes, reused meanings, or a REDEFINES | What does each value mean? Which are still in use? | New columns, lookup tables |
| Manual repairs in tickets or runbooks | How often, who does it, what are the exact steps? | The repair becomes a designed compensation |
| Reports, extracts, files other teams read | Who depends on the exact layout? Can it change? | Compatibility contracts |
| Personal, financial or health data | Retention period, masking, where it may be stored, who may see it | Schema, access, residency |
| Old and new must run side by side | Which system is the master for each kind of record during that time? Which way does data flow? | Coexistence, sync |
| Volumes or peaks unknown | Typical and peak load, growth expected, the slowest acceptable response | Sizing, sync or async |
| A planned change found in tickets | Is it still wanted? Must the new design allow for it? | Scope |

## Output per workflow

One table to the owner: what we learned, where from, what is still assumed, and our early read of how
this workflow should be modernized, with the trade-offs. Then hand to `modernize-data-model`.

## Never

- Never fill `consistency_need` or `target_shape` yourself.
- Never ask a question whose answer is in the repository or the sources.
- Never present an assumption as a fact.
