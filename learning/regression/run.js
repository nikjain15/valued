#!/usr/bin/env node
// Regression suite: scores every scenario workspace with check.js plus the expected properties in
// scenarios.json, and prints the scorecard. Must be all pass, within the time budget, before a push.
// Usage: node run.js [--prefix ~/dev/valued-audit-] [--only slug,slug] [--static] [--out results]
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const prefix = opt("--prefix", path.join(os.homedir(), "dev", "valued-audit-")).replace(/^~/, os.homedir());
const only = (opt("--only", "") || "").split(",").filter(Boolean);
const outDir = path.resolve(__dirname, opt("--out", "results"));
const { scenarios } = JSON.parse(fs.readFileSync(path.join(__dirname, "scenarios.json"), "utf8"));
fs.mkdirSync(outDir, { recursive: true });

const minutes = (meta) => {
  if (!meta) return null;
  if (meta.totalSeconds) return meta.totalSeconds / 60;
  if (meta.started && meta.ended && !Object.values(meta.phases || {}).some((v) => v === null)) return (meta.ended - meta.started) / 60;
  const p = Object.values(meta.phases || {}).filter((v) => typeof v === "number");
  return p.length ? null : null; // a resumed run has no full time
};
const rows = [];
for (const s of scenarios.filter((x) => !only.length || only.includes(x.slug))) {
  const dir = prefix + s.slug;
  if (!fs.existsSync(path.join(dir, "out"))) { rows.push({ s, missing: true }); continue; }
  const jf = path.join(outDir, `${s.slug}.json`);
  spawnSync("node", [path.join(__dirname, "check.js"), dir, "--port", String(s.port), "--json", jf].concat(args.includes("--static") ? ["--no-browser"] : []), { encoding: "utf8", timeout: 300000 });
  const r = JSON.parse(fs.readFileSync(jf, "utf8"));
  const ex = s.expect, extra = [];
  if (!ex.shape.includes(r.shape)) extra.push({ std: 3, msg: `shape ${r.shape}, expected ${ex.shape.join(" or ")}`, file: "out/gates/a.json" });
  if (r.systems < ex.minSystems) extra.push({ std: 3, msg: `${r.systems} systems, expected ${ex.minSystems}+`, file: "out/proto/case.json" });
  const meta = (() => { for (const f of ["run-report.json", "audit-meta.json"]) { try { return JSON.parse(fs.readFileSync(path.join(dir, "out", f), "utf8")); } catch {} } return null; })();
  const mins = minutes(meta);
  if (mins !== null && mins > ex.maxMinutes) extra.push({ std: 0, msg: `${mins.toFixed(1)} min, budget ${ex.maxMinutes}`, file: "out/run-report.json" });
  if (ex.notGenAIFirst) { const a = (() => { try { return JSON.parse(fs.readFileSync(path.join(dir, "out", "gates", "a.json"), "utf8")); } catch { return null; } })(); const txt = fs.readFileSync(path.join(dir, "out", "2-ai-fit.md"), "utf8"); if (!/not GenAI|not gen ?AI|rules first|no model/i.test(JSON.stringify(a || {}) + txt)) extra.push({ std: 2, msg: "rules case does not say not GenAI", file: "out/2-ai-fit.md" }); }
  for (const e of extra) if (e.std) r.row[e.std] = "fail";
  r.failures = r.failures.concat(extra); r.minutes = mins;
  fs.writeFileSync(jf, JSON.stringify(r, null, 2));
  rows.push({ s, r });
}
const head = "| # | Scenario | Shape | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | Cards | Minutes |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|";
const lines = rows.map(({ s, r, missing }) => missing ? `| ${s.n} | ${s.slug} | not run | | | | | | | | | | |` : `| ${s.n} | ${s.slug} | ${r.shape} | ${[1, 2, 3, 4, 5, 6, 7, 8].map((k) => r.row[k] === "pass" ? "pass" : "**FAIL**").join(" | ")} | ${r.questions} | ${r.minutes === null || r.minutes === undefined ? "n/a" : r.minutes.toFixed(1)} |`);
const fails = rows.filter((x) => x.r).flatMap(({ s, r }) => r.failures.map((f) => `- ${s.slug} [${f.std || "time"}] ${f.msg}${f.file ? ` (${f.file})` : ""}`));
const md = [head, ...lines, "", "Failures:", ...(fails.length ? fails : ["- none"])].join("\n");
fs.writeFileSync(path.join(outDir, "scorecard.md"), md + "\n");
console.log(md);
const allPass = rows.every((x) => x.r && x.r.failures.length === 0);
console.log(allPass ? "\nREGRESSION PASSES" : "\nREGRESSION FAILS");
process.exit(allPass ? 0 : 1);
