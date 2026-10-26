#!/usr/bin/env node
// VALUED observability: renders out/observe.html, one page for the whole run, from what the run left behind:
// out/trace.jsonl (every conductor command, decision, render and audit), out/run-clock.jsonl (phases),
// out/cards.json (decisions), out/audit/ (issues), out/proto/audit.jsonl (what people did in the prototype).
// Usage (from the workspace root): node .claude/skills/valued-audit/observe.js
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd(), OUT = path.join(ROOT, "out");
const read = (f, fb = "") => { try { return fs.readFileSync(f, "utf8"); } catch { return fb; } };
const json = (f, fb) => { try { return JSON.parse(read(f)); } catch { return fb; } };
const lines = (f) => read(f).split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const hhmm = (t) => new Date(t).toTimeString().slice(0, 8);
const dur = (s) => (s === null || s === undefined ? "" : `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, "0")}s`);

const trace = lines(path.join(OUT, "trace.jsonl"));
const clock = lines(path.join(OUT, "run-clock.jsonl"));
const cards = json(path.join(OUT, "cards.json"), []);
const issues = json(path.join(OUT, "audit", "issues.json"), { issues: [] }).issues;
const actions = lines(path.join(OUT, "proto", "audit.jsonl"));
const report = json(path.join(OUT, "run-report.json"), {});
const caseLine = read(path.join(OUT, "case-line.txt")).trim() || report.case || path.basename(ROOT);
const PHASES = [["0", "Frame", 3], ["1", "Round 1", 2], ["2", "V then A", 7], ["3", "Round 2", 2], ["4", "L and U", 5], ["5", "E and D", 6], ["6", "Build", 3]];

const phases = PHASES.map(([id, name, budget]) => {
  const st = clock.find((e) => e.phase === id && e.event === "start"), en = [...clock].reverse().find((e) => e.phase === id && e.event === "end");
  return { id, name, budget, secs: st ? ((en ? en.t : Date.now()) - st.t) / 1000 : null, running: Boolean(st && !en) };
});
const cuts = clock.filter((e) => e.event === "cut");
// Run time is the phase clock (first start to last end), not later audits or re-renders.
const t0 = clock[0]?.t || trace[0]?.t, tEnd = clock.length ? Math.max(...clock.map((e) => e.t)) : Math.max(...trace.map((e) => e.t), 0);
const total = t0 ? (tEnd - t0) / 1000 : 0;
const renders = trace.filter((e) => e.kind === "render");
const audits = trace.filter((e) => e.kind === "audit");
const last = audits[audits.length - 1];
const open = issues.filter((x) => x.status === "open"), closed = issues.filter((x) => x.status === "closed");
const flags = actions.filter((a) => /wrong/i.test(a.action || ""));
const lastRender = renders[renders.length - 1] || {};
const gateRows = Object.entries(lastRender.devGates || {});

const pill = (ok, yes, no) => `<span class="pill ${ok ? "ok" : "bad"}">${ok ? yes : no}</span>`;
const maxBar = Math.max(...phases.map((p) => Math.max(p.secs || 0, p.budget * 60)), 1);
const bars = phases.map((p) => `<div class="ph"><div class="phl">${p.id} ${esc(p.name)}</div><div class="track"><div class="budget" style="width:${(p.budget * 60 / maxBar) * 100}%"></div><div class="used ${p.secs > p.budget * 60 ? "over" : ""}" style="width:${((p.secs || 0) / maxBar) * 100}%"></div></div><div class="phv">${p.secs === null ? "not started" : `${dur(p.secs)} of ${p.budget}m${p.running ? " (running)" : ""}`}</div></div>`).join("");

const kpis = [
  [dur(total) || "0m 00s", "run time, budget 28m", total <= 28 * 60],
  [String(cards.filter((c) => c.decision).length), "client decisions", cards.length >= 11 && cards.length <= 16],
  [lastRender.dev === undefined ? "not run" : lastRender.dev && lastRender.holdout ? "Passes" : "Blocked", "release, dev and holdout", Boolean(lastRender.dev && lastRender.holdout)],
  [last ? String(open.length) : "not run", "open audit issues", last ? open.length === 0 : false],
];

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Run observability</title>
<style>
:root { --brand:#32854c; --brand-tint:#e9f5ee; --ink:#28323f; --ink-3:#5b636e; --ink-4:#97a0aa; --line:#e6e0d3; --paper:#f4f1e9; --white:#fff; --amber:#c97d1a; --amber-bg:#fdf8f0; --error:#b2291e; --error-bg:#fdf2f1; --sans:"Inter",-apple-system,"Segoe UI",Helvetica,Arial,sans-serif; --display:"Fraunces",Georgia,serif; --mono:ui-monospace,"SF Mono",Menlo,monospace; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --ink:#ece8df; --ink-3:#b9b3a7; --ink-4:#8a857b; --line:#3a4350; --paper:#1d232b; --white:#262e38; --brand-tint:#21362a; --amber-bg:#3a2f1e; --error-bg:#3b2422; } }
:root[data-theme="dark"] { --ink:#ece8df; --ink-3:#b9b3a7; --ink-4:#8a857b; --line:#3a4350; --paper:#1d232b; --white:#262e38; --brand-tint:#21362a; --amber-bg:#3a2f1e; --error-bg:#3b2422; }
* { box-sizing:border-box } body { margin:0; background:var(--paper); color:var(--ink); font:15px/1.5 var(--sans) }
.wrap { max-width:1080px; margin:0 auto; padding:28px 16px 64px } h1 { font:600 clamp(24px,3.4vw,34px)/1.2 var(--display); margin:4px 0 6px; letter-spacing:-.02em }
h2 { font:600 19px var(--display); margin:30px 0 10px } .eyebrow { font-size:11px; letter-spacing:.12em; text-transform:uppercase; color:var(--ink-4) } .muted { color:var(--ink-3); font-size:13px }
.kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-top:18px } .kpi { background:var(--white); border:1px solid var(--line); border-radius:12px; padding:14px 16px }
.kpi b { font:600 24px var(--display); display:block } .kpi.bad b { color:var(--error) } .kpi.ok b { color:var(--brand) }
.card { background:var(--white); border:1px solid var(--line); border-radius:12px; padding:14px 16px; overflow-x:auto }
.ph { display:grid; grid-template-columns:110px 1fr 150px; gap:10px; align-items:center; margin:6px 0; font-size:13px } .track { position:relative; height:14px; background:var(--paper); border-radius:7px }
.budget { position:absolute; inset:0 auto 0 0; border:1px dashed var(--ink-4); border-radius:7px } .used { position:absolute; inset:2px auto 2px 0; background:var(--brand); border-radius:6px } .used.over { background:var(--amber) }
table { border-collapse:collapse; width:100%; font-size:13px } th,td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top } th { color:var(--ink-3); font-weight:600 }
.pill { display:inline-block; padding:1px 9px; border-radius:999px; font-size:12px; font-weight:600 } .pill.ok { background:var(--brand-tint); color:var(--brand) } .pill.bad { background:var(--error-bg); color:var(--error) } .pill.warn { background:var(--amber-bg); color:var(--amber) }
code, .mono { font-family:var(--mono); font-size:12px } details summary { cursor:pointer; color:var(--ink-3); font-size:13px }
@media (max-width:640px) { .ph { grid-template-columns:80px 1fr; } .phv { grid-column:2 } }
</style></head><body><div class="wrap">
<div class="eyebrow">VALUED run observability</div>
<h1>${esc(caseLine)}</h1>
<div class="muted">${t0 ? `Started ${new Date(t0).toLocaleString()}` : "Not started"} · ${trace.length} events · ${audits.length} audit${audits.length === 1 ? "" : "s"} · ${report.mode || "orchestrated"}</div>
<div class="kpis">${kpis.map(([v, l, ok]) => `<div class="kpi ${ok ? "ok" : "bad"}"><b>${esc(v)}</b><span class="muted">${esc(l)}</span></div>`).join("")}</div>

<h2>Phases against the 28-minute budget</h2>
<div class="card">${bars}${cuts.length ? `<p class="muted">Scope cut: ${cuts.map((c) => `phase ${esc(c.phase)}, ${esc(c.note)}`).join("; ")}</p>` : ""}</div>

<h2>Audit: the eight standards</h2>
<div class="card">${last ? `<table><tr>${Object.keys(last.row).map((k) => `<th>${k}</th>`).join("")}</tr><tr>${Object.values(last.row).map((v) => `<td>${pill(v === "pass", "Pass", "Fail")}</td>`).join("")}</tr></table>
<table style="margin-top:12px"><tr><th>ID</th><th>Status</th><th>Issue</th><th>File at fault</th><th>Owner</th><th>Fix</th></tr>${[...open, ...closed].slice(0, 40).map((x) => `<tr><td class="mono">${esc(x.id)}</td><td>${x.status === "open" ? '<span class="pill bad">Open</span>' : `<span class="pill ok">Closed in audit ${x.closedIn}</span>`}</td><td>${esc(x.issue)}</td><td class="mono">${esc(x.file)}</td><td>gate ${esc(x.gate)}</td><td>${esc(x.fix)}</td></tr>`).join("") || '<tr><td colspan="6">No issues found.</td></tr>'}</table>` : '<p class="muted">No audit yet. Run <code>/valued-audit</code>.</p>'}</div>

<h2>Evals over the run</h2>
<div class="card">${gateRows.length ? `<table><tr><th>Gate</th><th>Bar</th><th>Dev</th><th>Holdout</th></tr>${gateRows.map(([k, r]) => `<tr><td>${esc(k)}</td><td>${esc(r.bar)}</td><td>${esc(r.value)} ${pill(r.result === "PASS", "Pass", "Fail")}</td><td>${esc((lastRender.holdGates || {})[k]?.value || "")} ${(lastRender.holdGates || {})[k] ? pill((lastRender.holdGates || {})[k].result === "PASS", "Pass", "Fail") : ""}</td></tr>`).join("")}</table>` : '<p class="muted">No eval yet.</p>'}
${renders.length ? `<p class="muted">Release status at each render: ${renders.map((r) => `${hhmm(r.t)} ${r.dev === undefined ? "none" : r.dev && r.holdout ? "passes" : "blocked"} (${r.open} open checks, ${r.pending} pending)`).join(" · ")}</p>` : ""}</div>

<h2>Client decisions</h2>
<div class="card"><table><tr><th>Round</th><th>Gate</th><th>Who</th><th>Question</th><th>Decision</th></tr>${cards.map((c) => `<tr><td>${esc(c.round)}</td><td>${esc(c.gate)}</td><td>${esc(c.by || c.role)}</td><td>${esc(c.question)}</td><td>${c.decision ? `${esc(c.decision)}${c.auto ? ' <span class="pill warn">auto</span>' : ""}${c.decision !== (c.options || [])[0]?.label ? ' <span class="pill warn">overruled us</span>' : ""}` : '<span class="muted">open</span>'}</td></tr>`).join("") || '<tr><td colspan="5">No cards yet.</td></tr>'}</table></div>

<h2>In the prototype</h2>
<div class="card"><p class="muted">${actions.length} logged actions · ${flags.length} flagged "This is wrong"</p>${actions.length ? `<table><tr><th>Time</th><th>Item</th><th>Outcome</th><th>Action</th><th>By</th></tr>${actions.slice(-15).reverse().map((a) => `<tr><td class="mono">${esc((a.at || "").slice(11, 19))}</td><td>${esc(a.item)}</td><td>${esc(a.verdict)}</td><td>${/wrong/i.test(a.action || "") ? '<span class="pill bad">' + esc(a.action) + "</span>" : esc(a.action)}</td><td>${esc(a.by)}</td></tr>`).join("")}</table>` : ""}</div>

<h2>Event log</h2>
<div class="card"><details><summary>${trace.length} events, newest first</summary><table><tr><th>Time</th><th>Kind</th><th>Detail</th></tr>${[...trace].reverse().slice(0, 300).map((e) => `<tr><td class="mono">${hhmm(e.t)}</td><td>${esc(e.kind)}</td><td class="mono">${esc(e.kind === "cmd" ? [e.cmd, ...(e.args || [])].join(" ") : e.kind === "decision" ? `${e.gate} ${e.question} : ${e.decision}` : e.kind === "render" ? `gates ${e.gates.join("")}, ${e.pending} pending, ${e.open} open checks, golden ${e.golden}, holdout ${e.holdoutN}` : e.kind === "audit" ? `audit ${e.n}: ${e.open} open, ${e.closed} closed` : JSON.stringify(e).slice(0, 200))}</td></tr>`).join("")}</table></details></div>
</div></body></html>
`;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "observe.html"), html);
console.log(`Observability: out/observe.html · ${trace.length} events · ${open.length} open issues · ${dur(total)} of 28m`);
