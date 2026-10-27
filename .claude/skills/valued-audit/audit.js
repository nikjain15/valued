#!/usr/bin/env node
// VALUED audit: scores this run's PRD and prototype against the eight standards (check.js), gives every
// issue an ID, the gate and skill that own it, and the fix, and keeps the issue list across re-audits.
// Writes out/audit/report.md, out/audit/issues.json and out/audit/audit-<n>.json, appends to
// out/trace.jsonl and to learning/runs.jsonl, then re-renders out/observe.html.
// Usage (from the workspace root): node .claude/skills/valued-audit/audit.js [--port 4317] [--no-browser]
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd(), OUT = path.join(ROOT, "out"), AUD = path.join(OUT, "audit");
const args = process.argv.slice(2);
const port = (args[args.indexOf("--port") + 1] && args.includes("--port")) ? args[args.indexOf("--port") + 1] : process.env.PORT || "4317";
const json = (f, fb) => { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return fb; } };
const STANDARDS = { 1: "Questions", 2: "Agentic by design", 3: "Product shape", 4: "Traceability", 5: "PRD", 6: "Evals", 7: "Runs in a browser", 8: "Writing" };

// Who owns each kind of issue, and the fix. First match wins.
const OWNERS = [
  [/provenance|not independent|wrote both/i, "L", "valued-labels", "The holdout must be written by the holdout-sealer subagent, never by the context that writes or fixes router.js. Launch it at gate L, run `conductor.js seal holdout holdout-sealer`, and `seal router <builder>` when the router is written. A run where one name wrote both cannot be repaired after the fact: re-run it."],
  [/router versions/i, "E", "valued-evals", "The sealed set has been scored against too many routers. Stop fixing against it: the honest record is the first attempt plus at most one disclosed repair. Add dev rows for the failing family and fix there."],
  [/lines of code/i, "E", "prototype-builder", "Move wording out of router.js into sources.json match lists or the u.json trigger lexicon. The limit is 200 lines of code; more branches is the wrong fix."],
  [/Given|requirement ids|section 19|section 12|section 18|pricing|observability|token strategy|business case|document history|PRD table|Pending|title not set|placeholders|prd\.html/i, "B", "valued-build", "Fix the requirement or section in out/gates/b.json, then render. Never hand-edit prd.md."],
  [/holdout eval|dev eval/i, "E", "valued-evals", "Widen the trigger cues for the failing family (u.json), rerun model-inputs and the guard model, rerun both evals. Never edit labels."],
  [/samples/i, "L", "valued-labels", "Set l.json samples to 6 { text, expect } picked from golden.json (or drop them and let render pick), then render."],
  [/golden|holdout has|never-list rows/i, "L", "valued-labels", "Add labelled rows in golden.json (labels before code), keep 30+ dev and 20 holdout, then rerun the evals."],
  [/gates\.json|eval output|evidence pack|not independent/i, "E", "valued-evals", "Use the shared runner (.claude/skills/valued-build/eval.js) and the gates.json keys in prototype-builder.md."],
  [/router\.js|self-contained|module\.exports/i, "E", "prototype-builder", "Make router.js self-contained CommonJS ending module.exports = { decide }."],
  [/assistant|sweep/i, "A", "valued-ai-fit", "Fix agents or sweeps in a.json (first a rules Safety guard; 3 to 6 assistants; 1 to 3 sweeps), then render."],
  [/clocks|never list|Close to their clock/i, "U", "valued-user-loop", "Set clocks { escalate, human, answer: { hours, label } } and the never list in u.json, then render."],
  [/connector|systems|vendor|verdicts/i, "L", "valued-labels", "Fix connectors in l.json (6+, vendors only as e.g. ... (assumed)), then render."],
  [/shape|persona|labels missing|itemNoun|dismissReasons/i, "A", "valued-ai-fit", "Fix shape, persona, labels or item nouns in a.json or v.json, then render."],
  [/questions asked|card|Recommended|COO|a decision lacks/i, "conductor", "valued", "Fix out/cards.json: 11 to 16 cards, recommended first, case roles on headers."],
  [/governance|FAQ/i, "B", "valued-build", "Fill governance owners and FAQ 'from' tags in the gate JSON, then render."],
  [/em-dash|company name|employer/i, "B", "valued-build", "Replace the text in the gate JSON with a synthetic name or a comma, then render."],
  [/app\.html differs/i, "app", "valued-build", "Copy the skill's app.html back into out/proto; case data belongs in case.json, never in the app."],
  [/page missing|console|detail is empty|trail|This is wrong|Design A|quality page|Data and tools|controls page|Needs you now|tiles|sidebar|queue/i, "app", "valued-build", "Open the prototype, reproduce, and fix the case.json field the page reads; app bugs go to /valued-learn."],
];
// For eval issues, name the failing gates and pick the fix that matches them.
const failing = (file) => { const e = path.join(OUT, "proto", "eval.js"); if (!fs.existsSync(e)) return []; const o = spawnSync("node", [e].concat(file ? [file] : []), { encoding: "utf8", timeout: 60000 }).stdout || ""; return (o.match(/^(.{1,39}?)\s{2,}\S+\s+\S+\s+FAIL\s*$/gm) || []).map((l) => l.replace(/\s{2,}.*$/, "").trim()); };
const evalFix = (gates) => [
  gates.some((g) => /recall|Fairness|gap/i.test(g)) && "recall: widen the cues for the failing family in u.json, rerun model-inputs and the guard model",
  gates.some((g) => /precision/i.test(g)) && "false alarms: sharpen what is and is not each family in u.json triggers, rerun the guard model; process questions route to sources",
  gates.some((g) => /Routing/i.test(g)) && "routing: widen each source's match list in sources.json and send ties to a person",
  gates.some((g) => /Never/i.test(g)) && "never list: add the topic to the guard's never cues",
].filter(Boolean).join("; ") + ". Then rerun both evals; never edit labels.";
const owner = (msg) => { const o = OWNERS.find(([re]) => re.test(msg)) || [null, "?", "valued", "Investigate."]; return { gate: o[1], skill: o[2], fix: o[3] }; };
const keyOf = (f) => `${f.std}|${f.msg.replace(/^(local|hosted): /, "").replace(/\d+(\.\d+)?/g, "#")}`;

fs.mkdirSync(AUD, { recursive: true });
const n = fs.readdirSync(AUD).filter((f) => /^audit-\d+\.json$/.test(f)).length + 1;
const tmp = path.join(AUD, `check-${n}.json`);
const r = spawnSync("node", [path.join(__dirname, "check.js"), ROOT, "--port", String(port), "--json", tmp].concat(args.includes("--no-browser") ? ["--no-browser"] : []), { encoding: "utf8", timeout: 300000 });
const res = json(tmp, null);
if (!res) { console.log("Audit could not run:\n" + (r.stdout || "") + (r.stderr || "")); process.exit(2); }
fs.unlinkSync(tmp);

// Issue list across audits: same issue keeps its ID; gone issues are closed, never deleted.
const prev = json(path.join(AUD, "issues.json"), { next: 1, issues: [] });
const now = new Date().toISOString();
const seen = new Set();
for (const f of res.failures) {
  const k = keyOf(f); if (seen.has(k)) continue; seen.add(k);
  let it = prev.issues.find((x) => x.key === k);
  if (/(dev|holdout) eval does not pass/.test(f.msg)) { const g = failing(/holdout/.test(f.msg) ? "holdout.json" : ""); if (g.length) { f.msg = `${f.msg}: ${g.join(", ")}`; f.fixOverride = evalFix(g); } }
  if (!it) { it = { id: `I-${String(prev.next++).padStart(3, "0")}`, key: k, std: f.std, standard: STANDARDS[f.std] || "Time", issue: f.msg, file: f.file, ...owner(f.msg), browser: /^(local|hosted): /.test(f.msg), opened: now, audits: [] }; prev.issues.push(it); }
  if (f.fixOverride) it.fix = f.fixOverride;
  it.status = "open"; it.lastSeen = n; it.audits.push(n); it.issue = f.msg;
}
// An issue closes only when the check that found it ran again: a --no-browser audit cannot close a browser issue.
const browserRan = !args.includes("--no-browser");
for (const it of prev.issues) if (it.status === "open" && !seen.has(it.key) && (browserRan || !it.browser)) { it.status = "closed"; it.closed = now; it.closedIn = n; }
fs.writeFileSync(path.join(AUD, "issues.json"), JSON.stringify(prev, null, 2) + "\n");

const open = prev.issues.filter((x) => x.status === "open"), closed = prev.issues.filter((x) => x.status === "closed");
const audit = { n, at: now, row: res.row, pass: open.length === 0, open: open.length, closed: closed.length, shape: res.shape, questions: res.questions, systems: res.systems, dev: res.dev, holdout: res.holdoutLine, browser: res.browser };
fs.writeFileSync(path.join(AUD, `audit-${n}.json`), JSON.stringify(audit, null, 2) + "\n");

const cell = (s) => String(s ?? "").replace(/\|/g, "/").replace(/\s+/g, " ");
const md = [`# Audit ${n}: ${audit.pass ? "all eight standards pass" : `${open.length} open issue${open.length === 1 ? "" : "s"}`}`, "", `Run: ${cell((() => { try { return fs.readFileSync(path.join(OUT, "case-line.txt"), "utf8").trim(); } catch { return path.basename(ROOT); } })())} · ${now.slice(0, 16).replace("T", " ")} · audit ${n}`, "",
  "| Standard | Result |", "|---|---|", ...Object.entries(STANDARDS).map(([k, v]) => `| ${k}. ${v} | ${res.row[k] === "pass" ? "Pass" : "**Fail**"} |`), "",
  "## Open issues", "", open.length ? ["| ID | Standard | Issue | File at fault | Owner | Fix |", "|---|---|---|---|---|---|", ...open.map((x) => `| ${x.id} | ${x.std} ${cell(x.standard)} | ${cell(x.issue)} | ${cell(x.file)} | gate ${x.gate} (${x.skill}) | ${cell(x.fix)} |`)].join("\n") : "None.", "",
  "## Closed since the first audit", "", closed.length ? closed.map((x) => `- ${x.id} closed in audit ${x.closedIn}: ${cell(x.issue)}`).join("\n") : "- None yet.", "",
  "## Evals", "", "```", `dev:     ${res.dev}`, `holdout: ${res.holdoutLine}`, "```", "",
  "Work an issue: `/valued-revise <the fix>` (or edit the gate JSON and render), then `/valued-audit` again. The issue closes when the audit no longer finds it.", ""].join("\n");
fs.writeFileSync(path.join(AUD, "report.md"), md);

// Trace and the cross-run ledger.
const trace = (e) => fs.appendFileSync(path.join(OUT, "trace.jsonl"), JSON.stringify({ t: Date.now(), ...e }) + "\n");
trace({ kind: "audit", n, pass: audit.pass, open: open.length, closed: closed.length, row: res.row, issues: open.map((x) => x.id) });
const ledgerDir = path.join(ROOT, "learning");
if (fs.existsSync(ledgerDir)) fs.appendFileSync(path.join(ledgerDir, "runs.jsonl"), JSON.stringify({ at: now, workspace: path.basename(ROOT), case: (json(path.join(OUT, "run-report.json"), {}).case || ""), audit: n, row: res.row, open: open.map((x) => ({ id: x.id, std: x.std, gate: x.gate, issue: x.issue })), minutes: json(path.join(OUT, "run-report.json"), {}).totalSeconds ? +(json(path.join(OUT, "run-report.json"), {}).totalSeconds / 60).toFixed(1) : null }) + "\n");
spawnSync("node", [path.join(__dirname, "observe.js")], { cwd: ROOT, encoding: "utf8" });

console.log(`| Standard | ${Object.keys(STANDARDS).join(" | ")} |\n|---|${Object.keys(STANDARDS).map(() => "---").join("|")}|\n| Audit ${n} | ${Object.keys(STANDARDS).map((k) => (res.row[k] === "pass" ? "pass" : "FAIL")).join(" | ")} |`);
console.log(open.length ? `\n${open.length} open issue${open.length === 1 ? "" : "s"}${closed.length ? `, ${closed.length} closed` : ""}:\n` + open.map((x) => `- ${x.id} [${x.std}] ${x.issue} · ${x.file} · gate ${x.gate} · fix: ${x.fix}`).join("\n") : `\nAll eight standards pass${closed.length ? ` (${closed.length} issues closed)` : ""}.`);
console.log(`\nReport: out/audit/report.md · Observability: out/observe.html`);
process.exit(open.length ? 1 : 0);
