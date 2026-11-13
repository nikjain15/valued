// Our approach: out/proto/approach.html, served at localhost:4317/approach.
// The product lead reads this out loud; the client may see it too, so every word is client-friendly and soft:
// options and early thinking, never assertions. Rendered from out/gates/approach.json (one card per lifecycle
// stage, written by the conductor after each phase). The page refreshes itself as each card is written.
const A = (x) => (Array.isArray(x) ? x : []);
const esc = (s) => String(s ?? "").replace(/—/g, ", ").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const bold = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

const STAGES = [
  ["discover", "Discover", "Product discovery"],
  ["frame", "Frame", "Hypotheses, research"],
  ["shape", "Shape the solution", "Where AI fits"],
  ["prove", "Prove it", "Quality and evals"],
  ["launch", "Launch and run", "Lifecycle, feedback"],
  ["align", "Align", "Ownership, stakeholders"],
];

function renderApproach(ap, cards, title, client, r) {
  ap = ap || {}; r = r || {};
  const srcs = A(r.sources); const srcN = Object.fromEntries(srcs.map((x, i) => [x.key, i + 1]));
  const factOf = Object.fromEntries(A(r.facts).map((f) => [f.key, f])); const cited = new Set();
  const citeF = (k) => { const f = factOf[k]; const sk = f ? f.source : k; if (!srcN[sk]) return ""; cited.add(sk); return `<a class="cite" href="/research#src-${esc(sk)}">${srcN[sk]}</a>`; };
  const byStage = Object.fromEntries(A(ap.stages).map((s) => [s.stage, s]));
  const nowKey = ap.current || [...STAGES].reverse().find(([k]) => byStage[k])?.[0] || "discover";
  const nowIdx = STAGES.findIndex(([k]) => k === nowKey);
  const stepper = STAGES.map(([k, name, sub], i) => `<div class="st${i < nowIdx ? " done" : i === nowIdx ? " now" : ""}"><div class="dot">${i < nowIdx ? "&#10003;" : i + 1}</div><b>${name}</b>${sub}</div>`).join("");
  const c = byStage[nowKey];
  const reasons = c ? A(c.reasons).slice(0, 3).map((r) => `<li>${bold(r)}</li>`).join("") : "";
  const card = c ? `<div class="card">
<div class="k">${esc(STAGES[nowIdx][1])}</div>
<h2>${bold(c.headline)}</h2>
${c.heard ? `<div class="row"><span class="chip c1">What we heard</span><p>${bold(c.heard)}</p></div>` : ""}
${c.breaks ? `<div class="row"><span class="chip c3">Where it breaks</span><p>${bold(c.breaks)}</p></div>` : ""}
${A(c.evidence).slice(0, 2).map((e) => `<div class="row"><span class="chip c1">The research says</span><p>${bold(e.text)}${citeF(e.fact)}</p></div>`).join("")}
${nowKey === "discover" && A(r.assumptions).length ? `<div class="row why"><span class="chip c0">We're assuming</span><ul class="as">${A(r.assumptions).slice(0, 3).map((a) => `<li><span class="st2 ${a.status === "confirmed" ? "ok" : a.status === "challenged" ? "chk" : ""}">${a.status === "confirmed" ? "Confirmed" : a.status === "challenged" ? "Worth a closer look" : "To discuss"}</span>${bold(a.short || a.text)}</li>`).join("")}</ul></div>` : ""}
${c.rule ? `<div class="row"><span class="chip c1">Rules to respect</span><p>${bold(c.rule)}</p></div>` : ""}
${c.option ? `<div class="row"><span class="chip c2">One way to start</span><p>${bold(c.option)}</p></div>` : ""}
${reasons ? `<div class="row why"><span class="chip c2">Why it might work</span><ol>${reasons}</ol></div>` : ""}
${c.tradeoff ? `<div class="row"><span class="chip c3">What we'd give up</span><p>${bold(c.tradeoff)}</p></div>` : ""}
</div>
${c.checkIn ? `<div class="ask"><div class="q">?</div><div><span class="l">Check in</span><p>"${esc(c.checkIn)}"</p></div></div>` : ""}` :
    `<div class="card"><div class="k">Getting started</div><h2>We'll shape this together as we go</h2><p class="muted">Each stage fills in here as we learn more about your world.</p></div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Our approach</title><link rel="stylesheet" href="/ff.css">
<style>
body{background:var(--paper);color:var(--ink);font-family:var(--font-sans);margin:0}
.wrap{max-width:940px;margin:0 auto;padding:32px 20px 48px}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--brand-strong);font-weight:700}
h1{font-family:var(--font-display);font-size:26px;margin:4px 0 0}
.client{font-size:13px;color:var(--ink-3);background:var(--white);border:1px solid var(--line);border-radius:999px;padding:5px 12px}
.stepper{display:flex;align-items:flex-start;margin:26px 0 22px;position:relative}
.stepper:before{content:"";position:absolute;left:18px;right:18px;top:15px;height:2px;background:var(--line)}
.st{flex:1;text-align:center;position:relative;font-size:12px;color:var(--ink-4)}
.dot{width:32px;height:32px;border-radius:16px;margin:0 auto 8px;display:grid;place-items:center;font-weight:700;font-size:13px;background:var(--paper);border:2px solid var(--line);color:var(--ink-4);position:relative}
.st.done .dot{background:var(--brand-soft);border-color:var(--brand-soft);color:var(--brand-strong)}
.st.now .dot{background:var(--brand);border-color:var(--brand);color:#fff;box-shadow:0 0 0 5px var(--brand-tint)}
.st b{display:block;font-size:13px;color:var(--ink-3)}
.st.now b{color:var(--brand-strong)}
.live{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 14px}
.live .l{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-4);font-weight:700;margin-right:4px}
.pill{background:var(--white);border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-size:14px;color:var(--ink-2)}
.card{background:var(--white);border:1px solid var(--line);border-radius:20px;padding:26px 30px;box-shadow:var(--shadow-float)}
.card .k{font-size:12px;color:var(--brand-strong);font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.card h2{font-family:var(--font-display);font-size:28px;margin:6px 0 16px;letter-spacing:-.01em;line-height:1.2}
.muted{color:var(--ink-3);font-size:18px}
.row{display:grid;grid-template-columns:170px 1fr;gap:18px;align-items:center;padding:13px 0;border-top:1px solid var(--line-2)}
.row:first-of-type{border-top:0}
.chip{justify-self:start;font-size:13px;font-weight:700;border-radius:10px;padding:6px 12px}
.c1{background:var(--blue-bg);color:var(--blue)}.c2{background:var(--brand-tint);color:var(--brand-strong)}.c3{background:var(--amber-bg);color:var(--amber-strong)}
.row p{margin:0;font-size:21px;line-height:1.35}
.row b{font-weight:650}
.row ol{margin:0;padding-left:26px;font-size:20px;line-height:1.45}
.row.why{align-items:start}.row.why .chip{margin-top:4px}
.ask{margin-top:16px;display:flex;gap:14px;align-items:center;background:var(--dark);color:#fff;border-radius:16px;padding:16px 22px}
.ask .q{flex:none;width:30px;height:30px;border-radius:15px;background:var(--brand);display:grid;place-items:center;font-weight:700}
.ask .l{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9fd3b0;font-weight:700;display:block}
.ask p{margin:2px 0 0;font-size:19px}
.c0{background:var(--paper);color:var(--ink-3)}
.as{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:19px}
.st2{display:inline-block;font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;margin-right:10px;background:var(--paper);color:var(--ink-3);vertical-align:2px}
.st2.ok{background:var(--brand-tint);color:var(--brand-strong)}.st2.chk{background:var(--amber-bg);color:var(--amber-strong)}
.cite{display:inline-block;min-width:18px;height:18px;line-height:18px;text-align:center;border-radius:9px;background:var(--brand-tint);color:var(--brand-strong);font-size:11px;font-weight:700;margin-left:5px;vertical-align:3px;text-decoration:none}
.src{font-size:12px;color:var(--ink-4);margin:12px 4px 0}.src a{color:var(--brand-strong)}
.fresh{animation:fresh 2.4s ease-out}@keyframes fresh{from{box-shadow:0 0 0 4px var(--brand-soft)}to{box-shadow:var(--shadow-float)}}
@media (max-width:720px){.stepper{flex-wrap:wrap;row-gap:12px}.stepper:before{display:none}.st{flex:0 0 33%}.row{grid-template-columns:1fr;gap:6px}.row p,.row ol{font-size:18px}.card h2{font-size:23px}}
</style></head><body><div class="wrap">
<div class="top"><div><div class="eyebrow">Our approach</div><h1>${esc(title || "Our approach")}</h1></div>${client ? `<span class="client">${esc(client)}</span>` : ""}</div>
<div class="stepper">${stepper}</div>
${card}
${cited.size ? `<p class="src">Sources: ${[...cited].map((k) => { const x = srcs.find((y) => y.key === k); return `${srcN[k]}. ${esc(x.publisher)}, ${esc(x.title)}, ${esc(x.year)}`; }).join(" · ")} · <a href="/research">Full research</a></p>` : ""}
</div>
<script>
(function () {
  let last = document.querySelector(".wrap").innerHTML;
  setInterval(async () => {
    try {
      const html = await (await fetch(location.pathname, { cache: "no-store" })).text();
      const next = new DOMParser().parseFromString(html, "text/html").querySelector(".wrap");
      if (!next || next.innerHTML === last) return;
      const y = window.scrollY; document.querySelector(".wrap").innerHTML = next.innerHTML; last = next.innerHTML; window.scrollTo(0, y);
      const c = document.querySelector(".card"); if (c) c.classList.add("fresh");
    } catch (e) {}
  }, 3000);
})();
</script></body></html>
`;
}

// Soft, consultant language: these phrasings read as assertive on a shared screen.
const ASSERTIVE = /\b(we will|you must|you need to|must|obviously|clearly|definitely|guarantee[ds]?|the only way|the right answer|always)\b/i;
function approachIssues(ap) {
  const out = [];
  for (const s of A(ap?.stages)) {
    const texts = [s.headline, s.heard, s.option, s.tradeoff, s.checkIn, s.breaks, s.rule, ...A(s.reasons), ...A(s.evidence).map((e) => e.text)].filter(Boolean);
    for (const t of texts) {
      if (ASSERTIVE.test(t)) out.push(`approach ${s.stage}: assertive wording "${String(t).match(ASSERTIVE)[0]}" in "${t}"; soften it (an option, our early thinking)`);
      if (t !== s.headline && t !== s.checkIn && String(t).replace(/\*\*/g, "").split(/\s+/).length > 14) out.push(`approach ${s.stage}: "${t}" is over 14 words; make it a bullet you can read in one breath`);
    }
    if (A(s.reasons).length && A(s.reasons).length !== 3) out.push(`approach ${s.stage}: give exactly three reasons`);
    if (s.checkIn && !/\?$/.test(String(s.checkIn).trim())) out.push(`approach ${s.stage}: the check-in should be an open question`);
  }
  return out;
}

module.exports = { renderApproach, approachIssues, STAGES };
