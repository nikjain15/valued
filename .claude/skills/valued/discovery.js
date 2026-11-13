// Discovery brief: out/proto/discovery.html, served at localhost:4317/discovery.html.
// Rendered from out/gates/r.json (the merged research plus the hypothesis tree) and out/cards.json.
// Client-facing: everything here is read by the client on a shared screen.
const A = (x) => (Array.isArray(x) ? x : []);
const esc = (s) => String(s ?? "").replace(/—/g, ", ").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// The live research page (/research, also /discovery): what the research agents are doing and what they found,
// for the client to watch. Hypotheses, assumptions and questions live on the approach page, not here.
function renderDiscovery(r, cards, client, qc) {
  r = r || {};
  const src = Object.fromEntries(A(r.sources).map((s, i) => [s.key, { ...s, n: i + 1 }]));
  const cite = (k) => { const s = src[k]; return s ? `<a class="cite" href="#src-${esc(k)}" title="${esc(s.publisher)}, ${esc(s.year)}">${s.n}</a>` : ""; };
  const STR = [["process", "How the work runs", "Volumes, cycle times, cost and where the process breaks"], ["regulation", "Rules and risk", "The rules that govern this work and what goes wrong when they are missed"], ["ai", "Where AI has worked", "Documented deployments in this industry, what was measured, what went wrong"]];
  const runs = Object.fromEntries(A(r.runs).map((x) => [x.strand, x]));
  const blocked = A(r.notes).length && !A(r.facts).length;
  const strands = STR.map(([k, name, what]) => {
    const x = runs[k] || {}; const facts = A(r.facts).filter((f) => (f.key || "")[0] === { process: "P", regulation: "R", ai: "A" }[k]);
    const state = x.done ? (x.thin ? ["c3", "Still confirming"] : ["c2", "Done"]) : x.note ? ["c0", "Not reachable"] : ["c1", "Researching"];
    const log = A(x.log).slice(-5).map((l) => `<li>${esc(l.step || l)}</li>`).join("");
    return `<div class="strand"><div class="sh"><b>${name}</b><span class="chip ${state[0]}">${state[1]}</span></div><p class="what">${what}</p><div class="nums"><span><b>${facts.length}</b> findings</span><span><b>${new Set(facts.map((f) => f.source)).size}</b> sources</span></div>${log ? `<ul class="log">${log}</ul>` : ""}</div>`;
  }).join("");
  // Follow-ups: short targeted checks launched when an answer opens a new angle (strand "followup-<n>").
  const fups = A(r.runs).filter((x) => /^followup/.test(x.strand || "")).map((x) => {
    const ff = A(r.facts).filter((f) => (f.followup || "") === x.strand);
    const state = x.done ? (x.thin ? ["c3", "Still confirming"] : ["c2", "Done"]) : x.note ? ["c0", "Not reachable"] : ["c1", "Researching"];
    const log = A(x.log).slice(-4).map((l) => `<li>${esc(l.step || l)}</li>`).join("");
    return `<div class="strand"><div class="sh"><b>${esc(x.topic || "Following your answer")}</b><span class="chip ${state[0]}">${state[1]}</span></div><p class="what">Following your answer${x.because ? `: "${esc(x.because)}"` : ""}</p><div class="nums"><span><b>${ff.length}</b> findings</span></div>${log ? `<ul class="log">${log}</ul>` : ""}</div>`;
  }).join("");
  const facts = A(r.facts).map((f) => `<div class="fact"><div class="fig">${esc(f.figure)}</div><p>${esc(f.fact)}</p><div class="by">${src[f.source] ? `${esc(src[f.source].publisher)}, ${esc(src[f.source].year)} <span class="tag">${src[f.source].tag === "P" ? "Primary" : "Secondary"}</span>` : ""}${cite(f.source)}</div></div>`).join("");
  const flow = A(r.process).slice(0, 7).map((p, i) => `<li class="step${p.breaks ? " hot" : ""}"><span class="n">${i + 1}</span><b>${esc(p.step)}</b><span>${esc(p.plain)}</span>${p.breaks ? `<em>Where it breaks: ${esc(p.breaks)}</em>` : ""}</li>`).join("");
  const regs = A(r.regulation).slice(0, 6).map((g) => `<div class="row"><span class="chip c1">${esc(g.rule)}</span><p>${esc(g.plain)}${cite(g.source)}</p></div>`).join("");
  const terms = A(r.terms).slice(0, 10).map((t) => `<div class="term"><b>${esc(t.term)}</b><span>${esc(t.plain)}</span></div>`).join("");
  const sources = A(r.sources).map((s) => `<li id="src-${esc(s.key)}"><span class="sn">${src[s.key].n}</span>${esc(s.publisher)}, <i>${esc(s.title)}</i>, ${esc(s.year)} <span class="tag">${s.tag === "P" ? "Primary" : "Secondary"}</span> <a href="${esc(s.url)}" target="_blank" rel="noopener">Open</a></li>`).join("");
  const nP = A(r.sources).filter((x) => x.tag === "P").length;
  const section = (k, h, sub, body) => body ? `<section class="card"><div class="k">${k}</div><h2>${h}</h2>${sub ? `<p class="lede2">${sub}</p>` : ""}${body}</section>` : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Research</title><link rel="stylesheet" href="/ff.css">
<style>
body{background:var(--paper);color:var(--ink);font-family:var(--font-sans);margin:0}
.wrap{max-width:940px;margin:0 auto;padding:32px 20px 56px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-strong);font-weight:700}
h1{font-family:var(--font-display);font-size:26px;margin:4px 0 0;line-height:1.2}
.client{font-size:13px;color:var(--ink-3);background:var(--white);border:1px solid var(--line);border-radius:999px;padding:5px 12px}
.lede{color:var(--ink-2);font-size:16px;line-height:1.5;margin:12px 0 18px;max-width:760px}
.totals{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 16px}
.tot{background:var(--white);border:1px solid var(--line);border-radius:14px;padding:12px 16px}.tot b{font-family:var(--font-display);font-size:26px;display:block}.tot span{font-size:13px;color:var(--ink-3)}
.card{background:var(--white);border:1px solid var(--line);border-radius:20px;padding:24px 28px;box-shadow:var(--shadow-float);margin:0 0 16px}
.card .k{font-size:12px;color:var(--brand-strong);font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.card h2{font-family:var(--font-display);font-size:24px;margin:6px 0 4px;letter-spacing:-.01em}
.lede2{color:var(--ink-3);margin:0 0 12px;font-size:14px}
.strands{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.strand{border:1px solid var(--line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:6px}
.sh{display:flex;justify-content:space-between;align-items:center;gap:8px}.sh b{font-size:15px}
.what{margin:0;font-size:13px;color:var(--ink-3)}
.nums{display:flex;gap:14px;font-size:13px;color:var(--ink-3)}.nums b{color:var(--ink);font-size:16px}
.log{list-style:none;margin:4px 0 0;padding:8px 0 0;border-top:1px solid var(--line-2);font-size:12.5px;color:var(--ink-2);display:flex;flex-direction:column;gap:4px}
.log li:before{content:"";display:inline-block;width:6px;height:6px;border-radius:3px;background:var(--brand-soft);margin-right:8px;vertical-align:2px}
.chip{justify-self:start;font-size:12px;font-weight:700;border-radius:10px;padding:4px 10px;white-space:nowrap}
.c0{background:var(--paper);color:var(--ink-3)}.c1{background:var(--blue-bg);color:var(--blue)}.c2{background:var(--brand-tint);color:var(--brand-strong)}.c3{background:var(--amber-bg);color:var(--amber-strong)}
.row{display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:center;padding:12px 0;border-top:1px solid var(--line-2)}.row:first-of-type{border-top:0}
.row p{margin:0;font-size:16px;line-height:1.45}
.cite{display:inline-block;min-width:17px;height:17px;line-height:17px;text-align:center;border-radius:9px;background:var(--brand-tint);color:var(--brand-strong);font-size:10.5px;font-weight:700;text-decoration:none;margin-left:4px;padding:0 4px;vertical-align:2px}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.fact{border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--paper)}
.fig{font-family:var(--font-display);font-size:26px;color:var(--brand-strong);line-height:1.15}
.fact p{margin:6px 0;color:var(--ink-2);font-size:14px}.by{font-size:12px;color:var(--ink-4)}
.tag{font-size:10.5px;border:1px solid var(--line);border-radius:6px;padding:0 5px;margin:0 2px;color:var(--ink-3)}
.flow{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}
.step{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:3px;font-size:13px;color:var(--ink-3)}
.step b{color:var(--ink);font-size:14px}.step .n{font-size:11px;color:var(--ink-4);font-weight:700}
.step.hot{border-color:var(--amber);background:var(--amber-bg)}.step em{font-style:normal;color:var(--amber-strong);font-weight:600;font-size:12px}
.terms{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}
.term{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}.term span{font-size:13px;color:var(--ink-3)}
.sources{list-style:none;padding:0;margin:0;font-size:13px;color:var(--ink-3);display:flex;flex-direction:column;gap:6px}
.sn{display:inline-block;width:22px;color:var(--brand-strong);font-weight:700}
.note{font-size:14px;color:var(--ink-3);background:var(--white);border:1px solid var(--line);border-radius:14px;padding:12px 16px;margin:0 0 16px}
.fresh{animation:fresh 2.4s ease-out}@keyframes fresh{from{box-shadow:0 0 0 4px var(--brand-soft)}to{box-shadow:none}}
@media (max-width:720px){.strands,.totals{grid-template-columns:1fr}.row{grid-template-columns:1fr;gap:6px}.card{padding:18px}}
</style></head><body><div class="wrap">
<div class="top"><div><div class="eyebrow">Research, live</div><h1>What the published evidence says</h1></div>${client ? `<span class="client">${esc(client)}</span>` : ""}</div>
<p class="lede">While we talk, three research agents read published sources on your industry: regulators, standards bodies, filings, peer-reviewed work and named studies. Every figure links to the source it came from; nothing here is estimated.</p>
${blocked ? `<p class="note">Published sources are not reachable from this machine right now, so this page stays empty; everything in our approach comes from what you told us.</p>` : ""}
<div class="totals"><div class="tot"><b>${A(r.facts).length}</b><span>findings</span></div><div class="tot"><b>${A(r.sources).length}</b><span>sources</span></div><div class="tot"><b>${nP}</b><span>primary sources</span></div></div>
${section("Live", "Three research streams", "Running in the background; they never hold up our conversation.", `<div class="strands">${strands}</div>`)}
${section("Following your answers", "Research that follows the conversation", "Short checks we started when an answer opened a new angle.", fups ? `<div class="strands">${fups}</div>` : "")}
${section("Findings", "What we found", "Figures as published, with what each means for you.", facts ? `<div class="facts">${facts}</div>` : "")}
${section("Today", "How the work typically runs", "The industry's own steps, and where they tend to break.", flow ? `<ol class="flow">${flow}</ol>` : "")}
${section("Boundaries", "Rules that shape the design", "", regs)}
${section("Shared language", "Terms we'll use", "", terms ? `<div class="terms">${terms}</div>` : "")}
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
      const seen = new Set([...document.querySelectorAll(".fact,.row,.log li")].map((e) => e.textContent));
      const y = window.scrollY; document.querySelector(".wrap").innerHTML = next.innerHTML; last = next.innerHTML; window.scrollTo(0, y);
      document.querySelectorAll(".fact,.row,.log li").forEach((e) => { if (!seen.has(e.textContent)) e.classList.add("fresh"); });
    } catch (e) {}
  }, 3000);
})();
</script></body></html>
`;
}

// Merge out/research/*.json into the research part of r.json, keeping any tree, title and summary already written.
function mergeResearch(strands, prev) {
  const r = { ...(prev || {}) };
  for (const k of ["facts", "process", "regulation", "terms", "hypotheses", "sources"]) {
    const seen = new Set(); const kept = k === "terms" ? A(prev && prev.terms) : []; r[k] = [];
    for (const x of kept) { const id = String(x.term || "").toLowerCase(); if (id && !seen.has(id)) { seen.add(id); r[k].push(x); } }
    for (const s of strands) for (const x of A(s[k])) { const id = k === "terms" ? String(x.term || "").toLowerCase() : k === "sources" ? x.url || x.key : JSON.stringify(x); if (id && !seen.has(id)) { seen.add(id); r[k].push(x); } }
  }
  r.notes = strands.filter((s) => s.note).map((s) => `${s.strand}: ${s.note}`);
  r.strands = strands.filter((s) => s.done && !s.thin).map((s) => s.strand);
  r.runs = strands.map((s) => ({ strand: s.strand, done: !!s.done, thin: !!s.thin, note: s.note || "", log: A(s.log), topic: s.topic || "", because: s.because || "" }));
  for (const st of strands) if (/^followup/.test(st.strand || "")) for (const f of A(st.facts)) { const m = r.facts.find((x) => x.key === f.key); if (m) m.followup = st.strand; }
  r.thin = strands.filter((s) => s.done && s.thin).map((s) => s.strand);
  return r;
}

module.exports = { renderDiscovery, mergeResearch };
