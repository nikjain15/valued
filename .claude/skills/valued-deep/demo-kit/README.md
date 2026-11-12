# Demo kit: reference implementation

Working files from the UC2 Knowledge and Search build (refreshed 3 Nov 2026, P-010 to P-013) (fictional plan "Lakewell"), kept as a starting point
for the next `/valued-deep go build`. Every name in them is invented. Copy what you need into the case's
prototype folder and replace the case content; keep the structure. The rules they implement are in
`../demo-standard.md`.

| File | What it is | Replace for a new case |
|---|---|---|
| `story-shared.js` | The story bar (`STORY5`: six steps plus PRD, `storyStepper`), icons, shared helpers | The step list only if the story differs |
| `story.css` | All demo styles: story bar, scene player, dashboards, the colour rule | Nothing, unless the design system differs |
| `day.html` | Current state and Future state (`?mode=today`, `?mode=new`) with channel tabs, artefacts and MECE takeaways | The channels, artefacts, fixes and takeaways |
| `flowmap.js`, `vendors.js` | Solution architecture: the jobs map that builds one layer per arrow press, each job's "How it runs" list, techniques and product kinds (never vendors) | Jobs, steps, techniques |
| `how-engine.js`, `how-scenes.js`, `how1.html` | How it works: click-to-advance scenes mirroring each job's step list, record cards, the people strip | Scenes, records and one page per job |
| `eval-core.js` | `evalAll(state)`: the single scorer (golden, sealed holdout counts, rule tests, probe sets, the fairness pairs) | Tests, groups, bars and fairness pairs |
| `prove.html` | Prove it: the Release decision dashboard (Summary with meanings, Responsible AI, accuracy, red-team, fairness, gates, what went wrong, monitoring, not testable yet), then Accuracy, Red-team, Release gate and monitoring, Questions we never tested; all click-to-advance and computed live | `FIXED` (from your log), the untested questions, feedback examples |
| `plan.html` | Roadmap: phase cards with techniques and tools (build, buy, use today's) and the who-does-what journey | Phases, tools, journey steps; keep it equal to the build list |
| `choices.html` | Trade-offs: ranked "we chose X instead of Y", cost, how we keep it small, how later builds fix it | The rows, from your log |
| `talktrack.py` | Talk track markdown to PDF with headless Chrome | Nothing |
| `publish.sh` | The public copy: two-stage copy, real-name gate, cache stamp, never touches the public `.git` (P-008) | The case block at the top |

The kit depends on the prototype's engine and data (`answer()`, `DOCS`, `ROLES`, `store`, `S()`, `nav()`,
`esc()`, `QS`), which every case builds for itself. Read `prove.html` and `how-engine.js` first: they show
the scene pattern most plainly.
