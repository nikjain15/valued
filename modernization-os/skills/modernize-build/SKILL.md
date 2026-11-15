---
name: modernize-build
description: Generate and run the new code an approved design calls for, tests first. Covers schema scripts for the new tables and columns, data migration scripts, saga steps with their compensations, and the orchestrator. Use once the owner has approved the design, for anything that has no legacy code to transform.
---

# Build: new code from the approved design, tests first

Some of the target system has no legacy counterpart: the new schemas, the migration, the saga
orchestrator, the outbox. There is no old behavior to pin, so the order flips: the design becomes
tests, the tests fail, then the code makes them pass.

## Preconditions

The owner has looked at the design and said yes: `mos_design.py approve --by "<name>"` is on record.
The tool refuses a new-code slice otherwise, and again if the design changed after the approval.

## What to build, and from where

| Build | Source of truth | Tests that must exist |
|---|---|---|
| Schema scripts: new schemas, tables, columns, type changes | `modernization/data/build-list.md` | Applies cleanly to an empty database; every listed column exists with the listed type; applying twice is safe |
| Data migration | `modernization/data/migration.md`, the `legacy:` sources in `target-model.json` | Row counts match; control totals match; a sample of invented rows maps field by field; overloaded fields land in the right columns |
| Each saga step and its compensation | `modernization/architecture/sagas/<name>.json` | Step succeeds; step repeated has no second effect; compensation undoes it; compensation repeated is safe |
| The orchestrator, or the event handlers | The saga's steps, kinds and timeouts | Happy path; failure at each step compensates the earlier ones in reverse; timeout at each step; nothing compensates after the point of no return; retriable steps retry until success |
| Outbox and message publishing | The architecture document | State change and message commit together; a crash between them loses neither |

## Steps, per slice

1. **Register it.** One unit per slice, small enough to review in one sitting:
   `python3 modernization/mos.py slice add N1 --kind new --title "..." --files <files to be created> [--jira KEY]`
2. **Write the tests from the design.** One test per row in the table above that applies. Take
   every expected value from the design files, not from what you plan to write. Use invented data.
3. **Prove they fail:** `python3 modernization/mos.py baseline N1 -- <test command>`.
   For a new-code slice this gate passes only when the tests fail. Tests that pass before the code
   exists prove nothing.
4. **Write the code** in the target stack's ordinary style. Smallest thing that satisfies the design.
5. **Record and prove:** `python3 modernization/mos.py transformed N1 --files <new files>`, then
   `python3 modernization/mos.py verify N1`. Same command, now passing.
6. **Continue through the usual gates:** `modernize-secure`, `modernize-document`, owner approval.

## Running things

- Run tests and builds locally, as often as needed. That is the point.
- Schema and migration scripts run only against a local or disposable database you created for the
  test. Produce the scripts for shared environments; the owner runs them.
- If a test needs a service that is not there (a queue, a provider), use an in-process fake and say so
  in the slice document. Note the integration test still owed.

## If the design is wrong

Building is where design gaps show. Do not patch around one in code. Stop, journal it, fix the design
file, rerun `mos_design.py gate`, and show the owner: the approval is void until they approve again.

## Never

- Never write the code before the failing tests are recorded.
- Never change a test to match the code. Change the code, or raise the design.
- Never build something the approved design does not contain.
- Never run a script against a database you did not create for the test.
- Never use real records as test data.
