/* How it works: one page per architecture step; the sub-steps are what the lead person does. Each sub-step plays as it would
   happen: a person adds something or something happens, the AI reads and proposes (results appear one after another), a person
   decides, and the result. Scenes live in how-scenes.js. */
const CH_NAME = { Voice: "Phone bot", "Member chat": "Member chat", "Advocate desk": "Call with Dana", Outbound: "Text", Website: "Website" };
const PD = Object.fromEntries(PD_WORDINGS.map(w => [w.label, w.text]));
const docOf = id => DOCS.find(d => d.id === id);
const STEPS = ACT.steps.map(([ch, label, key], i) => Object.assign({ key: key || ch, ch, label, n: i + 1 }, ACT.channels[key || ch]));
/* One thread through the four jobs: the Rx pricing disclaimer, the brief's own scenario. Each page opens on its thread step. */
const THREAD = [["how1.html", 1, "1 Ingest", "A hidden order to the AI is caught"], ["how1.html", 5, "1 Ingest", "Three wordings found"], ["how2.html", 4, "2 Govern", "Tom picks one wording"], ["how2.html", 6, "2 Govern", "Legal's 2027 edit, one alert"], ["how3.html", 1, "3 Serve", "June and Dana get the same"], ["prove.html", 2, "4 Test", "The golden test passes"]];
const PAGE = location.pathname.split("/").pop() || "how1.html", HERE_T = THREAD.filter(t => t[0] === PAGE);
const heroN = (HERE_T[0] || [])[1], startN = +QS.get("s") || heroN || 1;
let cur = Math.max(0, STEPS.findIndex(s => s.n === startN)), playing = false, run = 0, playFrom = QS.get("s") ? cur : 0; /* A-071: ?s=N&play=1 starts at N */
/* Steps are shown in at most five groups; a group may hold two or three short parts that play back to back (how-scenes.js HOW_GROUPS) */
const GROUPS = (typeof HOW_GROUPS !== "undefined" && HOW_GROUPS[ACT.howIndex]) || STEPS.map((s, i) => [s.label, [i]]);
const ORDER = GROUPS.flatMap(g => g[1]), groupOf = i => GROUPS.findIndex(g => g[1].includes(i)), nextOf = i => ORDER[ORDER.indexOf(i) + 1];
/* The app window's memory: an audit row for every action, a bell for every decision, a clock */
const AUDIT = []; let BELLS = 0, LIVE_Q = "";
/* Story time, not the browser clock: a scripted 12-hour clock that moves two minutes per logged action (audit G1-18) */
/* No unit codes on screen: a code becomes its unit's title */
const unitName = id => { const L = [].concat(typeof CORE_UNITS !== "undefined" ? CORE_UNITS : [], typeof MESSY_UNITS !== "undefined" ? MESSY_UNITS : []), u = L.find(x => x.id === id); return (u && u.title) || "an approved topic"; };
const deCode = t => String(t).replace(/\b(KU-\d+)( v(\d+))?/g, (m, id, vv, n) => unitName(id) + (n ? (vv && /^\s/.test(vv) ? ", v" : " v") + n : ""));
const hhmmss = () => { const m = 9 * 60 + AUDIT.length * 2, h = Math.floor(m / 60) % 24; return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };
function audit(who, what) { AUDIT.unshift([hhmmss(), who, what]); const a = document.getElementById("auditRows"), n = document.getElementById("auditN"); if (a) a.innerHTML = AUDIT.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join(""); if (n) n.textContent = `Audit trail (${AUDIT.length})`; }
function bell(n) { BELLS += n || 1; const b = document.getElementById("bellN"); if (b) { b.textContent = BELLS; b.hidden = false; b.parentNode.title = bellTitle(); b.parentNode.setAttribute("aria-label", bellTitle()); } }
setInterval(() => { const c = document.getElementById("clock"); if (c) c.textContent = hhmmss(); }, 1000);
const bellTitle = () => `${BELLS} decision${BELLS === 1 ? "" : "s"} logged`;
async function typeInto(root, fast) { for (const el of root.querySelectorAll("[data-type]")) { const text = el.getAttribute("data-type"); if (fast) { el.textContent = text; continue; } el.textContent = ""; const c = document.createElement("span"); c.className = "lv-caret"; el.appendChild(c); for (const w of text.match(/\S+\s*/g) || [text]) { c.before(document.createTextNode(w)); await new Promise(r => setTimeout(r, 45)); } c.remove(); } }

function docView(d, mark, only, kind) {
  const secs = only ? d.sections.filter(x => only.test(x.h)) : d.sections, cut = d.sections.length - secs.length;
  return `<div class="docv"><p class="small" style="margin:0 0 6px"><b>${esc(d.title)}</b> · ${esc(d.tool || "")}${kind ? ` · ${esc(kind)}` : ""}${cut ? ` · showing ${secs.length} of ${d.sections.length} sections` : ""}</p>${secs.map(s => `<h5>${esc(s.h)}</h5>${s.blocks.map(b => typeof b === "string" ? `<p class="small">${esc(b)}</p>` : `<p class="${(mark && mark(b)) || ""}">${esc(b.t || (b.table || []).map(r => r.join(" ")).join("; "))}</p>`).join("")}`).join("")}</div>`;
}
const unitCard = (title, meta, cls, locked) => `<div class="unitc ${cls || ""}"><span class="ut">${esc(title)}</span><span class="um"> · ${esc(meta)}</span>${locked ? `<span class="lk">${esc(locked)}</span>` : ""}</div>`;
const screen = (title, rows, foot) => `<div class="docv"><p class="small" style="margin:0 0 6px"><b>${esc(title)}</b></p>${rows.map(r => `<p>${r}</p>`).join("")}${foot ? `<p class="small" style="margin-top:6px">${foot}</p>` : ""}</div>`;

const FILEI = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>`;
const BELL = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>`;
const person = k => PEOPLE[k] || [k, "", k.slice(0, 2).toUpperCase(), "p"];
const SHORT = { Calloway: "Ruth", Backup: "The backup reviewer", Translator: "A qualified translator", System: "The system" };
const first = k => SHORT[k] || person(k)[0].split(" ")[0];

const ownerOf = B => { const d = B.find(b => b.k === "decide"); if (d) return person(d.who)[0].split(" ")[0]; const a = B.find(b => b.k === "ai"); return a && a.who === "AI" ? "The AI, inside rules" : "The system"; };
/* Which "How it runs" row (Solution architecture) plays which step group here; null = a row that runs inside every step */
const RUNMAP = [[null, 0, 1, 2, 3, 4], [0, 1, 2, 3, 4, null], [null, 0, 1, 2, 3, 4]];
const litAuto = (k, on) => { const r = document.querySelectorAll(".rs-row")[k]; if (r) { r.classList.toggle("on", on); if (!on) r.classList.add("played"); } };
/* Click to advance: between beats the scene waits for a click or the right arrow, unless Play is running */
let goNext = null;
function clickToGo(label) {
  const n = document.getElementById("narr"), my = run;
  if (n) n.insertAdjacentHTML("beforeend", ` <button class="btn sm primary gonext" id="gonext">Next: ${esc(label)} ▸</button>`);
  return new Promise(res => { goNext = () => { goNext = null; const b = document.getElementById("gonext"); if (b) b.remove(); res(my === run); }; const b = document.getElementById("gonext"); if (b) b.onclick = () => goNext && goNext(); });
}
document.addEventListener("keydown", e => { if (/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || "")) return; if ((e.key === "ArrowRight" || e.key === " ") && goNext) { e.preventDefault(); goNext(); } });
/* The beats of one scene, each with the line the narrator says */
function beatsOf(s) {
  const sc = (SCENES[ACT.howIndex + ":" + s.key] || (() => ({})))(), st = sc.start || ["System", "event", s.label, ""], B = [];
  const verb = { upload: "", event: "", ask: "asks" }[st[1]];
  B.push({ k: "start", who: st[0], say: st[1] === "upload" ? `A changed document arrives: ${st[2]}` : st[1] === "event" ? (st[0] === "System" ? st[2] : `${first(st[0])}: ${st[2]}`) : `${first(st[0])} ${verb}`, sc, st, label: "Trigger" });
  const rowRole = (() => { const J = (typeof FM_JOBS !== "undefined" && FM_JOBS[ACT.howIndex]) || null, k = (RUNMAP[ACT.howIndex] || []).indexOf(groupOf(STEPS.indexOf(s))); return J && k >= 0 ? J.run[k][0] : ""; })();
  const sys = rowRole === "rule" ? true : rowRole === "ai" || rowRole === "rec" ? false : /^Rule/i.test(((s.fix4 || {}).kind) || "") || /system checks|clock|reminder reads|diff|Drift|Only the approved|linked Spanish/.test(sc.ai || "");
  B.push({ k: "ai", who: sys ? "System" : "AI", say: sc.ai || "The AI proposes", sc, label: "AI does", narr: sys ? "A fixed rule runs; watch the feed" : "The AI works; watch the feed" });
  (sc.decide || []).forEach(d => B.push({ k: "decide", who: d[0], say: `${first(d[0])} decides`, d, label: "Person decides" }));
  B.push({ k: "end", who: "", say: "The result", label: "Result" });
  return B;
}
/* The AI's role on the left always matches its row on the right (the brief's decides / recommends split) */
function aiSub() { const J = (typeof FM_JOBS !== "undefined" && FM_JOBS[ACT.howIndex]) || null, M = RUNMAP[ACT.howIndex] || [], k = M.indexOf(groupOf(cur)), r = J && k >= 0 ? J.run[k][0] : "rec";
  return r === "ai" ? "decides, inside rules" : r === "rule" ? "a fixed rule" : "recommends; a person confirms"; }
function feedItem(who, say, body, cls) {
  const p = person(who).slice(); if (p[3] === "ai") p[1] = aiSub();
  return `<div class="fe ${p[3]} ${cls || ""}"><span class="av">${p[3] === "ai" ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>` : esc(p[2])}</span>
    <div class="fb"><p class="fh"><b>${esc(p[0])}</b>${p[1] ? ` · ${esc(p[1])}` : ""}</p><p class="fs">${esc(say)}</p>${body ? `<div class="fp">${body}</div>` : ""}</div></div>`;
}
const SLOW = 2.6, wait = ms => new Promise(r => setTimeout(r, ms * SLOW));
const REVEAL = ".unitc, .docv > p, .docv > h5, .results > div, .cmp > div, .match, .chips2 span, .phone .sms";

function shell(s, B) {
  const nextS = STEPS[nextOf(cur)], nextHow = HOW4[ACT.howIndex + 1], f = s.fix4 || {}, g = groupOf(cur), G = GROUPS[g] || [s.label, [cur]], parts = G[1].length, part = G[1].indexOf(cur) + 1;
  /* Every Next names a step on the stepper, or its sub-step as "1b ..." (audit A-263) */
  const nx = nextOf(cur), ng = nx === undefined ? -1 : groupOf(nx), NG = GROUPS[ng];
  const nextLabel = nextS ? (NG[1].length > 1 ? `Next: ${ng + 1}${"abcdefgh"[NG[1].indexOf(nx)]} ${ng === g ? nextS.label : NG[0]}` : `Next: ${ng + 1} ${NG[0]}`) : "";
  const howName = h => h[0] + (/prove\.html/.test(h[1]) ? " (opens Prove it)" : "");
  document.getElementById("stage").innerHTML = `
    <p class="eyebrow">Job ${ACT.howIndex + 1} · step ${g + 1} of ${GROUPS.length}${parts > 1 ? ` (part ${part} of ${parts})` : ""}</p>
    <h2 class="hl">${esc(f.line || s.label)}</h2>
    <div class="beats">${B.map((b, i) => `<span data-b="${i}">${esc(b.label)}</span>`).join("")}</div>
    <p class="narr" id="narr">&nbsp;</p>
    ${s.live ? `<div class="lv-ask"><input id="liveQ" value="${esc(LIVE_Q || s.live)}" aria-label="Ask as June"><button class="btn sm primary" id="liveAsk">Ask as June</button><span class="small" style="flex-basis:100%">Or pick one:</span>${(s.chips || []).map(c => `<button class="lv-chip" data-q="${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}
    <div class="appwin"><div class="appbar"><i></i><i></i><i></i><span>Lakewell Knowledge · ${esc(ACT.howIndex === 1 ? (() => { const d = B.find(b => b.k === "decide"); const n = d ? first(d.who) : "Tom"; return /^(A|The) /.test(n) ? n.replace(/^(A|The) /, "") .replace(/^./, c => c.toUpperCase()) + "'s review queue" : n + "'s review queue"; })() : ["Priya's workspace", "", "Renee's knowledge console"][ACT.howIndex] || "")} · ${esc(HOW4[ACT.howIndex][0])}</span><div class="lv-tabs"><button class="on" data-pane="feed">Feed</button><button data-pane="audit" id="auditN">Audit trail (${AUDIT.length})</button></div><span style="flex:1"></span><span class="lv-clock" id="clock">${hhmmss()}</span><span class="lv-bell" title="${bellTitle()}" aria-label="${bellTitle()}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg><b id="bellN" ${BELLS ? "" : "hidden"}>${BELLS}</b></span><button class="icb lv-icb" id="replay" title="Replay" aria-label="Replay"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></button></div><div class="feed" id="feed"></div><div class="lv-audit" id="auditPane" hidden><table><tbody id="auditRows">${AUDIT.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</tbody></table></div></div>
    <div id="endc" class="endc" hidden>
      <div class="now"><b>Result</b><dl class="res3"><dt>Before</dt><dd>${esc((s.issue || [])[0] || "")}</dd><dt>Now</dt><dd>${esc((s.fix || [])[0] || "")}</dd><dt>For June</dt><dd>${esc((s.fix || [])[1] || "")}</dd></dl></div>
      <div class="meta3"><span><b>Who owns it</b> ${esc(f.who || "")}</span><span><b>How we test it</b> ${esc(f.proof || "")}</span></div>
      <div class="foot">${(() => { const i = THREAD.findIndex(t => t[0] === PAGE && t[1] === s.n), nx = THREAD[i + 1]; return i >= 0 && nx ? `<span></span><a class="btn primary" href="${nx[0]}?s=${nx[1]}">Next: ${esc(nx[3])} →</a>` : "<span></span>"; })()}${THREAD.some(t => t[0] === PAGE && t[1] === s.n) && THREAD[THREAD.findIndex(t => t[0] === PAGE && t[1] === s.n) + 1] ? "" : nextS ? `<button class="btn primary" id="nextch">${esc(nextLabel)} →</button>` : nextHow ? `<a class="btn primary" href="${nextHow[1]}?play=${playing ? 1 : 0}">Next: ${esc(howName(nextHow))} →</a>` : `<a class="btn primary" href="day.html?mode=new">Next: the future state →</a>`}</div></div>`;
}
async function scene(fast) {
  const my = ++run, s = STEPS[cur], B = beatsOf(s), T = ms => fast ? 0 : s.live ? ms / 4 : ms, live = () => my === run;
  shell(s, B);
  document.getElementById("replay").onclick = () => scene(false);
  const n = document.getElementById("nextch"); if (n) n.onclick = () => { cur = nextOf(cur); draw(); scrollTo({ top: 0, behavior: SMOOTH }); };
  document.querySelectorAll(".lv-tabs button").forEach(b => b.onclick = () => { document.querySelectorAll(".lv-tabs button").forEach(x => x.classList.toggle("on", x === b)); document.getElementById("feed").hidden = b.dataset.pane !== "feed"; document.getElementById("auditPane").hidden = b.dataset.pane !== "audit"; });
  const ask = document.getElementById("liveAsk"); if (ask) { const go = q => { LIVE_Q = q; playing = false; scene(false); }; ask.onclick = () => go(document.getElementById("liveQ").value); document.getElementById("liveQ").onkeydown = e => { if (e.key === "Enter") go(e.target.value); }; document.querySelectorAll(".lv-chip").forEach(c => c.onclick = () => go(c.dataset.q)); }
  const feed = document.getElementById("feed"), narr = document.getElementById("narr");
  const on = i => { document.querySelectorAll("[data-b]").forEach((x, j) => x.className = j < i ? "done" : j === i ? "on" : ""); narr.textContent = B[i].narr || B[i].say; const lit = document.querySelector(".rs-row.on .rs-bar i"); if (lit) lit.style.width = Math.round(100 * (i + 1) / B.length) + "%"; };
  const down = () => feed.scrollTo({ top: feed.scrollHeight, behavior: fast ? "auto" : SMOOTH });
  const push = html => { feed.insertAdjacentHTML("beforeend", html); const el = feed.lastElementChild; down(); return el; };
  const reveal = async el => { const rows = [...el.querySelectorAll(REVEAL)]; if (fast) return; rows.forEach(r => r.classList.add("rv")); for (const r of rows) { if (!live()) return; await wait(520); r.classList.add("in"); down(); } };
  for (let i = 0; i < B.length; i++) {
    if (i > 0 && !fast && !playing) { const ok = await clickToGo(B[i].label); if (!ok || !live()) return; }
    if (!live()) return; const b = B[i]; on(i);
    if (b.k === "start") { const [who, kind, title, meta] = b.st;
      const body = kind === "upload" ? `<div class="filec"><span class="fi">${FILEI}</span><div><b>${esc(title)}</b><span class="small">${esc(meta)}</span><div class="bar"><i style="${fast ? "width:100%" : ""}"></i></div></div></div>`
        : kind === "ask" ? `<div class="askb">${esc(title)}</div><span class="small">${esc(meta)}</span>` : `<div class="filec ev"><span class="fi">${BELL}</span><div><b>${esc(meta)}</b></div></div>`;
      const el = push(feedItem(kind === "upload" ? "System" : who, kind === "upload" ? "Pulls the changed document from its source" : kind === "ask" ? "Asks" : title, body));
      audit(kind === "upload" ? "System" : person(who)[0], kind === "upload" ? `Pulled ${title} · version and owner recorded` : kind === "ask" ? `Asked: "${title}" · redacted before storage` : title);
      if (ACT.howIndex === 0) litAuto(0, true);
      if (kind === "upload" && !fast) { await wait(150); el.querySelector(".bar i").style.width = "100%"; await wait(1300); el.querySelector(".bar").outerHTML = `<span class="ok3">✓ Pulled · version and owner recorded</span>`; }
      else await wait(T(1400));
      if (ACT.howIndex === 0) litAuto(0, false);
    }
    if (b.k === "ai") { if (b.sc.src) { const sv = push(feedItem(b.who, "Reads the document", `<div class="scan">${b.sc.src}</div>`)); if (!fast) { sv.querySelector(".scan").classList.add("go"); await wait(2200); } if (!live()) return; }
      const el = push(feedItem(b.who, b.say, `<div class="think"><i></i><i></i><i></i></div>`));
      await wait(T(1100)); if (!live()) return;
      const html = (b.sc.show || (s.now ? s.now() : "")) + (b.sc.rec ? b.sc.rec() : ""), R = s.live ? window.LIVE_R : null;
      if (R && R.trace) { const tk = document.createElement("div"); tk.className = "lv-tick"; el.querySelector(".fp").innerHTML = ""; el.querySelector(".fp").appendChild(tk);
        for (const t of R.trace) { const sp = document.createElement("span"); sp.className = "run"; sp.textContent = deCode(t); tk.appendChild(sp); down(); await wait(T(600)); if (!live()) return; sp.classList.remove("run"); }
        tk.insertAdjacentHTML("afterend", html); audit("System", R.kind === "answer" ? `Served ${R.unit.title || unitName(R.unit.id)} v${R.unit.version} to ${R.role} on ${R.channel} · exact wording rendered by template` : R.kind === "person" ? `Handed to a person now · ${R.urgent ? "911 and 988 given" : "no search"}` : `No approved topic answered · abstained · gap log +1`); bell(); }
      else el.querySelector(".fp").innerHTML = html;
      down(); await typeInto(el, fast); await reveal(el); await wait(T(700));
      if (b.sc.also) for (const [w, say, html] of b.sc.also()) { if (!live()) return; const ea = push(feedItem(w, say, html)); audit(person(w)[0], say); await reveal(ea); await wait(T(1200)); } }
    if (b.k === "decide") { const [who, btn, out] = b.d, p = person(who);
      const el = push(feedItem(who, "Reviews and decides", `<div class="dec"><button class="btn sm primary fakeb" tabindex="-1" aria-hidden="true">${esc(btn)}</button><span class="cursor"></span></div>`));
      await wait(T(1100)); if (!live()) return; el.querySelector(".fakeb").classList.add("press"); await wait(T(450));
      el.querySelector(".dec").innerHTML = `<span class="stampd">✓ ${esc(btn)}</span><span class="small">${esc(p[0])} · ${esc(out)}</span>`; audit(p[0], `${btn} · ${out}`); bell(); await wait(T(1300)); }
    if (b.k === "end" && ACT.howIndex === 1 && !s.noStore) { const M = RUNMAP[1], k = M.indexOf(null); litAuto(k, true);
      const es = push(feedItem("System", "Stores the approved version", `<div class="unitc"><span class="ut">State: approved</span><span class="um"> · version and start date recorded · readers set by role · every channel reads this copy</span></div>`)); audit("System", "Stored the approved version with its dates and readers"); await reveal(es); await wait(T(1100)); litAuto(k, false); if (!live()) return; }
    if (b.k === "end") { const lr = document.querySelector(".rs-row.on"); if (lr && (GROUPS[groupOf(cur)][1].slice(-1)[0] === cur)) lr.classList.add("played"); document.getElementById("endc").hidden = false; document.querySelectorAll("[data-b]").forEach(x => x.className = "done"); narr.textContent = "Result below";
      if (!fast) document.getElementById("endc").scrollIntoView({ block: "nearest", behavior: SMOOTH }); }
  }
  return my;
}
function draw() {
  document.getElementById("stepper").innerHTML = storyStepper(2);
  document.getElementById("how4").innerHTML = HOW4.map(([n, h], i) => `<a href="${h}" class="${i === ACT.howIndex ? "on" : ""}"><i>${i + 1}</i>${esc(n + (/prove\.html/.test(h) ? " (opens Prove it)" : ""))}</a>`).join("");
  const here = document.getElementById("here"); if (here) here.remove(); if (false) { const H = HOW4[ACT.howIndex]; here.innerHTML = `Job ${ACT.howIndex + 1} of 4 on the <a href="day.html?mode=approach">Solution architecture map</a>: <b>${esc(H[0])}</b>. ${esc(ACT.setup || H[3] || "")}`; }
  const g = groupOf(cur); document.getElementById("tabs").classList.toggle("many", GROUPS.length > 6);
  if (!document.getElementById("cast")) {
    const CAST = [["June", "June", "Member", "Asks the questions; gets the answer"], ["Dana", "Dana", "Insurance advocate", "Answers June on live calls"], ["Luis", "Luis", "Pharmacy advocate", "Answers pharmacy questions"], ["Priya", "Priya", "Author", "Writes and fixes the content"], ["Tom", "Tom", "Legal and Compliance", "Approves Legal's wording"], ["Grace", "Grace", "Clinical pharmacist", "First sign-off on clinical content"], ["Calloway", "Ruth", "Medical director", "Second clinical sign-off"], ["Renee", "Renee", "Knowledge Operations lead", "Runs the system; signs each release"]];
    const ACTIVE = [["Priya", "Renee", "Grace", "Tom"], ["Tom", "Grace", "Calloway", "Priya"], ["June", "Dana", "Priya", "Renee"]][ACT.howIndex] || [];
    document.getElementById("tabs").closest("main").querySelector(".hhead, #how4") && (document.getElementById("howgrid") || document.getElementById("stage")).insertAdjacentHTML("beforebegin", `<details class="cast" id="cast" open><summary>Meet the people</summary><div class="cast-row">${CAST.map(([k, n, r, l]) => `<div class="cp${ACTIVE.includes(k) ? " act" : ""}"><span class="cpi">${esc(n[0])}</span><div><b>${esc(n)}</b><span>${esc(r)}</span><small>${esc(l)}</small></div></div>`).join("")}</div></details>`);
  }
  const tabs = document.getElementById("tabs"), J = (typeof FM_JOBS !== "undefined" && FM_JOBS[ACT.howIndex]) || null;
  if (J && !document.getElementById("howgrid")) { const st = document.getElementById("stage"), w = document.createElement("div"); w.id = "howgrid"; w.className = "howgrid"; st.before(w); w.append(st, tabs); tabs.className = "runside"; }
  if (J) {
    const M = RUNMAP[ACT.howIndex], tech = (typeof FM_RUNTECH !== "undefined" && FM_RUNTECH[ACT.howIndex]) || [];
    tabs.innerHTML = `<p class="eyebrow">How it runs, step by step</p><ol class="rs-list">${J.run.map((r, k) => { const gi = M[k], st = gi == null ? "auto" : gi === g ? "on" : gi < g ? "done" : "", thr = gi != null && GROUPS[gi][1].some(j => HERE_T.some(t => t[1] === STEPS[j].n));
      return `<li class="rs-row ${st}" ${gi == null ? "" : `data-t="${GROUPS[gi][1][0]}" role="button" tabindex="0"`}><span class="fm-who ${r[0]}">${esc(r[1])}</span><span class="rs-txt">${esc(r[2])}${(tech[k] || []).length ? `<span class="fm-rtech">${tech[k].map(t => `<i>${esc(t)}</i>`).join("")}</span>` : ""}${gi == null && (k === 0 && ACT.howIndex === 2) ? `<span class="rs-note">${k === 0 && ACT.howIndex === 2 ? "click to play it: a crisis line typed in the chat" : ""}</span>` : ""}</span><span class="rs-bar"><i></i></span></li>`; }).join("")}</ol><p class="rs-key"><span class="fm-who rule">System</span> a fixed rule <span class="fm-who ai">AI decides</span> inside rules <span class="fm-who rec">AI recommends</span> a person confirms <span class="fm-who person">Name</span> only a person</p>${(() => { const v = (typeof FM_VEND !== "undefined" && FM_VEND[ACT.howIndex]) || J.vend || []; return `<details class="rs-more"><summary>Techniques used</summary><dl class="fm-tech">${(J.tags || []).map(t => `<dt>${esc(t[0])}</dt><dd>${esc(t[1])}</dd>`).join("")}</dl>${v.length ? `<p class="eyebrow" style="margin-top:10px">Ready to build on</p><ul class="fm-vend">${v.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</details>`; })()}`;
    if (ACT.howIndex === 2) { const cr = tabs.querySelectorAll(".rs-row")[0]; if (cr) { cr.classList.add("crisis"); cr.setAttribute("role", "button"); cr.tabIndex = 0; const go = () => { playing = false; LIVE_Q = "I think I am having a stroke"; cur = 0; draw(); }; cr.onclick = go; cr.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }; } }
    tabs.querySelectorAll("[data-t]").forEach(b => { const go = () => { playing = false; cur = +b.dataset.t; draw(); }; b.onclick = go; b.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }; });
  } else {
  tabs.innerHTML = GROUPS.map((x, i) => `<button data-t="${x[1][0]}" class="${i === g ? "on" : i < g ? "done" : ""}"><i>${i + 1}</i><span>${esc(x[0])}</span></button>`).join("");
  document.querySelectorAll("[data-t]").forEach(b => b.onclick = () => { playing = false; cur = +b.dataset.t; draw(); });
  }
  return scene(false);
}
document.getElementById("play").onclick = async () => { playing = true; cur = playFrom; playFrom = ORDER[0];
  while (playing) { const my = await draw(); if (!playing || my !== run) return; await wait(3500); if (!playing || my !== run) return;
    if (nextOf(cur) !== undefined) cur = nextOf(cur); else { const nx = HOW4[ACT.howIndex + 1]; location.href = nx ? nx[1] + "?play=1" : "day.html?mode=new"; return; } } };
document.getElementById("stop").onclick = () => { playing = false; run++; };
/* Audit A-072: the same stand-in line as Solution architecture, always shown under How it works */
document.querySelector("main").insertAdjacentHTML("beforeend", `<p class="small" style="margin-top:14px">Prototype: scripted AI steps; simple search stands in for the real one.</p>`);
if (QS.get("play") === "1") document.getElementById("play").click(); else draw();
