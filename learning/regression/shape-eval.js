#!/usr/bin/env node
// Shape micro-eval (S-086). The A gate's shape decision is a judgement, so a wording change to the
// rule can silently flip it; that costs a full 18-run regression to notice. This scores the shape
// decision on its own, for the price of one agent.
//
//   node learning/regression/shape-eval.js brief             print the brief to give one agent
//   node learning/regression/shape-eval.js baseline <file>   record today's answers as the baseline
//   node learning/regression/shape-eval.js score <file>      what moved since the baseline
//
// The answers file is JSON: [{ "slug", "shape", "question" }], where question is the number of the
// question in the A skill's table that picked the shape.
//
// What this does and does not check. The verdict is drift: a shape that moved since the baseline
// means the rule now reads differently, which is the failure S-086 describes. Agreement with
// scenarios.json is printed but never gated, because this agent sees only the one-line case while
// a real run reaches the A gate with the value gate, the three lenses and the systems behind it.
// A disagreement here is a case the rule cannot settle from a case line alone, not a failing run.
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const scenarios = JSON.parse(fs.readFileSync(path.join(__dirname, "scenarios.json"), "utf8"));
const cases = (Array.isArray(scenarios) ? scenarios : scenarios.scenarios);
const table = () => {
  const md = fs.readFileSync(path.join(ROOT, ".claude", "skills", "valued-ai-fit", "SKILL.md"), "utf8");
  const start = md.indexOf("| Order | Ask | Shape |");
  if (start < 0) { console.error("The shape table is gone from valued-ai-fit/SKILL.md: fix the skill or this script."); process.exit(2); }
  const after = md.slice(start);
  const end = after.indexOf("\n\n", after.indexOf("| 4 |"));
  return after.slice(0, end > 0 ? end : 1200).split("\n").map((l) => l.replace(/^\s+/, "")).join("\n").trimEnd();
};
const cmd = process.argv[2];
const scored = cases.filter((c) => String(c.case || "").trim());
const BASE = path.join(__dirname, "shape-baseline.json");
const tableHash = () => { const t = table(); let h = 0; for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return (h >>> 0).toString(16); };

if (cmd === "brief") {
  console.log(`Decide the product shape for each case below, using only the table that follows. It is the
shape table from the VALUED A gate, copied verbatim. Walk the four questions in order and stop at the
first yes. Do not reason from the channel the work arrived on.

${table()}

Answer with JSON only, no prose: an array of { "slug", "shape", "question" }, where question is the
number of the question that picked the shape. One object per case, in this order.

${scored.map((c) => `- ${c.slug}: ${c.case}`).join("\n")}`);
  process.exit(0);
}

if (!["baseline", "score"].includes(cmd) || !process.argv[3]) { console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 19).map((l) => l.replace(/^\/\/ ?/, "")).join("\n")); process.exit(0); }

const answers = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const got = Object.fromEntries(answers.map((a) => [a.slug, a]));

if (cmd === "baseline") {
  const missing = scored.filter((c) => !(got[c.slug] || {}).shape).map((c) => c.slug);
  if (missing.length) { console.error(`No shape for: ${missing.join(", ")}. A baseline needs every case answered.`); process.exit(2); }
  const rows = scored.map((c) => ({ slug: c.slug, shape: got[c.slug].shape, question: got[c.slug].question }));
  fs.writeFileSync(BASE, JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), table: tableHash(), shapes: rows }, null, 1) + "\n");
  console.log(`Baseline written: ${rows.length} cases, shape table ${tableHash()}.`);
  console.log(`Per shape: ${["desk", "review", "rank", "chat"].map((k) => `${k}=${rows.filter((r) => r.shape === k).length}`).join(" ")}`);
  process.exit(0);
}

if (!fs.existsSync(BASE)) { console.error(`No baseline yet. Run: node ${path.relative(ROOT, __filename)} baseline <answers>.json`); process.exit(2); }
const base = JSON.parse(fs.readFileSync(BASE, "utf8"));
const was = Object.fromEntries(base.shapes.map((r) => [r.slug, r]));
const pad = (s, n) => String(s).padEnd(n);
const rows = scored.map((c) => {
  const a = got[c.slug] || {}, b = was[c.slug] || {};
  return { slug: c.slug, was: b.shape || "new", now: a.shape || "missing", q: a.question || "", allowed: c.expect.shape.join(" or "), moved: Boolean(b.shape) && a.shape !== b.shape, agrees: c.expect.shape.includes(a.shape) };
});
console.log(`Shape table: ${tableHash()} now, ${base.table} at the baseline of ${base.recorded}.${tableHash() === base.table ? " Unchanged." : " Changed, so any drift below is that change."}\n`);
console.log(`${pad("Scenario", 16)}${pad("Baseline", 10)}${pad("Now", 10)}${pad("By Q", 6)}${pad("Drift", 8)}Expectation`);
for (const r of rows) console.log(`${pad(r.slug, 16)}${pad(r.was, 10)}${pad(r.now, 10)}${pad(r.q, 6)}${pad(r.moved ? "MOVED" : "held", 8)}${r.agrees ? "agrees" : `cannot settle from the case line (wants ${r.allowed})`}`);
const moved = rows.filter((r) => r.moved), off = rows.filter((r) => !r.agrees);
console.log(`\n${moved.length} of ${rows.length} shapes moved since the baseline.`);
if (moved.length) console.log(`Moved: ${moved.map((r) => `${r.slug} ${r.was} to ${r.now}`).join("; ")}\nA move is the S-086 failure: the rule now reads differently. Decide which reading is right, fix the shape table, and record a new baseline. Never edit scenarios.json to match.`);
console.log(`Not settled from the case line alone (reported, not gated): ${off.length ? off.map((r) => r.slug).join(", ") : "none"}. Those need the value gate and the lenses behind them, which a real run has and this agent does not.`);
process.exit(moved.length ? 1 : 0);
