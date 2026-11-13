---
name: valued-explore
description: Show the product lead the three or four most important topics still open in a VALUED session, ranked for this case by criticality, industry and the answers so far, as talking points they can read to the client, then a card to choose which to explore and add detail. Runs automatically after the core questions and again after V and A land; also when the user types /valued-explore.
---

# /valued-explore: what to explore next, ranked for this case

The product lead reads this in the Claude chat; the client sees only the approach page. Print nothing else.

## 1. Rank what is still open
Open topics are the conditional cards (see "Ask or assume" in `.claude/skills/valued/SKILL.md`) that have not
been asked: assumed ones and ones not yet decided. After the core questions, rank the Round 1 topics; after V and A
have landed, rank the Round 2 topics. Score each:
- **Criticality** (highest weight): could getting it wrong harm a person, cost money, or breach a rule or a
  commitment to customers? Customer-facing, regulated, health, money and vulnerable-group topics rank high.
- **Industry**: what this industry's regulators and research say matters (use `out/gates/r.json`): for example
  transparency and fairness weigh more in insurance, banking, healthcare and the public sector than in an internal
  tool.
- **The answers so far**: a short timeline raises Dependencies; "tried before" raises Pause point and Past
  efforts; several systems raise Integrations; an AI approach that allows a model raises Trade-offs and
  Transparency; cost as the key outcome raises Value case and Alternatives.
Show only the **top three or four**. Label each "high priority" or "worth checking". The rest keep their researched
assumption quietly.

## 2. Print the talking points
Header: **What I'd want to understand next, given what you've shared**. One numbered item per topic: the title, the
label, one sentence on why it matters for this client (from their answers or the research, never generic), then
the question in the soft consultant voice, and the current assumption with its source number, or "being checked",
so the product lead can say "we've assumed X; does that hold?". Plain words, no jargon, no internal ids.

## 3. Ask which to explore
One card, `multiSelect: true`, header "Explore", question "Which of these would you like to go into?", one option
per ranked topic (its title, the why as the description), plus "Other" for more detail in their own words.
- Each chosen topic is asked next, one at a time, as its normal titled card, written from every answer so far.
- Text under "Other" is the client's answer: match it to the topic it concerns and record it on that card
  (`"assumed": false`, `by` the client role). If that card's gate has already run, apply it through
  `valued-feedback` so every page updates.
- Topics not chosen keep their researched assumption; they can be explored later with `/valued-explore`.
Then `out/tools/c render`.

## Memory between calls

Keep `out/explore.json` as `{ "offered": [topic titles], "picked": [topic titles] }`. Read it before ranking: never offer a
topic already answered, already picked, or offered twice before without being picked. Write it after every call. On a
second call, word the card differently ("Anything else worth a closer look?") so it never repeats the first card's text.
Explore cards use ids `X-<n>` and do not count toward the card total. Match "Other" text to topics: put each part of it
on the card it answers (in the client's words), and keep the whole text only once, on the explore card.
