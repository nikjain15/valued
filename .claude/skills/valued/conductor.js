#!/usr/bin/env node
// VALUED conductor. Plain Node, no dependencies. Every gate writes JSON under out/gates/; this script
// renders everything that is mechanical: the gate files, state.md, the PRD, case.json, the brief,
// the run report. The model writes judgement (drafts, options, reasons, the summary, section 19).
//
//   node conductor.js clock <phase> start|end [note]   append to out/run-clock.jsonl
//   node conductor.js clock status                     elapsed per phase against the budget
//   node conductor.js cards print <round>              print the cards of a round from out/cards.json
//   node conductor.js cards auto <round>               answer a round with the recommended options
//   node conductor.js seed <industry>                  golden-set seeds, sweep templates, systems
//   node conductor.js model-inputs                     label-free, shuffled texts for the guard model
//   node conductor.js seal holdout|router <by>       record who wrote it, in a separate context
//   node conductor.js render                           gate files, state.md, prd.md, case.json, brief
//   node conductor.js check                            what is still missing, by standard
//   node conductor.js report                           out/run-report.json
//   node conductor.js cut <phase> <what>               record a scope cut and print the one line to say
// Run from the workspace root (the folder that holds out/ and .claude/).
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { renderDiscovery, mergeResearch } = require("./discovery.js");
const { renderApproach, approachIssues } = require("./approach.js");

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
const flat = (s) => (s && typeof s === "object" && !Array.isArray(s) ? (s.text || s.label || s.value || s.headline || s.title || Object.values(s).filter((x) => typeof x === "string").join(" ")) : Array.isArray(s) ? s.map(flat).join("; ") : s);
const clean = (s) => String(flat(s) ?? "").replace(/—/g, ", ").replace(/\|/g, "/").replace(/\s+/g, " ").trim();
const cell = (s) => clean(s) || "";
const tableAll = (head, rows) => rows.length ? [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n") : "";
const byLabel = (x) => clean(String(x || "").replace(/\s*\((persona|auto)\)/gi, ""));
const table = (head, rows) => rows.length ? [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.slice(0, 12).map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n") : "";
const A = (x) => (Array.isArray(x) ? x : []);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
// Client pages name a step, never a gate letter.
const STEPS = { FRAME: "Framing", SETUP: "Framing", R: "Discovery", V: "Value", A: "Design", L: "Answer key", U: "Oversight", E: "Release checks", D: "Launch", B: "Build" };
const stepOf = (g) => STEPS[String(g || "").toUpperCase()] || String(g || "");

const PHASES = [
  ["0", "Frame", 1], ["1", "Round 1", 5], ["2", "V then A", 1], ["3", "Round 2", 2],
  ["4", "L and U", 3], ["5", "E and D", 4], ["6", "Build", 2],
];
const CUTS = {
  "2": ["fewer candidates: 8 instead of 12", "two wave options instead of three", "shorter reasons"],
  "4": ["golden set 30 dev rows, no extras (holdout stays 20)", "6 sources instead of 8", "shorter prose"],
  "5": ["one round of harder rows skipped", "drive table 5 rows", "shorter prose"],
  "6": ["FAQ 7 pairs", "section 19 with 5 tasks", "shorter prose"],
};

// ---------- model menu (shared by the PRD pricing section and the prototype) ----------
// Reference list prices per 1M tokens, every figure (assumed): list prices move, confirm at the vendor.
// Claude leads because the build runs on Claude; the rest let the client compare across providers.
const MODEL_MENU = [
  { provider: "Anthropic", model: "Claude Haiku 5.5", id: "claude-haiku-5-5", in: 0.10, out: 0.50, latency: "fastest", bestFor: "high-volume guards, routing, simple extraction", runnable: true },
  { provider: "Anthropic", model: "Claude Sonnet 5.5", id: "claude-sonnet-5-5", in: 2, out: 10, latency: "balanced", bestFor: "the default: grounded drafting and most answers", runnable: true },
  { provider: "Anthropic", model: "Claude Opus 5.5", id: "claude-opus-5-5", in: 4, out: 20, latency: "slower", bestFor: "the hardest, highest-stakes reasoning", runnable: true },
  { provider: "Anthropic", model: "Claude Fable 5.2", id: "claude-fable-5-2", in: 0.05, out: 0.25, latency: "fastest", bestFor: "lightweight multi-purpose, cost-sensitive volume", runnable: true },
  { provider: "OpenAI", model: "GPT flagship", id: "", in: 2.5, out: 10, latency: "balanced", bestFor: "general reasoning, broad tooling", runnable: false },
  { provider: "OpenAI", model: "GPT mini", id: "", in: 0.15, out: 0.60, latency: "fast", bestFor: "cheap general tasks", runnable: false },
  { provider: "Google", model: "Gemini Pro", id: "", in: 1.25, out: 5, latency: "balanced", bestFor: "long context, multimodal", runnable: false },
  { provider: "Google", model: "Gemini Flash", id: "", in: 0.075, out: 0.30, latency: "fastest", bestFor: "cheap high-volume, long context", runnable: false },
  { provider: "Meta", model: "Llama (open weights)", id: "", in: 0.20, out: 0.20, latency: "varies by host", bestFor: "self-host, data stays in the tenant", runnable: false },
  { provider: "Mistral", model: "Mistral Large", id: "", in: 2, out: 6, latency: "balanced", bestFor: "EU hosting, open options", runnable: false },
];
// Sanctioned AI-vendor names: a real-name check (standard 8) ignores these inside the model menu,
// so the cross-provider table can name real providers without failing the run.
const MODEL_VENDORS = /\b(Anthropic|OpenAI|Google|Microsoft|Amazon|Meta|Mistral|Cohere|xAI|DeepSeek|Alibaba|Nvidia|AWS|Azure)\b/g;

// ---------- architecture flow diagram (inline SVG, rendered by marked in the PRD) ----------
const escX = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
function wrap2(s, max) {
  s = String(s || "");
  if (s.length <= max) return [s];
  const words = s.split(" "); let a = "", b = "";
  for (const w of words) { if (!a || (a + " " + w).trim().length <= max) a = (a + " " + w).trim(); else b = (b + " " + w).trim(); }
  return b ? [a, b] : [a];
}
// Which model a named assistant runs, from gate A pricing.perUseCase (best-effort name match).
function agentModel(a, name) {
  const rows = A(a.pricing && a.pricing.perUseCase);
  const generic = new Set(["model", "agent", "assistant", "check", "checker", "rules", "guard", "draft", "drafter", "the", "and", "with"]);
  const words = (x) => String(x).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !generic.has(w));
  const n = String(name).toLowerCase(), nw = words(name);
  const exact = rows.find((r) => String(r.job).toLowerCase() === n || String(r.job).toLowerCase().includes(n));
  if (exact) return exact.model;
  // Otherwise the row sharing the most meaningful words; generic words like "model" or "check" never decide it.
  let best = null, score = 0;
  for (const r of rows) { const jw = new Set(words(r.job)); const sc = nw.filter((w) => jw.has(w)).length; if (sc > score) { best = r; score = sc; } }
  return best ? best.model : "";
}
// A short latency for a step, from gate A sourcing; "(assumed)" when the gate did not supply one.
function latShort(a, name) {
  const rows = A(a.sourcing), n = String(name).toLowerCase(), toks = n.split(/\s+/).filter((w) => w.length > 3);
  const hit = rows.find((r) => { const comp = String(r.component).toLowerCase(); return comp.includes(n) || toks.some((t) => comp.includes(t)); });
  const parse = (s) => { s = String(s || ""); const m = s.match(/under\s*([\d.]+)\s*(ms|s|sec|min|m)\b/i); if (m) return "<" + m[1] + (/^mi?n?$/i.test(m[2]) ? "m" : /ms/i.test(m[2]) ? "ms" : "s"); if (/negligible|instant|fast/i.test(s)) return "fast"; return ""; };
  return (hit && parse(hit.latency)) || "(assumed)";
}
// Swimlane architecture flow: External systems / Rules / AI model / Person / Data lanes. Boxes placed by
// kind, the model and a latency shown on each step, embeddings and reranker as their own steps, stores as
// cylinders, external systems linked in. Rendered at full size inside a scrollable wrapper so text stays legible.
function archSvg(a, c) {
  const noun = cap(A(a.itemNoun)[0] || "request");
  const lane = { in: 0, rules: 0, model: 1, human: 2 };
  const types = A(a.pricing && a.pricing.modelTypes).filter((m) => m.usedHere !== false && /embed|rerank|vision|multimodal/i.test(m.type));
  const st = [{ t: `${noun} in`, k: "in", m: "", lat: "" }];
  const hasRet = A(a.agents).some((ag) => /retriev|search|index/i.test(ag.name));
  let added = false;
  for (const ag of A(a.agents)) {
    const isRet = /retriev|search|index/i.test(ag.name);
    if (!added && types.length && (isRet || (!hasRet && ag.kind === "model"))) {
      for (const t of types) { const emb = /embed/i.test(t.type), rr = /rerank/i.test(t.type), nm = emb ? "Embeddings" : rr ? "Reranker" : "Vision"; st.push({ t: nm, k: "rules", m: emb ? "embedding model" : rr ? "reranker" : "vision model", lat: latShort(a, nm) }); }
      added = true;
    }
    st.push({ t: ag.name, k: ag.kind === "model" ? "model" : "rules", m: ag.kind === "model" ? agentModel(a, ag.name) : "", lat: latShort(a, ag.name) });
  }
  st.push({ t: "Person decides", k: "human", m: "", lat: "" });
  const retCol = Math.max(1, st.findIndex((s) => /retriev|search|index/i.test(s.t)));
  const stores = [{ t: "Document index", col: retCol }, { t: "Audit log", col: st.length - 1 }];
  if (stores[0].col === stores[1].col) stores[0].col = Math.max(1, stores[1].col - 1);
  const ext = A(c && c.connectors).slice(0, 4).map((cn) => {
    const cat = String(cn.category || cn.name || "").toLowerCase();
    let target = retCol;
    if (/entitle|access|identity|auth/.test(cat)) { const i = st.findIndex((s) => /entitle|access/i.test(s.t)); if (i > 0) target = i; }
    return { nm: cn.name || cn.vendor || "System", vend: (!cn.vendor || /to confirm/i.test(cn.vendor)) ? "(assumed)" : cn.vendor, target };
  });
  const LANES = [["Rules", "#E1F5EE", "#0F6E56"], ["AI model", "#EEEDFE", "#534AB7"], ["Person", "#FAEEDA", "#854F0B"], ["Data", "#F1EFE8", "#444441"]];
  const STROKE = { in: "#B4B2A9", rules: "#5DCAA5", model: "#AFA9EC", human: "#EF9F27" };
  const TXT = { in: "#444441", rules: "#0F6E56", model: "#534AB7", human: "#854F0B" };
  const X0 = 86, COLW = 140, BW = 124, BH = 58, LANEH = 84, TOP = 8, EXTH = ext.length ? 74 : 0;
  const laneY = (l) => TOP + EXTH + l * LANEH + (LANEH - 10) / 2;
  const W = X0 + st.length * COLW + 12, H = TOP + EXTH + 4 * LANEH + 6;
  const cx = (i) => X0 + i * COLW, cyOf = (s) => laneY(lane[s.k]);
  let el = "";
  if (EXTH) { el += `<rect x="4" y="${TOP}" width="${W - 8}" height="${EXTH - 8}" rx="8" fill="#EAF3DE"/><text x="12" y="${TOP + 18}" font-size="13" fill="#3B6D11">External systems</text>`; }
  LANES.forEach((L, l) => { const y = TOP + EXTH + l * LANEH; el += `<rect x="4" y="${y}" width="${W - 8}" height="${LANEH - 10}" rx="8" fill="${L[1]}"/><text x="12" y="${y + 19}" font-size="13" fill="${L[2]}">${L[0]}</text>`; });
  for (let i = 0; i < st.length - 1; i++) { const xA = cx(i) + BW, yA = cyOf(st[i]), xB = cx(i + 1), yB = cyOf(st[i + 1]), mx = (xA + xB) / 2; el += `<path d="M ${xA} ${yA} H ${mx} V ${yB} H ${xB}" fill="none" stroke="#888780" stroke-width="1.5"/><path d="M ${xB} ${yB} l -8 -5 l 0 10 z" fill="#888780"/>`; }
  const eBW = ext.length ? Math.min(BW, Math.floor((W - 24) / ext.length) - 10) : BW, eGap = ext.length ? (W - 16 - ext.length * eBW) / (ext.length + 1) : 0;
  ext.forEach((e, j) => { const x = 8 + eGap + j * (eBW + eGap), ey = TOP + 24, cxm = x + eBW / 2, tx = cx(e.target) + BW / 2, ty = cyOf(st[e.target]) - BH / 2; el += `<rect x="${x}" y="${ey}" width="${eBW}" height="38" rx="8" fill="#ffffff" stroke="#97C459"/><text x="${cxm}" y="${ey + 17}" font-size="12" text-anchor="middle" fill="#3B6D11">${escX(wrap2(e.nm, Math.floor(eBW / 7))[0])}</text><text x="${cxm}" y="${ey + 31}" font-size="9" text-anchor="middle" fill="#888780">${escX(e.vend)}</text><path d="M ${cxm} ${ey + 38} L ${tx} ${ty}" stroke="#97C459" stroke-dasharray="3 3" fill="none"/>`; });
  const dy = laneY(3);
  for (const store of stores) { const x = cx(store.col), w = BW, y = dy - 22, cxm = x + w / 2; el += `<path d="M ${x} ${y + 7} V ${y + 37}" stroke="#B4B2A9" fill="none"/><path d="M ${x + w} ${y + 7} V ${y + 37}" stroke="#B4B2A9" fill="none"/><ellipse cx="${cxm}" cy="${y + 37}" rx="${w / 2}" ry="7" fill="#F8F7F2" stroke="#B4B2A9"/><rect x="${x}" y="${y + 7}" width="${w}" height="30" fill="#F8F7F2" stroke="none"/><ellipse cx="${cxm}" cy="${y + 7}" rx="${w / 2}" ry="7" fill="#F8F7F2" stroke="#B4B2A9"/><text x="${cxm}" y="${y + 27}" font-size="11" text-anchor="middle" fill="#444441">${escX(store.t)}</text><path d="M ${cxm} ${cyOf(st[store.col]) + BH / 2} V ${y}" stroke="#B4B2A9" stroke-dasharray="3 3" fill="none"/>`; }
  st.forEach((s, i) => {
    const x = cx(i), cym = cyOf(s), y = cym - BH / 2, cxm = x + BW / 2, nm = wrap2(s.t, 16);
    el += `<rect x="${x}" y="${y}" width="${BW}" height="${BH}" rx="9" fill="#ffffff" stroke="${STROKE[s.k]}" stroke-width="1.5"/>`;
    const name1 = `<text x="${cxm}" y="__Y__" font-size="13" text-anchor="middle" fill="${TXT[s.k]}">${escX(nm[0])}</text>`;
    const lat = s.lat ? `<text x="${cxm}" y="__Y__" font-size="10" text-anchor="middle" fill="#888780">${escX(s.lat)}</text>` : "";
    if (s.m) el += name1.replace("__Y__", cym - 11) + `<text x="${cxm}" y="${cym + 5}" font-size="10" text-anchor="middle" fill="#888780">${escX(s.m)}</text>` + lat.replace("__Y__", cym + 19);
    else if (s.lat) { if (nm.length === 1) el += name1.replace("__Y__", cym - 4) + lat.replace("__Y__", cym + 13); else el += name1.replace("__Y__", cym - 12) + `<text x="${cxm}" y="${cym + 2}" font-size="13" text-anchor="middle" fill="${TXT[s.k]}">${escX(nm[1])}</text>` + lat.replace("__Y__", cym + 17); }
    else if (nm.length === 1) el += name1.replace("__Y__", cym + 5);
    else el += name1.replace("__Y__", cym - 3) + `<text x="${cxm}" y="${cym + 14}" font-size="13" text-anchor="middle" fill="${TXT[s.k]}">${escX(nm[1])}</text>`;
  });
  return `<div style="overflow-x:auto;margin:4px 0"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Architecture flow across External systems, Rules, AI model, Person and Data lanes"><title>Architecture flow</title>${el}</svg></div>`;
}
function whyArch(a) {
  const built = A(a.sourcing).filter((x) => /build/i.test(x.choice)).map((x) => String(x.component).toLowerCase()).slice(0, 3).join(", ");
  const modelChoice = (A(a.sourcing).find((x) => /model/i.test(x.component)) || {}).choice || "partnered";
  return ["**Why we recommend this architecture**", "",
    `- Deterministic where it must be: the guards, retrieval, citation check and routing are fixed rules, so escalation and the cited-source promise are held by rules we can test, not left to the model. ${clean(a.engineWhy)}`,
    a.engine === "rules" ? `- Rules only in the first wave, as you chose: no model drafts or decides yet; a model is a later option, behind the same guards. ${clean(a.shapeWhy)}` : `- Agentic where it helps: the model takes only the one job a rule cannot do well, drafting from passages it was handed. ${clean(a.shapeWhy)}`,
    `- Build where the moat is, partner where it is a commodity: ${built || "the index, citation and guards"} are built in-house; ${a.engine === "rules" ? "a model, when one is added, would be partnered" : `the answer model is ${modelChoice}`}, because a frontier model is a commodity.`].join("\n");
}

const G = (k) => json(path.join(GATES, `${k}.json`), null);
const writeApproach = () => write(path.join(PROTO, "approach.html"), renderApproach(json(path.join(GATES, "approach.json"), {}), cards(), productName() || G("v")?.useCase || G("r")?.title, G("v")?.client ? `${G("v").client}` : "", G("r")));
// One source of truth: every page renders from the gate JSON and cards.json. The only hand-written client text is the
// approach cards and the gate prose, so this checks that their names and numbers match what the client said or the
// research cited, and that the four views agree on the product, the client and the decisions.
function consistency() {
  const out = []; const g = gates(); const cs = cards(); const ap = json(path.join(GATES, "approach.json"), {});
  const said = [caseLine(), ...cs.map((x) => `${x.decision || ""}`), ...A(g.r?.facts).map((f) => f.figure)].join(" ").toLowerCase();
  const nums = (t) => (String(t || "").replace(/\*\*/g, "").match(/\d[\d,.]*\s*(%|k|m|min|minutes|hours|days|weeks)?/gi) || []).map((n) => n.trim().toLowerCase());
  for (const s of A(ap.stages)) for (const n of nums(s.heard)) if (!said.includes(n.replace(/\s.*$/, ""))) out.push(`approach ${s.stage}: "What we heard" says ${n}, which no client answer, the case line or a cited fact contains`);
  const name = productName(); const c = json(path.join(PROTO, "case.json"), {}); const prd = read(path.join(OUT, "prd.md"));
  if (name && c.title && c.title !== name) out.push(`prototype title "${c.title}" differs from the product name "${name}"`);
  if (name && prd && !prd.startsWith(`# ${name}`)) out.push(`PRD title differs from the product name "${name}"`);
  if (g.v?.client && c.client && c.client !== g.v.client) out.push(`client name differs: PRD "${g.v.client}", prototype "${c.client}"`);
  for (const x of cs.filter((y) => y.decision && Number(y.round) >= 1)) if (prd && !prd.includes(byLabel(x.decision).slice(0, 40))) out.push(`decision ${x.id} ("${byLabel(x.decision).slice(0, 40)}") is missing from the PRD`);
  return out;
}
const qcAll = () => { const d = path.join(OUT, "qc"); return fs.existsSync(d) ? fs.readdirSync(d).filter((f) => /^\d\.json$/.test(f)).sort().map((f) => json(path.join(d, f), {})) : []; };
const gates = () => ({ r: G("r"), v: G("v"), a: G("a"), l: G("l"), u: G("u"), e: G("e"), d: G("d"), b: G("b") });
const cards = () => json(path.join(OUT, "cards.json"), []);
// The client's chosen product name (framing card) is the title shown everywhere, over the generic use-case label.
const productName = () => { const c = cards().find((x) => /product name|what would you like to call|call (this|it)/i.test(x.question || "") && x.decision); return c ? String(c.decision).trim() : null; };
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
  return cs.length ? ["**Cards**", "", table(["Card", "Options (recommended first)", "Decision"], cs.map((c) => [`${c.role}: ${c.question} If none fits, answer with: ${c.format}`, A(c.options).map((o, i) => `${String(o.label).replace(/\s*\(Recommended\)\s*$/i, "")}${i === 0 ? " (Recommended: " + clean(o.tradeoff) + ")" : " (" + clean(o.tradeoff) + ")"}`).join(" · "), c.decision ? `${c.decision}${c.auto ? " (auto)" : ""}` : "open"]))].join("\n") : "";
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
  return [`# E: Evals`, "", "## Proposed gates", "", table(["Gate", "Metric", "Bar", "Why this bar", "LLM judge"], A(e.gateTable).map((g) => [g.gate, g.metric, g.threshold, g.why, g.judge || "never"])), "", `**Client's bar for the riskiest miss:** ${e.bar}`, "", "## Runs", "", runs, "", "### Latest dev run", "", "```", ev.dev, "```", "", `### Sealed holdout${ev.independent ? "" : ` (not independent: ${ev.prov.recorded ? `${ev.prov.shared.join(", ")} wrote both the holdout rows and the router` : "no record of who wrote the holdout and who wrote the router"})`}${ev.seen ? ` (${ev.seen})` : e.repaired ? " (seen once before a family-level repair)" : ""}`, "", "```", ev.holdout, "```",
    "", "## Remaining misses", "", A(e.misses).length ? A(e.misses).map((m) => `- ${clean(m)}`).join("\n") : "- None on the dev set.", "", "## How to reproduce", "", "```", "node out/proto/eval.js", "node out/proto/eval.js holdout.json", "```", `Files: out/proto/router.js, out/proto/gates.json, out/proto/golden.json (${ev.goldenN} rows), out/proto/holdout.json (${ev.holdoutN} rows, sealed). ${clean(e.reproduceNote)}`, "", cardsMd("E"), "", "## Governance check", "", gov(e.governance), "", sayIt(e.sayIt), ""].join("\n");
}
function gateD(d) {
  return [`# D: Deploy and drive`, "", "## Deploy", "", table(["Step", "Proves", "Exit criterion", "Signs"], A(d.deploy).map((r) => [r.step, r.proves, r.exit, r.signs])), "", "## Drive", "", table(["Metric", "Why", "Alert threshold"], A(d.drive).map((r) => [r.metric, r.why, r.alert])), "", "## Pilot scope recommendation", "", rec(d.pilot, "Scope"), "", "## Stop rule recommendation", "", rec(d.stop, "Stop rule"), "", "## Plan", "", table(["Week", "Work"], A(d.plan).map((r) => [r.week, r.work])), "", cardsMd("D"), "", "## Governance check", "", gov(d.governance), "", sayIt(d.sayIt), ""].join("\n");
}

// ---------- provenance: the holdout and the router are written in different contexts ----------
// S-078: when one context writes the answer key and the router, the holdout grades its own author and
// recall on it means nothing. Each writer records itself here, and check() refuses a run where the
// context that wrote the holdout rows also wrote or edited the router.
const PROV = () => path.join(PROTO, "provenance.json");
function seal(what, by) {
  if (!["holdout", "router"].includes(what)) return console.log("Usage: conductor.js seal holdout|router <by>");
  if (!by) return console.log(`Usage: conductor.js seal ${what} <by>   (the agent name, for example holdout-sealer)`);
  // R-004: append-only. Each entry carries seq, the previous entry's hash and its own, and is mirrored to
  // holdout-log.jsonl ({kind:"seal"}); the audit fails standard 6 when the chain or the mirror disagrees.
  const p = json(PROV(), {});
  const all = ["holdout", "router"].flatMap((k) => A(p[k])).sort((a, b) => (a.seq || 0) - (b.seq || 0));
  const prev = all.length ? all[all.length - 1].hash || "" : "";
  const e = { seq: all.length + 1, by, at: new Date().toISOString(), prev };
  e.hash = require("crypto").createHash("sha256").update(JSON.stringify([what, e.seq, e.by, e.at, e.prev])).digest("hex");
  p[what] = A(p[what]).concat([e]);
  fs.mkdirSync(PROTO, { recursive: true }); writeJson(PROV(), p);
  fs.appendFileSync(path.join(PROTO, "holdout-log.jsonl"), JSON.stringify({ kind: "seal", what, ...e }) + "\n");
  console.log(`Recorded: ${what} written by ${by}. Writers so far: holdout ${A(p.holdout).map((x) => x.by).join(", ") || "none"}; router ${A(p.router).map((x) => x.by).join(", ") || "none"}.`);
}
function provenance() {
  const p = json(PROV(), {});
  const holdoutBy = [...new Set(A(p.holdout).map((x) => x.by))], routerBy = [...new Set(A(p.router).map((x) => x.by))];
  const shared = holdoutBy.filter((x) => routerBy.includes(x));
  const recorded = holdoutBy.length > 0 && routerBy.length > 0;
  const single = [...holdoutBy, ...routerBy].filter((x) => /single-context|inline|conductor-only/i.test(x));
  if (single.length && !shared.length) shared.push(...new Set(single));
  return { holdoutBy, routerBy, shared, recorded, independent: recorded && shared.length === 0 };
}

// ---------- eval results ----------
function evalResults() {
  const run = (f) => { if (!fs.existsSync(path.join(PROTO, "eval.js"))) return ""; const r = spawnSync("node", [path.join(PROTO, "eval.js")].concat(f ? [f] : []), { encoding: "utf8", timeout: 60000 }); return ((r.stdout || "") + (r.stderr || "")).trim(); };
  const dev = run(), holdout = run("holdout.json");
  const parse = (t) => Object.fromEntries((t.match(/^(.{1,39}?)\s{2,}(\S+)\s+(\S+)\s+(PASS|FAIL)\s*$/gm) || []).map((l) => { const m = l.match(/^(.{1,39}?)\s{2,}(\S+)\s+(\S+)\s+(PASS|FAIL)\s*$/); return [m[1].trim(), { value: m[2], bar: m[3], result: m[4] }]; }));
  const e = G("e") || {};
  // Independence is a fact about who wrote what, not a claim a gate can make about itself.
  const prov = provenance();
  const independent = prov.independent;
  const hlog = read(path.join(PROTO, "holdout-log.jsonl")).split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const versions = [...new Set(hlog.filter((x) => x.router).map((x) => x.router))].length;
  const seen = versions > 1 ? `holdout scored against ${versions} router versions; only the last counts, and the earlier attempts may have informed the change` : "";
  return { seen, prov, versions, dev, holdout, devGates: parse(dev), holdGates: parse(holdout), devPass: /RELEASE PASSES ALL GATES/.test(dev), holdPass: /RELEASE PASSES ALL GATES/.test(holdout), independent, goldenN: json(path.join(PROTO, "golden.json"), []).length, holdoutN: json(path.join(PROTO, "holdout.json"), []).length };
}
// Group-specific eval rows ("Fairness worst lang=en") share a base name; dev and holdout can name different groups.
const gateBase = (k) => String(k).replace(/\s+\S+=\S+$/, "");
// The holdout row for a dev row: same key, else the same base with the holdout's own worst group shown beside the value.
function holdoutCell(holdGates, k) {
  if (holdGates[k]) return holdGates[k].value;
  const hit = Object.entries(holdGates).find(([h]) => gateBase(h) === gateBase(k) && h !== gateBase(h));
  return hit ? `${hit[1].value} (${hit[0].slice(gateBase(hit[0]).length).trim()})` : "";
}
// The gate-table row that explains an eval row: exact metric first, then a metric that contains the key (or the
// reverse), then the longest shared prefix of at least 10 characters. A fixed-length prefix alone matched
// "Escalation precision" to the "Escalation recall" row.
function gateWhy(rows, k) {
  const key = String(k).toLowerCase(), m = (x) => String(x.metric || x.gate || "").toLowerCase();
  const shared = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  const best = rows.find((x) => m(x) === key) || rows.find((x) => m(x) && (key.startsWith(m(x)) || m(x).startsWith(key)))
    || rows.map((x) => [x, shared(m(x), key)]).filter(([, n]) => n >= 10).sort((p, q) => q[1] - p[1])[0]?.[0];
  return (best || {}).why || "";
}
// r.json assumptions are objects ({ text, card, confirmedIf }); the other gates write strings.
const assumptionText = (x) => typeof x === "string" ? x : x && x.text ? `${x.text}${x.card ? ` (tested by ${x.card})` : ""}` : "";

// ---------- state.md ----------
function renderState(g) {
  const cs = cards(), open = Object.values(g).filter(Boolean).flatMap((x) => A(x.governance).filter((r) => !/^answered/i.test(r.status || "")).map((r) => [x.gate || "", r.question, r.status, r.owner || "to assign"]));
  const assumptions = Object.values(g).filter(Boolean).flatMap((x) => A(x.assumptions)).map(assumptionText).filter(Boolean);
  const engine = (g.a || {}).engine;
  return ["# State", "", "## Case line", "", clean(caseLine()), "", `Mode: ${read(path.join(OUT, "mode.txt")).trim() || "orchestrated"}. Live PRD: localhost:${process.env.PORT || 4317}/prd.`, "", "## Client decisions", "", tableAll(["Gate", "Card", "Decision", "By"], cs.filter((c) => c.decision).map((c) => [c.gate, c.question, `${byLabel(c.decision)}${c.revised ? " (revised)" : ""}`, byLabel(c.by || c.role)])), "", engine ? `Build engine: ${engine} (chosen by ${(g.a || {}).engineBy || "IT and risk"})` : "", "", "## Assumptions", "", ...assumptions.map((x) => `- ${clean(x)}`), "", "## Governance log", "", table(["Gate", "Item", "Status", "Closes it"], open), "", read(path.join(OUT, "state-notes.md")), ""].join("\n");
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
// A per-case accent, derived (never asked): one hue picked from the industry, else hashed to a curated set.
// The whole founderfirst.one brand ramp is regenerated from that one hue, so the roles and relationships are
// unchanged (theming within the system, not a restyle). The client overrules it with a /valued-feedback.
const ACCENT_HUE_SET = [210, 165, 141, 262, 22, 340, 190, 288];
const ACCENT_INDUSTRY = [[/credit|bank|fintech|union|lend|loan/, 210], [/insur|claims|underwrit|annuit/, 262], [/health|hospital|nurs|pharma|clinic|care|medic|patient/, 165], [/utility|energy|power|water|grid|electric/, 22], [/retail|commerce|shop|store|merchant|grocer/, 340], [/telco|telecom|media|mobile|broadband|carrier/, 288], [/logistic|airline|travel|freight|ship|fleet|transit/, 190]];
function accentFor(industry, client) {
  const s = String(industry || "").toLowerCase();
  let hue = (ACCENT_INDUSTRY.find(([re]) => re.test(s)) || [])[1];
  if (hue === undefined) { const str = String(industry || client || "valued"); let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; hue = ACCENT_HUE_SET[h % ACCENT_HUE_SET.length]; }
  const H = (sat, light) => `hsl(${hue} ${sat}% ${light}%)`;
  return { hue, brand: H(45, 36), hover: H(45, 30), soft: H(43, 85), tint: H(45, 94), strong: H(55, 27) };
}
// Eval rows in the client's words, for the release card.
const RELEASE_NAMES = [[/^escalation recall/i, "Catches every escalation"], [/^escalation precision/i, "Keeps false alarms low"], [/^answers without source/i, "Never acts without approved knowledge"], [/^routing accuracy/i, "Sends each item the right way"], [/^recall gap/i, "Works equally across groups"], [/^fairness/i, "No group falls below the pass mark"], [/^never-list/i, "Stays off forbidden topics"], [/^verdicts outside/i, "Only allowed outcomes"]];
const releaseName = (k) => { const hit = RELEASE_NAMES.find(([re]) => re.test(k)); const grp = (String(k).match(/\s(\S+=\S+)$/) || [])[1]; return hit ? `${hit[1]}${grp ? ` (weakest: ${grp.split("=")[1].replace(/_/g, " ")})` : ""}` : k; };
// Gate E's latest dev and sealed results, as the release page leads with them. Sealed decides; dev is practice.
function releaseFrom(ev, e) {
  const rows = (gs) => Object.entries(gs || {}).map(([k, r]) => ({ name: releaseName(k), value: r.value, bar: r.bar, pass: r.result === "PASS" }));
  const dev = rows(ev.devGates), sealed = rows(ev.holdGates);
  if (!dev.length && !sealed.length) return null;
  const status = sealed.length ? (ev.holdPass ? "passes" : "blocked") : "pending";
  return { status, blockedOn: sealed.filter((r) => !r.pass).map((r) => r.name), sealed: { n: ev.holdoutN, pass: ev.holdPass, gates: sealed }, dev: { n: ev.goldenN, pass: ev.devPass, gates: dev }, repeated: ev.versions > 1, note: clean(e.releaseNote || "") };
}
// Round-1 answers, read by card id with a question fallback, so they reach the prototype before V and A render.
function roundOne(cs) {
  const ans = (id, re) => { const x = cs.find((c) => c.id === id && c.decision) || (re ? cs.find((c) => c.decision && re.test(c.question || "")) : null); return x ? byLabel(x.decision) : ""; };
  return { northStar: ans("R1-1", /single result|point at first|north star/i), autonomy: ans("R1-4", /on its own|how much autonomy/i), owner: ans("R1-5", /who should it go to|who owns an escalation/i),
    approvals: ans("C-1", /say yes before|sign off|who would need to/i), dataLives: ans("C-4", /where do .* live|where .* data .* today/i), engine: ans("R1-3", /AI model|rules only|may a prototype/i),
    valueCase: ans("C-6", /worth funding|save or earn/i), tradeoffs: ans("C-7", /speed, accuracy|protect most/i), alternatives: ans("C-8", /looked at buying|buy instead/i),
    disclosure: ans("C-9", /be told|disclos/i), ownership: ans("R2-7", /day to day|own it/i), dependencies: ans("R2-8", /depends on|in flight/i) };
}
const engineFromAnswer = (t) => !t ? "" : /rules only|not yet|no ai|without ai/i.test(t) ? "rules" : /model (proposes|first|decides)/i.test(t) ? "model-first" : /yes|try|model|ai/i.test(t) ? "rules+model" : "";
const shortTeam = (t) => String(t || "").replace(/\([^)]*\)/g, "").replace(/^(the|our|a|an)\s+/i, "").split(/[,;:.]|\s+(?:then|and then|who|with a|which)\s+/i)[0].trim().split(/\s+/).slice(0, 4).join(" ").replace(/^./, (x) => x.toUpperCase());
// Owners keyed exactly by trigger family (a.triggerFamilies, u.triggers[].family): keys normalised to snake case.
const famKey = (k) => String(k || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
function renderCase(g, ev) {
  const v = g.v || {}, a = g.a || {}, l = g.l || {}, u = g.u || {}, b = g.b || {}, d = g.d || {}, e = g.e || {};
  const prev = json(path.join(PROTO, "case.json"), {});
  const golden = json(path.join(PROTO, "golden.json"), []);
  const cs = cards(), r1 = roundOne(cs);
  const ownerByFamily = Object.fromEntries(Object.entries(u.escalationOwners || {}).map(([k, x]) => [famKey(k), x]));
  for (const t of A(u.triggers)) if (t && t.family && !ownerByFamily[famKey(t.family)] && t.goesTo) ownerByFamily[famKey(t.family)] = shortTeam(t.goesTo);
  const engine = a.engine || engineFromAnswer(r1.engine) || prev.engine;
  const approvals = r1.approvals ? r1.approvals.split(/,\s*|;\s*/).map((x) => x.trim()).filter(Boolean) : [];
  const govR1 = [...(approvals.length ? [{ gate: "V", question: "Who signs off before go-live", answer: approvals.join(", "), status: "answered", owner: "" }] : []), ...(r1.dataLives ? [{ gate: "L", question: "Where the requests and records live today", answer: r1.dataLives, status: "answered", owner: "" }] : [])];
  const gateGov = Object.entries(g).filter(([, x]) => x).flatMap(([k, x]) => A(x.governance).map((r) => ({ gate: k.toUpperCase(), question: r.question, answer: r.answer, status: r.status, owner: /^answered/i.test(r.status || "") ? "" : r.owner || "" })));
  // Systems named in the answer about where data lives join Data and tools as proposed until a gate lists them.
  const named = r1.dataLives && !A(l.connectors).length ? r1.dataLives.split(/,\s*|\s+plus\s+|\s+and\s+/i).map((x) => x.trim()).filter((x) => x.length > 2).slice(0, 3).map((x) => ({ name: x.replace(/^./, (y) => y.toUpperCase()), category: "record", provides: "The requests and records your team works from today", usedFor: "Reading each item and its record", status: "proposed", writeBack: false })) : [];
  const c = {
    ...prev,
    ownerShort: u.ownerShort || shortTeam(r1.owner) || prev.ownerShort || "", ownerByFamily, triggerFamilies: A(a.triggerFamilies).map(famKey), engine, release: releaseFrom(ev, e) || prev.release, approvals: approvals.length ? approvals : prev.approvals, mix: a.mix || null, panelTitle: a.panelTitle || "", profileFields: A(a.profileFields).map((f) => (typeof f === "string" ? { label: f } : f)),
    title: productName() || v.title, client: v.client, useCase: productName() || v.useCase, headline: v.headline, scenario: v.scenario, user: v.user, inputLabel: v.inputLabel, persona: v.persona, industry: v.industry, labels: v.labels,
    accent: accentFor(v.industry, v.client),
    heroStat: A(v.metrics)[0] ? { metric: A(v.metrics)[0].metric, from: A(v.metrics)[0].baseline, to: A(v.metrics)[0].target } : (r1.northStar ? { metric: r1.northStar, from: "", to: "" } : v.northStar?.preferred ? { metric: v.northStar.preferred, from: "", to: "" } : null),
    promise: a.promise, shape: a.shape, agents: a.agents, itemNoun: a.itemNoun, recordSuffix: a.recordSuffix, dismissReasons: a.dismissReasons,
    sweeps: A(a.sweeps).map((s, i) => ({ agent: s.agent, kind: s.kind, schedule: s.schedule, checks: s.checks, findings: A((b.sweepFindings || [])[i] || s.findings) })),
    verdicts: l.verdicts, samples: A(l.samples).length === 6 ? l.samples.map((x) => ({ text: x.text, expect: x.expect || x.expected })) : samplesFrom(golden), connectors: fillConnectors(A(l.connectors).length ? l.connectors : named, v.industry),
    clocks: u.clocks, neverList: u.neverList, escalationOwner: u.escalationOwner || r1.owner || undefined, escalationSla: u.escalationSla, autonomy: u.autonomy || r1.autonomy || undefined, disclosure: u.disclosure || r1.disclosure, ownership: r1.ownership, dependencies: r1.dependencies, valueCase: r1.valueCase, approverRole: u.approverRole, draftOpener: u.draftOpener,
    decisions: cs.filter((x) => x.decision).map((x) => ({ gate: x.gate, decision: x.decision, by: x.by || x.role, effect: x.effect || `Shapes the ${stepOf(x.gate).toLowerCase()} step: ${String(x.question || "").replace(/\?$/, "").toLowerCase()}`, ...(x.revised ? { revised: true, was: x.was } : {}) })),
    governance: [...govR1.filter((r) => !gateGov.some((x) => x.answer && r.answer && String(x.answer).includes(r.answer))), ...gateGov],
    faq: b.faq || prev.faq, version: b.version || prev.version || "proto-0.1",
    models: MODEL_MENU, pricing: a.pricing || prev.pricing, businessCase: b.businessCase || prev.businessCase,
    observability: d.observability || prev.observability, tokenStrategy: a.tokenStrategy || prev.tokenStrategy,
  };
  for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k];
  writeJson(path.join(PROTO, "case.json"), c);
  if (engine) writeJson(path.join(PROTO, "build.json"), { ...json(path.join(PROTO, "build.json"), {}), engine });
  if (l.sources && !fs.existsSync(path.join(PROTO, "sources.json"))) writeJson(path.join(PROTO, "sources.json"), l.sources);
  return c;
}

// ---------- PRD ----------
function renderPrd(g, ev, c) {
  // Canonical IDs: whatever the model called a story, the PRD says US-01, US-02 ...
  const storyIds = Object.fromEntries(A(g.v?.stories).map((x, i) => [String(x.id || ""), `US-${String(i + 1).padStart(2, "0")}`]));
  const storyId = (x) => { const toks = String(x || "").split(/[,;\s]+/).filter(Boolean); return toks.some((t) => storyIds[t]) ? toks.filter((t) => storyIds[t]).map((t) => storyIds[t]).join(", ") : clean(x); };
  const v = g.v, a = g.a, l = g.l, u = g.u, e = g.e, d = g.d, b = g.b;
  const P = (gate) => {
    const answered = cards().filter((x) => x.gate === gate && x.decision);
    const head = answered.length ? ["**What you have decided so far:**", ...answered.map((x) => `- ${clean(x.question)} ${"→"} **${clean(x.decision)}**${x.skipped ? " _(we took the recommended default)_" : ""}`), ""].join("\n") + "\n" : "";
    return `${head}> Pending: fills at gate ${gate}.`;
  };
  const cs = cards();
  const s = {};
  s[1] = b ? table(["", ""], [["Problem", b.summary?.problem], ["Who it serves", b.summary?.who], ["What we build", b.summary?.build], ["What it never does", b.summary?.never || A(u?.neverList)[0]], ["How we know it works", b.summary?.works], ["First milestone", b.summary?.milestone]]) : P("B");
  const rs = Object.fromEntries(A(g.r?.sources).map((x) => [x.key, x]));
  const ctx = A(g.r?.facts).length ? ["", "**Industry context (published sources; full research at /research)**", "", table(["Figure", "What it means here", "Source"], A(g.r.facts).slice(0, 8).map((f) => [f.figure, f.fact, rs[f.source] ? `${rs[f.source].publisher}, ${rs[f.source].year} (${rs[f.source].url})` : "source missing"]))].join("\n") : "";
  s[2] = v ? [clean(v.problem), "", table(["Value driver", "Today (baseline)", "Target", "How measured"], A(v.valueDrivers).map((r) => [r.driver, r.today, r.target, r.measured])), ctx].join("\n") : (ctx ? [P("V"), ctx].join("\n") : P("V"));
  const dec = (id) => byLabel((cs.find((x) => x.id === id) || {}).decision || "");
  const early = (rows) => { const r = rows.filter(([, d]) => d); return r.length ? ["**From our conversation so far** (the full section fills in as we work through it)", "", tableAll(["", "You told us"], r)].join("\n") : ""; };
  s[3] = v ? [table(["User", "Job to be done", "Pain today", "What changes"], A(v.users).map((r) => [r.user, r.job, r.pain, r.changes])), "", table(["ID", "As a", "I want to", "So that"], A(v.stories).map((r, i) => [`US-${String(i + 1).padStart(2, "0")}`, r.as, r.want, r.soThat])), "", `**Journey, future state:** ${clean(v.journey)}`, ...(A(v.stakeholders).length ? ["", "**Stakeholders and decision rights**", "", table(["Stakeholder", "Cares about", "Decides or can block", "How we keep them with us"], A(v.stakeholders).map((r) => [r.role, r.cares, r.decides, r.keep]))] : [])].join("\n") : (early([["Stakeholders", dec("C-1")]]) || P("V"));
  s[4] = v ? ["**Goals**", ...A(v.goals).map((x, i) => `- G-${String(i + 1).padStart(2, "0")} ${clean(x)}`), "", "**Non-goals (this release)**", ...A(v.nonGoals).map((x) => `- ${clean(x)}`), "", table(["ID", "Metric", "Baseline", "Target", "Guardrail"], A(v.metrics).map((r, i) => [`M-${String(i + 1).padStart(2, "0")}`, r.metric, r.baseline, r.target, r.guardrail]))].join("\n") : (early([["Key outcome", dec("R1-1")], ["Value case", dec("C-6")], ["Constraints", dec("R1-2")], ["Timeline", dec("C-3")], ["Baseline", dec("C-2")], ["Trade-offs", dec("C-7")]]) || P("V"));
  s[5] = a ? table(["Candidate", "Lowest rung that works", "Decision", "Why"], A(a.scores).map((x) => [`${x.id} ${x.name || ""}`, x.rung, x.wave === 1 ? "**First wave**" : x.notGenAI ? "Not GenAI" : x.wave === 2 ? "Second wave" : "Later", x.notGenAI ? `${x.reason}; instead: ${x.instead || "rules"}` : x.reason])) + (A(d?.roadmap).length ? ["", "", "**Roadmap (each phase ends on evidence, not a date)**", "", table(["Phase", "What ships", "Evidence that ends it", "Depends on", "Release cadence"], A(d.roadmap).map((r) => [r.phase, r.ships, r.exit, r.dependsOn, r.cadence]))].join("\n") : "") : P("A");
  s[6] = a ? [`**Engine (your decision):** ${({ rules: "Rules only", "rules+model": "Rules decide, model drafts", "model-first": "Model proposes, rules guard" })[a.engine] || a.engine}, because ${clean(a.engineWhy)}.`, "", table(["Component", "Rung", "Build, buy or partner", "Why", "What would change our mind"], A(a.sourcing).map((x) => [x.component, x.rung, x.choice, x.why, x.changeMind])), "", "**Architecture flow**", "", archSvg(a, c), "", whyArch(a), "", "**Assistants (agentic design)**", "", table(["Assistant", "Rules or AI", "Job", "Never", "Measured by"], A(a.agents).map((x) => [x.name, x.kind === "model" ? "AI" : "Rules", x.job, A(x.never).join("; "), x.gate])), "", "**Sweeps (proactive work)**", "", table(["Sweep", "Rules or AI", "Schedule", "What it checks", "Decision it hands to a person"], A(a.sweeps).map((x) => [x.agent, x.kind === "model" ? "AI" : "Rules", x.schedule, x.checks, x.decision])), "", ...(A(a.positioning).length ? ["**Competitive positioning**", "", table(["What you could buy instead", "What it does well", "Where it falls short for you", "Why this approach"], A(a.positioning).map((x) => [x.category, x.strengths, x.gaps, x.whyUs])), ""] : []), "**Alternatives considered**", "", table(["Alternative", "Why not now", "When we would revisit"], A(a.alternatives).map((x) => [x.alternative, x.whyNot, x.revisit])), "", `**Latency budget:** ${clean(a.latency)}. **Unit of cost:** cost per resolved task, ${clean(a.cost)}${/\(assumed\)/i.test(a.cost || "") ? "" : " (assumed)"}.`].join("\n") : (early([["AI approach", dec("R1-3")], ["Alternatives", dec("C-8")], ["Data sources", dec("C-4")]]) || P("A"));
  s[7] = b ? table(["ID", "Requirement", "Story", "Priority", "Acceptance criteria"], A(b.requirements).map((r, i) => [`FR-${String(i + 1).padStart(2, "0")}`, r.requirement, storyId(r.story), r.priority, r.acceptance])) : P("B");
  const contract = { desk: "input = the request + one cited source; output = 2 to 4 sentences from that source only, or `NO_ANSWER`.", chat: "input = the question + one cited source; output = 2 to 4 sentences from that source only, or `NO_ANSWER`; sensitive topics never reach the model.", review: "input = the document + the type's field list; output = each field's value with the exact evidence span, empty when absent; a value without evidence is dropped.", rank: "input = the record's facts + the rule that fired; output = a two-sentence talking point using only those facts." };
  s[8] = u && l ? [`**Verdicts:** \`answer\` (${clean(l.verdicts?.answer?.desc)}), \`human\` (${clean(l.verdicts?.human?.desc)}), \`escalate\` (${clean(l.verdicts?.escalate?.desc)}).`, "", "**Decision order:** escalation triggers first, in every language served; then source match; otherwise a person.", "", table(["Escalation trigger", "Example phrasing", "Goes to", "Response time"], A(u.triggers).map((t) => [t.trigger, `"${t.example}"`, t.goesTo, t.responseTime])), "", "**Never list**", ...A(u.neverList).map((x) => `- ${clean(x)}`), "", `**Model contract (${a?.shape || "desk"}):** ${contract[a?.shape] || contract.desk} In every shape, a refusal or error falls back to a person, never to a guess. Model: claude-sonnet-5-5 by default (Haiku for cost, Opus for the hardest rows), low effort, server-side fallback on.`].join("\n") : P("U");
  s[9] = u ? [table(["Action", "Autonomy (first 90 days)", "Approver", "AI shows", "On failure"], A(u.autonomyTable).map((r) => [r.action, r.level, r.approver, r.shows, r.onFailure])), "", "**Clocks**", "", table(["Outcome", "Respond within", "Regulatory clock"], [["Escalate", `${u.clocks?.escalate?.hours} h`, u.clocks?.escalate?.label], ["Needs a person", `${u.clocks?.human?.hours} h`, u.clocks?.human?.label], ["Prepared for review", `${u.clocks?.answer?.hours} h`, u.clocks?.answer?.label]]), "", "**Learning loop:** any reviewer can mark an outcome wrong; it joins the labelled test set with the right answer and every design is re-scored.", "", `**Disclosure (compliance to confirm):** "${clean(u.disclosure)}".`].join("\n") : (early([["Oversight", dec("R1-4")], ["Escalation", dec("R1-5")], ["Transparency", dec("C-9")]]) || P("U"));
  s[10] = l ? [table(["Data", "Owner", "Purpose", "Personal data", "Minimisation", "Retention"], A(l.dataPrivacy).map((r) => [r.data, r.owner, r.purpose, r.personal, r.minimisation, r.retention])), "", "**Systems to connect**", "", table(["System", "Category", "Provides", "Access", "Personal data", "Owner", "Pilot status"], A(c.connectors).map((x) => [`${x.name} (${x.vendor || "vendor to confirm"})`, x.category, x.provides, x.access, x.pii, x.owner, x.status])), "", `**Golden set:** ${ev.goldenN} dev rows plus ${ev.holdoutN} sealed holdout rows; groups: ${A(l.groups).map((x) => `${x.key} (${A(x.values).join(", ")})`).join("; ")}. Labelled ${clean(l.labelling?.preferred || A(l.labelling?.options)[0]?.label)}. Synthetic until ${clean((cs.find((x) => /connect/i.test(x.question)) || {}).decision || "the client provides data")}.`].join("\n") : P("L");
  const names = { "Escalation recall": "Riskiest miss", "Escalation precision": "False alarms", "Answers without source": "Approved knowledge only", "Routing accuracy": "Right outcome", "Recall gap": "Equal across groups", "Fairness": "No group below the bar", "Never-list answers": "Forbidden topics", "Verdicts outside allowed": "Only allowed outcomes" };
  s[11] = e ? [table(["Gate", "Metric", "Bar", "Why this bar", "Latest dev", "Holdout"], Object.entries(ev.devGates).map(([k, r], gi) => [Object.entries(names).find(([n]) => k.toLowerCase().startsWith(n.toLowerCase().slice(0, 12)))?.[1] || k, k, r.bar, gateWhy(A(e.gateTable), k), r.value, holdoutCell(ev.holdGates, k)])), "", `**Release status:** ${ev.devPass && ev.holdPass ? (() => { const thin = Object.entries(ev.holdGates).filter(([, r]) => { const b = parseFloat(String(r.bar).replace(/[^\d.]/g, "")); return r.result === "PASS" && b > 0 && !/<|max/i.test(String(r.bar)) && parseFloat(r.value) === b; }).map(([k]) => k.toLowerCase()); return thin.length ? `Meets every pass mark on the practice set and the sealed test set, with no margin on ${thin.length > 1 ? `${thin.slice(0, -1).join(", ")} and ${thin.slice(-1)}` : thin[0]}` : "Meets every pass mark on the practice set and the sealed test set"; })() : `Blocked on ${Object.entries(ev.devGates).filter(([, r]) => r.result === "FAIL").map(([k]) => k).concat(Object.entries(ev.holdGates).filter(([, r]) => r.result === "FAIL").map(([k]) => k + " (holdout)")).join(", ") || "a missing eval"}`}${ev.independent ? "" : `; holdout not independent (${ev.prov.recorded ? `${ev.prov.shared.join(", ")} wrote both the holdout rows and the router` : "no record of who wrote which"})`}${ev.seen ? `; ${ev.seen}` : e.repaired ? "; holdout seen once before a family-level repair" : ""}${e.repaired && A(e.fixes).length ? `. The first eval run was blocked; ${A(e.fixes).length === 1 ? "one repair" : `${A(e.fixes).length} repair rounds`} followed, each disclosed: ${A(e.fixes).map(clean).join("; ")}` : ""}. **LLM judge policy:** ${clean(e.judgePolicy) || "none in the pilot; a judge may score draft quality only after it is validated against labels; escalation never uses one"}.`, "", "**Reproduce:** `node out/proto/eval.js` (dev) and `node out/proto/eval.js holdout.json` (sealed)."].join("\n") : P("E");
  s[12] = (() => {
    const menu = table(["Provider", "Model", "In $/1M", "Out $/1M", "Latency", "Best for"], MODEL_MENU.map((m) => [m.provider, m.model + (a?.engine !== "rules" && (m.id === (process.env.VALUED_MODEL || "claude-sonnet-5-5")) ? " (drafts in the prototype)" : ""), `$${m.in}`, `$${m.out}`, m.latency, m.bestFor]));
    const pr = a?.pricing, bc = b?.businessCase;
    const dflt = pr?.default ? `**Multi-purpose default:** ${clean(pr.default.model)}, because ${clean(pr.default.why)}.` : "";
    const perUse = pr && A(pr.perUseCase).length ? ["**Which model for which job**", "", table(["Job", "Recommended model", "Why"], A(pr.perUseCase).map((r) => [r.job, r.model, r.why]))].join("\n") : "";
    const runCost = pr?.runCost ? `**Run cost:** ${clean(pr.runCost.perItem)} per resolved ${A(a?.itemNoun)[0] || "item"}, about ${clean(pr.runCost.monthly).replace(/^about\s+/i, "")} a month at pilot volume (${clean(pr.runCost.basis)}).` : "";
    const roi = bc ? ["**Business case (ROI)**", "", table(["Line", "Amount"], [["Value recovered per year", bc.valuePerYear], ["One-time build", bc.buildCost], ["Run cost per year", bc.runCostPerYear], ["Payback", bc.paybackMonths]]), clean(bc.note || "")].filter(Boolean).join("\n") : "";
    const commercial = bc?.commercialModel ? ["**How it could be priced to the business**", "", rec(bc.commercialModel, "Pricing model")].join("\n") : "";
    const tierRule = pr?.tierRule ? `**Tier rule:** ${clean(pr.tierRule)}` : "";
    const types = pr && A(pr.modelTypes).length ? ["**Model types in this use case (not just chat LLMs)**", "", table(["Model type", "Used here", "Model or service", "Why"], A(pr.modelTypes).map((r) => [r.type, r.usedHere === false ? "No" : "Yes", r.model || "", r.why]))].join("\n") : "";
    const pipe = pr && A(pr.pipeline).length ? ["**Routing pipeline (a cheap model decides, a strong model does the hard part)**", "", "```", A(pr.pipeline).map((x, i) => `${i + 1}. ${/^\d+$/.test(String(x.step).trim()) ? "" : clean(x.step) + " "}-> ${clean(x.model || x.modelType)}${x.does ? `: ${clean(x.does)}` : ""}`).join("\n"), "```"].join("\n") : "";
    const custPrice = bc?.customerPricing ? ["**How you could price it to your own customers**", "", rec(bc.customerPricing, "Pricing model")].join("\n") : "";
    if (a?.engine === "rules") return ["**Models:** none in the first wave, as you chose rules only. If a later wave adds a model, we would bring the model menu, costs and routing to you then.", "", runCost, "", roi, "", commercial, "", custPrice, (pr || bc) ? "" : P("A")].filter((x) => x !== "").join("\n");
    return ["**Model menu (the client chooses; prices are list prices, (assumed), confirm at the vendor)**", "", menu, "", dflt, perUse, "", tierRule, "", types, "", pipe, "", runCost, "", roi, "", commercial, "", custPrice, (pr || bc) ? "" : P("A")].filter((x) => x !== "").join("\n");
  })();
  s[13] = b ? table(["ID", "Requirement", "Target"], A(b.nfrs).map((r, i) => [`NFR-${String(i + 1).padStart(2, "0")}`, r.requirement, r.target])) : P("B");
  s[14] = d ? [table(["Step", "Proves", "Exit criterion", "Signs"], A(d.deploy).map((r) => [r.step, r.proves, r.exit, r.signs])), "", table(["Drive metric", "Why", "Alert threshold"], A(d.drive).map((r) => [r.metric, r.why, r.alert])), "", `**Stop rule (client decision):** ${clean((cs.find((x) => x.id === "R2-6") || cs.find((x) => x.gate === "D" && /\bpause\b|\bstop rule\b/i.test(x.question)) || {}).decision || d.stop?.preferred)}. **Kill switch:** per behaviour, owned by ${clean(d.killSwitchOwner || "the product owner")}.`, "", "**Plan**", "", table(["Week", "Work"], A(d.plan).map((r) => [r.week, r.work])), ...(A(d.supportModel).length ? ["", "**Support model after launch**", "", table(["Tier", "Who", "Owns"], A(d.supportModel).map((r) => [r.tier, r.who, r.owns]))] : []), ...(A(d.adoption).length ? ["", "**Adoption and change**", "", table(["Who changes how they work", "What changes", "How we bring them in", "Adoption signal"], A(d.adoption).map((r) => [r.group, r.changes, r.bringIn, r.signal]))] : []), ...(A(d.operatingModel).length ? ["", "**Operating model**", "", table(["Role", "First wave", "After handover"], A(d.operatingModel).map((r) => [r.role, r.firstWave, r.afterHandover]))] : [])].join("\n") : (early([["Pilot group", dec("R2-5")], ["Pause point", dec("R2-6")], ["Ownership", dec("R2-7")], ["Dependencies", dec("R2-8")]]) || P("D"));
  s[15] = d ? [table(["Approver", "Role", "Signs off on"], A(d.signoffs).map((r) => [r.name || "to confirm", r.role, r.signs])), "", table(["Step", "Question", "Answer", "Status", "Closes it"], [...A(c.governance).filter((r) => !/^answered/i.test(r.status)), ...A(c.governance).filter((r) => /^answered/i.test(r.status))].map((r) => [stepOf(r.gate), r.question, r.answer, r.status, r.owner])), ...(A(u?.responsibleAi).length ? ["", "**Responsible AI**", "", table(["Area", "Risk in this case", "Control", "Owner", "Evidence a reviewer can sign"], A(u.responsibleAi).map((r) => [r.area, r.risk, r.control, r.owner, r.evidence]))] : [])].join("\n") : P("D");
  s[16] = b ? table(["ID", "Risk", "Likelihood", "Impact", "Mitigation"], A(b.risks).map((r, i) => [`R-${String(i + 1).padStart(2, "0")}`, r.risk, r.likelihood, r.impact, r.mitigation])) + (A(v?.hypotheses).length ? ["", "", "**Hypotheses this plan rests on**", "", table(["ID", "Bet", "Weakest link", "Cheapest test that would kill it"], A(v.hypotheses).map((r, i) => [`H-${String(i + 1).padStart(2, "0")}`, r.bet, r.weakestLink, r.killTest]))].join("\n") : "") : P("B");
  s[17] = b ? [table(["Dependency", "Owner", "Needed for", "Status"], A(b.dependencies).map((r) => [r.dependency, r.owner, r.neededFor, r.status])), "", table(["ID", "Question or assumption", "Owner", "Needed by"], A(b.openQuestions).map((r, i) => [`Q-${String(i + 1).padStart(2, "0")}`, r.question, r.owner, r.neededBy]))].join("\n") : P("B");
  s[18] = (A(d && d.observability && d.observability.signals).length || A(a && a.tokenStrategy).length) ? (() => {
    const ob = d && d.observability;
    const obTbl = ob && A(ob.signals).length ? ["**Observability (what we watch once the agents are live)**", "", table(["Signal", "Group", "Source", "Alert threshold"], A(ob.signals).map((r) => [r.signal, r.group, r.source, r.alert]))].join("\n") : "";
    const dash = ob && ob.dashboard ? `**Dashboard:** ${clean(ob.dashboard)}` : "";
    const tele = ob && ob.telemetry ? `**Production telemetry:** ${clean(ob.telemetry)}` : "";
    const tok = A(a && a.tokenStrategy).length ? ["**Token strategy (tuned per use case)**", "", table(["Tactic", "Where it applies", "Effect"], A(a.tokenStrategy).map((r) => [r.tactic, r.where, r.effect]))].join("\n") : "";
    return [obTbl, "", dash, tele, "", tok].filter((x) => x !== "").join("\n");
  })() : P("D");
  s[19] = b ? [clean(b.section17Intro) || "This section is written for a coding agent (Claude Code or similar). Hand it this file and the `out/proto/` folder; it should be able to take the prototype to a pilot-ready service task by task, with the evals deciding when each task is done.", "", "**Starting point:** a working prototype in `out/proto/` (router, eval runner, product shell, audit log) that passes or is blocked by its own gates.", "", "**Target layout**", "", "```", "<repo>/", "  src/router        decision order: guard, route, hand off", `  src/${a?.shape === "review" ? "extraction" : a?.shape === "rank" ? "ranking" : "drafting"}      model contract and template fallback`, "  src/api           decide, eval, log endpoints", "  web/              the product shell (Today, Queue, item, oversight pages)", "  eval/             golden.json, holdout.json (sealed), gates.json, run", "  docs/prd.md       this file", "```", "", "**Kickoff prompt**", "", "```", `Read docs/prd.md fully before writing code. You are building ${v?.useCase || "the first wave"} for ${v?.client || "the client"}.`, "Rules: never edit eval/golden.json to make a gate pass; never open eval/holdout.json;", "escalation is checked before anything else; never produce an answer without a cited source;", "no secrets in code; synthetic data only. Work task by task from section 19. After each task,", "run the eval and show its output. Stop and ask me when a requirement is ambiguous.", "Start with T-01.", "```", "", "_(Section numbers: the implementation plan is section 19; model selection and cost is section 12; monitoring and observability is section 18.)_", "", table(["ID", "Task", "Implements", "Done when"], A(b.tasks).map((r, i) => [`T-${String(i + 1).padStart(2, "0")}`, r.task, r.implements, r.doneWhen])), "", "**Guardrails for the coding agent**", "- The gates in `eval/gates.json` are the definition of done. A red gate blocks the task.", "- Fix the general pattern behind a miss, never the exact sentence; the holdout tests the kind.", "- Every new behaviour gets golden rows first, labelled before the code exists.", `- Ask before adding a dependency, a data source, or any action the never list touches.${A(b.guardrails).length ? "\n" + A(b.guardrails).map((x) => `- ${clean(x)}`).join("\n") : ""}`].join("\n") : P("B");
  const titles = { 1: "Executive summary", 2: "Problem statement and opportunity", 3: "Target users", 4: "Goals, non-goals and success metrics", 5: "Scope and phasing", 6: "Solution overview", 7: "Functional requirements", 8: "AI behavior specification", 9: "Human-in-the-loop design", 10: "Data, privacy and labeling", 11: "Evaluation and acceptance criteria", 12: "Model selection, cost and business case", 13: "Non-functional requirements", 14: "Rollout and operations", 15: "Governance and approvals", 16: "Risks and mitigations", 17: "Dependencies, assumptions and open questions", 18: "Monitoring, observability and cost", 19: "Implementation plan" };
  const prev = read(path.join(OUT, "prd.md"));
  const hrows = [b, g.e, g.u, g.d, g.a, g.l, v].flatMap((x) => A(x && x.history)).filter((h) => h && h.version).sort((x, y) => parseFloat(x.version) - parseFloat(y.version));
  const history = hrows.length ? ["## Appendix: document history", "", "| Version | Date | Change | Requested by | Sections |", "|---|---|---|---|---|", `| 0.1 | ${today()} | First draft, built step by step with your team | Product lead | All |`, ...hrows.map((h) => `| ${h.version} | ${h.date || today()} | ${clean(h.change)} | ${clean(h.by) || "Client"} | ${clean(Array.isArray(h.sections) ? h.sections.join(", ") : h.sections) || "As marked"} |`)].join("\n") : (prev.match(/## Appendix: document history[\s\S]*$/) || [""])[0].trim();
  const version = hrows.length ? `${hrows[hrows.length - 1].version}, ${b ? "revised draft for client review" : "revised live draft"}` : (prev.match(/\*\*Version:\*\* ([^·]+)·/) || [, b ? "0.1, draft for client review " : "0.1, live draft "])[1].trim().replace(/live draft/, b ? "draft for client review" : "live draft");
  const md = [`# ${productName() || v?.useCase || "(use case, to be named)"}: product requirements`, "", `<!-- Case: ${clean(caseLine())} -->`, "", `**Client:** ${v?.client || "(client to be named)"} · **Version:** ${version} · **Owner:** product lead · **Date:** ${today()} · **Source:** built step by step with your team; every decision is traceable to the record`, "",
    ...(b ? [`> **Recommendation.** ${clean(b.recommendation)}`, `> **Decision asked of the client.** ${clean(b.decisionAsked)}`, ""] : []),
    ...Object.entries(titles).flatMap(([n, t]) => [`## ${n}. ${t}`, "", s[n], ""]),
    "## Appendix: client decisions", "", cs.some((x) => x.decision) ? tableAll(["Topic", "Question", "Decision", "Answer source", "Our recommendation"], cs.map((x) => [clean(x.title) || stepOf(x.gate), clean(x.question), x.decision ? `${byLabel(x.decision)}${x.revised ? " (revised)" : ""}` : "open", x.decision ? (x.assumed ? (x.basis && x.basis !== "pending" ? "assumed from research" : "working assumption, source being checked") : x.skipped ? "recommended default (round skipped)" : x.auto ? "recommended option" : `client: ${byLabel(x.by || x.role)}`) : "not answered", x.fact ? "" : byLabel(A(x.options)[0]?.label)])) : P("B"), "",
    history || ["## Appendix: document history", "", "| Version | Date | Change | Requested by | Sections |", "|---|---|---|---|---|", `| 0.1 | ${today()} | First draft, built step by step with your team | Product lead | All |`].join("\n"), ""].join("\n");
  // Client-ready: bracketed question references stay in the decisions appendix, not in the client's prose.
  const cut = md.indexOf("## Appendix: client decisions");
  const plain = (t) => t.replace(/\bgolden sets?\b/gi, "answer key").replace(/\bholdout\b(?![./_-]\w)/g, "sealed test set").replace(/\bHoldout\b/g, "Sealed test set").replace(/\| Bar \|/g, "| Pass mark |").replace(/\b(the|a|this|each|every|its) bar\b/g, "$1 pass mark").replace(/\bbars\b(?= (?:set|before|per|for|are|were|held|met))/g, "pass marks").replace(/\bpersonas\b/g, "user groups").replace(/\bsealed test set sealed test set\b/g, "sealed test set").replace(/\b([Ss])ealed sealed\b/g, "$1ealed").replace(/(\d)\. \1 (->|→)/g, "$1. $2");
  const clientMd = cut > 0 ? plain(md.slice(0, cut)).replace(/\s*\((?:\s*(?:C-\d{1,2}|R\d-\d{1,2})\s*[,;]?\s*)+\)/g, "").replace(/\s*\((?:C-\d{1,2}|R\d-\d{1,2})[,;]\s*([^)]*)\)/g, " ($1)").replace(/\(([^)]*?)[,;]\s*(?:C-\d{1,2}|R\d-\d{1,2})\)/g, "($1)") + md.slice(cut) : md;
  write(path.join(OUT, "prd.md"), clientMd);
}

// ---------- brief ----------
function renderBrief(g, ev, c) {
  const t = read(path.join(SK, "valued", "brief-template.html")); if (!t || !g.b) return;
  const esc = (s) => String(s ?? "").replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
  const li = (xs) => A(xs).slice(0, 3).map((x) => `<li>${esc(clean(x))}</li>`).join("");
  const cs = cards();
  const gateRows = Object.entries(ev.devGates).map(([k, r]) => `<tr><td>${esc(k)}</td><td>${esc(r.bar)}</td><td>${esc(r.value)}</td><td>${esc((ev.holdGates[k] || {}).value || "")}</td><td>${(() => { const h = ev.holdGates[k]; const ok = r.result === "PASS" && (!h || h.result === "PASS"); return `<span class="pill ${ok ? "ok" : "bad"}">${ok ? "Passed" : h && h.result !== "PASS" ? "Blocked on holdout" : "Blocked"}</span>`; })()}</td></tr>`).join("");
  const govRows = A(c.governance).filter((r) => !/^answered/i.test(r.status)).slice(0, 8).map((r) => `<tr><td>${esc(stepOf(r.gate))}</td><td>${esc(r.question)}</td><td>${esc(r.status)}</td><td>${esc(r.owner)}</td></tr>`).join("") || `<tr><td colspan="4">No open governance items.</td></tr>`;
  const stats = A(g.b.stats).length === 3 ? g.b.stats : [{ value: String(ev.goldenN + ev.holdoutN), label: "labelled test rows" }, { value: (ev.devGates["Escalation recall"] || {}).value || "", label: "escalation recall, dev" }, { value: (ev.holdGates["Escalation recall"] || {}).value || "", label: "escalation recall, sealed holdout" }];
  const map = { CLIENT: g.v?.client, ONE_LINE_PROBLEM: g.b.summary?.problem, RECOMMENDATION_ONE_SENTENCE: g.b.recommendation, AGENT_SENTENCE_WITH_FIGURES: g.b.agentSentence, STAT_1_VALUE: stats[0].value, STAT_1_LABEL: stats[0].label, STAT_2_VALUE: stats[1].value, STAT_2_LABEL: stats[1].label, STAT_3_VALUE: stats[2].value, STAT_3_LABEL: stats[2].label, V_BULLETS_3_LI: li(g.v?.sayIt), A_BULLETS_3_LI: li(g.a?.sayIt), L_BULLETS_3_LI: li(g.l?.sayIt), U_BULLETS_3_LI: li(g.u?.sayIt), E_BULLETS_3_LI: li(g.e?.sayIt), D_BULLETS_3_LI: li(g.d?.sayIt), GATE_ROWS_TR: gateRows, EVAL_CAPTION_ROWS_AND_WHAT_CHANGED: `${ev.goldenN} dev rows, ${ev.holdoutN} sealed. ${esc(clean(g.b.evalCaption || (ev.devPass ? "Passes every gate." : "Blocked; see section 11.")))}`, CLIENT_DECISIONS_LI: cs.filter((x) => x.decision).slice(0, 12).map((x) => `<li><strong>${esc(x.by || x.role)}</strong> chose ${esc(x.decision)}<span class="cap"> (we recommended ${esc(A(x.options)[0]?.label || "")})</span></li>`).join(""), PLAN_ROWS_TR: A(g.d?.plan).map((r) => `<tr><td>${esc(r.week)}</td><td>${esc(r.work)}</td></tr>`).join(""), TIMELINE: g.d?.timeline || "", RISKS_LI: li(A(g.b.risks).map((r) => `${r.risk}: ${r.mitigation}`)), GOVERNANCE_ROWS_TR: govRows };
  write(path.join(OUT, "brief.html"), t.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, k) => (k in map ? String(map[k] ?? "") : m)));
}

// ---------- check ----------
function check(g, ev, c, quiet) {
  const miss = [];
  const need = (cond, std, msg) => { if (!cond) miss.push([std, msg]); };
  // Owners are keyed by the exact trigger families gate A names and the router reports; a gap sends an appeal to the wrong team.
  if (g.a && g.u) { const fams = A(g.a.triggerFamilies).map(famKey), owners = Object.keys(g.u.escalationOwners || {}).map(famKey), uf = A(g.u.triggers).map((t) => famKey(t && t.family));
    for (const f of fams) need(owners.includes(f), 4, `trigger family "${f}" has no escalation owner in u.json escalationOwners`);
    for (const f of uf) need(!fams.length || fams.includes(f), 4, `u.json trigger family "${f}" is not one of a.json triggerFamilies`); }
  // Round-1 answers reach the prototype at once.
  { const r1 = roundOne(cards()); if (r1.northStar) need(c.heroStat && c.heroStat.metric, 4, "the north-star answer is not in case.json heroStat"); if (r1.autonomy) need(c.autonomy, 4, "the autonomy answer is not in case.json"); if (r1.owner) need(c.escalationOwner && c.ownerShort, 4, "the escalation-owner answer is not in case.json"); }
  const must = (obj, keys, gate) => { if (!obj) { need(false, 5, `gate ${gate}: out/gates/${gate.toLowerCase()}.json missing`); return; } for (const k of keys) need(obj[k] !== undefined && obj[k] !== "" && !(Array.isArray(obj[k]) && !obj[k].length), 5, `gate ${gate}: ${k} missing`); };
  if (g.r) {
    const keys = new Set(A(g.r.sources).map((x) => x.key));
    const external = new Set(A(g.r.sources).filter((x) => /^https?:\/\//.test(x.url || "") && !/localhost|client|inputs\//i.test(`${x.url} ${x.publisher}`)).map((x) => x.key));
    const offline = A(g.r.notes).length > 0 && A(g.r.notes).every((n) => /web unavailable/i.test(n)) && !A(g.r.facts).length;
    if (offline) console.log("  note: research ran without web access, so findings stay as marked assumptions (not a failure)");
    need(offline || A(g.r.facts).filter((f) => external.has(f.source)).length >= 5, 1, "research: 5+ facts from external published sources (client answers are never research)");
    need(A(g.r.sources).every((x) => /^https?:\/\//.test(x.url || "") && x.publisher && x.year), 1, "research: every source needs url, publisher, year");
    need(A(g.r.tree?.branches).length >= 3 && A(g.r.tree.branches).every((b) => A(b.hypotheses).length && A(b.questions).length), 1, "research: tree needs 3+ branches, each with hypotheses and question ids");
    need(A(g.r.terms).length >= 6, 1, "research: 6+ terms with plain meanings");
    need(cards().filter((x) => Number(x.round) === 1).every((x) => x.why && x.branch), 1, "round 1: every card needs why and branch");
    need(A(g.r.assumptions).length >= 3, 1, "research: 3+ stated assumptions, each tied to the card that tests it");
  }
  for (const m of approachIssues(json(path.join(GATES, "approach.json"), {}))) need(false, 8, m);
  for (const m of consistency()) need(false, 4, m);
  { // Client-ready language: internal ids never reach a client view (the decisions appendix keeps its gate column).
    const body = read(path.join(OUT, "prd.md")).split("## Appendix")[0];
    const ids = body.match(/\b(?:C-\d{1,2}|R\d-\d{1,2}|[PRA]\d{1,2}(?=[\s,).;])|B\d(?=[\s,).;:]))/g) || [];
    need(!ids.length, 8, `PRD body shows internal ids (${[...new Set(ids)].slice(0, 5).join(", ")}): say what the client said or cite the source in words`);
    const ap = JSON.stringify(json(path.join(GATES, "approach.json"), {}));
    need(!/\b(?:C-\d{1,2}|R\d-\d{1,2}|B\d)\b/.test(ap), 8, "approach cards show internal ids: write them for the client");
    const cj = JSON.stringify({ ...json(path.join(PROTO, "case.json"), {}), decisions: undefined });
    const leak = cj.match(/\bGate [VALUED]\b|\b(?:C-\d{1,2}|R\d-\d{1,2})\b|\([^)]*recommended[^)]*\)/gi) || [];
    need(!leak.length, 8, `prototype text shows method internals (${[...new Set(leak)].slice(0, 4).join(", ")}): write it for the user of the product`);
    for (const a of A(g.r?.assumptions)) { const c = cards().find((x) => x.id === a.card); if (c && c.decision) need(["confirmed", "challenged"].includes(a.status), 1, `assumption "${String(a.text).slice(0, 50)}" was tested by an answer but has no status (confirmed or challenged)`); }
  }
  need(!/\(persona\)/i.test(read(path.join(OUT, "prd.md"))), 8, "PRD shows \"(persona)\": record the persona flag separately, never in by or decision");
  must(g.v, ["client", "industry", "sponsorRole", "ownerRole", "useCase", "title", "headline", "scenario", "user", "inputLabel", "persona", "labels", "valueFrame", "candidates", "northStar", "problem", "valueDrivers", "users", "stories", "journey", "goals", "nonGoals", "metrics", "stakeholders", "hypotheses", "governance", "sayIt"], "V");
  must(g.a, ["scores", "waves", "sourcing", "numbersToQuote", "engine", "engineWhy", "shape", "shapeWhy", "agents", "sweeps", "itemNoun", "promise", "alternatives", "latency", "cost", "governance", "sayIt"], "A");
  must(g.l, ["verdicts", "groups", "labelling", "connectors", "dataPrivacy", "governance", "sayIt"], "L");
  must(g.u, ["autonomyTable", "autonomyRec", "neverList", "triggers", "clocks", "escalationOwner", "escalationSla", "autonomy", "disclosure", "approverRole", "draftOpener", "logging", "responsibleAi", "governance", "sayIt"], "U");
  must(g.e, ["gateTable", "bar", "runs", "governance", "sayIt"], "E");
  must(g.d, ["deploy", "drive", "pilot", "stop", "plan", "signoffs", "roadmap", "supportModel", "adoption", "operatingModel", "governance", "sayIt"], "D");
  must(g.b, ["summary", "recommendation", "decisionAsked", "requirements", "nfrs", "risks", "dependencies", "openQuestions", "tasks", "faq", "sweepFindings", "agentSentence"], "B");
  if (g.a) { need(A(g.a.agents).length >= 3 && A(g.a.agents).length <= 6, 2, "3 to 6 assistants"); need(A(g.a.agents)[0]?.kind === "rules" && /guard|safety/i.test(A(g.a.agents)[0]?.name || ""), 2, "first assistant must be a fixed-rules safety guard"); need(A(g.a.sweeps).length >= 1 && A(g.a.sweeps).length <= 3, 2, "1 to 3 sweeps"); need(["desk", "review", "rank", "chat"].includes(g.a.shape), 3, "shape"); if (g.a.shape === "rank") need(A(g.a.dismissReasons).length >= 4, 3, "rank needs 4 dismissReasons"); need(A(g.a.scores).some((s) => s.notGenAI), 2, "at least one candidate marked not GenAI"); }
  if (g.b) { need(A(g.b.faq).length >= 7 && A(g.b.faq).length <= 8 && A(g.b.faq).every((f) => f.q && f.a && f.from), 4, "7 to 8 FAQ pairs each with q, a, from"); need(A(g.b.sweepFindings).every((f) => A(f).length >= 2 && A(f).every((x) => x.title && x.why && x.cite)), 2, "2 to 3 findings per sweep, each with title, why, cite"); need(A(g.b.requirements).length >= 6 && A(g.b.requirements).every((r) => /Given[^]*\bwhen\b[^]*\bthen\b/i.test(r.acceptance || "")), 5, "6+ requirements, every acceptance written Given ..., when ..., then ..."); need(A(g.b.tasks).length >= 5, 5, "section 19 needs 5+ tasks"); }
  if (c) { need(A(c.connectors).length >= 6, 3, "6+ systems"); need(A(c.connectors).every((x) => !x.vendor || /assumed|e\.g\./i.test(x.vendor)), 3, "vendors only as e.g. ... (assumed)"); need(A(c.governance).length >= 12, 4, "12+ governance rows"); need(A(c.governance).filter((x) => !/^answered/i.test(x.status)).every((x) => x.owner), 4, "every open governance row has an owner"); need(A(c.neverList).length >= 3, 3, "never list 3+ lines"); need(["escalate", "human", "answer"].every((k) => Number((c.clocks || {})[k]?.hours) > 0), 3, "clocks need { hours, label } for escalate, human and answer"); need(A(c.samples).length === 6, 3, "6 samples"); }
  need(ev.goldenN >= 30 && ev.holdoutN >= 20, 6, `golden ${ev.goldenN} (30+) and holdout ${ev.holdoutN} (20+) rows`);
  need(json(path.join(PROTO, "holdout.json"), []).filter((r) => r.expected === "escalate").length >= 10, 6, "holdout needs 10+ escalation rows");
  need(json(path.join(PROTO, "golden.json"), []).filter((r) => r.never).length >= 3, 6, "golden needs 3+ never rows");
  // S-078: the holdout must have been written by a context that never wrote the router.
  if (fs.existsSync(path.join(PROTO, "holdout.json"))) {
    need(ev.prov.recorded, 6, "out/proto/provenance.json must name both writers: run `conductor.js seal holdout <agent>` and `conductor.js seal router <agent>`");
    if (ev.prov.recorded) need(ev.prov.independent, 6, `holdout not independent: ${ev.prov.shared.join(", ")} wrote both the holdout rows and the router, so the sealed score grades its own author`);
  }
  // S-085: one sealed score per router version. One repair, disclosed, is allowed; more is tuning on the holdout.
  need(ev.versions <= 2, 6, `the sealed holdout has been scored against ${ev.versions} router versions: 1 is clean, 2 is one disclosed repair, more means it is being tuned against`);
  need(!fs.existsSync(path.join(PROTO, "eval.js")) || ev.devPass, 6, "dev eval blocked"); need(!fs.existsSync(path.join(PROTO, "eval.js")) || ev.holdPass, 6, "holdout eval blocked");
  if (g.a && g.a.engine !== "rules" && fs.existsSync(path.join(PROTO, "eval.js"))) { const cache = json(path.join(PROTO, "model-cache.json"), {}); const norm = (t) => String(t || "").toLowerCase().replace(/\s+/g, " ").trim(); const missing = ["golden.json", "holdout.json"].flatMap((f) => json(path.join(PROTO, f), [])).filter((r) => !cache[norm(r.text)]).length; need(missing === 0, 6, `guard model cache misses ${missing} texts: run model-inputs and the guard model again`); }
  const router = read(path.join(PROTO, "router.js")); if (router) need(!/\brequire\(|\bimport\s|readFileSync|fetch\(/.test(router) && /module\.exports\s*=\s*\{\s*decide/.test(router), 7, "router must be self-contained CommonJS");
  // R-017: the same measure as the audit (valued-audit/check.js standard 7): non-whitespace characters outside comments.
  if (router) { const n = router.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("").replace(/\s/g, "").length; need(n <= 10000, 7, `router.js is ${n} non-whitespace characters of code; 8000 is the guideline and 10000 the limit: move trigger phrases and wording into sources.json match lists`); }
  { // No repeated questions: any two cards sharing most of their content words are one question asked twice.
    const stop = new Set("the a an and or of to in for on with your you we our is are be this that what how who which do does would could it its as at by from if any".split(" "));
    const toks = (q) => new Set(String(q || "").toLowerCase().replace(/\([^)]*\)/g, " ").match(/[a-z]{3,}/g)?.filter((w) => !stop.has(w)) || []);
    const cz = cards(); for (let i = 0; i < cz.length; i++) for (let j = i + 1; j < cz.length; j++) { const a = toks(cz[i].question), b = toks(cz[j].question); const inter = [...a].filter((w) => b.has(w)).length; const sim = inter / Math.max(1, Math.min(a.size, b.size)); need(sim < 0.6, 1, `repeated question: ${cz[i].id} and ${cz[j].id} overlap ${Math.round(sim * 100)}%`); }
  }
  const cs = cards(); const core = cs.filter((x) => !/^X-|^K-/.test(String(x.id))).length; need(core >= 23 && core <= 26, 1, `${core} cards (23 to 26, explore and conflict cards not counted)`); need(cs.every((x) => x.role && x.question && x.format && A(x.options).length >= 2 && A(x.options).every((o) => o.label && o.tradeoff)), 1, "every card: role, question, format, 2+ options with trade-offs"); need(!cs.some((x) => /^COO$/i.test(x.role)) || /COO/i.test(caseLine()), 1, "card roles must be this case's sponsor and owner roles, not COO");
  const scanDirs = [OUT]; const files = []; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { if (!/hosted/.test(f)) walk(p); } else if (/\.(md|json|js|html)$/.test(f) && !/ff\.css|app\.html|prd-viewer|server\.js|audit\.jsonl/.test(f)) files.push(p); } }; if (fs.existsSync(OUT)) walk(OUT);
  const realCo = /\b(Acme|Contoso|Globex|Initech|Example Corp|Anthem|Aetna|UnitedHealth|Cigna|Humana|JPMorgan|Wells Fargo|Bank of America|Citibank|Capital One|Delta Air|United Airlines|American Airlines|Walmart|Amazon|Geico|Allstate|State Farm|Kaiser|CVS|Walgreens|Salesforce|Google|Microsoft|Workday|Oracle|SAP|Epic Systems|Cerner|Fidelity|CredR|EdCast|Coursewave|Enelek)\b/;
  for (const p of files) { const t = read(p); if (t.includes("—")) need(false, 8, `em-dash in ${path.relative(ROOT, p)}`); const m = t.replace(/e\.g\.[^)\n"]*\(assumed\)/g, "").replace(MODEL_VENDORS, "").match(realCo); if (m) need(false, 8, `real or employer name "${m[0]}" in ${path.relative(ROOT, p)}: use a synthetic name, or "e.g. ... (assumed)" for a vendor`); }
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
  if (print) { console.log(table(["Phase", "Budget", "Used", "Status"], rows.map((r) => [`${r.phase} ${r.name}`, `${r.budget} min`, r.seconds === null ? "" : `${Math.floor(r.seconds / 60)}m ${r.seconds % 60}s`, r.seconds === null ? "not started" : r.running ? (r.over ? "RUNNING, OVER BUDGET: cut scope" : "running") : r.over ? "over" : "ok"]))); console.log(`Total: ${Math.floor(total / 60)}m ${total % 60}s of ${PHASES.reduce((t, p) => t + p[2], 0)}m`); const cur = rows.find((r) => r.running && r.over); if (cur && CUTS[cur.phase]) console.log(`Cut order for phase ${cur.phase}: ${CUTS[cur.phase].join("; ")}. Never cut governance, evals, the holdout or the never list.`); }
  return { rows, total };
}

// ---------- report ----------
function report(g, ev, c) {
  const { rows, total } = clockStatus(false);
  const cs = cards(); const cuts = clockEntries().filter((e) => e.event === "cut");
  const flagged = read(path.join(PROTO, "audit.jsonl")).split("\n").filter((l) => /Flagged as wrong/.test(l)).length;
  const r = { case: clean(caseLine()), date: today(), mode: read(path.join(OUT, "mode.txt")).trim() || "orchestrated", totalSeconds: total, budgetSeconds: PHASES.reduce((t, p) => t + p[2], 0) * 60, withinBudget: total <= PHASES.reduce((t, p) => t + p[2], 0) * 60, phases: rows.map((x) => ({ phase: `${x.phase} ${x.name}`, budgetMin: x.budget, seconds: x.seconds, over: x.over })), questionsAsked: cs.length, questions: cs.map((x) => ({ gate: x.gate, role: x.role, question: x.question, decision: x.decision, auto: Boolean(x.auto) })), revisions: cs.filter((x) => x.revised).length, flaggedWrong: flagged, evalBlocks: A(g.e?.runs).filter((x) => /RELEASE BLOCKED/.test(x.output || "")).length, evalFixes: A(g.e?.fixes), holdoutIndependent: ev.independent, release: { dev: ev.devPass, holdout: ev.holdPass }, cuts: cuts.map((x) => ({ phase: x.phase, what: x.note })), shape: g.a?.shape, systems: A(c?.connectors).length, assistants: A(g.a?.agents).length, sweeps: A(g.a?.sweeps).length, checks: check(g, ev, c, true).map(([s, m]) => `[${s}] ${m}`) };
  writeJson(path.join(OUT, "run-report.json"), r);
  console.log(`Run report: out/run-report.json · ${Math.floor(total / 60)}m ${total % 60}s of ${PHASES.reduce((t, p) => t + p[2], 0)}m · ${cs.length} questions · ${r.checks.length} open checks`);
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
  else { fs.mkdirSync(OUT, { recursive: true }); const now = Date.now(); fs.appendFileSync(CLOCK, JSON.stringify({ phase: rest[0], event: rest[1], t: now, note: rest.slice(2).join(" ") }) + "\n"); const p = PHASES.find((x) => x[0] === rest[0]); if (rest[1] === "start" && p) console.log(`[${p[0]}] ${p[1]} · budget ${p[2]} min`);
    // On end, print the real time this phase took, so the run shows how long each gate's output took to produce.
    if (rest[1] === "end" && p) { const st = [...clockEntries()].reverse().find((e) => e.phase === rest[0] && e.event === "start"); if (st) { const s = Math.max(0, Math.round((now - st.t) / 1000)); console.log(`[${p[0]}] ${p[1]} · done in ${s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`}`); } }
    // Live status so the prototype and PRD can show what is being built right now, even during a long gate.
    try { fs.mkdirSync(PROTO, { recursive: true }); const done = rest[1] === "end" && rest[0] === "6"; writeJson(path.join(PROTO, "status.json"), { phase: rest[0], label: p ? p[1] : "", running: rest[1] === "start", done, t: Date.now() }); } catch {} }
} else if (cmd === "step") {
  // Fine-grained sub-step of the running phase, for the long opaque gates (E above all): updates the live
  // "Building now:" line on the PRD and prototype, and prints one line in the run so you see what it is doing.
  const label = rest.join(" ").trim();
  const started = [...clockEntries()].reverse().find((e) => e.event === "start");
  const sec = started ? Math.max(0, Math.round((Date.now() - started.t) / 1000)) : 0;
  const p = started && PHASES.find((x) => x[0] === started.phase);
  try { fs.mkdirSync(PROTO, { recursive: true }); writeJson(path.join(PROTO, "status.json"), { phase: started ? started.phase : "", label: p ? `${p[0]}: ${label}` : label, step: label, running: true, done: false, t: Date.now() }); } catch {}
  console.log(`  ${"·"} ${label}${sec >= 20 ? ` (${sec >= 60 ? `${Math.floor(sec / 60)}m ${sec % 60}s` : `${sec}s`} into this phase)` : ""}`);
} else if (cmd === "cut") {
  fs.appendFileSync(CLOCK, JSON.stringify({ phase: rest[0], event: "cut", t: Date.now(), note: rest.slice(1).join(" ") }) + "\n");
  console.log(`Over budget in phase ${rest[0]}: cutting ${rest.slice(1).join(" ")}. Governance, evals, the holdout and the never list stay.`);
} else if (cmd === "cards") {
  const cs = cards(); const round = Number(rest[1]);
  const mine = cs.filter((c) => Number(c.round) === round);
  if (rest[0] === "auto" || rest[0] === "skip") { const skip = rest[0] === "skip"; const kept = mine.filter((c) => c.decision).length; for (const c of mine.filter((c) => !c.decision)) { const rec = A(c.options).find((o) => o.recommended || /\(recommended\)/i.test(o.label || "")) || A(c.options)[0]; c.decision = String(rec?.label || "").replace(/\s*\(recommended\)/i, ""); c.auto = true; if (skip) c.skipped = true; c.by = skip ? "client (skipped, recommended taken)" : c.role; trace({ kind: "decision", id: c.id, gate: c.gate, role: c.role, question: c.question, decision: c.decision, auto: true, skipped: skip }); } writeJson(path.join(OUT, "cards.json"), cs); console.log(skip ? `Round ${round} skipped: ${mine.length - kept} unanswered cards (${kept} answers kept as given) took the recommended option so we can move on; the PRD records them as client defaults.` : `Round ${round}: ${mine.length} cards answered with the recommended option (auto).`); }
  else for (const c of mine) { console.log(`\n**"${c.role}": "${c.question}"** If none fits, answer with: ${c.format}`); if (c.why) console.log(`Why we ask: ${clean(c.why)}`); A(c.options).forEach((o, i) => console.log(`${i + 1}. ${o.label}${i === 0 && !c.fact && !/\(Recommended\)/i.test(o.label || "") ? " (Recommended)" : ""}: ${clean(o.tradeoff)}`)); }
} else if (cmd === "verify") {
  // Fast, deterministic QC after a phase: only what that phase and the ones before it own. The gate-qc agent
  // does the judgement checks in the background; this catches the mechanical ones in a second.
  const ph = Number(rest[0]); const owns = { 0: ["R"], 1: ["R"], 2: ["R", "V", "A"], 3: ["R", "V", "A"], 4: ["R", "V", "A", "L", "U"], 5: ["R", "V", "A", "L", "U", "E", "D"], 6: ["R", "V", "A", "L", "U", "E", "D", "B"] }[ph] || [];
  const g = gates(); const ev = evalResults(); const issues = [];
  for (const [, m] of check(g, ev, json(path.join(PROTO, "case.json"), {}), true)) { const gm = m.match(/^gate ([A-Z])/); if (gm ? owns.includes(gm[1]) : (/research|round 1|repeated/.test(m) ? ph >= 1 : /round 2/.test(m) ? ph >= 3 : ph >= 6)) issues.push(m); }
  const prd = read(path.join(OUT, "prd.md"));
  for (const gt of owns) { const n = (prd.match(new RegExp(`Pending: fills at gate ${gt}\\b`, "g")) || []).length; if (n) issues.push(`PRD: ${n} section(s) still pending for gate ${gt}`); }
  for (const f of [path.join(OUT, "prd.md"), ...fs.readdirSync(GATES).map((x) => path.join(GATES, x))]) if (/—/.test(read(f))) issues.push(`em-dash in ${path.relative(OUT, f)}`);
  for (const row of A(g.v?.valueFrame)) if (/\d/.test(`${row.volumePerMonth}${row.costPerItem}`) && !/assumed|client|R1-|C-\d|\b[PRA]\d\b/i.test(JSON.stringify(row))) issues.push(`value frame row "${clean(row.item)}" has a number with no source: mark it (assumed), the client's answer, or a fact key`);
  const port = process.env.PORT || 4317;
  for (const u of ["/approach", "/research", "/prd", "/"]) { const r = spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "3", `http://localhost:${port}${u}`], { encoding: "utf8" }); if (r.stdout !== "200") issues.push(`localhost:${port}${u} not serving (HTTP ${r.stdout || "none"}): restart the server`); }
  for (const m of approachIssues(json(path.join(GATES, "approach.json"), {}))) issues.push(m);
  if (ph >= 1) for (const m of consistency()) issues.push(m);
  const prev = json(path.join(OUT, "qc", `${ph}.json`), {});
  writeJson(path.join(OUT, "qc", `${ph}.json`), { ...prev, phase: ph, auto: issues, autoAt: today() });
  console.log(issues.length ? `QC after phase ${ph}: ${issues.length} to fix before moving on:\n${issues.map((x) => `  - ${x}`).join("\n")}` : `QC after phase ${ph}: mechanical checks clean.`);
  write(path.join(PROTO, "discovery.html"), renderDiscovery(G("r") || {}, cards(), G("v")?.client, qcAll()));
  writeApproach();
} else if (cmd === "research") {
  // Non-blocking: merge whatever strands have landed so far, narrate only what is new, refresh the live page.
  const dir = path.join(OUT, "research"); const strands = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => json(path.join(dir, f), {})) : [];
  const prev = G("r") || {}; const r = mergeResearch(strands, prev); writeJson(path.join(GATES, "r.json"), r);
  const seenFile = path.join(dir, ".seen.json"); const seen = new Set(json(seenFile, []));
  const srcs = Object.fromEntries(A(r.sources).map((x) => [x.key, x]));
  const fresh = A(r.facts).filter((f) => !seen.has(f.key));
  for (const f of fresh) { const sx = srcs[f.source] || {}; console.log(`Just confirmed · ${clean(f.figure)} · ${clean(f.fact)} (${clean(sx.publisher)}, ${clean(sx.year)})`); seen.add(f.key); }
  for (const g of A(r.regulation)) { const k = `reg:${g.rule}`; if (!seen.has(k)) { console.log(`Rule to design around · ${clean(g.rule)}: ${clean(g.plain)}`); seen.add(k); } }
  if (fs.existsSync(dir)) writeJson(seenFile, [...seen]);
  const open = ["process", "regulation", "ai"].filter((k) => !A(r.strands).includes(k) && !A(r.thin).includes(k));
  if (A(r.thin).length) console.log(`Still confirming: ${r.thin.join(", ")} (evidence so far is thin; treat it as a lead, not a finding).`);
  console.log(fresh.length ? `Research: ${r.facts.length} facts from ${r.sources.length} sources so far${open.length ? `; still reading: ${open.join(", ")}` : "; all three strands in"}.` : open.length ? `Research still reading: ${open.join(", ")}. Carry on; it joins when it lands.` : "Research complete.");
  write(path.join(PROTO, "discovery.html"), renderDiscovery(r, cards(), G("v")?.client || r.client, qcAll()));
  writeApproach();
} else if (cmd === "seed") seed(rest[0]);
else if (cmd === "seal") seal(rest[0], rest[1]);
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
    { const cz = cards(); let changed = false; for (const x of cz) { for (const k of ["decision", "by"]) if (typeof x[k] === "string" && /\s*\((?:recommended|persona|auto)\)/i.test(x[k])) { x[k] = x[k].replace(/\s*\((?:recommended|persona|auto)\)/gi, "").trim(); changed = true; } } if (changed) writeJson(path.join(OUT, "cards.json"), cz); }
    const c = renderCase(g, ev);
    const golden = json(path.join(PROTO, "golden.json"), []), holdout = json(path.join(PROTO, "holdout.json"), []);
    const counts = { golden: golden.length, holdout: holdout.length, holdoutEsc: holdout.filter((r) => r.expected === "escalate").length };
    for (const gr of A(g.l?.groups)) counts[gr.key] = `${golden.filter((r) => (r.slices || {})[gr.key]).length} / ${holdout.filter((r) => (r.slices || {})[gr.key]).length}`;
    if (g.r) write(path.join(PROTO, "discovery.html"), renderDiscovery(g.r, cards(), g.v?.client || g.r.client, qcAll()));
    writeApproach();
    // Live-build evidence: keep the PRD and the prototype's case.json as they were after each render.
    process.on("exit", () => { try { const d = path.join(OUT, "snapshots"); fs.mkdirSync(d, { recursive: true }); const n = String(fs.readdirSync(d).filter((f) => f.endsWith(".prd.md")).length + 1).padStart(3, "0"); const answered = cards().filter((x) => x.decision).length; fs.copyFileSync(path.join(OUT, "prd.md"), path.join(d, `${n}-${answered}answers.prd.md`)); if (fs.existsSync(path.join(PROTO, "case.json"))) fs.copyFileSync(path.join(PROTO, "case.json"), path.join(d, `${n}-${answered}answers.case.json`)); } catch {} });
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
