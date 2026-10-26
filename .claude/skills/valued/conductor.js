#!/usr/bin/env node
// VALUED conductor. Plain Node, no dependencies. Every gate writes JSON under out/gates/; this script
// renders everything that is mechanical: the gate files, state.md, the PRD, case.json, the brief,
// the run report. The model writes judgement (drafts, options, reasons, the summary, section 17).
//
//   node conductor.js clock <phase> start|end [note]   append to out/run-clock.jsonl
//   node conductor.js clock status                     elapsed per phase against the budget
//   node conductor.js cards print <round>              print the cards of a round from out/cards.json
//   node conductor.js cards auto <round>               answer a round with the recommended options
//   node conductor.js seed <industry>                  golden-set seeds, sweep templates, systems
//   node conductor.js model-inputs                     label-free, shuffled texts for the guard model
//   node conductor.js render                           gate files, state.md, prd.md, case.json, brief
//   node conductor.js check                            what is still missing, by standard
//   node conductor.js report                           out/run-report.json
//   node conductor.js cut <phase> <what>               record a scope cut and print the one line to say
// Run from the workspace root (the folder that holds out/ and .claude/).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out"), PROTO = path.join(OUT, "proto"), GATES = path.join(OUT, "gates");
const SK = path.join(ROOT, ".claude", "skills");
const read = (f, fb = "") => { try { return fs.readFileSync(f, "utf8"); } catch { return fb; } };
const json = (f, fb) => { try { return JSON.parse(read(f)); } catch { return fb; } };
const write = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const writeJson = (f, o) => write(f, JSON.stringify(o, null, 2) + "\n");
// Observability: every command leaves one event in out/trace.jsonl (rendered by valued-audit/observe.js).
const trace = (e) => { try { fs.mkdirSync(OUT, { recursive: true }); fs.appendFileSync(path.join(OUT, "trace.jsonl"), JSON.stringify({ t: Date.now(), ...e }) + "\n"); } catch {} };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const clean = (s) => String(s ?? "").replace(/—/g, ", ").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const cell = (s) => clean(s) || "";
const table = (head, rows) => rows.length ? [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.slice(0, 12).map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n") : "";
const A = (x) => (Array.isArray(x) ? x : []);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const PHASES = [
  ["0", "Frame", 3], ["1", "Round 1", 2], ["2", "V then A", 7], ["3", "Round 2", 2],
  ["4", "L and U", 5], ["5", "E and D", 6], ["6", "Build", 3],
];
const CUTS = {
  "2": ["fewer candidates: 8 instead of 12", "two wave options instead of three", "shorter reasons"],
  "4": ["golden set 32 rows instead of 40 (holdout stays 12)", "6 sources instead of 8", "shorter prose"],
  "5": ["one round of harder rows skipped", "drive table 5 rows", "shorter prose"],
  "6": ["FAQ 7 pairs", "section 17 with 5 tasks", "shorter prose"],
};

const G = (k) => json(path.join(GATES, `${k}.json`), null);
const gates = () => ({ v: G("v"), a: G("a"), l: G("l"), u: G("u"), e: G("e"), d: G("d"), b: G("b") });
const cards = () => json(path.join(OUT, "cards.json"), []);
const caseLine = () => (read(path.join(OUT, "case-line.txt")).trim() || (read(path.join(OUT, "prd.md")).match(/<!-- Case: (.*) -->/) || [, ""])[1]);

// ---------- recommendation block ----------
function rec(r, label = "Option") {
  if (!r || !A(r.options).length) return "";
  const rows = r.options.map((o, i) => [o.label || o.name || o.metric || o.option, o.tradeoff || o.rulesOut || "", i === 0 || o.label === r.preferred || o.name === r.preferred ? "**Preferred**" : ""]);
  return [table([label, "Trade-off", ""], rows), "", `**Why we prefer ${rows[0][0]}:** ${clean(r.why)}`, `**What would change our mind:** ${clean(r.changeMind)}`].join("\n");
}
function gov(rows) { return table(["Question", "Answer", "Status"], A(rows).map((g) => [g.question, g.answer + (g.owner && !/^answered/i.test(g.status || "") ? ` (closes it: ${g.owner})` : ""), g.status])); }
function sayIt(lines) { return A(lines).length ? ["**Say it**", ...A(lines).map((l) => `- ${clean(l)}`)].join("\n") : ""; }
function cardsMd(gate) {
  const cs = cards().filter((c) => c.gate === gate);
  return cs.length ? ["**Cards**", "", table(["Card", "Options (recommended first)", "Decision"], cs.map((c) => [`${c.role}: ${c.question} If none fits, answer with: ${c.format}`, A(c.options).map((o, i) => `${o.label}${i === 0 ? " (Recommended: " + clean(o.tradeoff) + ")" : " (" + clean(o.tradeoff) + ")"}`).join(" · "), c.decision ? `${c.decision}${c.auto ? " (auto)" : ""}` : "open"]))].join("\n") : "";
}

// ---------- gate files ----------
function gateV(v) {
  return [`# V: Value`, "", `**Case:** ${clean(caseLine())}`, "", "## Value frame", "", table(["Work item", "Who", "Volume / month", "Cost or time per item", "Cost of wrong or slow", "Today's metric", "Regulated?"], A(v.valueFrame).map((r) => [r.item, r.who, r.volumePerMonth, r.costPerItem, r.costOfWrong, r.todayMetric, r.regulated])),
    "", "## Candidates", "", table(["ID", "Use case", "Rung"], A(v.candidates).map((c) => [c.id, c.name, c.rung])), "", "## North-star recommendation", "", rec(v.northStar, "Metric"), "", cardsMd("V"), "", "## Governance check", "", gov(v.governance), "", sayIt(v.sayIt), ""].join("\n");
}
function gateA(a) {
  return [`# A: AI-fit`, "", "## Ranked use cases", "", table(["Use case", "Lowest rung", "Value", "Feasibility", "Risk", "Reuse", "Overall", "Reason"], A(a.scores).map((s) => [`${s.id} ${s.name || ""}${s.notGenAI ? " (not GenAI: " + (s.instead || "rules") + ")" : ""}`, s.rung, s.value, s.feasibility, s.risk, s.reuse, s.overall, s.reason])),
    "", "## First-wave recommendation", "", rec(a.waves, "Wave"), "", "## Sourcing and stack", "", table(["Component", "Rung", "Build, buy or partner", "Why", "What would change our mind", "Routing and latency"], A(a.sourcing).map((s) => [s.component, s.rung, s.choice, s.why, s.changeMind, `${s.routing || ""} ${s.latency || ""}`.trim()])), "", `Numbers to quote: ${clean(a.numbersToQuote)}`,
    "", `## Product shape: \`${a.shape}\``, "", clean(a.shapeWhy), "", "## Assistants", "", table(["Assistant", "Rules or AI", "Job", "May", "Never", "Release check"], A(a.agents).map((g) => [g.name, g.kind, g.job, A(g.may).join("; "), A(g.never).join("; "), g.gate])), "", "## Sweeps", "", table(["Sweep", "Rules or AI", "Schedule", "Checks", "Decision handed to a person"], A(a.sweeps).map((s) => [s.agent, s.kind, s.schedule, s.checks, s.decision])),
    "", `**Engine:** ${a.engine} (chosen by ${a.engineBy || "IT and risk"})`, "", cardsMd("A"), "", "## Governance check", "", gov(a.governance), "", sayIt(a.sayIt), ""].join("\n");
}
function gateL(l, counts) {
  return [`# L: Labels`, "", "## Label spec", "", table(["Verdict", "Label", "Requires"], ["answer", "human", "escalate"].map((k) => [k, (l.verdicts || {})[k]?.label, (l.verdicts || {})[k]?.desc])), "", "## Groups", "", table(["Group", "Values", "Why it matters", "Rows (dev / holdout)"], A(l.groups).map((g) => [g.key, A(g.values).join(", "), g.why, counts[g.key] || ""])),
    "", "## Labelling-approach recommendation", "", rec(l.labelling, "Approach"), "", `**Golden set:** ${counts.golden} dev rows, ${counts.holdout} sealed holdout rows (${counts.holdoutEsc} escalations: a 0.99 bar means zero misses). ${clean(l.goldenNote)}`, "", "## Systems to connect", "", table(["System", "Category", "Provides", "Used for", "Access", "Personal data", "Owner", "Status"], A(l.connectors).map((c) => [`${c.name} (${c.vendor || "vendor to confirm"})`, c.category, c.provides, c.usedFor, c.access, c.pii, c.owner, c.status])),
    "", "## Data and privacy", "", table(["Data", "Owner", "Purpose", "Personal or health data", "Minimisation", "Retention"], A(l.dataPrivacy).map((d) => [d.data, d.owner, d.purpose, d.personal, d.minimisation, d.retention])), "", cardsMd("L"), "", "## Governance check", "", gov(l.governance), "", sayIt(l.sayIt), ""].join("\n");
}
function gateU(u) {
  return [`# U: User-in-the-loop`, "", "## Autonomy table", "", table(["Action", "Autonomy", "Approver", "AI shows", "On failure"], A(u.autonomyTable).map((r) => [r.action, r.level, r.approver, r.shows, r.onFailure])), "", "## Autonomy recommendation", "", rec(u.autonomyRec, "Level"),
    "", "## Never list", "", ...A(u.neverList).map((n) => `- ${clean(n)}`), "", "## Escalation triggers", "", table(["Trigger", "Example phrasing", "Goes to", "Response time"], A(u.triggers).map((t) => [t.trigger, `"${t.example}"`, t.goesTo, t.responseTime])), "", "## Clocks", "", table(["Outcome", "Respond within", "Regulatory clock"], ["escalate", "human", "answer"].map((k) => [k, `${(u.clocks || {})[k]?.hours} h`, (u.clocks || {})[k]?.label])),
    "", `**Disclosure (compliance to confirm):** "${clean(u.disclosure)}"`, "", `**Logging:** ${clean(u.logging)}`, "", cardsMd("U"), "", "## Governance check", "", gov(u.governance), "", sayIt(u.sayIt), ""].join("\n");
}
function gateE(e, ev) {
  const runs = A(e.runs).map((r, i) => `### Run ${i + 1}: ${r.label || r.set}\n\n\`\`\`\n${r.output}\n\`\`\``).join("\n\n");
  return [`# E: Evals`, "", "## Proposed gates", "", table(["Gate", "Metric", "Bar", "Why this bar", "LLM judge"], A(e.gateTable).map((g) => [g.gate, g.metric, g.threshold, g.why, g.judge || "never"])), "", `**Client's bar for the riskiest miss:** ${e.bar}`, "", "## Runs", "", runs, "", "### Latest dev run", "", "```", ev.dev, "```", "", `### Sealed holdout${ev.independent ? "" : " (not independent: the same context wrote the golden set and the router)"}${e.repaired ? " (seen once before a family-level repair)" : ""}`, "", "```", ev.holdout, "```",
    "", "## Remaining misses", "", A(e.misses).length ? A(e.misses).map((m) => `- ${clean(m)}`).join("\n") : "- None on the dev set.", "", "## How to reproduce", "", "```", "node out/proto/eval.js", "node out/proto/eval.js holdout.json", "```", `Files: out/proto/router.js, out/proto/gates.json, out/proto/golden.json (${ev.goldenN} rows), out/proto/holdout.json (${ev.holdoutN} rows, sealed). ${clean(e.reproduceNote)}`, "", cardsMd("E"), "", "## Governance check", "", gov(e.governance), "", sayIt(e.sayIt), ""].join("\n");
}
function gateD(d) {
  return [`# D: Deploy and drive`, "", "## Deploy", "", table(["Step", "Proves", "Exit criterion", "Signs"], A(d.deploy).map((r) => [r.step, r.proves, r.exit, r.signs])), "", "## Drive", "", table(["Metric", "Why", "Alert threshold"], A(d.drive).map((r) => [r.metric, r.why, r.alert])), "", "## Pilot scope recommendation", "", rec(d.pilot, "Scope"), "", "## Stop rule recommendation", "", rec(d.stop, "Stop rule"), "", "## Plan", "", table(["Week", "Work"], A(d.plan).map((r) => [r.week, r.work])), "", cardsMd("D"), "", "## Governance check", "", gov(d.governance), "", sayIt(d.sayIt), ""].join("\n");
}

// ---------- eval results ----------
function evalResults() {
  const run = (f) => { if (!fs.existsSync(path.join(PROTO, "eval.js"))) return ""; const r = spawnSync("node", [path.join(PROTO, "eval.js")].concat(f ? [f] : []), { encoding: "utf8", timeout: 60000 }); return ((r.stdout || "") + (r.stderr || "")).trim(); };
  const dev = run(), holdout = run("holdout.json");
  const parse = (t) => Object.fromEntries((t.match(/^(.{1,39}?)\s{2,}(\S+)\s+(\S+)\s+(PASS|FAIL)\s*$/gm) || []).map((l) => { const m = l.match(/^(.{1,39}?)\s{2,}(\S+)\s+(\S+)\s+(PASS|FAIL)\s*$/); return [m[1].trim(), { value: m[2], bar: m[3], result: m[4] }]; }));
  const e = G("e") || {}, state = read(path.join(OUT, "state.md"));
  const independent = e.independent !== undefined ? Boolean(e.independent) : !/single-context|not independent/i.test(state + JSON.stringify(e));
  return { dev, holdout, devGates: parse(dev), holdGates: parse(holdout), devPass: /RELEASE PASSES ALL GATES/.test(dev), holdPass: /RELEASE PASSES ALL GATES/.test(holdout), independent, goldenN: json(path.join(PROTO, "golden.json"), []).length, holdoutN: json(path.join(PROTO, "holdout.json"), []).length };
}

// ---------- state.md ----------
function renderState(g) {
  const cs = cards(), open = Object.values(g).filter(Boolean).flatMap((x) => A(x.governance).filter((r) => !/^answered/i.test(r.status || "")).map((r) => [x.gate || "", r.question, r.status, r.owner || "to assign"]));
  const assumptions = Object.values(g).filter(Boolean).flatMap((x) => A(x.assumptions));
  const engine = (g.a || {}).engine;
  return ["# State", "", "## Case line", "", clean(caseLine()), "", `Mode: ${read(path.join(OUT, "mode.txt")).trim() || "orchestrated"}. Live PRD: localhost:${process.env.PORT || 4317}/prd.`, "", "## Client decisions", "", table(["Gate", "Card", "Decision", "By"], cs.filter((c) => c.decision).map((c) => [c.gate, c.question, `${c.decision}${c.auto ? " (auto)" : ""}${c.revised ? " (revised)" : ""}`, c.by || c.role])), "", engine ? `Build engine: ${engine} (chosen by ${(g.a || {}).engineBy || "IT and risk"})` : "", "", "## Assumptions", "", ...assumptions.map((x) => `- ${clean(x)}`), "", "## Governance log", "", table(["Gate", "Item", "Status", "Closes it"], open), "", read(path.join(OUT, "state-notes.md")), ""].join("\n");
}

// ---------- case.json ----------
function samplesFrom(golden) {
  const pick = (v, n) => golden.filter((r) => r.expected === v).slice(0, n).map((r) => ({ text: r.text, expect: v }));
  return [...pick("escalate", 2), ...pick("human", 2), ...pick("answer", 2)];
}
function fillConnectors(list, industry) {
  const lib = json(path.join(SK, "valued-labels", "connectors-library.json"), {});
  // Vendors appear only as examples: "e.g. <vendor> (assumed)"; anything else is dropped or wrapped.
  const vend = (v) => !v || /assumed/i.test(v) ? v || "" : /built|in-house|internal|this run|none|to confirm/i.test(v) ? "" : `e.g. ${String(v).replace(/^e\.g\.\s*/i, "")} (assumed)`;
  const have = A(list).map((c) => ({ ...c, vendor: vend(c.vendor) }));
  if (have.length >= 6) return have;
  const key = lib[industry] ? industry : Object.keys(lib).find((k) => industry && (k.includes(industry) || industry.includes(k))) || "banking";
  const add = A(lib[key]).map((c) => ({ ...c, vendor: vend(c.vendor) })).filter((c) => !have.some((h) => h.name === c.name)).map((c) => ({ ...c, status: ["channel", "knowledge", "testing"].includes(c.category) ? "connected" : "planned", writeBack: false }));
  return have.concat(add).slice(0, Math.max(6, have.length + add.length));
}
function renderCase(g, ev) {
  const v = g.v || {}, a = g.a || {}, l = g.l || {}, u = g.u || {}, b = g.b || {};
  const prev = json(path.join(PROTO, "case.json"), {});
  const golden = json(path.join(PROTO, "golden.json"), []);
  const cs = cards();
  const c = {
    ...prev,
    title: v.title, client: v.client, useCase: v.useCase, headline: v.headline, scenario: v.scenario, user: v.user, inputLabel: v.inputLabel, persona: v.persona, industry: v.industry, labels: v.labels,
    promise: a.promise, shape: a.shape, agents: a.agents, itemNoun: a.itemNoun, recordSuffix: a.recordSuffix, dismissReasons: a.dismissReasons,
    sweeps: A(a.sweeps).map((s, i) => ({ agent: s.agent, kind: s.kind, schedule: s.schedule, checks: s.checks, findings: A((b.sweepFindings || [])[i] || s.findings) })),
    verdicts: l.verdicts, samples: A(l.samples).length === 6 ? l.samples : samplesFrom(golden), connectors: fillConnectors(l.connectors, v.industry),
    clocks: u.clocks, neverList: u.neverList, escalationOwner: u.escalationOwner, escalationSla: u.escalationSla, autonomy: u.autonomy, disclosure: u.disclosure, approverRole: u.approverRole, draftOpener: u.draftOpener,
    decisions: cs.filter((x) => x.decision).map((x) => ({ gate: x.gate, decision: x.decision, by: x.by || x.role, effect: x.effect || "", ...(x.revised ? { revised: true, was: x.was } : {}) })),
    governance: Object.entries(g).filter(([, x]) => x).flatMap(([k, x]) => A(x.governance).map((r) => ({ gate: k.toUpperCase(), question: r.question, answer: r.answer, status: r.status, owner: /^answered/i.test(r.status || "") ? "" : r.owner || "" }))),
    faq: b.faq || prev.faq, version: b.version || prev.version || "proto-0.1",
  };
  for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  writeJson(path.join(PROTO, "case.json"), c);
  if (a.engine) writeJson(path.join(PROTO, "build.json"), { engine: a.engine });
  if (l.sources && !fs.existsSync(path.join(PROTO, "sources.json"))) writeJson(path.join(PROTO, "sources.json"), l.sources);
  return c;
}

// ---------- PRD ----------
function renderPrd(g, ev, c) {
  // Canonical IDs: whatever the model called a story, the PRD says US-01, US-02 ...
  const storyIds = Object.fromEntries(A(g.v?.stories).map((x, i) => [String(x.id || ""), `US-${String(i + 1).padStart(2, "0")}`]));
  const storyId = (x) => String(x || "").split(/[,;\s]+/).filter(Boolean).map((t) => storyIds[t] || t).join(", ");
  const v = g.v, a = g.a, l = g.l, u = g.u, e = g.e, d = g.d, b = g.b;
  const P = (gate) => `> Pending: fills at gate ${gate}.`;
  const cs = cards();
  const s = {};
  s[1] = b ? table(["", ""], [["Problem", b.summary?.problem], ["Who it serves", b.summary?.who], ["What we build", b.summary?.build], ["What it never does", b.summary?.never || A(u?.neverList)[0]], ["How we know it works", b.summary?.works], ["First milestone", b.summary?.milestone]]) : P("B");
  s[2] = v ? [clean(v.problem), "", table(["Value driver", "Today (baseline)", "Target", "How measured"], A(v.valueDrivers).map((r) => [r.driver, r.today, r.target, r.measured]))].join("\n") : P("V");
  s[3] = v ? [table(["User", "Job to be done", "Pain today", "What changes"], A(v.users).map((r) => [r.user, r.job, r.pain, r.changes])), "", table(["ID", "As a", "I want to", "So that"], A(v.stories).map((r, i) => [`US-${String(i + 1).padStart(2, "0")}`, r.as, r.want, r.soThat])), "", `**Journey, future state:** ${clean(v.journey)}`].join("\n") : P("V");
  s[4] = v ? ["**Goals**", ...A(v.goals).map((x, i) => `- G-${String(i + 1).padStart(2, "0")} ${clean(x)}`), "", "**Non-goals (this release)**", ...A(v.nonGoals).map((x) => `- ${clean(x)}`), "", table(["ID", "Metric", "Baseline", "Target", "Guardrail"], A(v.metrics).map((r, i) => [`M-${String(i + 1).padStart(2, "0")}`, r.metric, r.baseline, r.target, r.guardrail]))].join("\n") : P("V");
  s[5] = a ? table(["Candidate", "Lowest rung that works", "Decision", "Why"], A(a.scores).map((x) => [`${x.id} ${x.name || ""}`, x.rung, x.wave === 1 ? "**First wave**" : x.notGenAI ? "Not GenAI" : x.wave === 2 ? "Second wave" : "Later", x.notGenAI ? `${x.reason}; instead: ${x.instead || "rules"}` : x.reason])) : P("A");
  s[6] = a ? [`**Engine (gate A, client decision):** ${({ rules: "Rules only", "rules+model": "Rules decide, model drafts", "model-first": "Model proposes, rules guard" })[a.engine] || a.engine}, because ${clean(a.engineWhy)}.`, "", table(["Component", "Rung", "Build, buy or partner", "Why", "What would change our mind"], A(a.sourcing).map((x) => [x.component, x.rung, x.choice, x.why, x.changeMind])), "", "```", clean(a.flow) || `${A(a.itemNoun)[0] || "request"} -> safety guard -> ${A(a.agents).filter((x) => !/guard/i.test(x.name)).map((x) => x.name.toLowerCase()).join(" -> ")} -> person decides -> audit log`, "```", "", "**Assistants (agentic design)**", "", table(["Assistant", "Rules or AI", "Job", "Never", "Measured by"], A(a.agents).map((x) => [x.name, x.kind === "model" ? "AI" : "Rules", x.job, A(x.never).join("; "), x.gate])), "", "**Sweeps (proactive work)**", "", table(["Sweep", "Rules or AI", "Schedule", "What it checks", "Decision it hands to a person"], A(a.sweeps).map((x) => [x.agent, x.kind === "model" ? "AI" : "Rules", x.schedule, x.checks, x.decision])), "", "**Alternatives considered**", "", table(["Alternative", "Why not now", "When we would revisit"], A(a.alternatives).map((x) => [x.alternative, x.whyNot, x.revisit])), "", `**Latency budget:** ${clean(a.latency)}. **Unit of cost:** cost per resolved task, ${clean(a.cost)} (assumed).`].join("\n") : P("A");
  s[7] = b ? table(["ID", "Requirement", "Story", "Priority", "Acceptance criteria"], A(b.requirements).map((r, i) => [`FR-${String(i + 1).padStart(2, "0")}`, r.requirement, storyId(r.story), r.priority, r.acceptance])) : P("B");
  const contract = { desk: "input = the request + one cited source; output = 2 to 4 sentences from that source only, or `NO_ANSWER`.", chat: "input = the question + one cited source; output = 2 to 4 sentences from that source only, or `NO_ANSWER`; sensitive topics never reach the model.", review: "input = the document + the type's field list; output = each field's value with the exact evidence span, empty when absent; a value without evidence is dropped.", rank: "input = the record's facts + the rule that fired; output = a two-sentence talking point using only those facts." };
  s[8] = u && l ? [`**Verdicts:** \`answer\` (${clean(l.verdicts?.answer?.desc)}), \`human\` (${clean(l.verdicts?.human?.desc)}), \`escalate\` (${clean(l.verdicts?.escalate?.desc)}).`, "", "**Decision order:** escalation triggers first, in every language served; then source match; otherwise a person.", "", table(["Escalation trigger", "Example phrasing", "Goes to", "Response time"], A(u.triggers).map((t) => [t.trigger, `"${t.example}"`, t.goesTo, t.responseTime])), "", "**Never list**", ...A(u.neverList).map((x) => `- ${clean(x)}`), "", `**Model contract (${a?.shape || "desk"}):** ${contract[a?.shape] || contract.desk} In every shape, a refusal or error falls back to a person, never to a guess. Model: claude-sonnet-5-5 by default (Haiku for cost, Opus for the hardest rows), low effort, server-side fallback on.`].join("\n") : P("U");
  s[9] = u ? [table(["Action", "Autonomy (first 90 days)", "Approver", "AI shows", "On failure"], A(u.autonomyTable).map((r) => [r.action, r.level, r.approver, r.shows, r.onFailure])), "", "**Clocks**", "", table(["Outcome", "Respond within", "Regulatory clock"], [["Escalate", `${u.clocks?.escalate?.hours} h`, u.clocks?.escalate?.label], ["Needs a person", `${u.clocks?.human?.hours} h`, u.clocks?.human?.label], ["Prepared for review", `${u.clocks?.answer?.hours} h`, u.clocks?.answer?.label]]), "", "**Learning loop:** any reviewer can mark an outcome wrong; it joins the labelled test set with the right answer and every design is re-scored.", "", `**Disclosure (compliance to confirm):** "${clean(u.disclosure)}".`].join("\n") : P("U");
  s[10] = l ? [table(["Data", "Owner", "Purpose", "Personal data", "Minimisation", "Retention"], A(l.dataPrivacy).map((r) => [r.data, r.owner, r.purpose, r.personal, r.minimisation, r.retention])), "", "**Systems to connect**", "", table(["System", "Category", "Provides", "Access", "Personal data", "Owner", "Pilot status"], A(c.connectors).map((x) => [`${x.name} (${x.vendor || "vendor to confirm"})`, x.category, x.provides, x.access, x.pii, x.owner, x.status])), "", `**Golden set:** ${ev.goldenN} dev rows plus ${ev.holdoutN} sealed holdout rows; groups: ${A(l.groups).map((x) => `${x.key} (${A(x.values).join(", ")})`).join("; ")}. Labelled ${clean(l.labelling?.preferred || A(l.labelling?.options)[0]?.label)}. Synthetic until ${clean((cs.find((x) => /connect/i.test(x.question)) || {}).decision || "the client provides data")}.`].join("\n") : P("L");
  const names = { "Escalation recall": "Riskiest miss", "Escalation precision": "False alarms", "Answers without source": "Approved knowledge only", "Routing accuracy": "Right outcome", "Recall gap": "Equal across groups", "Fairness": "No group below the bar", "Never-list answers": "Forbidden topics", "Verdicts outside allowed": "Only allowed outcomes" };
  s[11] = e ? [table(["Gate", "Metric", "Bar", "Why this bar", "Latest dev", "Holdout"], Object.entries(ev.devGates).map(([k, r]) => [Object.entries(names).find(([n]) => k.toLowerCase().startsWith(n.toLowerCase().slice(0, 12)))?.[1] || k, k, r.bar, (A(e.gateTable).find((x) => k.toLowerCase().includes(String(x.metric || x.gate).toLowerCase().slice(0, 10))) || {}).why || "", r.value, (ev.holdGates[k] || {}).value || ""])), "", `**Release status:** ${ev.devPass && ev.holdPass ? "Passes all gates on dev and holdout" : `Blocked on ${Object.entries(ev.devGates).filter(([, r]) => r.result === "FAIL").map(([k]) => k).concat(Object.entries(ev.holdGates).filter(([, r]) => r.result === "FAIL").map(([k]) => k + " (holdout)")).join(", ") || "a missing eval"}`}${ev.independent ? "" : "; holdout not independent (one context wrote the golden set and the router)"}${e.repaired ? "; holdout seen once before a family-level repair" : ""}. **LLM judge policy:** ${clean(e.judgePolicy) || "none in the pilot; a judge may score draft quality only after it is validated against labels; escalation never uses one"}.`, "", "**Reproduce:** `node out/proto/eval.js` (dev) and `node out/proto/eval.js holdout.json` (sealed)."].join("\n") : P("E");
  s[12] = b ? table(["ID", "Requirement", "Target"], A(b.nfrs).map((r, i) => [`NFR-${String(i + 1).padStart(2, "0")}`, r.requirement, r.target])) : P("B");
  s[13] = d ? [table(["Step", "Proves", "Exit criterion", "Signs"], A(d.deploy).map((r) => [r.step, r.proves, r.exit, r.signs])), "", table(["Drive metric", "Why", "Alert threshold"], A(d.drive).map((r) => [r.metric, r.why, r.alert])), "", `**Stop rule (client decision):** ${clean((cs.find((x) => /stop/i.test(x.question)) || {}).decision || d.stop?.preferred)}. **Kill switch:** per behaviour, owned by ${clean(d.killSwitchOwner || "the product owner")}.`, "", "**Plan**", "", table(["Week", "Work"], A(d.plan).map((r) => [r.week, r.work]))].join("\n") : P("D");
  s[14] = d ? [table(["Approver", "Role", "Signs off on"], A(d.signoffs).map((r) => [r.name || "to confirm", r.role, r.signs])), "", table(["Gate", "Question", "Answer", "Status", "Closes it"], [...A(c.governance).filter((r) => !/^answered/i.test(r.status)), ...A(c.governance).filter((r) => /^answered/i.test(r.status))].map((r) => [r.gate, r.question, r.answer, r.status, r.owner]))].join("\n") : P("D");
  s[15] = b ? table(["ID", "Risk", "Likelihood", "Impact", "Mitigation"], A(b.risks).map((r, i) => [`R-${String(i + 1).padStart(2, "0")}`, r.risk, r.likelihood, r.impact, r.mitigation])) : P("B");
  s[16] = b ? [table(["Dependency", "Owner", "Needed for", "Status"], A(b.dependencies).map((r) => [r.dependency, r.owner, r.neededFor, r.status])), "", table(["ID", "Question or assumption", "Owner", "Needed by"], A(b.openQuestions).map((r, i) => [`Q-${String(i + 1).padStart(2, "0")}`, r.question, r.owner, r.neededBy]))].join("\n") : P("B");
  s[17] = b ? [clean(b.section17Intro) || "This section is written for a coding agent (Claude Code or similar). Hand it this file and the `out/proto/` folder; it should be able to take the prototype to a pilot-ready service task by task, with the evals deciding when each task is done.", "", "**Starting point:** a working prototype in `out/proto/` (router, eval runner, product shell, audit log) that passes or is blocked by its own gates.", "", "**Target layout**", "", "```", "<repo>/", "  src/router        decision order: guard, route, hand off", `  src/${a?.shape === "review" ? "extraction" : a?.shape === "rank" ? "ranking" : "drafting"}      model contract and template fallback`, "  src/api           decide, eval, log endpoints", "  web/              the product shell (Today, Queue, item, oversight pages)", "  eval/             golden.json, holdout.json (sealed), gates.json, run", "  docs/prd.md       this file", "```", "", "**Kickoff prompt**", "", "```", `Read docs/prd.md fully before writing code. You are building ${v?.useCase || "the first wave"} for ${v?.client || "the client"}.`, "Rules: never edit eval/golden.json to make a gate pass; never open eval/holdout.json;", "escalation is checked before anything else; never produce an answer without a cited source;", "no secrets in code; synthetic data only. Work task by task from section 17. After each task,", "run the eval and show its output. Stop and ask me when a requirement is ambiguous.", "Start with T-01.", "```", "", table(["ID", "Task", "Implements", "Done when"], A(b.tasks).map((r, i) => [`T-${String(i + 1).padStart(2, "0")}`, r.task, r.implements, r.doneWhen])), "", "**Guardrails for the coding agent**", "- The gates in `eval/gates.json` are the definition of done. A red gate blocks the task.", "- Fix the general pattern behind a miss, never the exact sentence; the holdout tests the kind.", "- Every new behaviour gets golden rows first, labelled before the code exists.", `- Ask before adding a dependency, a data source, or any action the never list touches.${A(b.guardrails).length ? "\n" + A(b.guardrails).map((x) => `- ${clean(x)}`).join("\n") : ""}`].join("\n") : P("B");
  const titles = { 1: "Summary", 2: "Problem and value", 3: "Users and jobs", 4: "Goals, non-goals and success metrics", 5: "Scope: first wave, and what is not GenAI", 6: "Solution overview", 7: "Functional requirements", 8: "AI behaviour specification", 9: "Human in the loop", 10: "Data, labels and privacy", 11: "Evaluation and release gates", 12: "Non-functional requirements", 13: "Rollout and drive", 14: "Governance and sign-offs", 15: "Risks and mitigations", 16: "Dependencies, open questions and assumptions", 17: "Build it with AI" };
  const prev = read(path.join(OUT, "prd.md"));
  const history = (prev.match(/## Appendix: document history[\s\S]*$/) || [""])[0].trim();
  const version = (prev.match(/\*\*Version:\*\* ([^·]+)·/) || [, b ? "0.1, draft for client review " : "0.1, live draft "])[1].trim().replace(/live draft/, b ? "draft for client review" : "live draft");
  const md = [`# ${v?.useCase || "(use case, from gate V)"}: product requirements`, "", `<!-- Case: ${clean(caseLine())} -->`, "", `**Client:** ${v?.client || "(from gate V)"} · **Version:** ${version} · **Owner:** product lead · **Date:** ${today()} · **Source:** VALUED run, every decision traceable to a gate file in \`out/\``, "",
    ...(b ? [`> **Recommendation.** ${clean(b.recommendation)}`, `> **Decision asked of the client.** ${clean(b.decisionAsked)}`, ""] : []),
    ...Object.entries(titles).flatMap(([n, t]) => [`## ${n}. ${t}`, "", s[n], ""]),
    "## Appendix: client decisions", "", b ? table(["Gate", "Decision", "Chosen by", "Our recommendation"], cs.filter((x) => x.decision).map((x) => [x.gate, x.decision, x.by || x.role, A(x.options)[0]?.label])) : P("B"), "",
    history || ["## Appendix: document history", "", "| Version | Date | Change | Requested by | Sections |", "|---|---|---|---|---|", `| 0.1 | ${today()} | First draft, built gate by gate in the working session | Product lead | All |`].join("\n"), ""].join("\n");
  write(path.join(OUT, "prd.md"), md);
}

// ---------- brief ----------
function renderBrief(g, ev, c) {
  const t = read(path.join(SK, "valued", "brief-template.html")); if (!t || !g.b) return;
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
  const li = (xs) => A(xs).slice(0, 3).map((x) => `<li>${esc(clean(x))}</li>`).join("");
  const cs = cards();
  const gateRows = Object.entries(ev.devGates).map(([k, r]) => `<tr><td>${esc(k)}</td><td>${esc(r.bar)}</td><td>${esc(r.value)}</td><td>${esc((ev.holdGates[k] || {}).value || "")}</td><td><span class="pill ${r.result === "PASS" ? "ok" : "bad"}">${r.result === "PASS" ? "Passed" : "Blocked"}</span></td></tr>`).join("");
  const govRows = A(c.governance).filter((r) => !/^answered/i.test(r.status)).slice(0, 8).map((r) => `<tr><td>${esc(r.gate)}</td><td>${esc(r.question)}</td><td>${esc(r.status)}</td><td>${esc(r.owner)}</td></tr>`).join("") || `<tr><td colspan="4">No open governance items.</td></tr>`;
  const stats = A(g.b.stats).length === 3 ? g.b.stats : [{ value: String(ev.goldenN + ev.holdoutN), label: "labelled test rows" }, { value: (ev.devGates["Escalation recall"] || {}).value || "", label: "escalation recall, dev" }, { value: (ev.holdGates["Escalation recall"] || {}).value || "", label: "escalation recall, sealed holdout" }];
  const map = { CLIENT: g.v?.client, ONE_LINE_PROBLEM: g.b.summary?.problem, RECOMMENDATION_ONE_SENTENCE: g.b.recommendation, AGENT_SENTENCE_WITH_FIGURES: g.b.agentSentence, STAT_1_VALUE: stats[0].value, STAT_1_LABEL: stats[0].label, STAT_2_VALUE: stats[1].value, STAT_2_LABEL: stats[1].label, STAT_3_VALUE: stats[2].value, STAT_3_LABEL: stats[2].label, V_BULLETS_3_LI: li(g.v?.sayIt), A_BULLETS_3_LI: li(g.a?.sayIt), L_BULLETS_3_LI: li(g.l?.sayIt), U_BULLETS_3_LI: li(g.u?.sayIt), E_BULLETS_3_LI: li(g.e?.sayIt), D_BULLETS_3_LI: li(g.d?.sayIt), GATE_ROWS_TR: gateRows, EVAL_CAPTION_ROWS_AND_WHAT_CHANGED: `${ev.goldenN} dev rows, ${ev.holdoutN} sealed. ${esc(clean(g.b.evalCaption || (ev.devPass ? "Passes every gate." : "Blocked; see section 11.")))}`, CLIENT_DECISIONS_LI: cs.filter((x) => x.decision).slice(0, 12).map((x) => `<li><strong>${esc(x.by || x.role)}</strong> chose ${esc(x.decision)}<span class="cap"> (we recommended ${esc(A(x.options)[0]?.label || "")})</span></li>`).join(""), PLAN_ROWS_TR: A(g.d?.plan).map((r) => `<tr><td>${esc(r.week)}</td><td>${esc(r.work)}</td></tr>`).join(""), TIMELINE: g.d?.timeline || "", RISKS_LI: li(A(g.b.risks).map((r) => `${r.risk}: ${r.mitigation}`)), GOVERNANCE_ROWS_TR: govRows };
  write(path.join(OUT, "brief.html"), t.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in map ? String(map[k] ?? "") : m)));
}

// ---------- check ----------
function check(g, ev, c, quiet) {
  const miss = [];
  const need = (cond, std, msg) => { if (!cond) miss.push([std, msg]); };
  const must = (obj, keys, gate) => { if (!obj) { need(false, 5, `gate ${gate}: out/gates/${gate.toLowerCase()}.json missing`); return; } for (const k of keys) need(obj[k] !== undefined && obj[k] !== "" && !(Array.isArray(obj[k]) && !obj[k].length), 5, `gate ${gate}: ${k} missing`); };
  must(g.v, ["client", "industry", "sponsorRole", "ownerRole", "useCase", "title", "headline", "scenario", "user", "inputLabel", "persona", "labels", "valueFrame", "candidates", "northStar", "problem", "valueDrivers", "users", "stories", "journey", "goals", "nonGoals", "metrics", "governance", "sayIt"], "V");
  must(g.a, ["scores", "waves", "sourcing", "numbersToQuote", "engine", "engineWhy", "shape", "shapeWhy", "agents", "sweeps", "itemNoun", "promise", "alternatives", "latency", "cost", "governance", "sayIt"], "A");
  must(g.l, ["verdicts", "groups", "labelling", "connectors", "dataPrivacy", "governance", "sayIt"], "L");
  must(g.u, ["autonomyTable", "autonomyRec", "neverList", "triggers", "clocks", "escalationOwner", "escalationSla", "autonomy", "disclosure", "approverRole", "draftOpener", "logging", "governance", "sayIt"], "U");
  must(g.e, ["gateTable", "bar", "runs", "governance", "sayIt"], "E");
  must(g.d, ["deploy", "drive", "pilot", "stop", "plan", "signoffs", "governance", "sayIt"], "D");
  must(g.b, ["summary", "recommendation", "decisionAsked", "requirements", "nfrs", "risks", "dependencies", "openQuestions", "tasks", "faq", "sweepFindings", "agentSentence"], "B");
  if (g.a) { need(A(g.a.agents).length >= 3 && A(g.a.agents).length <= 6, 2, "3 to 6 assistants"); need(A(g.a.agents)[0]?.kind === "rules" && /guard|safety/i.test(A(g.a.agents)[0]?.name || ""), 2, "first assistant must be a fixed-rules safety guard"); need(A(g.a.sweeps).length >= 1 && A(g.a.sweeps).length <= 3, 2, "1 to 3 sweeps"); need(["desk", "review", "rank", "chat"].includes(g.a.shape), 3, "shape"); if (g.a.shape === "rank") need(A(g.a.dismissReasons).length >= 4, 3, "rank needs 4 dismissReasons"); need(A(g.a.scores).some((s) => s.notGenAI), 2, "at least one candidate marked not GenAI"); }
  if (g.b) { need(A(g.b.faq).length >= 7 && A(g.b.faq).length <= 8 && A(g.b.faq).every((f) => f.q && f.a && f.from), 4, "7 to 8 FAQ pairs each with q, a, from"); need(A(g.b.sweepFindings).every((f) => A(f).length >= 2 && A(f).every((x) => x.title && x.why && x.cite)), 2, "2 to 3 findings per sweep, each with title, why, cite"); need(A(g.b.requirements).length >= 6 && A(g.b.requirements).every((r) => /Given[^]*\bwhen\b[^]*\bthen\b/i.test(r.acceptance || "")), 5, "6+ requirements, every acceptance written Given ..., when ..., then ..."); need(A(g.b.tasks).length >= 5, 5, "section 17 needs 5+ tasks"); }
  if (c) { need(A(c.connectors).length >= 6, 3, "6+ systems"); need(A(c.connectors).every((x) => !x.vendor || /assumed|e\.g\./i.test(x.vendor)), 3, "vendors only as e.g. ... (assumed)"); need(A(c.governance).length >= 12, 4, "12+ governance rows"); need(A(c.governance).filter((x) => !/^answered/i.test(x.status)).every((x) => x.owner), 4, "every open governance row has an owner"); need(A(c.neverList).length >= 3, 3, "never list 3+ lines"); need(["escalate", "human", "answer"].every((k) => Number((c.clocks || {})[k]?.hours) > 0), 3, "clocks need { hours, label } for escalate, human and answer"); need(A(c.samples).length === 6, 3, "6 samples"); }
  need(ev.goldenN >= 30 && ev.holdoutN >= 10, 6, `golden ${ev.goldenN} (30+) and holdout ${ev.holdoutN} (10+) rows`);
  need(json(path.join(PROTO, "holdout.json"), []).filter((r) => r.expected === "escalate").length >= 6, 6, "holdout needs 6+ escalation rows");
  need(json(path.join(PROTO, "golden.json"), []).filter((r) => r.never).length >= 3, 6, "golden needs 3+ never rows");
  need(!fs.existsSync(path.join(PROTO, "eval.js")) || ev.devPass, 6, "dev eval blocked"); need(!fs.existsSync(path.join(PROTO, "eval.js")) || ev.holdPass, 6, "holdout eval blocked");
  if (g.a && g.a.engine !== "rules" && fs.existsSync(path.join(PROTO, "eval.js"))) { const cache = json(path.join(PROTO, "model-cache.json"), {}); const norm = (t) => String(t || "").toLowerCase().replace(/\s+/g, " ").trim(); const missing = ["golden.json", "holdout.json"].flatMap((f) => json(path.join(PROTO, f), [])).filter((r) => !cache[norm(r.text)]).length; need(missing === 0, 6, `guard model cache misses ${missing} texts: run model-inputs and the guard model again`); }
  const router = read(path.join(PROTO, "router.js")); if (router) need(!/\brequire\(|\bimport\s|readFileSync|fetch\(/.test(router) && /module\.exports\s*=\s*\{\s*decide/.test(router), 7, "router must be self-contained CommonJS");
  const cs = cards(); need(cs.length >= 11 && cs.length <= 16, 1, `${cs.length} cards (11 to 16)`); need(cs.every((x) => x.role && x.question && x.format && A(x.options).length >= 2 && A(x.options).every((o) => o.label && o.tradeoff)), 1, "every card: role, question, format, 2+ options with trade-offs"); need(!cs.some((x) => /^COO$/i.test(x.role)) || /COO/i.test(caseLine()), 1, "card roles must be this case's sponsor and owner roles, not COO");
  const scanDirs = [OUT]; const files = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!/hosted/.test(f)) walk(p); } else if (/\.(md|json|js|html)$/.test(f) && !/ff\.css|app\.html|prd-viewer|server\.js|audit\.jsonl/.test(f)) files.push(p); } }; if (fs.existsSync(OUT)) walk(OUT);
  const realCo = /\b(Anthem|Aetna|UnitedHealth|Cigna|Humana|JPMorgan|Wells Fargo|Bank of America|Citibank|Capital One|Delta Air|United Airlines|American Airlines|Walmart|Amazon|Geico|Allstate|State Farm|Kaiser|CVS|Walgreens|Salesforce|Google|Microsoft|Workday|Oracle|SAP|Epic Systems|Cerner|Fidelity|CredR|EdCast|Coursewave|Enelek)\b/;
  for (const p of files) { const t = read(p); if (t.includes("—")) need(false, 8, `em-dash in ${path.relative(ROOT, p)}`); const m = t.replace(/e\.g\.[^)\n"]*\(assumed\)/g, "").match(realCo); if (m) need(false, 8, `real or employer name "${m[0]}" in ${path.relative(ROOT, p)}: use a synthetic name, or "e.g. ... (assumed)" for a vendor`); }
  const pend = (read(path.join(OUT, "prd.md")).match(/Pending:/g) || []).length; need(pend === 0, 5, `${pend} Pending lines in the PRD`);
  if (!quiet) { console.log(miss.length ? miss.map(([s, m]) => `- [${s}] ${m}`).join("\n") : "All checks pass."); }
  return miss;
}

// ---------- clock ----------
const CLOCK = path.join(OUT, "run-clock.jsonl");
function clockEntries() { return read(CLOCK).split("\n").filter(Boolean).map((l) => JSON.parse(l)); }
function clockStatus(print = true) {
  const es = clockEntries(); const rows = [];
  for (const [id, name, budget] of PHASES) {
    const st = es.find((e) => e.phase === id && e.event === "start"), en = [...es].reverse().find((e) => e.phase === id && e.event === "end");
    const secs = st ? Math.round(((en ? en.t : Date.now()) - st.t) / 1000) : null;
    rows.push({ phase: id, name, budget, seconds: secs, over: secs !== null && secs > budget * 60, running: Boolean(st && !en) });
  }
  const start = es[0]?.t, end = es.length && es.every((e) => e.event !== "start" || es.some((x) => x.phase === e.phase && x.event === "end")) ? Math.max(...es.map((e) => e.t)) : Date.now();
  const total = start ? Math.round((end - start) / 1000) : 0;
  if (print) { console.log(table(["Phase", "Budget", "Used", "Status"], rows.map((r) => [`${r.phase} ${r.name}`, `${r.budget} min`, r.seconds === null ? "" : `${Math.floor(r.seconds / 60)}m ${r.seconds % 60}s`, r.seconds === null ? "not started" : r.running ? (r.over ? "RUNNING, OVER BUDGET: cut scope" : "running") : r.over ? "over" : "ok"]))); console.log(`Total: ${Math.floor(total / 60)}m ${total % 60}s of 28m`); const cur = rows.find((r) => r.running && r.over); if (cur && CUTS[cur.phase]) console.log(`Cut order for phase ${cur.phase}: ${CUTS[cur.phase].join("; ")}. Never cut governance, evals, the holdout or the never list.`); }
  return { rows, total };
}

// ---------- report ----------
function report(g, ev, c) {
  const { rows, total } = clockStatus(false);
  const cs = cards(); const cuts = clockEntries().filter((e) => e.event === "cut");
  const flagged = read(path.join(PROTO, "audit.jsonl")).split("\n").filter((l) => /Flagged as wrong/.test(l)).length;
  const r = { case: clean(caseLine()), date: today(), mode: read(path.join(OUT, "mode.txt")).trim() || "orchestrated", totalSeconds: total, budgetSeconds: 28 * 60, withinBudget: total <= 28 * 60, phases: rows.map((x) => ({ phase: `${x.phase} ${x.name}`, budgetMin: x.budget, seconds: x.seconds, over: x.over })), questionsAsked: cs.length, questions: cs.map((x) => ({ gate: x.gate, role: x.role, question: x.question, decision: x.decision, auto: Boolean(x.auto) })), revisions: cs.filter((x) => x.revised).length, flaggedWrong: flagged, evalBlocks: A(g.e?.runs).filter((x) => /RELEASE BLOCKED/.test(x.output || "")).length, evalFixes: A(g.e?.fixes), holdoutIndependent: ev.independent, release: { dev: ev.devPass, holdout: ev.holdPass }, cuts: cuts.map((x) => ({ phase: x.phase, what: x.note })), shape: g.a?.shape, systems: A(c?.connectors).length, assistants: A(g.a?.agents).length, sweeps: A(g.a?.sweeps).length, checks: check(g, ev, c, true).map(([s, m]) => `[${s}] ${m}`) };
  writeJson(path.join(OUT, "run-report.json"), r);
  console.log(`Run report: out/run-report.json · ${Math.floor(total / 60)}m ${total % 60}s of 28m · ${cs.length} questions · ${r.checks.length} open checks`);
}

// ---------- seeds ----------
function seed(industry) {
  const lib = json(path.join(SK, "valued-labels", "connectors-library.json"), {});
  const seeds = json(path.join(SK, "valued-labels", "golden-seeds.json"), {});
  const sweeps = json(path.join(SK, "valued-ai-fit", "sweep-templates.json"), {});
  const pick = (o) => o[industry] || o[Object.keys(o).find((k) => industry && (k.includes(industry) || industry.includes(k)))] || o[Object.keys(o).find((k) => !k.startsWith("_"))];
  console.log(JSON.stringify({ industry, systems: pick(lib), goldenSeeds: pick(seeds), sweepTemplates: pick(sweeps) }, null, 1));
}

// ---------- main ----------
const [cmd, ...rest] = process.argv.slice(2);
if (cmd && !(cmd === "clock" && rest[0] === "status")) trace({ kind: "cmd", cmd, args: rest });
if (cmd === "clock") {
  if (rest[0] === "status") clockStatus();
  else { fs.mkdirSync(OUT, { recursive: true }); fs.appendFileSync(CLOCK, JSON.stringify({ phase: rest[0], event: rest[1], t: Date.now(), note: rest.slice(2).join(" ") }) + "\n"); if (rest[1] === "start") { const p = PHASES.find((x) => x[0] === rest[0]); if (p) console.log(`[${p[0]}] ${p[1]} · budget ${p[2]} min`); } }
} else if (cmd === "cut") {
  fs.appendFileSync(CLOCK, JSON.stringify({ phase: rest[0], event: "cut", t: Date.now(), note: rest.slice(1).join(" ") }) + "\n");
  console.log(`Over budget in phase ${rest[0]}: cutting ${rest.slice(1).join(" ")}. Governance, evals, the holdout and the never list stay.`);
} else if (cmd === "cards") {
  const cs = cards(); const round = Number(rest[1]);
  const mine = cs.filter((c) => Number(c.round) === round);
  if (rest[0] === "auto") { for (const c of mine) { c.decision = A(c.options)[0]?.label; c.auto = true; c.by = c.role; trace({ kind: "decision", id: c.id, gate: c.gate, role: c.role, question: c.question, decision: c.decision, auto: true }); } writeJson(path.join(OUT, "cards.json"), cs); console.log(`Round ${round}: ${mine.length} cards answered with the recommended option (auto).`); }
  else for (const c of mine) { console.log(`\n**"${c.role}": "${c.question}"** If none fits, answer with: ${c.format}`); A(c.options).forEach((o, i) => console.log(`${i + 1}. ${o.label}${i === 0 ? " (Recommended)" : ""}: ${clean(o.tradeoff)}`)); }
} else if (cmd === "seed") seed(rest[0]);
else if (cmd === "model-inputs") {
  // Texts only: no ids, no labels, no slices, shuffled, so the guard model cannot tell dev from holdout.
  const norm = (t) => String(t || "").toLowerCase().replace(/\s+/g, " ").trim();
  const texts = [...new Set(["golden.json", "holdout.json"].flatMap((f) => json(path.join(PROTO, f), []).map((r) => r.text)))];
  const seeded = texts.map((t, i) => ({ t, k: (i * 2654435761) % 4294967296 })).sort((a, b) => a.k - b.k).map((x) => ({ key: norm(x.t), text: x.t }));
  writeJson(path.join(PROTO, "model-inputs.json"), seeded);
  console.log(`out/proto/model-inputs.json: ${seeded.length} texts, no labels. Give it to the guard model; it writes out/proto/model-cache.json.`);
}
else if (cmd === "render" || cmd === "check" || cmd === "report") {
  const g = gates(); const ev = evalResults();
  if (cmd === "render") {
    const c = renderCase(g, ev);
    const golden = json(path.join(PROTO, "golden.json"), []), holdout = json(path.join(PROTO, "holdout.json"), []);
    const counts = { golden: golden.length, holdout: holdout.length, holdoutEsc: holdout.filter((r) => r.expected === "escalate").length };
    for (const gr of A(g.l?.groups)) counts[gr.key] = `${golden.filter((r) => (r.slices || {})[gr.key]).length} / ${holdout.filter((r) => (r.slices || {})[gr.key]).length}`;
    if (g.v) write(path.join(OUT, "1-value.md"), gateV({ ...g.v, gate: "V" }));
    if (g.a) write(path.join(OUT, "2-ai-fit.md"), gateA(g.a));
    if (g.l) write(path.join(OUT, "3-labels.md"), gateL(g.l, counts));
    if (g.u) write(path.join(OUT, "4-user-loop.md"), gateU(g.u));
    if (g.e) write(path.join(OUT, "5-evals.md"), gateE(g.e, ev));
    if (g.d) write(path.join(OUT, "6-deploy.md"), gateD(g.d));
    for (const [k, x] of Object.entries(g)) if (x) x.gate = k.toUpperCase();
    write(path.join(OUT, "state.md"), renderState(g));
    renderPrd(g, ev, c); renderBrief(g, ev, c);
    if (g.b) { const r = spawnSync("node", [path.join(SK, "valued-build", "render-prd.js"), path.join(OUT, "prd.md"), path.join(OUT, "prd.html")], { encoding: "utf8" }); if (r.status) console.log(r.stderr); }
    const miss = check(g, ev, c, true);
    trace({ kind: "render", gates: Object.entries(g).filter(([, x]) => x).map(([k]) => k.toUpperCase()), pending: (read(path.join(OUT, "prd.md")).match(/Pending:/g) || []).length, open: miss.length, dev: ev.devPass, holdout: ev.holdPass, devGates: ev.devGates, holdGates: ev.holdGates, golden: ev.goldenN, holdoutN: ev.holdoutN });
    console.log(`Rendered: ${Object.entries(g).filter(([, x]) => x).map(([k]) => k.toUpperCase()).join(" ")} · prd.md (${(read(path.join(OUT, "prd.md")).match(/Pending:/g) || []).length} pending) · case.json · ${miss.length} open checks${miss.length ? ":\n" + miss.map(([s, m]) => `  - [${s}] ${m}`).join("\n") : ""}`);
  } else if (cmd === "check") check(g, ev, json(path.join(PROTO, "case.json"), {}));
  else report(g, ev, json(path.join(PROTO, "case.json"), {}));
} else console.log(read(__filename).split("\n").slice(1, 14).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
