// Discovery brief: out/proto/discovery.html, served at localhost:4317/discovery.html.
// Rendered from out/gates/r.json (the merged research plus the hypothesis tree) and out/cards.json.
// Client-facing: everything here is read by the client on a shared screen.
const A = (x) => (Array.isArray(x) ? x : []);
const esc = (s) => String(s ?? "").replace(/—/g, ", ").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function renderDiscovery(r, cards, client, qc) {
  r = r || {};
  const src = Object.fromEntries(A(r.sources).map((s, i) => [s.key, { ...s, n: i + 1 }]));
  const factSrc = Object.fromEntries(A(r.facts).map((f) => [f.key, f.source]));
  const cite = (k) => { const s = src[k] || src[factSrc[k]]; return s ? `<a class="cite" href="#src-${esc(s.key)}" title="${esc(s.publisher)}, ${esc(s.year)}">${s.n}</a>` : ""; };
  const cites = (ks) => A(ks).map(cite).join("");
  const byId = Object.fromEntries(A(cards).map((c) => [c.id, c]));
  const tree = r.tree || {};
  const driver = Object.fromEntries(A(tree.branches).map((b) => [b.id, b.driver]));
  // Client view: internal ids never show. Fact keys become citation chips, branch ids become their names.
  const human = (t) => esc(String(t || "")
    .replace(/^\s*tests?\s+B\d+\s*:\s*/i, "")
    .replace(/\b(?:C|R\d)-\d+\b/g, "")
    .replace(/\bB\d+\b/g, (m) => driver[m] ? `"${driver[m]}"` : ""))
    .replace(/\(?\b((?:S[PRA]?)?[PRA]?\d{1,2})\b\)?/g, (m, k) => (factSrc[k] || src[k]) ? cite(k) : m)
    .replace(/\(\s*\)/g, "").replace(/\s{2,}/g, " ").trim();
  const said = (d) => esc(String(d || "").replace(/\s*\((persona|auto|recommended)\)/gi, ""));

  const STR = [["process", "How the work runs"], ["regulation", "Rules and risk"], ["ai", "Where AI has worked"]];
  const landed = new Set(A(r.strands));
  const status = STR.map(([k, l]) => `<span class="stat${landed.has(k) ? " ok" : ""}">${landed.has(k) ? "&#10003;" : "&#9679;"} ${l}${landed.has(k) ? "" : A(r.thin).includes(k) ? ", still confirming" : ", researching"}</span>`).join("");
  const names = ["Framing", "Discovery", "Value and AI fit", "Your steers", "Answer key and guardrails", "Evals and launch", "PRD and prototype"];
  const checks = A(qc).map((q) => { const n = A(q.auto).length + A(q.findings).filter((f) => f.severity !== "minor" && !f.fixed).length; return `<span class="stat${n ? "" : " ok"}">${n ? "&#9679;" : "&#10003;"} Checked: ${names[q.phase] || q.phase}${n ? ", refining" : ""}</span>`; }).join("");

  const branches = A(tree.branches).slice(0, 4).map((b) => {
    const qs = A(b.questions).map((id) => byId[id]).filter(Boolean); const done = qs.filter((c) => c.decision).length;
    return `<div class="row"><span class="chip c2">${esc(b.driver)}</span><p>${A(b.hypotheses).slice(0, 2).map((h) => `${esc(h.text)}${cites(h.facts)}`).join("<br>")}</p><span class="state${qs.length && done === qs.length ? " ok" : ""}">${qs.length ? (done === qs.length ? "Discussed" : done ? "In discussion" : "To explore") : ""}</span></div>`;
  }).join("");

  const assumptions = A(r.assumptions).slice(0, 8).map((a) => {
    const c = a.card && byId[a.card]; const st = c && c.decision ? (a.confirmedIf && new RegExp(a.confirmedIf, "i").test(c.decision) ? "ok" : "check") : "open";
    const lab = { ok: "Confirmed", check: "Worth a closer look", open: "To discuss" }[st];
    return `<div class="row"><span class="chip ${st === "ok" ? "c2" : st === "check" ? "c3" : "c0"}">${lab}</span><p>${esc(a.text)}${cites(a.facts)}${c && c.decision ? `<span class="sub">You said: ${said(c.decision)}</span>` : ""}</p></div>`;
  }).join("");

  const facts = A(r.facts).slice(0, 6).map((f) => `<div class="fact"><div class="fig">${esc(f.figure)}</div><p>${esc(f.fact)}</p><div class="by">${src[f.source] ? `${esc(src[f.source].publisher)}, ${esc(src[f.source].year)}` : ""}${cite(f.source)}</div></div>`).join("");
  const flow = A(r.process).slice(0, 7).map((p, i) => `<li class="step${p.breaks ? " hot" : ""}"><span class="n">${i + 1}</span><b>${esc(p.step)}</b><span>${esc(p.plain)}</span>${p.breaks ? `<em>Where it breaks: ${esc(p.breaks)}</em>` : ""}</li>`).join("");

  const groups = A(tree.branches).slice(0, 4).map((b) => {
    const rows = A(b.questions).map((id) => byId[id]).filter(Boolean).map((c) => `<li class="ask${c.decision ? " done" : ""}"><p class="q">${human(c.question)}</p>${c.why ? `<p class="why">Why we ask: ${human(c.why)}</p>` : ""}${c.decision ? `<p class="said">You said: ${said(c.decision)}</p>` : ""}</li>`).join("");
    return rows ? `<div class="group"><h3>${esc(b.driver)}</h3><ul>${rows}</ul></div>` : "";
  }).join("");

  const terms = A(r.terms).slice(0, 10).map((t) => `<div class="term"><b>${esc(t.term)}</b><span>${esc(t.plain)}</span></div>`).join("");
  const regs = A(r.regulation).slice(0, 6).map((g) => `<div class="row"><span class="chip c1">${esc(g.rule)}</span><p>${esc(g.plain)}${cite(g.source)}</p></div>`).join("");
  const sources = A(r.sources).map((s) => `<li id="src-${esc(s.key)}"><span class="sn">${src[s.key].n}</span>${esc(s.publisher)}, <i>${esc(s.title)}</i>, ${esc(s.year)} <span class="stag">${s.tag === "P" ? "Primary" : "Secondary"}</span> <a href="${esc(s.url)}" target="_blank" rel="noopener">Open</a></li>`).join("");
  const section = (k, h, sub, body) => body ? `<section class="card"><div class="k">${k}</div><h2>${h}</h2>${sub ? `<p class="lede2">${sub}</p>` : ""}${body}</section>` : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Discovery brief</title><link rel="stylesheet" href="/ff.css">
<style>
body{background:var(--paper);color:var(--ink);font-family:var(--font-sans);margin:0}
.wrap{max-width:940px;margin:0 auto;padding:32px 20px 56px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-strong);font-weight:700}
h1{font-family:var(--font-display);font-size:26px;margin:4px 0 0;line-height:1.2}
.client{font-size:13px;color:var(--ink-3);background:var(--white);border:1px solid var(--line);border-radius:999px;padding:5px 12px}
.lede{color:var(--ink-2);font-size:17px;line-height:1.5;margin:14px 0 10px;max-width:760px}
.status{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 22px}
.stat{font-size:12px;border-radius:999px;padding:3px 10px;background:var(--white);border:1px solid var(--line);color:var(--ink-3)}
.stat.ok{background:var(--brand-tint);border-color:var(--brand-soft);color:var(--brand-strong)}
.card{background:var(--white);border:1px solid var(--line);border-radius:20px;padding:24px 28px;box-shadow:var(--shadow-float);margin:0 0 16px}
.card .k{font-size:12px;color:var(--brand-strong);font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.card h2{font-family:var(--font-display);font-size:24px;margin:6px 0 4px;letter-spacing:-.01em}
.lede2{color:var(--ink-3);margin:0 0 10px;font-size:14px}
.row{display:grid;grid-template-columns:190px 1fr auto;gap:16px;align-items:center;padding:12px 0;border-top:1px solid var(--line-2)}
.row:first-of-type{border-top:0}
.chip{justify-self:start;font-size:12.5px;font-weight:700;border-radius:10px;padding:5px 11px}
.c0{background:var(--paper);color:var(--ink-3)}.c1{background:var(--blue-bg);color:var(--blue)}.c2{background:var(--brand-tint);color:var(--brand-strong)}.c3{background:var(--amber-bg);color:var(--amber-strong)}
.row p{margin:0;font-size:16px;line-height:1.45}
.row .sub{display:block;font-size:13px;color:var(--ink-3);margin-top:3px}
.state{font-size:12px;color:var(--ink-4)}.state.ok{color:var(--brand-strong);font-weight:600}
.root{display:inline-block;background:var(--dark);color:#fff;border-radius:10px;padding:8px 14px;font-family:var(--font-display);font-size:17px;margin:8px 0 6px}
.cite{display:inline-block;min-width:17px;height:17px;line-height:17px;text-align:center;border-radius:9px;background:var(--brand-tint);color:var(--brand-strong);font-size:10.5px;font-weight:700;text-decoration:none;margin-left:4px;padding:0 4px;vertical-align:2px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:8px}
.fact{border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--paper)}
.fig{font-family:var(--font-display);font-size:26px;color:var(--brand-strong);line-height:1.15}
.fact p{margin:6px 0;color:var(--ink-2);font-size:14px}
.by{font-size:12px;color:var(--ink-4)}
.flow{list-style:none;padding:0;margin:8px 0 0;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.step{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:3px;font-size:13px;color:var(--ink-3)}
.step b{color:var(--ink);font-size:14px}.step .n{font-size:11px;color:var(--ink-4);font-weight:700}
.step.hot{border-color:var(--amber);background:var(--amber-bg)}.step em{font-style:normal;color:var(--amber-strong);font-weight:600;font-size:12px}
.group{margin-top:12px}.group h3{font-size:14px;margin:0 0 6px;color:var(--brand-strong)}
.group ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.ask{border:1px solid var(--line);border-radius:12px;padding:12px 14px}.ask.done{border-color:var(--brand-soft)}
.ask p{margin:0}.ask .q{font-size:16px;font-weight:500}.ask .why{font-size:13px;color:var(--ink-3);margin-top:4px}.ask .said{font-size:13.5px;color:var(--brand-strong);margin-top:6px;font-weight:600}
.terms{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin-top:8px}
.term{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}.term span{font-size:13px;color:var(--ink-3)}
.sources{list-style:none;padding:0;margin:8px 0 0;font-size:13px;color:var(--ink-3);display:flex;flex-direction:column;gap:6px}
.sn{display:inline-block;width:22px;color:var(--brand-strong);font-weight:700}.stag{font-size:11px;border:1px solid var(--line);border-radius:6px;padding:0 5px;margin:0 4px}
.fresh{animation:fresh 2.4s ease-out}@keyframes fresh{from{box-shadow:0 0 0 4px var(--brand-soft)}to{box-shadow:var(--shadow-float)}}
@media (max-width:720px){.row{grid-template-columns:1fr;gap:6px}.card{padding:18px}}
</style></head><body><div class="wrap">
<div class="top"><div><div class="eyebrow">Discovery brief</div><h1>${esc(r.title || "Understanding your world")}</h1></div>${client ? `<span class="client">${esc(client)}</span>` : ""}</div>
${r.summary ? `<p class="lede">${esc(r.summary)}</p>` : ""}
<div class="status">${status}${checks}</div>
${section("Our early thinking", "Where we think the value is", "Working hypotheses; each one is tested in our conversation.", branches ? `${tree.problem ? `<div class="root">${esc(tree.problem)}</div>` : ""}${branches}` : "")}
${section("Stated up front", "What we're assuming", "So you can correct us early.", assumptions)}
${section("Published evidence", "What the research says", "Figures as published; each links to its source.", facts ? `<div class="facts">${facts}</div>` : "")}
${section("Today", "How the work runs now", "The industry's own steps, and where they tend to break.", flow ? `<ol class="flow">${flow}</ol>` : "")}
${section("Our conversation", "Questions we're exploring", "Grouped by the hypothesis each one tests.", groups)}
${section("Shared language", "Terms we'll use", "", terms ? `<div class="terms">${terms}</div>` : "")}
${section("Boundaries", "Rules that shape the design", "", regs)}
${section("References", "Sources", "", sources ? `<ol class="sources">${sources}</ol>` : "")}
</div>
<script>
(function () {
  let last = document.querySelector(".wrap").innerHTML;
  setInterval(async () => {
    try {
      const html = await (await fetch(location.pathname, { cache: "no-store" })).text();
      const next = new DOMParser().parseFromString(html, "text/html").querySelector(".wrap");
      if (!next || next.innerHTML === last) return;
      const seen = new Set([...document.querySelectorAll(".row,.ask,.fact")].map((e) => e.textContent));
      const y = window.scrollY; document.querySelector(".wrap").innerHTML = next.innerHTML; last = next.innerHTML; window.scrollTo(0, y);
      document.querySelectorAll(".row,.ask,.fact").forEach((e) => { if (!seen.has(e.textContent)) e.classList.add("fresh"); });
    } catch (e) {}
  }, 4000);
})();
</script></body></html>
`;
}

// Merge out/research/*.json into the research part of r.json, keeping any tree, title and summary already written.
function mergeResearch(strands, prev) {
  const r = { ...(prev || {}) };
  for (const k of ["facts", "process", "regulation", "terms", "hypotheses", "sources"]) {
    const seen = new Set(); r[k] = [];
    for (const s of strands) for (const x of A(s[k])) { const id = k === "terms" ? String(x.term || "").toLowerCase() : k === "sources" ? x.url || x.key : JSON.stringify(x); if (id && !seen.has(id)) { seen.add(id); r[k].push(x); } }
  }
  r.notes = strands.filter((s) => s.note).map((s) => `${s.strand}: ${s.note}`);
  r.strands = strands.filter((s) => s.done && !s.thin).map((s) => s.strand);
  r.thin = strands.filter((s) => s.done && s.thin).map((s) => s.strand);
  return r;
}

module.exports = { renderDiscovery, mergeResearch };
