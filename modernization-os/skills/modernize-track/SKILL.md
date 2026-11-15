---
name: modernize-track
description: Keep Jira in step with the modernization, after a person approves each update. Comments on the issue that tracks a slice with the recorded evidence, moves it through its workflow, and can open issues for slices that have none. Use after a slice passes a gate, when asked to update Jira, or when setting up tracking for the slice plan.
---

# Track: Jira says what the evidence says

The update is written by a tool from what is on disk: which tests ran, with what result, on which
commit, who approved. You do not compose it, so it cannot claim more than happened. Nothing is sent
until the owner has seen the exact text and said yes.

## Set up once

Ask the owner: the Jira address, whether updates may be sent from this machine, whether slices
without an issue should get one (and in which project), and which Jira status each gate maps to.

```
python3 modernization/mos_jira.py setup --base https://jira.yourcompany.example \
    --project PAY --create-missing --transition verified="In Review" approved=Done
python3 modernization/mos_jira.py link S1 PAY-204
```

The owner sets `JIRA_TOKEN` in their own shell (and `ATLASSIAN_EMAIL` on Atlassian Cloud). Never ask
for it, print it or store it.

## Each update

1. `python3 modernization/mos_jira.py plan`
   Writes `modernization/jira/outbox.json` and shows a table of every comment, status change and new
   issue it would send. It skips what was already sent.
2. Show the owner the table, and the full text if they want it.
3. Only on their yes: `python3 modernization/mos_jira.py push --approved-by "<their name>"`

The push is refused if the outbox was edited after it was shown, or if the work moved on since. Plan
again and show it again. If Jira rejects one update partway, what was sent is logged and is not sent
twice.

## When to offer an update

| Moment | Offer |
|---|---|
| Slice plan agreed | Open or link an issue per slice |
| A slice is verified | Comment with the test evidence; move to review |
| A slice is approved | Comment with the approval; move to done |
| A slice is blocked for more than a session | Tell the owner; they may want a comment. Write it for them to post, or record it with `mos.py decide` |

Do not offer after every small step. One update per gate that matters to people outside the team.

## What goes in a comment

Built by the tool: the slice, its status, the test command and result with time and commit, the
security review counts, the handover document path, who approved, the files. No personal data, no
source code, no secrets.

## Never

- Never run `push` without the owner's yes to the plan they were shown, in this session.
- Never edit `outbox.json`. To change what is sent, change the work, then plan again.
- Never write to Jira any other way: no direct calls, no other tool, no MCP server.
- Never write to Confluence. Handover documents are files; the owner publishes them.
- Never mark an issue done for a slice that is not `approved`.
