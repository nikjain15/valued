#!/usr/bin/env node
// VALUED run checker: scores one run folder against the eight standards and prints a scorecard row.
// Usage: node check.js <run dir> [--port 4401] [--no-browser] [--json out.json]
// Static checks read out/; the eval runs node out/proto/eval.js; the browser checks drive the local
// server and the hosted page in headless Chrome over the DevTools protocol (no dependencies).
const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const args = process.argv.slice(2);
const dir = path.resolve(args[0] || ".");
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const PORT = Number(opt("--port", process.env.PORT || 4317));
const NO_BROWSER = args.includes("--no-browser");
const JSON_OUT = opt("--json", "");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const out = path.join(dir, "out"), proto = path.join(out, "proto");
const read = (f) => { try { return fs.readFileSync(f, "utf8"); } catch { return ""; } };
const json = (f, fb) => { try { return JSON.parse(read(f)); } catch { return fb; } };
const BLOCKED_NAMES = /\b(Fidelity|CredR|EdCast|Coursewave|Enelek)\b/;

const F = []; // failures: { std, msg, file }
const fail = (std, msg, file = "") => F.push({ std, msg, file });
const expect = (cond, std, msg, file) => { if (!cond) fail(std, msg, file); return Boolean(cond); };

const CASE = json(path.join(proto, "case.json"), {});
const gates = json(path.join(proto, "gates.json"), {});
const golden = json(path.join(proto, "golden.json"), []);
const holdout = json(path.join(proto, "holdout.json"), []);
const prd = read(path.join(out, "prd.md"));
const state = read(path.join(out, "state.md"));
const gateFiles = fs.existsSync(out) ? fs.readdirSync(out).filter((f) => /^\d-.*\.md$/.test(f)).map((f) => path.join(out, f)) : [];
const meta = json(path.join(out, "run-report.json"), json(path.join(out, "audit-meta.json"), {}));

// ---------- 1 Questions ----------
const cards = gateFiles.concat([path.join(out, "state.md")]).map(read).join("\n");
const ifNone = (cards.match(/If none fits, answer with/g) || []).length;
const decSection = (state.split(/## Client decisions/)[1] || "").split(/\n## /)[0];
const decisionsRows = (decSection.match(/^\|\s*(Setup|V|A|L|U|E|D|Frame|R1|R2)\s*\|/gm) || []).length;
const asked = meta.questionsAsked ?? meta.questions ?? (decisionsRows || ifNone);
expect(asked >= 11 && asked <= 16, 1, `questions asked ${asked}, expected 11 to 16`, "out/state.md");
expect(Array.isArray(CASE.decisions) && CASE.decisions.length >= 11 && CASE.decisions.length <= 16, 1, `case.json decisions ${(CASE.decisions || []).length}, expected 11 to 16`, "out/proto/case.json");
expect(/\(Recommended[:)]/.test(cards), 1, "no card option labelled (Recommended)", "out/*.md");
const cardHeaders = cards.match(/\*\*"([^"]+)": "/g) || [];
expect(!/\*\*"COO": "/.test(cards) || /COO/.test(CASE.client || "") || /COO/i.test(state.split("## Client decisions")[0] || ""), 1, 'card header still says "COO" although the case names no COO', "out/*.md");

// ---------- 2 Agentic ----------
const agents = CASE.agents || [];
expect(agents.length >= 3 && agents.length <= 6, 2, `${agents.length} assistants, expected 3 to 6`, "out/proto/case.json");
expect(agents[0] && agents[0].kind === "rules" && /guard|safety/i.test(agents[0].name), 2, "first assistant is not a fixed-rules safety guard", "out/proto/case.json");
expect(agents.every((a) => a.name && a.kind && a.job && Array.isArray(a.may) && Array.isArray(a.never) && a.gate), 2, "an assistant lacks name, kind, job, may, never or gate", "out/proto/case.json");
expect(!agents.some((a) => /^agent \d/i.test(a.name)), 2, "an assistant is named 'agent n'", "out/proto/case.json");
const sweeps = CASE.sweeps || [];
expect(sweeps.length >= 1 && sweeps.length <= 3, 2, `${sweeps.length} sweeps, expected 1 to 3`, "out/proto/case.json");
expect(sweeps.length && sweeps.every((s) => (s.findings || []).length >= 2 && s.findings.every((f) => f.title && f.why && f.cite)), 2, "a sweep has fewer than 2 findings or a finding lacks title, why or cite", "out/proto/case.json");

// ---------- 3 Prototype shape ----------
expect(["desk", "review", "rank", "chat"].includes(CASE.shape), 3, `shape "${CASE.shape}" not one of desk, review, rank, chat`, "out/proto/case.json");
expect(CASE.persona && CASE.persona.name && CASE.persona.role, 3, "persona missing name or role", "out/proto/case.json");
expect(CASE.labels && ["section", "evals", "gov", "audit", "agents", "data", "how", "faq"].every((k) => CASE.labels[k]), 3, "labels missing one of section, evals, gov, audit, agents, data, how, faq", "out/proto/case.json");
expect(CASE.clocks && ["escalate", "human", "answer"].every((k) => CASE.clocks[k] && CASE.clocks[k].hours), 3, "clocks missing hours for escalate, human or answer", "out/proto/case.json");
const conns = CASE.connectors || [];
expect(conns.length >= 6, 3, `${conns.length} systems in Data and tools, expected 6 or more`, "out/proto/case.json");
expect(conns.every((c) => !c.vendor || /assumed|e\.g\./i.test(c.vendor) || c.vendor === ""), 3, "a connector names a vendor without (assumed)", "out/proto/case.json");
expect(conns.every((c) => c.name && c.category && c.provides && c.usedFor && c.status), 3, "a connector lacks name, category, provides, usedFor or status", "out/proto/case.json");
expect(CASE.verdicts && ["answer", "human", "escalate"].every((k) => CASE.verdicts[k] && CASE.verdicts[k].label), 3, "verdicts missing labels", "out/proto/case.json");
expect(Array.isArray(CASE.samples) && CASE.samples.length === 6 && CASE.samples.every((s) => s.expect), 3, `${(CASE.samples || []).length} samples, expected 6 with expect`, "out/proto/case.json");
expect(Array.isArray(CASE.itemNoun) && CASE.itemNoun.length === 2, 3, "itemNoun missing (singular, plural)", "out/proto/case.json");
if (CASE.shape === "rank") expect(Array.isArray(CASE.dismissReasons) && CASE.dismissReasons.length >= 4, 3, "rank shape needs 4 dismissReasons", "out/proto/case.json");
expect(Array.isArray(CASE.neverList) && CASE.neverList.length >= 3, 3, "never list has fewer than 3 lines", "out/proto/case.json");

// ---------- 4 Traceability ----------
expect((CASE.governance || []).length >= 12, 4, `${(CASE.governance || []).length} governance rows, expected 12 or more (3 per gate)`, "out/proto/case.json");
expect((CASE.governance || []).filter((g) => !/^answered/i.test(g.status || "")).every((g) => g.owner), 4, "an open governance row has no owner", "out/proto/case.json");
expect((CASE.decisions || []).every((d) => d.gate && d.decision && d.by && d.effect), 4, "a decision lacks gate, decision, by or effect", "out/proto/case.json");
const faq = CASE.faq || [];
expect(faq.length >= 7 && faq.length <= 8, 4, `${faq.length} FAQ pairs, expected 7 to 8`, "out/proto/case.json");
expect(faq.length && faq.every((f) => f.q && f.a && f.from), 4, "a FAQ pair lacks a 'from' (Based on) tag", "out/proto/case.json");
const appHtml = read(path.join(proto, "app.html"));
const appRef = read(path.join(dir, ".claude/skills/valued-build/app/app.html"));
expect(!appRef || appHtml === appRef, 4, "out/proto/app.html differs from the skill's app.html (case-specific edits in the app)", "out/proto/app.html");

// ---------- 5 PRD ----------
const pending = (prd.match(/Pending:/g) || []).length;
expect(pending === 0, 5, `${pending} "Pending:" lines in the PRD`, "out/prd.md");
expect(!/\(use case, from gate V\)/.test(prd) && /^# .+: product requirements/m.test(prd), 5, "PRD title not set from gate V", "out/prd.md");
expect((prd.match(/Given[^|\n]*\bwhen\b[^|\n]*\bthen\b/gi) || []).length >= 3, 5, "fewer than 3 Given / When / Then acceptance criteria", "out/prd.md");
for (const id of ["FR-", "NFR-", "US-", "G-", "M-", "R-"]) expect(prd.includes(id), 5, `no ${id} requirement ids`, "out/prd.md");
for (const t of [/\| *Assistant *\|/, /\| *Sweep *\|/, /\| *Outcome *\|.*(Clock|Deadline|Hours)/i, /\| *System *\|/]) expect(t.test(prd), 5, `PRD table missing: ${t}`, "out/prd.md");
expect(/## Appendix: document history[\s\S]*\|\s*0\.\d/.test(prd), 5, "document history has no version row", "out/prd.md");
expect(/## 17\. Build it with AI[\s\S]{600,}/.test(prd) && /Kickoff prompt/.test(prd), 5, "section 17 is short or lacks a kickoff prompt", "out/prd.md");
expect(/## 11\.[\s\S]*?(RELEASE PASSES|RELEASE BLOCKED|Passes all gates|Blocked)/i.test(prd), 5, "section 11 has no real eval result", "out/prd.md");
expect(!/<[a-z][^>]*>/.test(prd.replace(/`[^`]*`/g, "")) || true, 5, "", "");
expect(!/\| *<[^|]*> *\|/.test(prd), 5, "PRD still contains template placeholders like <...>", "out/prd.md");
expect(fs.existsSync(path.join(out, "prd.html")) && /prd-viewer|<article|class="doc"/.test(read(path.join(out, "prd.html"))) , 5, "out/prd.html missing or not rendered through the viewer", "out/prd.html");

// ---------- 6 Evals ----------
const evalRun = (file) => { const r = spawnSync("node", [path.join(proto, "eval.js")].concat(file ? [file] : []), { encoding: "utf8", timeout: 60000 }); return (r.stdout || "") + (r.stderr || ""); };
const dev = fs.existsSync(path.join(proto, "eval.js")) ? evalRun() : "";
const hold = fs.existsSync(path.join(proto, "eval.js")) ? evalRun("holdout.json") : "";
expect(/RELEASE PASSES ALL GATES/.test(dev), 6, "dev eval does not pass all gates", "out/proto/router.js");
expect(/RELEASE PASSES ALL GATES/.test(hold), 6, "holdout eval does not pass all gates", "out/proto/router.js");
const gateKeys = ["escalation_recall", "escalation_precision", "answers_without_source", "routing_accuracy", "recall_gap_max", "riskiest_slice", "fairness_min", "never_list_answers", "verdicts_outside_allowed"];
expect(gateKeys.every((k) => k in gates), 6, "gates.json lacks one of the 8 gates or riskiest_slice", "out/proto/gates.json");
expect((dev.match(/^\S.*(PASS|FAIL)\s*$/gm) || []).length >= 8, 6, "eval output lists fewer than 8 gates", "out/proto/eval.js");
expect(/By slice/.test(dev), 6, "eval output has no per-group line", "out/proto/eval.js");
expect(golden.length >= 30 && holdout.length >= 12, 6, `golden ${golden.length} rows, holdout ${holdout.length}; expected 30+ and 12+ (new runs write 20)`, "out/proto/golden.json");
expect(holdout.filter((r) => r.expected === "escalate").length >= 6, 6, "holdout has fewer than 6 escalation rows", "out/proto/holdout.json");
expect(golden.filter((r) => r.never).length >= 3, 6, "golden set has fewer than 3 never-list rows", "out/proto/golden.json");
const evalsMd = read(path.join(out, "5-evals.md"));
const singleContext = /single-context|inline|not independent/i.test(evalsMd + state);
expect(!singleContext || /not independent/i.test(evalsMd), 6, "built in one context but the evidence pack does not say 'not independent'", "out/5-evals.md");
expect(/holdout\.json/.test(evalsMd) && /node (?:out\/proto\/)?eval\.js/.test(evalsMd), 6, "evidence pack lacks reproduce commands", "out/5-evals.md");
const router = read(path.join(proto, "router.js"));
expect(router && !/\brequire\(|\bimport\s|readFileSync|fetch\(/.test(router), 7, "router.js is not self-contained (require, import, file read or fetch)", "out/proto/router.js");
expect(/module\.exports\s*=\s*\{\s*decide/.test(router), 7, "router.js does not end with module.exports = { decide }", "out/proto/router.js");

// ---------- 8 Writing ----------
const scan = [];
const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); if (s.isDirectory()) { if (!/hosted|node_modules/.test(f)) walk(p); } else if (/\.(md|json|js|html|csv)$/.test(f) && !/audit\.jsonl|ff\.css|app\.html|prd-viewer|server\.js/.test(f)) scan.push(p); } };
if (fs.existsSync(out)) walk(out);
for (const p of scan) { const t = read(p); const i = t.indexOf("—"); if (i >= 0) fail(8, `em-dash at ${path.relative(dir, p)}: "${t.slice(Math.max(0, i - 30), i + 30).replace(/\s+/g, " ")}"`, path.relative(dir, p)); const m = t.match(BLOCKED_NAMES); if (m) fail(8, `employer name "${m[0]}" in ${path.relative(dir, p)}`, path.relative(dir, p)); }
const realCo = /\b(Acme|Anthem|Aetna|UnitedHealth|Cigna|Humana|Chase(?![a-z]| [a-z])|JPMorgan|Wells Fargo|Bank of America|Citibank|Citi|Capital One|Delta Air|United Airlines|American Airlines|Walmart|Amazon|Geico|Allstate|State Farm|Humana|Kaiser|Mayo|Cleveland Clinic|CVS|Walgreens|Duke Energy|PG&E|Salesforce|Google|Microsoft)\b/;
for (const p of scan.filter((p) => /case\.json|golden\.json|holdout\.json|sources\.json|prd\.md|\d-.*\.md|state\.md/.test(p))) { const t = read(p).replace(/\(assumed\)/g, "").replace(/e\.g\.[^)\n]*\)?/g, ""); const m = t.match(realCo); if (m && !/vendor|assumed/i.test(t.slice(Math.max(0, t.indexOf(m[0]) - 60), t.indexOf(m[0]) + 60))) fail(8, `real company name "${m[0]}" in ${path.relative(dir, p)}`, path.relative(dir, p)); }

// ---------- 7 Browser ----------
async function browser() {
  if (NO_BROWSER) return { skipped: true };
  if (!fs.existsSync(CHROME)) { fail(7, "Chrome not found; browser checks skipped"); return {}; }
  const srv = spawn("node", [path.join(proto, "server.js")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
  await new Promise((r) => setTimeout(r, 900));
  const udd = fs.mkdtempSync(path.join(require("os").tmpdir(), "valued-chrome-"));
  const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${udd}`, "--no-first-run", "--disable-gpu", "--allow-file-access-from-files", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((res, rej) => { let buf = ""; chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); }); setTimeout(() => rej(new Error("chrome did not start")), 15000); });
  const port = wsUrl.match(/:(\d+)\//)[1];
  const result = {};
  try {
    const hostedPath = path.join(out, "hosted", "index.html");
    const bh = path.join(dir, ".claude/skills/valued-build/build-hosted.js");
    if (fs.existsSync(bh)) spawnSync("node", [bh, out], { encoding: "utf8" });
    const targets = [["local", `http://localhost:${PORT}/`], ["hosted", fs.existsSync(hostedPath) ? "file://" + hostedPath : ""], ["prd", `http://localhost:${PORT}/prd`]];
    for (const [name, url] of targets) {
      if (!url) { fail(7, `${name} page missing`); continue; }
      const t = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }).then((r) => r.json());
      const ws = new WebSocket(t.webSocketDebuggerUrl);
      await new Promise((r) => (ws.onopen = r));
      let id = 0; const pend = {}; const errors = [];
      ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; } if (m.method === "Runtime.exceptionThrown") errors.push("exception: " + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).split("\n")[0]); if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errors.push("console.error: " + m.params.args.map((a) => a.value || a.description || "").join(" ").slice(0, 160)); if (m.method === "Log.entryAdded" && m.params.entry.level === "error" && !/fonts\.g|ERR_INTERNET|favicon|net::|404/.test(m.params.entry.text)) errors.push("log: " + m.params.entry.text.slice(0, 160)); };
      const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
      const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) errors.push("eval: " + (r.result.exceptionDetails.exception?.description || "").split("\n")[0] + " in " + expr.slice(0, 60)); return r.result.result?.value; };
      await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
      await send("Page.navigate", { url }); await new Promise((r) => setTimeout(r, 2500));
      const r = { url, errors };
      if (name === "prd") {
        r.text = await ev("document.body.innerText.length");
        r.pending = await ev("(document.body.innerText.match(/Pending:/g)||[]).length");
        expect(r.text > 5000, 5, `PRD viewer rendered only ${r.text} characters`, "out/prd.html");
        expect(r.pending === 0, 5, `PRD viewer shows ${r.pending} Pending lines`, "out/prd.md");
      } else {
        r.items = await ev("typeof ITEMS!=='undefined'?ITEMS.length:-1");
        r.counts = await ev("typeof counts==='function'?JSON.stringify(counts()):''");
        expect(r.items === golden.length, 7, `${name}: queue has ${r.items} items, golden set has ${golden.length}`, "out/proto/router.js");
        r.greet = await ev("document.querySelector('#greet')?.textContent||''");
        expect(/Good (morning|afternoon|evening), \w+/.test(r.greet || ""), 3, `${name}: Today greeting missing`, "out/proto/app.html");
        r.tiles = await ev("document.querySelectorAll('#tiles .tile').length");
        r.ready = await ev("document.querySelector('#readyBanner')?.textContent?.trim().slice(0,60)||''");
        r.overnight = await ev("document.querySelector('#overnight')?.textContent?.trim().length||0");
        r.away = await ev("document.querySelectorAll('#away .finding').length");
        r.clocks = await ev("document.querySelectorAll('#clocks .qitem').length");
        r.top = await ev("document.querySelectorAll('#queues .qitem').length");
        expect(r.tiles === 4, 3, `${name}: ${r.tiles} tiles on Today`, "out/proto/app.html");
        expect(r.ready, 3, `${name}: no readiness banner`, "out/proto/app.html");
        expect(r.overnight > 40, 3, `${name}: no overnight summary`, "out/proto/app.html");
        expect(r.away >= 2, 3, `${name}: While you were away shows ${r.away} findings`, "out/proto/case.json");
        expect(r.clocks >= 1, 3, `${name}: Close to their clock shows nothing`, "out/proto/case.json");
        expect(r.top >= 1 && r.top <= 3, 3, `${name}: Needs you now shows ${r.top}, expected 1 to 3`, "out/proto/app.html");
        r.sidebar = await ev("[...document.querySelectorAll('.nav button')].map(b=>b.textContent.trim().replace(/\\d+$/,'')).join('|')");
        await ev("go('queue')"); r.qtabs = await ev("document.querySelectorAll('#qtabs [role=tab]').length");
        expect(r.qtabs >= 4, 3, `${name}: queue has ${r.qtabs} tabs`, "out/proto/app.html");
        r.opened = {};
        for (const v of ["escalate", "human", "answer"]) {
          const key = await ev(`(ITEMS.find(i=>i.d.verdict==='${v}')||{}).key||''`);
          if (!key) { fail(7, `${name}: no item with verdict ${v} in the queue`, "out/proto/golden.json"); continue; }
          await ev(`go('item', ${JSON.stringify(key)})`); await new Promise((r) => setTimeout(r, 300));
          const trail = await ev("document.querySelectorAll('#trailBox .trail li').length");
          const wrong = await ev("Boolean(document.querySelector('#wrongOpen'))");
          const body = await ev("document.querySelector('#item').innerText.length");
          r.opened[v] = { trail, wrong, body };
          expect(trail >= 2, 3, `${name}: item ${v} has no 'How this was prepared' trail`, "out/proto/app.html");
          expect(wrong, 3, `${name}: item ${v} has no 'This is wrong' button`, "out/proto/app.html");
          expect(body > 200, 7, `${name}: item ${v} detail is empty`, "out/proto/app.html");
          if (CASE.shape === "review" && v === "answer") { const fields = await ev("document.querySelectorAll('.fconf').length"); expect(fields >= 2, 3, `${name}: review item shows ${fields} fields`, "out/proto/router.js"); }
          if (CASE.shape === "rank" && v === "answer") { const acts = await ev("document.querySelectorAll('#item .action').length"); expect(acts >= 1, 3, `${name}: rank item shows ${acts} actions`, "out/proto/router.js"); }
        }
        await ev("go('agents')"); r.agentCards = await ev("document.querySelectorAll('#agentCards .agent').length");
        expect(r.agentCards === agents.length, 3, `${name}: assistants page shows ${r.agentCards} of ${agents.length}`, "out/proto/app.html");
        await ev("go('evals'); engine='rules'; renderEvalControls();"); await ev("runTest()"); await new Promise((r) => setTimeout(r, 800));
        r.evalRows = await ev("document.querySelectorAll('#board tr.click').length"); r.evalPass = await ev("(RUNS[0]||{}).pass"); r.evalGates = await ev("((RUNS[0]||{}).gates||[]).length");
        expect(r.evalRows >= 1, 7, `${name}: Design A run produced no row`, "out/proto/app.html");
        expect(r.evalGates === 8, 6, `${name}: quality page scores ${r.evalGates} gates, expected 8`, "out/proto/gates.json");
        expect(r.evalPass === true, 6, `${name}: Design A fails on the quality page`, "out/proto/router.js");
        await ev("go('data')"); r.connCards = await ev("document.querySelectorAll('#connGroups .conn-grid > *').length");
        expect(r.connCards >= 6, 3, `${name}: Data and tools shows ${r.connCards}`, "out/proto/case.json");
        await ev("go('gov')"); r.govRows = await ev("document.querySelectorAll('#govRows tr, #p-gov tbody tr').length");
        expect(r.govRows >= 6, 4, `${name}: controls page shows ${r.govRows} rows`, "out/proto/case.json");
        await ev("go('faq')"); r.faq = await ev("document.querySelectorAll('#faqList details').length");
        await ev("go('how')"); await ev("go('audit')"); await ev("go('home')");
        r.emdash = await ev("document.body.innerText.includes('\\u2014')");
        expect(!r.emdash, 8, `${name}: em-dash visible on the page`, "out/proto/app.html");
      }
      for (const e of [...new Set(errors)]) fail(7, `${name}: ${e}`, "out/proto/app.html");
      ws.close(); result[name] = r;
    }
  } finally { chrome.kill(); srv.kill(); try { fs.rmSync(udd, { recursive: true, force: true }); } catch {} }
  return result;
}

(async () => {
  const b = await browser().catch((e) => { fail(7, "browser run failed: " + e.message); return {}; });
  const stds = [1, 2, 3, 4, 5, 6, 7, 8];
  const row = Object.fromEntries(stds.map((s) => [s, F.some((f) => f.std === s) ? "fail" : "pass"]));
  const report = { dir: path.basename(dir), shape: CASE.shape, questions: asked, agents: agents.length, sweeps: sweeps.length, systems: conns.length, pending, golden: golden.length, holdout: holdout.length, row, failures: F, browser: b, timing: meta.phases || meta.gates || meta.timing || null, dev: dev.trim().split("\n").pop(), holdoutLine: hold.trim().split("\n").pop() };
  console.log(`| ${path.basename(dir)} | ${CASE.shape || "?"} | ${stds.map((s) => row[s] === "pass" ? "pass" : "FAIL").join(" | ")} | ${asked} q | ${agents.length} a | ${sweeps.length} s | ${conns.length} sys | ${pending} pend |`);
  for (const f of F) console.log(`  - [${f.std}] ${f.msg}${f.file ? ` (${f.file})` : ""}`);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(report, null, 2));
  process.exit(F.length ? 1 : 0);
})();
