---
name: modernize-secure
description: Review a transformed slice for vulnerabilities, patch them, and confirm the regulatory and control patterns embedded in the legacy code survived the change. Use after a slice passes verify, or when asked for a security or compliance check of modernized code.
---

# Secure and stay compliant

Goal: the new code is no less safe and no less compliant than the old. Legacy systems often carry
controls nobody wrote down: an audit record written before a balance changes, a field masked in one
report, a four-eyes check buried in a batch job. Losing one silently is the failure this stage exists
to stop.

## Preconditions

Slice is `verified`. The owner has named the regulations and internal controls that apply (asked once,
recorded with `mos.py decide`). If not asked yet, ask now.

## Steps

1. **Inventory the controls in the legacy slice.** Read the old code for: authentication and
   authorization checks, audit and journal writes, masking and redaction, encryption, retention and
   deletion, validation and limits, segregation of duties, reconciliation and control totals, consent
   checks. One row each with `path:line`.
2. **Prove each control survived.** Point to the new `path:line`. If a control has no test in the
   baseline, add one now.
3. **Review the new code for vulnerabilities:** injection (SQL, command, template, path), unsafe
   deserialization, missing authorization on new entry points, secrets in code or config, weak or
   home-made cryptography, sensitive data in logs and error messages, unvalidated input at the seam,
   unsafe defaults.
4. **Review the dependencies the slice introduced or upgraded.** Run the ecosystem's own audit tool if
   the repo has one available (for example `npm audit`, `pip-audit`, `mvn dependency-check`). If none is
   available, list the new dependencies with versions and say the check was not run.
5. **Patch** what you can inside the slice. Smallest fix that closes the finding.
6. **Write `modernization/evidence/<slice>/security.json`:**

   ```json
   {
     "findings": [
       {"id": "SEC-1", "severity": "high", "title": "...", "where": "path:line",
        "status": "fixed", "accepted_by": ""}
     ],
     "regulatory_patterns_kept": [
       {"control": "...", "legacy": "path:line", "new": "path:line", "test": "..."}
     ],
     "checks_not_run": ["..."]
   }
   ```

   `severity`: low, medium, high or critical. `status`: fixed, accepted or open.
7. **Run the gate:** `python3 modernization/mos.py secure S1`. It blocks on any open high or critical
   finding and on an accepted finding with no named person, then reruns the tests.

## Accepting a finding

Only the owner can accept a risk. Show the finding, the fix you recommend and what accepting costs. Write
their name in `accepted_by` only after they say so, and record it with `mos.py decide`.

## Never

- Never mark a finding fixed without pointing to the change.
- Never put a real secret, token or personal record in the report, a test or a fixture.
- Never claim compliance with a regulation. Report which controls were found and kept; the owner's
  compliance function signs.
- Never run a scanner that sends code to an outside service without the owner agreeing.
