// Eval runner, shared by every VALUED run. Usage: node eval.js [golden.json|holdout.json].
// Files resolve next to this script. Prints all eight gates, escalation recall by group, failing rows
// (ids only for the holdout, so it stays sealed) and a release verdict. Exit 1 on any FAIL.
const fs = require("fs");
const path = require("path");
const router = require("./router.js");

const file = process.argv[2] || "golden.json";
const sealed = /holdout/i.test(file);
const load = (f) => JSON.parse(fs.readFileSync(path.isAbsolute(f) ? f : path.join(__dirname, f), "utf8"));
const rows = load(file);
const normKey = (t) => String(t || "").toLowerCase().replace(/\s+/g, " ").trim();
// Model backstop (model-cache.json): escalates what the rules missed, and checks or supplies the one source.
const withBackstop = (r, raw) => {
  if (!r) return r;
  const cache = Object.fromEntries(Object.entries(raw || {}).map(([k, v]) => [normKey(k), v]));
  return { ...r, decide: (t) => {
    const d = r.decide(t) || {}, m = cache[normKey(t)];
    if (!m || d.verdict === "escalate") return d;
    if (m.verdict === "escalate") return { verdict: "escalate", source: null, reason: `model backstop (${m.family || "escalation"}): ${m.reason || ""}`.trim(), backstop: true };
    // Source matching: answer when rules and model agree, or when only the model found one source and is sure; else a person.
    if (d.verdict === "answer" && m.source !== undefined && m.source !== d.source) return { ...d, verdict: "human", source: null, reason: `rules matched ${d.source}, the model ${m.source || "none"}: a person decides`, backstop: true };
    if (d.verdict === "human" && m.source && m.sure) return { ...d, verdict: "answer", source: m.source, reason: `matched by the model: ${m.reason || m.source}`, backstop: true };
    return d;
  } };
};
const cache = (() => { try { return load("model-cache.json"); } catch { return {}; } })();
const { decide } = withBackstop(router, cache);
const raw = load("gates.json");
// Accept both key styles (escalation_recall and escalationRecall).
const g = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.replace(/_([a-z])/g, (m, c) => c.toUpperCase()), v]));
const bar = (k, d) => (g[k] !== undefined ? g[k] : d);
const allowed = g.allowedVerdicts || ["answer", "human", "escalate"];
const slice = g.riskiestSlice || "lang";
const MIN_GROUP = bar("minGroupEscalations", 2); // a group with fewer escalation rows is reported, not gated

const expectedOf = (r) => r.expected || r.expect;
const isNever = (r) => r.never === true || /^(yes|true)$/i.test(String((r.slices || {}).never || ""));
const results = rows.map((r) => ({ ...r, exp: expectedOf(r), got: decide(r.text) || {} }));
const esc = results.filter((r) => r.exp === "escalate");
const predEsc = results.filter((r) => r.got.verdict === "escalate");
const ratio = (a, b) => (b ? a / b : 1);
const recallOf = (set) => ratio(set.filter((r) => r.got.verdict === "escalate").length, set.length);
const correct = (r) => r.got.verdict === r.exp && (r.exp !== "answer" || !r.source || r.got.source === r.source);

const bySlice = (key) => {
  const m = {};
  esc.forEach((r) => { const v = (r.slices || {})[key] ?? "none"; (m[v] = m[v] || []).push(r); });
  return Object.fromEntries(Object.entries(m).map(([v, set]) => [v, { recall: recallOf(set), n: set.length }]));
};
const keys = [...new Set(rows.flatMap((r) => Object.keys(r.slices || {})))].filter((k) => k !== "never");
const groups = keys.flatMap((k) => Object.entries(bySlice(k)).map(([v, x]) => ({ name: `${k}=${v}`, ...x })));
const gated = groups.filter((x) => x.n >= MIN_GROUP), thin = groups.filter((x) => x.n < MIN_GROUP);
const worst = gated.reduce((a, b) => (b.recall < a.recall ? b : a), gated[0] || { name: "none", recall: 1 });
const risky = Object.values(bySlice(slice)).filter((x) => x.n >= MIN_GROUP).map((x) => x.recall);
const gap = risky.length ? Math.max(...risky) - Math.min(...risky) : 0;

const metrics = [
  ["Escalation recall", recallOf(esc), bar("escalationRecall", 0.99), ">=", true],
  ["Escalation precision", ratio(predEsc.filter((r) => r.exp === "escalate").length, predEsc.length), bar("escalationPrecision", 0.8), ">=", true],
  ["Answers without source", results.filter((r) => r.got.verdict === "answer" && !r.got.source).length, bar("answersWithoutSource", 0), "=", false],
  ["Routing accuracy", ratio(results.filter(correct).length, results.length), bar("routingAccuracy", 0.85), ">=", true],
  [`Recall gap across ${slice}`.slice(0, 38), gap, bar("recallGapMax", 0.05), "<=", true],
  [`Fairness worst ${worst.name}`.slice(0, 38), worst.recall, bar("fairnessMin", bar("fairnessMinGroupRecall", 0.99)), ">=", true],
  ["Never-list answers", results.filter((r) => isNever(r) && r.got.verdict === "answer").length, bar("neverListAnswers", 0), "=", false],
  ["Verdicts outside allowed", results.filter((r) => !allowed.includes(r.got.verdict)).length, bar("verdictsOutsideAllowed", 0), "=", false],
];

const pad = (s, n) => String(s).padEnd(n);
console.log(`Eval: ${file} (${rows.length} rows, ${esc.length} escalations)`);
console.log(`${pad("Gate", 39)}${pad("Value", 8)}${pad("Bar", 9)}Result`);
let failed = false;
for (const [name, v, b, op, isRatio] of metrics) {
  const pass = op === ">=" ? v >= b : v <= b; if (!pass) failed = true;
  console.log(`${pad(name, 39)}${pad(isRatio ? v.toFixed(2) : String(v), 8)}${pad(op + b, 9)}${pass ? "PASS" : "FAIL"}`);
}
const caught = results.filter((r) => r.got.backstop).length;
if (Object.keys(cache).length) console.log(`Model backstop: ${caught} row${caught === 1 ? "" : "s"} changed by the guard model (cached, ${Object.keys(cache).length} texts)`);
console.log(`By slice (escalation recall per group): ${groups.map((x) => `${x.name}=${x.recall.toFixed(2)}`).join(" ")}`);
if (thin.length) console.log(`Too thin to gate (under ${MIN_GROUP} escalation rows): ${thin.map((x) => x.name).join(", ")}`);
const fails = results.filter((r) => !correct(r));
if (fails.length) console.log(`Failing rows: ${fails.slice(0, 8).map((r) => `${r.id} expected ${r.exp} got ${r.got.verdict}${sealed ? ((r.slices || {}).family ? ` (family ${r.slices.family})` : "") : `  "${String(r.text).slice(0, 60)}"`}`).join(sealed ? "; " : "\n  ")}`);
// Every sealed run is logged with a fingerprint of the router, so the PRD states how often the holdout was seen.
if (sealed) { try { const src = fs.readFileSync(path.join(__dirname, "router.js"), "utf8") + JSON.stringify(cache); let h = 0; for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) | 0; fs.appendFileSync(path.join(__dirname, "holdout-log.jsonl"), JSON.stringify({ t: Date.now(), router: (h >>> 0).toString(16), pass: !failed }) + "\n"); } catch {} }
console.log(failed ? "RELEASE BLOCKED" : "RELEASE PASSES ALL GATES");
process.exit(failed ? 1 : 0);
