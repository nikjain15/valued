// Discovery brief: out/proto/discovery.html, served at localhost:4317/discovery.html.
// Rendered from out/gates/r.json (the merged research plus the hypothesis tree) and out/cards.json.
// Client-facing: everything here is read by the client on a shared screen.
const A = (x) => (Array.isArray(x) ? x : []);
const esc = (s) => String(s ?? "").replace(/—/g, ", ").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function renderDiscovery(r, cards, client) {
  const src = Object.fromEntries(A(r.sources).map((s, i) => [s.key, { ...s, n: i + 1 }]));
  const cite = (k) => { const s = src[k]; return s ? `<a class="cite" href="#src-${esc(k)}" title="${esc(s.publisher)}, ${esc(s.year)}">${s.n}</a>` : ""; };
  const cites = (ks) => A(ks).map(cite).join("");
  const byId = Object.fromEntries(A(cards).map((c) => [c.id, c]));
  const answered = A(cards).filter((c) => c.decision && Number(c.round) === 1).length;

  const facts = A(r.facts).slice(0, 6).map((f) => `<div class="fact"><div class="fig">${esc(f.figure)}</div><p>${esc(f.fact)}</p><div class="by">${src[f.source] ? `${esc(src[f.source].publisher)}, ${esc(src[f.source].year)}` : ""} ${cite(f.source)}</div></div>`).join("");

  const flow = A(r.process).slice(0, 7).map((p, i) => `<li class="step${p.breaks ? " hot" : ""}"><span class="n">${i + 1}</span><b>${esc(p.step)}</b><span class="plain">${esc(p.plain)}</span>${p.breaks ? `<span class="breaks">Breaks here: ${esc(p.breaks)}</span>` : ""}</li>`).join("");

  const tree = r.tree || {};
  const branches = A(tree.branches).slice(0, 4).map((b) => {
    const qs = A(b.questions).map((id) => { const c = byId[id]; return `<span class="q${c && c.decision ? " done" : ""}" title="${esc(c ? c.question : id)}">${esc(id)}</span>`; }).join("");
    const hyps = A(b.hypotheses).slice(0, 3).map((h) => `<li>${esc(h.text)} ${cites(h.facts)}</li>`).join("");
    return `<div class="branch"><div class="driver"><span class="tag">${esc(b.id)}</span>${esc(b.driver)}</div><ul class="hyps">${hyps}</ul><div class="qs">${qs}</div></div>`;
  }).join("");

  const terms = A(r.terms).slice(0, 10).map((t) => `<div class="term"><b>${esc(t.term)}</b><span>${esc(t.plain)}</span></div>`).join("");

  const groups = A(tree.branches).slice(0, 4).map((b) => {
    const rows = A(b.questions).map((id) => byId[id]).filter(Boolean).map((c) => `<li class="ask${c.decision ? " done" : ""}"><div class="qline"><span class="qid">${esc(c.id)}</span>${esc(c.question)}</div>${c.why ? `<div class="why"><b>Why we ask.</b> ${esc(c.why)}</div>` : ""}${c.decision ? `<div class="said"><b>You said.</b> ${esc(c.decision)}</div>` : ""}</li>`).join("");
    return rows ? `<div class="group"><h4><span class="tag">${esc(b.id)}</span>${esc(b.driver)}</h4><ul>${rows}</ul></div>` : "";
  }).join("");

  const regs = A(r.regulation).slice(0, 6).map((g) => `<tr><td><b>${esc(g.rule)}</b></td><td>${esc(g.plain)}</td><td>${cite(g.source)}</td></tr>`).join("");
  const sources = A(r.sources).map((s, i) => `<li id="src-${esc(s.key)}"><span class="sn">${i + 1}</span>${esc(s.publisher)}, <i>${esc(s.title)}</i>, ${esc(s.year)}. <span class="stag">${s.tag === "P" ? "Primary" : "Secondary"}</span> <a href="${esc(s.url)}" target="_blank" rel="noopener">source</a></li>`).join("");
  const nP = A(r.sources).filter((s) => s.tag === "P").length;
  const STR = [["process", "How the work runs"], ["regulation", "Rules and risk"], ["ai", "Where AI has worked"]];
  const landed = new Set(A(r.strands));
  const status = STR.map(([k, l]) => `<span class="strand${landed.has(k) ? " done" : ""}">${landed.has(k) ? "&#10003;" : "&#9679;"} ${l}${landed.has(k) ? "" : ": researching"}</span>`).join("");
  const assumptions = A(r.assumptions).slice(0, 8).map((a) => { const c = a.card && byId[a.card]; const st = c && c.decision ? (a.confirmedIf && new RegExp(a.confirmedIf, "i").test(c.decision) ? "ok" : "check") : "open"; return `<li class="as ${st}"><span class="dot"></span><div><b>${esc(a.text)}</b><span>${a.facts && A(a.facts).length ? `Based on ${cites(a.facts)}` : "Our assumption, from experience"}${c ? ` · tested by ${esc(c.id)}${c.decision ? `: you said "${esc(c.decision)}"` : ""}` : ""}</span></div></li>`; }).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Discovery brief</title><link rel="stylesheet" href="/ff.css">
<style>
body{background:var(--paper);color:var(--ink);font-family:var(--font-sans);margin:0}
.wrap{max-width:1120px;margin:0 auto;padding:32px 20px 64px}
.eyebrow{font-size:var(--fs-eyebrow);letter-spacing:var(--ls-eyebrow);text-transform:uppercase;color:var(--brand-strong);font-weight:600}
h1{font-family:var(--font-display);font-size:var(--fs-h1);letter-spacing:var(--ls-tight);margin:6px 0 8px;line-height:1.1}
h2{font-family:var(--font-display);font-size:var(--fs-h2);margin:40px 0 4px}
h2+.sub{color:var(--ink-3);margin:0 0 16px}
.lede{color:var(--ink-2);font-size:17px;max-width:760px}
.meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.pill{background:var(--white);border:1px solid var(--line);border-radius:var(--r-pill);padding:4px 12px;font-size:var(--fs-label);color:var(--ink-2)}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.fact{background:var(--white);border:1px solid var(--line);border-radius:var(--r-card);padding:16px;box-shadow:var(--shadow-card)}
.fig{font-family:var(--font-display);font-size:28px;color:var(--brand-strong);line-height:1.15}
.fact p{margin:8px 0;color:var(--ink-2);font-size:14px}
.by{font-size:var(--fs-micro);color:var(--ink-4)}
.cite{display:inline-block;min-width:18px;height:18px;line-height:18px;text-align:center;border-radius:9px;background:var(--brand-tint);color:var(--brand-strong);font-size:11px;font-weight:600;text-decoration:none;margin-left:3px;padding:0 4px}
.flow{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;counter-reset:s}
.step{background:var(--white);border:1px solid var(--line);border-radius:var(--r-card);padding:12px;position:relative;display:flex;flex-direction:column;gap:4px}
.step .n{font-size:11px;color:var(--ink-4);font-weight:600}
.step .plain{font-size:13px;color:var(--ink-3)}
.step.hot{border-color:var(--amber);background:var(--amber-bg)}
.breaks{font-size:12px;color:var(--amber-strong);font-weight:600}
.tree{display:grid;grid-template-columns:minmax(180px,240px) 1fr;gap:16px;align-items:center}
.root{background:var(--dark);color:var(--white);border-radius:var(--r-card-emph);padding:18px;font-family:var(--font-display);font-size:19px;line-height:1.3}
.root small{display:block;font-family:var(--font-sans);font-size:11px;letter-spacing:var(--ls-eyebrow);text-transform:uppercase;opacity:.7;margin-bottom:6px}
.branches{display:flex;flex-direction:column;gap:10px;border-left:2px solid var(--brand-soft);padding-left:16px}
.branch{display:grid;grid-template-columns:minmax(150px,220px) 1fr auto;gap:12px;align-items:center;background:var(--white);border:1px solid var(--line);border-radius:var(--r-card);padding:12px;position:relative}
.branch:before{content:"";position:absolute;left:-18px;top:50%;width:16px;border-top:2px solid var(--brand-soft)}
.driver{font-weight:600}
.tag{display:inline-block;background:var(--brand);color:var(--white);border-radius:6px;font-size:11px;padding:1px 6px;margin-right:6px;font-weight:600}
.hyps{margin:0;padding-left:18px;color:var(--ink-2);font-size:14px}
.qs{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.q{border:1px solid var(--line);border-radius:var(--r-pill);padding:2px 8px;font-size:11px;color:var(--ink-3);background:var(--paper)}
.q.done{background:var(--brand-tint);border-color:var(--brand-soft);color:var(--brand-strong)}
.terms{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px}
.term{background:var(--white);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
.term span{font-size:13px;color:var(--ink-3)}
.group{margin-bottom:18px}
.group h4{margin:0 0 8px;font-size:15px}
.group ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.ask{background:var(--white);border:1px solid var(--line);border-radius:var(--r-card);padding:12px 14px}
.ask.done{border-color:var(--brand-soft)}
.qline{font-weight:500}
.qid{font-family:var(--font-mono);font-size:11px;color:var(--ink-4);margin-right:8px}
.why{font-size:13px;color:var(--ink-3);margin-top:4px}
.said{font-size:13px;color:var(--brand-strong);margin-top:6px}
table{width:100%;border-collapse:collapse;background:var(--white);border:1px solid var(--line);border-radius:var(--r-card);overflow:hidden;font-size:14px}
td{padding:10px 12px;border-top:1px solid var(--line-2);vertical-align:top}
tr:first-child td{border-top:0}
.sources{list-style:none;padding:0;font-size:13px;color:var(--ink-3);display:flex;flex-direction:column;gap:6px}
.sn{display:inline-block;width:22px;color:var(--brand-strong);font-weight:600}
.stag{font-size:11px;border:1px solid var(--line);border-radius:6px;padding:0 5px}
.strands{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.strand{font-size:12px;border-radius:var(--r-pill);padding:3px 10px;background:var(--amber-bg);color:var(--amber-strong);border:1px solid #f0dcbc}
.strand.done{background:var(--brand-tint);color:var(--brand-strong);border-color:var(--brand-soft)}
.assume{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:8px}
.as{display:flex;gap:10px;background:var(--white);border:1px solid var(--line);border-radius:var(--r-card);padding:12px}
.as b{display:block;font-weight:500}
.as span{font-size:12px;color:var(--ink-3)}
.as .dot{flex:none;width:10px;height:10px;border-radius:5px;margin-top:5px;background:var(--ink-4)}
.as.ok .dot{background:var(--brand)}.as.check .dot{background:var(--amber)}
.fresh{animation:fresh 2.4s ease-out}
@keyframes fresh{from{box-shadow:0 0 0 3px var(--brand-soft)}to{box-shadow:none}}
@media (max-width:760px){.tree{grid-template-columns:1fr}.branches{border-left:0;padding-left:0}.branch{grid-template-columns:1fr}.branch:before{display:none}.qs{justify-content:flex-start}}
</style></head><body><div class="wrap">
<div class="eyebrow">Discovery brief${client ? ` · ${esc(client)}` : ""}</div>
<h1>${esc(r.title || "What we already know about your world")}</h1>
<p class="lede">${esc(r.summary || "")}</p>
<div class="meta"><span class="pill">${A(r.sources).length} sources, ${nP} primary</span><span class="pill">${A(r.facts).length} cited facts</span><span class="pill">${answered} of ${A(cards).filter((c) => Number(c.round) === 1).length} questions answered</span></div>
<div class="strands">${status}</div>
${assumptions ? `<h2>What we are assuming</h2><p class="sub">Stated up front so you can correct us. Each one is tested by a question.</p><ul class="assume">${assumptions}</ul>` : ""}
${facts ? `<h2>What the evidence says</h2><p class="sub">Published figures only; every number links to its source.</p><div class="facts">${facts}</div>` : ""}
${flow ? `<h2>How the work runs today</h2><p class="sub">The industry's own steps, and where they typically break.</p><ol class="flow">${flow}</ol>` : ""}
${branches ? `<h2>Where we think the value is</h2><p class="sub">Our working hypotheses. Each question below tests one branch.</p><div class="tree"><div class="root"><small>The problem</small>${esc(tree.problem || "")}</div><div class="branches">${branches}</div></div>` : ""}
${groups ? `<h2>Questions for you</h2><p class="sub">Grouped by the hypothesis each one tests.</p>${groups}` : ""}
${terms ? `<h2>Terms we'll use</h2><p class="sub">Your industry's words, and what each means in one line.</p><div class="terms">${terms}</div>` : ""}
${regs ? `<h2>Rules that shape the design</h2><table>${regs}</table>` : ""}
${sources ? `<h2>Sources</h2><ol class="sources">${sources}</ol>` : ""}
</div>
<script>
// Live: re-read this page every 4s and swap the content in place when research or answers land.
(function () {
  let last = document.querySelector(".wrap").innerHTML;
  setInterval(async () => {
    try {
      const html = await (await fetch(location.pathname, { cache: "no-store" })).text();
      const doc = new DOMParser().parseFromString(html, "text/html"); const next = doc.querySelector(".wrap");
      if (!next || next.innerHTML === last) return;
      const seen = new Set([...document.querySelectorAll(".fact,.ask,.as,.branch")].map((e) => e.textContent));
      const y = window.scrollY; document.querySelector(".wrap").innerHTML = next.innerHTML; last = next.innerHTML; window.scrollTo(0, y);
      document.querySelectorAll(".fact,.ask,.as,.branch").forEach((e) => { if (!seen.has(e.textContent)) e.classList.add("fresh"); });
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
  r.strands = strands.filter((s) => s.done).map((s) => s.strand);
  return r;
}

module.exports = { renderDiscovery, mergeResearch };
