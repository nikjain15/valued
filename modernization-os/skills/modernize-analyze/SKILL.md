---
name: modernize-analyze
description: Analyze a legacy system before any change. Builds the inventory, the dependency graph, dead-code candidates and a hotspot ranking by complexity and business impact, then proposes a slice plan. Use at the start of a modernization, or when asked what a legacy codebase contains, what depends on what, or where to start.
---

# Analyze the legacy system

Goal: a map the owner can trust, and a plan of small slices in a defensible order. No code changes.

## Steps

1. **Count.** `python3 modernization/mos.py inventory`. Read the build and delivery files it lists to
   learn how the system is built, tested and shipped today.
2. **Map.** `python3 modernization/mos.py graph`. The tool resolves static references for Python,
   JavaScript and TypeScript, Java, Kotlin, Scala, C and C++, Go, Ruby, PHP and COBOL (COPY and CALL).
3. **Fill the gaps by reading.** For languages the tool does not parse, and for dynamic calls
   (reflection, config-driven dispatch, job schedulers, stored procedures, message queues), read the code
   and write the edges you can prove to `modernization/graph.extra.json` as `[["from/file", "to/file"]]`.
   Rerun `graph`. In parallel per top-level module if you can.
4. **Ask for business impact.** Show the top-level areas in a table and ask the owner to rate each
   from 1 to 5. Write the answer to `modernization/impact.json` as `{"path/prefix/": 4}`. Unrated
   areas stay 3 (assumed).
5. **Rank.** `python3 modernization/mos.py rank --top 12`. Score = branches, used-by count, change
   frequency and size, scaled by impact.
6. **Review dead-code candidates.** For each one in `graph.json`, search for its name in configs,
   scripts, schedulers and strings. Sort into: referenced after all, likely dead, cannot tell.
7. **Ask the two framing decisions** (target stack; slice by slice or one cut-over), each with your
   recommendation and trade-offs. Record the answer:
   `python3 modernization/mos.py target --stack "..." --strategy "..." --by "<name>"`.
8. **Propose the slice plan** and write `modernization/plan.md`. Register each agreed slice:
   `python3 modernization/mos.py slice add S1 --title "..." --files a b c`.

## Slice rules

- A slice is something one person can review in one sitting: aim for under 400 changed lines.
- A slice has a seam: its inputs and outputs can be exercised by a test.
- Order: leaves first (files nothing else in the slice plan depends on), then inward. Break a cycle
  with an interface slice before touching its members.
- First slice: low risk, real value, exercises the whole pipeline once.
- High score with high impact means careful, not first.

## `modernization/plan.md`

| Section | Content |
|---|---|
| System at a glance | Languages, size, how it builds and ships today (from `inventory.json`) |
| Target | Stack and strategy, who decided |
| Risks found | Cycles, files with no seam, areas with no tests, dynamic dispatch you could not map |
| Slice plan | Table: slice, title, files, why this order, test seam, risk |
| Dead-code candidates | Table: file, verdict, evidence. Deleting is the owner's call |
| Assumptions | Every fact marked (assumed), and who can confirm it |

## Done when

`inventory.json`, `graph.json`, `hotspots.json` and `plan.md` exist, the target is on record, and at
least the first slice is registered. Then hand back to `modernize`.
