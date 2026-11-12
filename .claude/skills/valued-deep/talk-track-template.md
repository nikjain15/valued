# <Product name>: talk track

<date> · <minutes> minutes · start tab: `day.html?mode=today` · everything shown is synthetic; <client> is an invented name.

**Timing:** Current state 5 · Solution architecture 4 · How it works 8 · Prove it 4 · Future state 2 · Roadmap 4 · Trade-offs 1 · PRD 2.

**Opening line:** "<the problem in one sentence, in money and risk>"

---

## 1. Current state (5 min)

**On screen:** <the main user's day across the channels>, then Key takeaway.

**Say:**
- "<the user asks one question N ways and gets N answers>"
- Scale, aloud only: <sourced public figures, never the client's>.
- Close on the takeaway.

**Click:** <what to press, in order>

**Q&A**

| They ask | You answer |
|---|---|
| <hostile question> | <answer, with its source or "(assumed)"> |

---

<!-- Repeat the block for: 2. Solution architecture, 3. How it works, 4. Prove it (name all its tabs, say the
     tab count, walk the dashboard sections: Summary, Responsible AI, Fairness, To improve), 5. Future state,
     6. Roadmap (open the who-does-what journey), 7. Trade-offs, 8. PRD. Every rate names its own
     denominator. demo-check.js --talk fails if a step or tab is missing or the tab count is wrong. -->

## Never say

- Any single ROI or payback number.
- A public benchmark as the client's own rate.
- "The model is answering live" (say "recorded ahead of time, replayed").
- "Independent held-out test", "validated labels" or "ready to release".
- Vendor names as recommendations; on screen they are product kinds, aloud only as market examples.
- That the stories, members or ratings are real.

## Day-of checklist

| Check | How |
|---|---|
| Fresh browser | Incognito, or Cmd+Shift+R on every page |
| Seal check | Prove it: held-out test count, seal intact |
| Demo check | `demo-check.js` prints `Clean` |
| Offline copy | Local copy open in a second tab |
| Start tab | <public URL>/day.html?mode=today |

Rebuild the PDF after every change: `python3 .claude/skills/valued-deep/demo-kit/talktrack.py out/<case>-final-story.md`
