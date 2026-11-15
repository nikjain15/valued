---
name: modernize-data-model
description: Research the legacy data model in depth and design the target one, producing an exact list of the new schemas, tables and columns to build, the type changes, and what is dropped, with every legacy column accounted for. Use when a modernization changes the database, splits data between services, or when asked which schemas or columns need to be built.
---

# Data model: every legacy column gets a home

Goal: a target model the owner can sign, and a build list a team can work from. The tool refuses a model
that loses a column silently.

## 1. Research the legacy model, in depth

Run `python3 modernization/mos_design.py schema extract`. It reads SQL table definitions and COBOL
copybooks, and records which code reads and writes each table. Then go further than the tool can:

| Dig into | What to find | Where |
|---|---|---|
| Structures the tool missed | Entity classes, file layouts, message formats, schemas created in code or by migration scripts | Code, build scripts |
| True meaning of each field | Units, allowed values, defaults, who sets it and when | Code that writes it; data dictionaries in `sources/` |
| Overloaded fields | One column, several meanings: flags packed in a string, type codes that change the meaning of other columns, REDEFINES, magic values (`99999999`, `0001-01-01`, spaces) | Conditionals on the field |
| Hidden relationships | Joins and lookups with no foreign key; keys built by concatenation | SQL and lookups in code |
| Derived and duplicated data | Totals stored beside details, copies kept in sync by code | Writers of the same value in two places |
| Rules enforced only in code | Uniqueness, ranges, required-together fields with no database constraint | Validation code |
| Dead and zombie columns | Never read, never written, or written and never read | The usage matrix in `legacy-schema.json`, then dynamic SQL, reports and stored procedures |
| Who owns each table | The workflow that writes it. Several writers means a contested table | Usage matrix, workflow profiles |
| Volumes and history | Row counts, growth, how far back history is kept | Owner, runbooks |

Record findings in `modernization/data/legacy-notes.md`: one table per legacy table, a row per column
with meaning, evidence (`code:path:line` or `doc:source:line`) and anything odd. In parallel per table
group if you can. Unknown meanings go to the owner through `modernize-discover`, not into a guess.

## 2. Design the target model

Decide, and show as recommendations with trade-offs:

| Decision | Options to weigh |
|---|---|
| Schema boundaries | One schema per owning service, drawn where the workflows' writes separate. A table two services must both write is a boundary drawn in the wrong place |
| Contested tables | Split by writer; or give one service ownership and the others an interface |
| Overloaded fields | One column per meaning; codes to lookup tables or enumerations |
| Types | Exact decimals for money, real dates and timestamps with timezone, proper booleans, Unicode text |
| Keys | Keep business keys as unique columns; add surrogate keys where legacy keys are composite or reused |
| What sagas need | A status column per saga-managed record, an idempotency key, an outbox table per service that publishes events, timestamps for audit |
| History | Keep, archive or summarise. Retention is the owner's call |

## 3. Write `modernization/data/target-model.json`

```json
{
  "schemas": {
    "payments": {"status": "new", "owner_service": "payments", "reason": "split from the shared schema"}
  },
  "tables": {
    "payments.payment": {
      "status": "new", "reason": "replaces PAYMENT",
      "columns": {
        "id":              {"type": "uuid", "source": "new", "reason": "surrogate key"},
        "amount":          {"type": "numeric(12,2)", "source": "legacy:PAYMENT.AMT"},
        "state":           {"type": "text", "source": "derived", "reason": "saga status; from PAYMENT.STAT codes"},
        "idempotency_key": {"type": "text", "source": "new", "reason": "safe retries"}
      }
    }
  },
  "dropped": {
    "PAYMENT.OLD_REF": {"reason": "never read since 2019", "confirmed_by": ""}
  }
}
```

- `status`: `new`, `changed` or `existing`. `source`: `legacy:TABLE.COLUMN` (one or a list), `new` or
  `derived`. `new` and `derived` need a `reason`.
- A legacy column may feed several target columns; several may merge into one.
- Dropping a column is the owner's call: `confirmed_by` stays empty until they say so.

## 4. Run the gate

`python3 modernization/mos_design.py model check`

It fails if any legacy column has neither a target nor a confirmed drop, if a target column has no
type or source, or if a schema has no owning service. It writes `modernization/data/build-list.md`:
new schemas, new tables, new columns, type changes, drops. Show that file to the owner.

## 5. Plan the data move

For each target table: how it is first loaded, how it stays in step while old and new run together
(which side is the master, from the workflow profile), how the move is checked (row counts, control
totals, sampled record compare), and how it is rolled back. Write it to `modernization/data/migration.md`.

## Never

- Never infer a field's meaning from its name alone. Cite the code or a document, or mark it (assumed).
- Never drop, merge or retype a column without it appearing in the build list.
- Never copy real records into fixtures or documents. Use invented rows.
- Never run a schema change or a data load against a shared database. Produce the scripts; the owner runs them.
