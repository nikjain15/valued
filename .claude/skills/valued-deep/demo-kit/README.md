# Demo kit: reference implementation

Working files from the UC2 Knowledge and Search build (fictional plan "Lakewell"), kept as a starting point
for the next `/valued-deep go build`. Every name in them is invented. Copy what you need into the case's
prototype folder and replace the case content; keep the structure. The rules they implement are in
`../demo-standard.md`.

| File | What it is | Replace for a new case |
|---|---|---|
| `story-shared.js` | The five-step story bar (`STORY5`, `storyStepper`), the How it works step list (`HOW4`), icons, the source-versus-delivered `compare()`, the step flows (`todaySVG`, `fixSVG`) and the architecture view (`STEPS4`, `approachHTML`) | `STEPS4` (your architecture, from the strategy), `HOW4` (your four steps and their leads) |
| `story.css` | All demo styles: story bar, scene player, flows, key takeaways, icon play and stop, the colour rule | Nothing, unless the design system differs |
| `day.html` | Current state and Future state on one page (`?mode=today`, `?mode=new`), plus Solution architecture (`?mode=approach`): channel tabs, real artefacts, the per-channel talk-through, the answer path panel and the knowledge graph | The channels (`CH`), their artefacts, the fixes (`FIX4`), the voiced lines |
| `how-engine.js` | The scene player for How it works: a person acts, the AI reads and proposes with results one at a time, a person decides, then the result | Nothing; it reads `ACT` and `SCENES` |
| `how-scenes.js` | One scene per sub-step: trigger, what the AI reads, what it does, who decides | All scenes |
| `how1.html` | One How it works page: its `ACT` config (lead, sub-steps, the artefact each sub-step produces) | One page per architecture step |
| `eval-core.js` | `evalAll(state)`: the single scorer shared by the evals runner and Prove it (golden, sealed holdout counts, rule tests, probe sets) | The tests, groups and bars, from the strategy's eval section |
| `prove.html` | Prove it: golden set, independent probes, sealed holdout, release gate, what fails and the fix, observe and feedback, key takeaway, all computed live by `evalAll` | `FIXED` (from your decision log), feedback examples, the weekly checks |

The kit depends on the prototype's engine and data (`answer()`, `DOCS`, `ROLES`, `store`, `S()`, `nav()`,
`esc()`, `QS`), which every case builds for itself. Read `prove.html` and `how-engine.js` first: they show
the scene pattern most plainly.
