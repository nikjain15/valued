/* How it works: one page per architecture step; the sub-steps are what the lead person does. Each sub-step plays as it would
   happen: a person adds something or something happens, the AI reads and proposes (results appear one after another), a person
   decides, and the result. Scenes live in how-scenes.js. */
const CH_NAME = { Voice: "Phone bot", "Member chat": "Member chat", "Advocate desk": "Call with Dana", Outbound: "Text", Website: "Website" };
const PD = Object.fromEntries(PD_WORDINGS.map(w => [w.label, w.text]));
const docOf = id => DOCS.find(d => d.id === id);
const STEPS = ACT.steps.map(([k, label], i) => Object.assign({ key: k, label, n: i + 1 }, ACT.channels[k]));
let cur = Math.max(0, STEPS.findIndex(s => s.n === +QS.get("s"))), playing = false, run = 0;

function docView(d, mark) {
  return `<div class="docv"><p class="small" style="margin:0 0 6px"><b>${esc(d.title)}</b> · ${esc(d.tool || "")} · ${esc(d.short)}</p>${d.sections.map(s => `<h5>${esc(s.h)}</h5>${s.blocks.map(b => typeof b === "string" ? `<p class="small">${esc(b)}</p>` : `<p class="${(mark && mark(b)) || ""}">${esc(b.t || (b.table || []).map(r => r.join(" ")).join("; "))}</p>`).join("")}`).join("")}</div>`;
}
const unitCard = (title, meta, cls, locked) => `<div class="unitc ${cls || ""}"><span class="ut">${esc(title)}</span><span class="um"> · ${esc(meta)}</span>${locked ? `<span class="lk">${esc(locked)}</span>` : ""}</div>`;
const screen = (title, rows, foot) => `<div class="docv"><p class="small" style="margin:0 0 6px"><b>${esc(title)}</b></p>${rows.map(r => `<p>${r}</p>`).join("")}${foot ? `<p class="small" style="margin-top:6px">${foot}</p>` : ""}</div>`;

const FILEI = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>`;
const BELL = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>`;
const person = k => PEOPLE[k] || [k, "", k.slice(0, 2).toUpperCase(), "p"];
const SHORT = { Calloway: "Dr. Calloway", Backup: "The backup reviewer", Translator: "A qualified translator", System: "Lakewell Knowledge" };
const first = k => SHORT[k] || person(k)[0].split(" ")[0];

/* The beats of one scene, each with the line the narrator says */
function beatsOf(s) {
  const sc = (SCENES[ACT.howIndex + ":" + s.key] || (() => ({})))(), st = sc.start || ["System", "event", s.label, ""], B = [];
  const verb = { upload: "adds a document", event: "", ask: "asks" }[st[1]];
  B.push({ k: "start", who: st[0], say: st[1] === "event" ? (st[0] === "System" ? st[2] : `${first(st[0])}: ${st[2]}`) : `${first(st[0])} ${verb}`, sc, st, label: st[1] === "upload" ? "Adds" : st[1] === "ask" ? "Asks" : "Trigger" });
  const sys = /system checks|clock|reminder reads|diff|Drift|Only the approved|linked Spanish/.test(sc.ai || "");
  B.push({ k: "ai", who: sys ? "System" : "AI", say: sc.ai || "The AI proposes", sc, label: sys ? "Rules check" : "AI works" });
  (sc.decide || []).forEach(d => B.push({ k: "decide", who: d[0], say: `${first(d[0])} decides`, d, label: first(d[0]).replace(/^The b/, "B").replace(/^A q/, "Q") + " decides" }));
  B.push({ k: "end", who: "", say: "The result", label: "Result" });
  return B;
}
function feedItem(who, say, body, cls) {
  const p = person(who);
  return `<div class="fe ${p[3]} ${cls || ""}"><span class="av">${p[3] === "ai" ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>` : esc(p[2])}</span>
    <div class="fb"><p class="fh"><b>${esc(p[0])}</b>${p[1] ? ` · ${esc(p[1])}` : ""}</p><p class="fs">${esc(say)}</p>${body ? `<div class="fp">${body}</div>` : ""}</div></div>`;
}
const SLOW = 1.4, wait = ms => new Promise(r => setTimeout(r, ms * SLOW));
const REVEAL = ".unitc, .docv > p, .docv > h5, .results > div, .cmp > div, .match, .chips2 span, .phone .sms";

function shell(s, B) {
  const nextS = STEPS[cur + 1], nextHow = HOW4[ACT.howIndex + 1], f = s.fix4 || {};
  document.getElementById("stage").innerHTML = `
    <p class="eyebrow">${esc(ACT.lead)}</p>
    <h2 class="hl">${esc(f.line || s.label)}</h2>
    <p class="was1"><b>Today:</b> ${esc((s.issue || [])[0] || "")}</p>
    <div class="beats">${B.map((b, i) => `<span data-b="${i}">${esc(b.label)}</span>`).join("")}</div>
    <p class="narr" id="narr">&nbsp;</p>
    <div class="appwin"><div class="appbar"><i></i><i></i><i></i><span>Lakewell Knowledge · ${esc(HOW4[ACT.howIndex][0])}</span><span style="flex:1"></span><button class="btn sm" id="replay">↻ Replay</button><button class="btn sm" id="skip">Skip to result</button></div><div class="feed" id="feed"></div></div>
    <div id="endc" class="endc" hidden>
      <div class="now"><b>Result</b>${esc(f.line || "")}<span class="forj">For June: ${esc((s.fix || [])[1] || "")} <a href="day.html?mode=new&ch=${encodeURIComponent(s.key)}">See it in the ${esc(CH_NAME[s.key].toLowerCase())} →</a></span></div>
      <div class="meta3"><span><b>Owner</b> ${esc(f.who || "")}</span><span><b>Control</b> ${esc(f.kind || "")}</span><span><b>Proof</b> ${esc(f.proof || "")}</span></div>
      <div class="foot"><span></span>${nextS ? `<button class="btn primary" id="nextch">Next: ${esc(nextS.label)} →</button>` : nextHow ? `<a class="btn primary" href="${nextHow[1]}?play=${playing ? 1 : 0}">Next: ${esc(nextHow[0])} →</a>` : `<a class="btn primary" href="day.html?mode=new">Next: the future state →</a>`}</div></div>`;
}
async function scene(fast) {
  const my = ++run, s = STEPS[cur], B = beatsOf(s), T = ms => fast ? 0 : ms, live = () => my === run;
  shell(s, B);
  document.getElementById("replay").onclick = () => scene(false);
  document.getElementById("skip").onclick = () => scene(true);
  const n = document.getElementById("nextch"); if (n) n.onclick = () => { cur++; draw(); scrollTo({ top: 0, behavior: "smooth" }); };
  const feed = document.getElementById("feed"), narr = document.getElementById("narr");
  const on = i => { document.querySelectorAll("[data-b]").forEach((x, j) => x.className = j < i ? "done" : j === i ? "on" : ""); narr.textContent = B[i].say; };
  const down = () => feed.scrollTo({ top: feed.scrollHeight, behavior: fast ? "auto" : "smooth" });
  const push = html => { feed.insertAdjacentHTML("beforeend", html); const el = feed.lastElementChild; down(); return el; };
  const reveal = async el => { const rows = [...el.querySelectorAll(REVEAL)]; if (fast) return; rows.forEach(r => r.classList.add("rv")); for (const r of rows) { if (!live()) return; await wait(520); r.classList.add("in"); down(); } };
  for (let i = 0; i < B.length; i++) {
    if (!live()) return; const b = B[i]; on(i);
    if (b.k === "start") { const [who, kind, title, meta] = b.st;
      const body = kind === "upload" ? `<div class="filec"><span class="fi">${FILEI}</span><div><b>${esc(title)}</b><span class="small">${esc(meta)}</span><div class="bar"><i style="${fast ? "width:100%" : ""}"></i></div></div></div>`
        : kind === "ask" ? `<div class="askb">${esc(title)}</div><span class="small">${esc(meta)}</span>` : `<div class="filec ev"><span class="fi">${BELL}</span><div><b>${esc(meta)}</b></div></div>`;
      const el = push(feedItem(who, kind === "upload" ? "Adds a document" : kind === "ask" ? "Asks" : title, body));
      if (kind === "upload" && !fast) { await wait(150); el.querySelector(".bar i").style.width = "100%"; await wait(1300); el.querySelector(".bar").outerHTML = `<span class="ok3">✓ Uploaded</span>`; }
      else await wait(T(1400));
      if (b.sc.src) { const sv = push(feedItem("AI", "Reading it", `<div class="scan">${b.sc.src}</div>`)); if (!fast) { sv.querySelector(".scan").classList.add("go"); await wait(2200); } }
    }
    if (b.k === "ai") { const el = push(feedItem(b.who, b.say, `<div class="think"><i></i><i></i><i></i></div>`));
      await wait(T(1100)); if (!live()) return;
      el.querySelector(".fp").innerHTML = b.sc.show || (s.now ? s.now() : ""); down(); await reveal(el); await wait(T(700)); }
    if (b.k === "decide") { const [who, btn, out] = b.d, p = person(who);
      const el = push(feedItem(who, "Reviews and decides", `<div class="dec"><button class="btn sm primary fakeb" tabindex="-1">${esc(btn)}</button><span class="cursor"></span></div>`));
      await wait(T(1100)); if (!live()) return; el.querySelector(".fakeb").classList.add("press"); await wait(T(450));
      el.querySelector(".dec").innerHTML = `<span class="stampd">✓ ${esc(btn)}</span><span class="small">${esc(p[0])} · ${esc(out)}</span>`; await wait(T(1300)); }
    if (b.k === "end") { document.getElementById("endc").hidden = false; document.querySelectorAll("[data-b]").forEach(x => x.className = "done"); narr.textContent = "Done. " + ((s.fix || [])[1] || "");
      if (!fast) document.getElementById("endc").scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }
  return my;
}
function draw() {
  document.getElementById("stepper").innerHTML = storyStepper(2);
  document.getElementById("how4").innerHTML = HOW4.map(([n, h], i) => `<a href="${h}" class="${i === ACT.howIndex ? "on" : ""}"><i>${i + 1}</i>${esc(n)}</a>`).join("");
  document.getElementById("tabs").innerHTML = STEPS.map((x, i) => `<button data-t="${i}" class="${i === cur ? "on" : i < cur ? "done" : ""}"><i>${x.n}</i><span>${esc(x.label)}</span></button>`).join("");
  document.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { playing = false; cur = +b.dataset.t; draw(); });
  return scene(false);
}
document.getElementById("play").onclick = async () => { playing = true; cur = 0;
  while (playing) { const my = await draw(); if (!playing || my !== run) return; await wait(2500); if (!playing || my !== run) return;
    if (cur < STEPS.length - 1) cur++; else { const nx = HOW4[ACT.howIndex + 1]; location.href = nx ? nx[1] + "?play=1" : "day.html?mode=new"; return; } } };
document.getElementById("stop").onclick = () => { playing = false; run++; };
if (QS.get("play") === "1") document.getElementById("play").click(); else draw();
