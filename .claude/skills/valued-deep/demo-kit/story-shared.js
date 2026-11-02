/* Shared by the story acts: icons, the source-versus-delivered comparison, the coloured flows, the solution architecture and the control panel. */
/* Icons for the channels and the talk-through boxes */
const ICON = {bot: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V4M9 13h.01M15 13h.01M9 16h6"/></svg>`,chat: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>`,person: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13a7 7 0 0 1 14 0v3"/><rect x="3" y="13" width="4" height="6" rx="1.5"/><rect x="17" y="13" width="4" height="6" rx="1.5"/><path d="M19 19c0 1.5-2 2-4 2"/></svg>`,sms: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/></svg>`,web: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>`,warn: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/></svg>`,hurt: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 16c1-1.5 2.5-2 4-2s3 .5 4 2M9 10h.01M15 10h.01"/></svg>`,fix: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>`,win: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l6-6 4 4 6-7"/><path d="M14 8h6v6"/></svg>`};
function compare(approved, said, saidLabel, note, okLabel) {
  const norm2 = w => w.toLowerCase().replace(/[^a-z0-9$]/g, ""), A = approved.split(" "), B = said.split(" "), aset = new Set(B.map(norm2)), bset = new Set(A.map(norm2));
  const a = A.map(w => aset.has(norm2(w)) ? esc(w) : `<mark class="miss">${esc(w)}</mark>`).join(" "), b = B.map(w => bset.has(norm2(w)) ? esc(w) : `<mark class="wrongw">${esc(w)}</mark>`).join(" ");
  return `<div class="cmp"><div class="cmpa"><b>${esc(okLabel || "What Legal approved")}</b><p>${a}</p><span class="small">Green: approved words that are missing</span></div><div class="cmpb"><b>${esc(saidLabel)}</b><p>${b}</p><span class="small">${esc(note)}${/mark/.test(b) ? " · red: not in the approved wording" : ""}</span></div></div>`;
}
const TICON = {copies: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="12" height="13" rx="2"/><path d="M5 17V5a1 1 0 0 1 1-1h10"/></svg>`,pencil: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/></svg>`,clock: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,send: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/></svg>`,search: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`,eyeoff: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 22 12a14 14 0 0 1-2.4 3.3M6.6 6.6A14 14 0 0 0 2 12s4 7 10 7a9 9 0 0 0 4-1"/></svg>`,zap: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>`,source: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>`,lock: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,shield: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>`,stamp: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l-1 7h-4z"/><path d="M5 14h14v4H5zM7 21h10"/></svg>`,calendar: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/></svg>`,inbox: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13h4l2 3h4l2-3h4"/><path d="M5 5h14l1 8v6H4v-6z"/></svg>`,spark: `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/></svg>`};
/* Today: each step coloured by its role, so you can point to where it breaks */
const STEPC = [["q", "bubble", ""], ["look", "folder", ""], ["break", "warn", "breaks here"], ["bad", "x", ""]];
const SICON = { lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>', check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>', bubble: '<path d="M4 5h16v11H9l-5 4z"/>', folder: '<path d="M3 6h6l2 2h10v11H3z"/>', warn: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>', x: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>' };

/* With Lakewell: the same steps, coloured green, with "fixed here" where today's path broke */
function fixSVG(c) {
  const ic = ["bubble", "folder", "check", "check"];
  return `<ol class="vflow">${c.fixpath.map((p, i) => `<li class="gstep st-ok${i === 2 ? " st-fix" : ""}" style="animation-delay:${(i * 0.5).toFixed(2)}s"><span class="sic"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SICON[ic[i]]}</svg></span><div><span class="vk">${i + 1} · ${esc(p[0])}${i === 2 ? ' <em class="fixd">fixed here</em>' : ""}</span><b>${esc(p[1])}</b><span class="small">${esc(p[2])}</span></div></li>`).join("")}</ol>`;
}
function todaySVG(c) {
  return `<ol class="vflow">${c.path.map((p, i) => { const [cls, ic, tag] = STEPC[i] || STEPC[1];
    return `<li class="gstep st-${cls}" style="animation-delay:${(i * 0.5).toFixed(2)}s"><span class="sic"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SICON[ic]}</svg></span><div><span class="vk">${i + 1} · ${esc(p[0])}${tag ? ` <em class="brk">${tag}</em>` : ""}</span><b>${esc(p[1])}</b><span class="small">${esc(p[2])}</span></div></li>`; }).join("")}</ol>`;
}

/* ---------- The four steps of the solution architecture (strategy S7, S3.3 to S3.8, section 8) ---------- */
const STEPS4 = [
  { n: "Ingest and structure", take: "Messy documents become short, tagged topics, with Legal's words locked, and nothing is searchable until a person approves.", takeB: ["What it does: reads every document, splits it into topics, locks legal lines, sorts junk and finds copies", "Why it matters: every channel starts from clean, structured knowledge instead of raw files", "How we know: locked words match the source exactly; planted instructions never get through"], line: "AI reads the documents; a person approves", icon: "folder", cls: "s1",
    tags: ["LLM-based extraction", "Semantic deduplication", "Prompt-injection filtering", "PII redaction"],
    parts: [["Ingestion", "Pulls each source document; records its version, owner and hash", "Rule", "No one: automatic"],
      ["Extraction", "Splits it into short topics; marks the legal words to lock; proposes tags and the approver", "Model proposes", "Priya accepts or edits"],
      ["Dedup", "Finds the same wording in other documents and shows the difference; never merges on its own", "Model scores, rule guards", "Priya proposes; the approver confirms"]],
    proof: "Locked words match the source exactly (G1, G3); a not-duplicate pair is never merged (T1); planted instruction ignored (G13); identifiers redacted (T4)" },
  { n: "Govern", take: "One approved version of every answer, with an owner, dates and who may read it, and one alert when anything changes.", takeB: ["What it does: holds each topic with its approver, version, start and end dates and access", "Why it matters: there is always exactly one official answer, and it changes everywhere at once", "How we know: drafts and expired wording are never served; a typo fix raises no alert"], line: "One approved version, with dates, locked legal words and access", icon: "lock", cls: "s2",
    tags: ["Knowledge graph", "Temporal versioning", "Drift detection"],
    parts: [["Governance store", "Each topic as a node linked to its source, locked words, version, start and end dates, approver and channels", "Rule", "Tom, Grace or Renee; never the author"],
      ["Drift detection", "When a source changes, one alert lists every topic and channel it touches, with the proposed edit", "Rule diffs, model proposes", "The approver for that content"]],
    contract: ["Approved topics only", "In force on the date asked", "Only what the asker's role may read", "Locked words exactly as written", "Always cite the topic and version"],
    proof: "Only approved, in-date content is served (G4, G10, G11, G20); a formatting-only edit raises no alert (T2)" },
  { n: "Retrieve and serve", take: "Every channel gets the same approved answer, scoped to the asker, with Legal's words exact, or says \"not yet\" and logs the gap.", takeB: ["What it does: finds the approved topic for the question, checks the role and date, and inserts locked words exactly", "Why it matters: June hears one answer whether she calls, chats, texts or reads the website", "How we know: no answer outside the role; no guesses; the legal words never change"], line: "Every channel reads it, or says it doesn't know", icon: "bubble", cls: "s3",
    tags: ["GraphRAG", "Hybrid retrieval", "Role-based pre-filter", "Grounded generation with abstention", "Constrained rendering", "Gap clustering", "Synthetic voice"],
    parts: [["Retrieval", "Walks the knowledge graph from the question to the approved topic; scopes to the role before ranking; inserts locked words by template; says 'not yet' when nothing approved answers", "Rules filter, model ranks", "No one: automatic"],
      ["Consumers", "Phone bot, member chat, Agent Assist and search, texts and website all read the same topics through the read contract", "Rule per channel", "No one: automatic"],
      ["Gap log", "Every unanswered question is recorded and grouped into a backlog for the author", "Rule logs, model groups", "Priya writes; Renee decides write-it or fix-the-process"]],
    hitl: [["AI decides, inside rules", "Extract, propose duplicates, flag drift and expiry, rank, scope to the role, decline when nothing approved answers, group unanswered questions"],
      ["AI recommends, a person confirms", "Wording updates after drift, tags, merge or split, new topics from gaps, learned synonyms, a pinned answer"],
      ["Only a person", "Approve legal or clinical content, retire a source, decide which wording holds, grant access, approve a gap answer"]],
    proof: "Never answers outside the role (G9, G19); says 'not yet' instead of guessing (G6, G14); legal words verbatim in every channel (G16, G21)" },
  { n: "Evaluate and release", take: "Independent tests on every role and channel decide each release, and one red row blocks it.", takeB: ["What it does: runs the golden set, 621 independent probe questions and a sealed holdout before every release", "Why it matters: quality is proven group by group, not assumed from an average", "How we know: release is blocked by any red rule row; the holdout is never used for tuning"], line: "Independent tests decide every release", icon: "check", cls: "s4",
    tags: ["Golden set", "Adversarial probe suites", "Sealed holdout", "Per-group release gates", "LLM-as-judge", "Recorded model runs"],
    parts: [["Golden set", "21 questions with labelled answers, per role and channel", "Rule checks, human labels", "Labelled by the author, reviewed"],
      ["Adversarial probes", "621 questions from a writer who never saw the rules: personal data, cost, years, languages, roles, near-misses", "Rule", "Bars set by the owner"],
      ["Sealed holdout", "Written separately, hash-verified, never used for tuning", "Rule", "No one may open it"],
      ["Release gate", "Any red rule row, on any group, blocks release; a model judge is validated against two human reviewers", "Rule + validated judge", "Renee signs the release"]],
    proof: "100% of personal-data questions handed to a person; false refusals at most 10%, goal 2%; holdout run once per release" }
];
let DETAIL = (() => { try { return localStorage.getItem("uc2detail") === "1"; } catch (e) { return false; } })();
function setDetail(v) { DETAIL = v; try { localStorage.setItem("uc2detail", v ? "1" : ""); } catch (e) {} }
const tagRow = t => `<div class="tags4">${t.map(x => `<span>${esc(x)}</span>`).join("")}</div>`;
function stepDetail(s, i) {
  return `<div class="sd ${s.cls}"><div class="ktk"><p class="eyebrow">Key takeaway · ${i + 1}. ${esc(s.n)}</p><p class="ktl">${esc(s.take)}</p><ul>${s.takeB.map(b => { const [h, ...r] = b.split(": "); return `<li><b>${esc(h)}:</b> ${esc(r.join(": "))}</li>`; }).join("")}</ul></div>
    <details class="more2"><summary>What's inside: parts, rule or model, owner, techniques, evidence</summary>
    <div class="ptab"><div class="pr ph"><span>Part</span><span>What it does</span><span>Rule or model</span><span>Accountable owner</span></div>${s.parts.map(p => `<div class="pr"><b>${esc(p[0])}</b><span>${esc(p[1])}</span><span><em class="kind">${esc(p[2])}</em></span><span>${esc(p[3])}</span></div>`).join("")}</div>
    ${s.contract ? `<p class="small" style="margin:8px 0 2px"><b>The read contract every channel follows:</b></p><div class="chips2">${s.contract.map(x => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
    ${s.hitl ? `<p class="small" style="margin:8px 0 2px"><b>Human in the loop:</b></p>${s.hitl.map(h => `<div class="hl2"><b>${esc(h[0])}</b><span>${esc(h[1])}</span></div>`).join("")}` : ""}
    ${tagRow(s.tags)}<p class="ev2"><b>Evidence:</b> ${esc(s.proof)}</p></details></div>`;
}
/* Solution architecture: four steps on top; tap a step (or turn Detail on) to open its depth in place */
let OPEN4 = new Set();
function approachHTML(nextLabel) {
  const open = OPEN4;
  return `<div class="appr2"><p class="eyebrow">Solution architecture</p>
    <h2>A governed knowledge layer: one source of truth for every channel, human or AI.</h2>
    <p class="big2">We fix the knowledge once, at the source, instead of fixing each channel.</p>
    <div class="steps4">${STEPS4.map((s, i) => `<button class="s4card ${s.cls}${open.has(i) ? " open" : ""}" data-s4="${i}"><span class="s4i">${SICON[s.icon] ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SICON[s.icon]}</svg>` : ""}</span><b>${i + 1}. ${esc(s.n)} ${open.has(i) ? "▴" : "▾"}</b><span class="s4l">${esc(s.line)}</span>${tagRow(s.tags.slice(0, 3))}</button>`).join('<span class="arr4">→</span>')}</div>
    <div class="loops"><div class="loop"><b>Feedback loop · content gaps</b> Unanswered questions go back to the author as a writing backlog.</div><div class="loop"><b>Feedback loop · drift</b> When a source changes, one alert finds every copy and channel.</div></div>
    ${[...open].sort().map(i => stepDetail(STEPS4[i], i)).join("")}
    ${open.size ? "" : `<p class="small" style="margin-top:10px">Tap a step for its key takeaway.</p>`}
    <div class="acts" style="margin-top:22px"><button class="btn primary" id="toNew">${esc(nextLabel)}</button></div></div>`;
}
function bindApproach(redraw) {
  document.querySelectorAll("[data-s4]").forEach(b => b.onclick = () => { const i = +b.dataset.s4; OPEN4.has(i) ? OPEN4.delete(i) : OPEN4.add(i); if (DETAIL) setDetail(false); redraw(); });
  bindDetail(redraw);
}
function detailSwitch() { return `<label class="dsw"><input type="checkbox" id="detailsw"${DETAIL ? " checked" : ""}> Detail</label>`; }
function bindDetail(redraw) { const d = document.getElementById("detailsw"); if (d) d.onchange = e => { setDetail(e.target.checked); OPEN4 = new Set(); redraw(); }; }
/* Control panel on each future-state tab: one line, the four steps with the working ones lit, then control, owner and evidence one tap away */
function fixPanel4(c, f, mapHTML) {
  const broke = c.path && c.path[2];
  return `<div class="acts" style="justify-content:space-between"><h3 style="margin:0">Control</h3>${detailSwitch()}</div>
    <p class="oneline">${esc(f.line)}</p>
    <div class="mini4">${STEPS4.map((s, i) => `<span class="${f.steps.includes(i) ? "on" : ""}">${esc(s.n)}${f.steps.includes(i) ? " ★" : ""}</span>`).join("")}</div>
    <div class="tags4 solid">${f.tech.map(x => `<span>${esc(x)}</span>`).join("")}</div>
    <details class="why"${DETAIL ? " open" : ""}><summary>Control, owner and evidence</summary>
      <div class="fx4"><div class="fx broke"><b>Root cause</b>${broke ? esc(broke[1]) + " (" + esc(broke[2]) + ")" : ""}</div>
      <div class="fx ctl"><b>Control <em class="kind">${esc(f.kind)}</em></b>${esc(f.control)}</div>
      <div class="fx"><b>Accountable owner</b>${esc(f.who)}</div><div class="fx"><b>Evidence</b>${esc(f.proof)}</div></div>
      ${mapHTML || ""}</details>`;
}

/* ---------- The story stepper: the five parts of the demo, in order, on every page ---------- */
const STORY5 = [["Current state", "day.html?mode=today"], ["Solution architecture", "day.html?mode=approach"], ["How it works", "how1.html"], ["Future state", "day.html?mode=new"], ["Prove it", "prove.html"]];
function storyStepper(active) {
  return `<nav class="story5">${STORY5.map(([n, h], i) => `<a href="${h}" class="${i === active ? "on" : i < active ? "done" : ""}">${esc(n)}</a>`).join('<span class="sep5">›</span>')}</nav>`;
}
/* The four How it works steps, mirroring the architecture */
const HOW4 = [["Ingest and structure", "how1.html", "Priya"], ["Govern and approve", "how2.html", "Tom, Grace, Dr. Calloway"], ["Close the gaps", "how3.html", "Priya, Renee"], ["Keep it current", "how4.html", "Tom"]];
