/* Solution architecture as a flow map (replaces the four cards, 2 Nov 2026).
   Top to bottom: named sources, three jobs, the test gate as a bar, six channels. One topic travels the map;
   each beat moves it one stop or lights one row of "how it runs". Content from strategy S3, S6, S7; the AI
   levels are the brief's three: AI decides (inside rules), AI recommends (a person confirms), only a person. */
const FM_SOURCES = [["Plan policies", "Renee, Knowledge Operations lead"], ["Knowledge articles", "Priya, author"], ["Legal wording", "Tom, Legal and Compliance"], ["Clinical guidance", "Grace, then Ruth, clinical reviewers"], ["Drafts in progress", "Priya's new answers, not yet approved"]];
/* Which technique runs at which step of "How it runs", by job and row, so the tags sit on the step that uses them */
const FM_RUNTECH = [
  [["PII redaction"], ["Prompt-injection filtering"], ["LLM-based extraction"], ["LLM-based extraction"], ["LLM-based extraction"], ["Semantic deduplication"]],
  [[], [], [], [], ["Drift detection", "Knowledge graph"], ["Temporal versioning", "Knowledge graph"]],
  [[], ["Role-based pre-filter", "Hybrid retrieval", "Knowledge graph retrieval", "Constrained rendering"], ["Temporal versioning"], ["Grounded generation with abstention"], ["Gap clustering"], []],
  [["Golden set", "Per-group release gates"], ["Sealed holdout"], ["Adversarial probe suites"], [], ["Per-group release gates"], ["LLM-as-judge (not provable yet)"]]
];
const FM_CHANNELS = [["Phone bot", "June, calling before work"], ["Member chat", "member website chat, June"], ["Agent Assist", "beside Dana and Luis"], ["Advocate search", "Dana and Luis, at the desk"], ["Texts and calls", "outbound to June"], ["Member website", "plan pages June reads"]];
const FM_JOBS = [
  { n: "Ingest and structure", line: "long documents split into short answers", take: "Every document becomes short topics, with Legal's words locked. Nothing is readable until a person approves it.",
    w: "Pulls each changed document and runs five steps in order: check for hidden instructions, sort, extract topics, date the facts, find every copy", y: "Every channel starts from the same approved topics instead of its own copy of the document", h: "Exact wording matches its source, character for character; a different wording is never merged; a planted instruction never gets through",
    inp: "Source documents: plan policies, knowledge articles, Tom's legal wording, Grace's clinical guidance, Priya's drafts", out: "Proposed topics, with exact wording marked, waiting for approval in Job 2",
    run: [["rule", "System", "Pulls the changed document from its source; records its hash, version and owner"], ["rule", "System", "1. Check: a fixed rule holds back any line written as an order to an AI; Renee reviews the log"], ["rec", "AI recommends", "2. Sort: proposes skip, keep, flag as stale or route as clinical; Priya confirms"], ["ai", "AI decides", "3. Extract: splits it into topics and marks Legal's exact wording; Priya accepts or edits"], ["rec", "AI recommends", "4. Date: reads tables into facts with a year, owner and end date; the owner approves"], ["rec", "AI recommends", "5. Find every copy: finds the same clause elsewhere and proposes one, never merges; Tom, Grace or Renee decides, never the proposer"]],
    checks: [["Exact wording matches the source, character for character", "golden set"], ["Two different wordings are never merged", "release test"], ["A planted instruction inside a document never changes an answer", "golden set"], ["Member identifiers are removed before anything is stored", "release test"]],
    tags: [["LLM-based extraction", "A model reads a long document and pulls out short, self-contained answers"], ["Semantic deduplication", "Finds sentences that mean the same thing even when worded differently"], ["Prompt-injection filtering", "Treats document text as data and flags any line that tries to give the AI orders"], ["PII redaction", "Removes names, member IDs and other personal details before anything is stored"]], vend: ["Knowledge platforms already draft articles from files and list likely duplicates for an admin to confirm", "Cloud search services ingest the latest file version only when versioning is turned on", "Build, buy or partner: buy the search pieces from the cloud already in use, build the approval and copy rules"] },
  { n: "Govern and approve", line: "one approved version, dated, scoped", take: "The right person approves each answer once. Every version carries its start and end dates, and a source change raises one alert that finds every copy.",
    w: "Runs five steps in order: rules check, clinical sign-off, resolve conflicts, review clocks, catch drift; then stores the approved version with its dates and readers", y: "There is one signed original, and every channel points at it instead of holding a copy", h: "Only approved, in-date topics are ever served; a formatting-only edit raises no alert",
    inp: "Proposed topics from Job 1; an approval from Tom, Grace or Renee; a new version of any source document", out: "Approved topics, in date and in scope, for Job 3; one grouped drift alert per source change",
    run: [["rule", "System", "1. Rules check: runs the checks a machine can (approved text, exact wording, dates); the right approver ticks, and an author can never approve their own work"], ["person", "Grace, then Ruth", "2. Clinical sign-off: the pharmacist signs, then a second clinical sign-off before it goes live"], ["rec", "AI recommends", "3. Resolve conflicts: puts two official wordings side by side and raises them to Tom; it never picks"], ["rule", "System", "4. Review clocks: counts each review in working days; a reminder, then an escalation, then a backup reviewer"], ["rule", "System", "5. Catch drift: when a source changes, compares it word by word, ignores formatting-only edits and raises one alert listing every copy; AI proposes the edit and the same approver approves"], ["rule", "System", "Stores the approved version with its start and end dates and who may read it"]],
    checks: [["A draft or an expired topic is never served, in any channel", "golden set"], ["A topic switches on its start date, in every channel", "golden set"], ["A formatting-only edit raises no alert", "release test"], ["A changed source sends its translation back to a qualified translator; a machine draft is never served", "golden set, release test"], ["Every answer cites its topic id and version", "golden set"]],
    tags: [["Knowledge graph", "Links each answer to its source, its owner and every place it is used"], ["Temporal versioning", "Every version has a start and end date, so the right one is served on the day"], ["Drift detection", "When a source changes, compares it word by word and alerts every place the copy lives"]], vend: ["Enterprise copilots read only published articles, but people with permission can still open drafts", "Knowledge platforms flag stale articles by date and route gap tasks to an author"],
    loop: { t: "The drift loop: why a source change cannot leave a stale copy anywhere", s: [["1 · A source changes", "Tom files a new version of the legal wording; one clause has changed"], ["2 · One alert", "The system diffs every tracked clause and raises one alert listing every topic built from it"], ["3 · One decision", "AI proposes the edit; Tom, as the approver for legal wording, approves it once"], ["4 · Everywhere at once", "Job 3 serves the new version to every channel from its start date; no drawer keeps a copy"]] } },
  { n: "Serve every channel", line: "the same answer, or none", take: "Every channel gets the same approved answer with its source, or an honest 'not yet' that becomes the next answer to write.",
    w: "Runs five steps: one cited answer, right date never a draft, no answer no guess, close the gaps, pin the top answer", y: "June gets one answer whether she calls, chats, texts or reads the website, and Dana sees the same one", h: "Never a topic outside the role; never a guess; the exact wording identical in every channel",
    inp: "Approved topics from Job 2; a question from one of the six channels, with the asker's role and today's date", out: "One cited answer per channel, or none; every unanswered question in the gap log, redacted",
    run: [["rule", "System", "Crisis words skip everything: 911, 988 and a person, before any search"], ["ai", "AI decides", "1. One cited answer: searches only approved, in-date topics the asker's role may read, ranks them, and renders Legal's exact wording by template with its source"], ["rule", "System", "2. Right date, never a draft: serves only the version in force today; drafts and next year's version stay hidden until their start date"], ["rule", "System", "3. No answer, no guess: says 'not yet', offers a person and logs the question with personal details removed"], ["rec", "AI recommends", "4. Close the gaps: groups unanswered questions, drafts from a source, suggests members' own words, spots process problems; Priya writes, Renee confirms"], ["rec", "AI recommends", "5. Pin the top answer: suggests pinning the approved answer to the most-asked question; Renee confirms"]],
    checks: [["A member never receives staff-only content", "golden set, every role"], ["No guess when nothing approved answers", "golden set"], ["The exact wording identical in chat, voice, text and web", "golden set, every channel"], ["Every abstention appears in the gap log", "release test"]],
    tags: [["Temporal versioning", "Only the version in force today is served; drafts and next year's wording wait for their date"], ["Knowledge graph retrieval", "Follows the links from a question to the one approved answer"], ["Hybrid retrieval", "Combines keyword matching with meaning matching, so both exact terms and paraphrases are found"], ["Role-based pre-filter", "Removes what this person may not see before the search runs"], ["Grounded generation with abstention", "Answers only from the cited source, and says so when there is no approved answer"], ["Constrained rendering", "Exact wording is inserted by template, never retyped by the model"], ["Gap clustering", "Groups unanswered questions so the owner sees what to write first"]], vend: ["Cloud answer services cite a source per sentence, but it points to a chunk of a document, not an approved answer", "Buy the vector and keyword index and grounding scores from the cloud already in use"],
    loop: { t: "The gap loop: how a missing answer becomes a written one", s: [["1 · No approved topic", "June asks about a vaccine the plan has no topic for; the channel says it has none"], ["2 · Logged, grouped", "The system records the redacted question and groups it with others like it"], ["3 · Priya's queue", "The gap goes on Priya's list of answers to write; she drafts the topic"], ["4 · Renee decides", "Write it, or fix the process behind the question; a written topic goes through Jobs 1 and 2 as usual"]] } },
  { n: "Test every release", line: "the gate every change passes before it reaches a channel", take: "Every release is graded against answers written before building, group by group, plus a sealed set nobody tuned to. One red row blocks it.",
    w: "Runs four kinds of test before every release: a golden set, a sealed holdout, blind probes, and every past miss", y: "Quality is proven group by group, not assumed from an average", h: "Every number is computed in the browser by the same code as the full runner; the holdout is separated and sealed, not independent, and we say so",
    inp: "Every change to the system, before release", out: "A release that reaches the channels, or a red row that stops it",
    run: [["rule", "System", "1. Golden set: 21 questions with known right answers, written before building, run for every role and channel; each group must pass on its own"], ["rule", "System", "2. Sealed holdout: 11 questions nobody tuned to, run once; a hash proves the set was never changed"], ["rule", "System", "3. Blind probes: 430 questions from a writer who never saw the rules, plus 234 regression checks; every must-refuse question refused"], ["rule", "System", "4. Every miss becomes a test: a failure is added as a row, never fixed quietly; a disputed label is set aside and shown"], ["rule", "System", "5. Release gate: one red rule row on any group blocks release; false refusals at most 10%, tightening to 2%"], ["person", "Renee signs", "Renee signs; Tom and Engineering co-sign the monitoring plan; what a prototype cannot prove stays named and open"]],
    checks: [["Every question about personal data is handed to a person", "100% required"], ["False refusals stay under the bar", "at most 10%, goal 2%"], ["The holdout hash matches the one recorded before the first run", "every release"], ["Each role and channel passes on its own, not on the average", "every release"]],
    tags: [["Golden set", "Fixed questions with known right answers, rerun on every change"], ["Adversarial probe suites", "Tricky questions written to make it fail"], ["Sealed holdout", "Questions the builders never see, checked by a hash, used only at release"], ["Per-group release gates", "Each group must pass on its own, so an average cannot hide a failure"], ["LLM-as-judge", "A model grades answers, and is trusted only once it agrees with two people"]], vend: [] }
];

/* geometry, viewBox 1340 x 840 */
const FM = (() => {
  const W = 1340, H = 840, SY = 46, SH = 68, SW = 232, sX = i => 40 + i * 262, JY = 310, JH = 124, JW = 280, jX = i => 120 + i * 410, GY = 550, GH = 66, GX = 120, GW = 1100, CY = 740, CH = 68, CW = 196, cX = i => 40 + i * 214;
  const sc = i => [sX(i) + SW / 2, SY + SH], entry = i => [jX(0) + 36 + i * 57, JY];
  const vcurve = (a, b) => `M${a[0]} ${a[1]} C ${a[0]} ${(a[1] + b[1]) / 2}, ${b[0]} ${(a[1] + b[1]) / 2}, ${b[0]} ${b[1]}`;
  const seg = pts => pts.map((q, k) => (k ? "L" : "M") + q[0] + " " + q[1]).join(" ");
  const T = i => [jX(i) + JW / 2, JY], R = i => [jX(i) + JW, JY], RB = i => [jX(i) + JW, JY + JH], B = i => [jX(i) + JW / 2, JY + JH];
  return { W, H, SY, SH, SW, sX, JY, JH, JW, jX, GY, GH, GX, GW, CY, CH, CW, cX, sc, entry, vcurve, seg,
    srcPaths: FM_SOURCES.map((_, i) => vcurve(sc(i), entry(i))),
    j12: `M${jX(0) + JW} ${JY + JH / 2} L${jX(1)} ${JY + JH / 2}`, j23: `M${jX(1) + JW} ${JY + JH / 2} L${jX(2)} ${JY + JH / 2}`, j3g: `M${jX(2) + JW / 2} ${JY + JH} L${jX(2) + JW / 2} ${GY}`,
    chPaths: FM_CHANNELS.map((_, i) => `M${cX(i) + CW / 2} ${GY + GH} L${cX(i) + CW / 2} ${CY}`),
    gapLoop: `M${jX(2) + JW - 50} ${JY} C ${jX(2) + JW - 50} ${JY - 90}, ${sX(4) + SW / 2 + 40} ${SY + SH + 120}, ${sX(4) + SW / 2 + 40} ${SY + SH + 2}`,
    driftLoop: `M${sX(2) + SW - 24} ${SY + SH} C ${sX(2) + SW - 24} ${JY - 110}, ${jX(1) + JW - 40} ${JY - 120}, ${jX(1) + JW - 40} ${JY - 2}`,
    hops: [vcurve(sc(0), entry(0)) + " L" + T(0).join(" "), seg([T(0), R(0), [jX(1), JY], T(1)]), seg([T(1), R(1), [jX(2), JY], T(2)]), seg([T(2), R(2), RB(2), B(2), [jX(2) + JW / 2, GY]]), seg([[jX(2) + JW / 2, GY], [GX + GW, GY], [GX + GW, GY + GH], [cX(5) + CW / 2, GY + GH], [cX(5) + CW / 2, CY]])],
    stops: [sc(0), T(0), T(1), T(2), [jX(2) + JW / 2, GY], [cX(5) + CW / 2, CY]] };
})();
const FM_BEATS = [{ stop: 0, job: -1, rows: 0 }]; FM_JOBS.forEach((s, i) => { FM_BEATS.push({ stop: i + 1, job: i, rows: 0 }); s.run.forEach((_, k) => FM_BEATS.push({ stop: i + 1, job: i, rows: k + 1 })); }); FM_BEATS.push({ stop: 5, job: 3, rows: FM_JOBS[3].run.length });
let fmBuild = 0; const FM_BUILD_MAX = 8;
function fmSetBuild(n) { fmBuild = Math.max(0, Math.min(FM_BUILD_MAX, n)); const w = document.querySelector(".fm-wrap"); if (w) w.dataset.build = fmBuild; }
let fmBeat = 0, fmActive = -1, fmStop = 0, fmRows = 0, fmTimer = null, fmAnim = null;
const FM_REDUCED = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/* The stage markup: headline row with play and stop, the map, the legend, the footnote, the exhibit, the next button */
let FM_NEXT = "";
function flowHTML(nextLabel) {
  FM_NEXT = nextLabel;
  return `<div class="appr2 fm-wrap"><div class="fm-head"><div><p class="eyebrow">Solution architecture</p>
    <h2>One approved answer, on every channel.</h2>
    <p class="big2">Fix the knowledge once, at the source. Every channel, human or AI, reads the same answer.</p></div>
    <div class="fm-icons"><button class="icb primary" id="fmPlay" title="Play slowly" aria-label="Play slowly"></button><button class="icb" id="fmStop" title="Stop" aria-label="Stop"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg></button></div></div>
    <div id="fm"></div>
    <p class="fm-legend"><span class="fm-dash"></span>dashed green: a feedback loop, running back against the flow</p>
    <div class="fm-panel" id="fmPanel"></div>
    <button class="btn primary" id="toNew" style="display:none">${esc(nextLabel)}</button></div>`;
}
function fmTile(x, y, w, h, t, s, cls) {
  const max = Math.floor((w - 28) / 6.7), words = String(s).split(" "), ln = [""];
  words.forEach(wd => { const L = ln[ln.length - 1]; if (L && (L + " " + wd).length > max) ln.push(wd); else ln[ln.length - 1] = L ? L + " " + wd : wd; });
  const two = ln.length > 1, ly = two ? y + 25 : y + h / 2 - 3, sy = two ? y + 43 : y + h / 2 + 16;
  return `<g class="fm-tile ${cls}"><rect class="fm-box" x="${x}" y="${y}" width="${w}" height="${h}"/><text class="fm-lbl" x="${x + 16}" y="${ly}">${esc(t)}</text><text class="fm-sub" x="${x + 16}" y="${sy}">${ln.slice(0, 2).map((l, i) => `<tspan x="${x + 16}" dy="${i ? 15 : 0}">${esc(l)}${i < Math.min(ln.length, 2) - 1 ? " " : ""}</tspan>`).join("")}</text></g>`; }
function fmJob(i) { const s = FM_JOBS[i], g = FM, x = g.jX(i); return `<g class="fm-job" data-i="${i}" role="button" tabindex="0" aria-label="Job ${i + 1}: ${esc(s.n)}"><rect class="fm-ring" x="${x - 5}" y="${g.JY - 5}" width="${g.JW + 10}" height="${g.JH + 10}"/><rect class="fm-bg" x="${x}" y="${g.JY}" width="${g.JW}" height="${g.JH}"/><text class="fm-num" x="${x + 20}" y="${g.JY + 32}">JOB ${i + 1}</text><text class="fm-lbl" x="${x + 20}" y="${g.JY + 64}">${esc(s.n)}</text><text class="fm-sub" x="${x + 20}" y="${g.JY + 90}">${esc(s.line)}</text></g>`; }
function fmGate() { const s = FM_JOBS[3], g = FM; return `<g class="fm-job fm-gate" data-i="3" role="button" tabindex="0" aria-label="Job 4: ${esc(s.n)}"><rect class="fm-ring" x="${g.GX - 5}" y="${g.GY - 5}" width="${g.GW + 10}" height="${g.GH + 10}"/><rect class="fm-bg" x="${g.GX}" y="${g.GY}" width="${g.GW}" height="${g.GH}"/><text class="fm-num" x="${g.GX + 22}" y="${g.GY + 27}">JOB 4</text><text class="fm-lbl" x="${g.GX + 22}" y="${g.GY + 50}">${esc(s.n)}</text><text class="fm-sub" x="${g.GX + 280}" y="${g.GY + 40}">a fixed question set plus hidden tests · any failure blocks · Renee signs</text></g>`; }
function flowMount() {
  const g = FM, el = document.getElementById("fm"); if (!el) return;
  el.innerHTML = `<svg class="fm-svg" id="fmSvg" viewBox="0 0 ${g.W} ${g.H}" role="img" aria-label="Flow map of the governed knowledge layer: sources at the top, four jobs, six channels at the bottom">
   <defs><marker id="fmM" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9z" fill="#cfd6c9"/></marker><marker id="fmG" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 9 4.5 0 9z" fill="#72992e"/></marker></defs>
   <text class="fm-col" x="40" y="${g.SY - 16}">SOURCES · WHAT GOES IN, AND WHO OWNS IT</text>
   <text class="fm-col" x="40" y="${g.CY + g.CH + 24}">CHANNELS · WHO READS IT</text>
   ${g.srcPaths.map((d, i) => `<path class="fm-p k-src${i === 4 ? " k-draft" : ""}" d="${d}" marker-end="url(#fmM)"/>`).join("")}
   <path class="fm-p k-j12" d="${g.j12}" marker-end="url(#fmM)"/><path class="fm-p k-j23" d="${g.j23}" marker-end="url(#fmM)"/><path class="fm-p k-j3g" d="${g.j3g}" marker-end="url(#fmM)"/>
   ${g.chPaths.map(d => `<path class="fm-p k-ch" d="${d}" marker-end="url(#fmM)"/>`).join("")}
   <path class="fm-loop k-gap" d="${g.gapLoop}" marker-end="url(#fmG)"/><path class="fm-loop k-drift" d="${g.driftLoop}" marker-end="url(#fmG)"/>
   <text class="fm-looplbl k-gap" x="${g.jX(2) + g.JW - 62}" y="${g.JY - 74}" text-anchor="end"><tspan>Gap loop ↑</tspan><tspan class="fm-loopsub" x="${g.jX(2) + g.JW - 62}" dy="17">unanswered questions go back to Priya</tspan></text>
   <text class="fm-looplbl k-drift" x="${g.sX(2) + g.SW - 36}" y="${Math.round((g.SY + g.SH + g.JY) / 2) - 6}" text-anchor="end"><tspan>Drift loop ↓</tspan><tspan class="fm-loopsub" x="${g.sX(2) + g.SW - 36}" dy="17">a changed source raises one alert for every copy</tspan></text>
   ${FM_SOURCES.map((s, i) => fmTile(g.sX(i), g.SY, g.SW, g.SH, s[0], s[1], i === 4 ? "k-sbox k-draft" : "k-sbox")).join("")}
   ${FM_CHANNELS.map((c, i) => fmTile(g.cX(i), g.CY, g.CW, g.CH, c[0], c[1], "k-cbox")).join("")}
   ${[0, 1, 2].map(fmJob).join("")}${fmGate()}
   <g id="fmTrav" class="fm-trav"><circle class="fm-halo" r="11"><animate attributeName="r" values="9;14;9" dur="1.8s" repeatCount="indefinite"/></circle><circle class="fm-core" r="5.5"/></g></svg>`;
  el.querySelectorAll(".fm-job").forEach(j => { const jump = () => fmGo(FM_BEATS.findIndex(b => b.job === +j.dataset.i && b.rows === 0)); j.onclick = jump; j.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); jump(); } }; });
  document.getElementById("fmStop").onclick = () => { if (fmTimer) { clearInterval(fmTimer); fmTimer = null; } fmGo(0); };
  document.getElementById("fmPlay").onclick = fmPlay;
  if (!flowMount.keys) { flowMount.keys = true; document.addEventListener("keydown", e => { if (!document.getElementById("fm")) return; if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.key === "ArrowRight") { if (fmBuild < FM_BUILD_MAX) fmSetBuild(fmBuild + 1); else fmGo(fmBeat + 1); e.preventDefault(); } if (e.key === "ArrowLeft") { if (fmBeat === 0 && fmBuild > 0) fmSetBuild(fmBuild - 1); else fmGo(fmBeat - 1); e.preventDefault(); } }); }
  fmSetBuild(0);
  fmBeat = 0; fmActive = -1; fmStop = 0; fmRows = 0; fmPlace(FM.stops[0]); fmGo(0);
}
function fmPlace(pt) { const t = document.getElementById("fmTrav"); if (t) t.setAttribute("transform", `translate(${pt[0]} ${pt[1]})`); }
function fmMove(from, to) {
  if (fmAnim) cancelAnimationFrame(fmAnim);
  if (FM_REDUCED) { fmPlace(FM.stops[to]); return; }
  const step = from < to ? 1 : -1; let i = from;
  const hop = () => { if (i === to) { fmPlace(FM.stops[to]); return; }
    const idx = step > 0 ? i : i - 1, path = document.createElementNS("http://www.w3.org/2000/svg", "path"); path.setAttribute("d", FM.hops[idx]);
    const L = path.getTotalLength(), t0 = performance.now(), dur = Math.max(700, L / 0.45);
    const tick = now => { let u = Math.min(1, (now - t0) / dur); u = 1 - Math.pow(1 - u, 2); const p = path.getPointAtLength((step > 0 ? u : 1 - u) * L); fmPlace([p.x, p.y]); if (u < 1) fmAnim = requestAnimationFrame(tick); else { i += step; hop(); } };
    fmAnim = requestAnimationFrame(tick); };
  hop();
}
function fmFocus() {
  const svg = document.getElementById("fmSvg"); if (!svg) return; svg.classList.toggle("fm-focus", fmActive >= 0);
  const lit = { src: [0], j12: [0, 1], j23: [1, 2], j3g: [2, 3], ch: [2, 3], gap: [2], drift: [1], sbox: [0], cbox: [2, 3] };
  Object.entries(lit).forEach(([k, jobs]) => svg.querySelectorAll(".k-" + k).forEach(n => { n.classList.remove("lit", "dim"); if (fmActive < 0) return; const on = jobs.includes(fmActive); if (on && !/box/.test(k)) n.classList.add("lit"); if (!on) n.classList.add("dim"); }));
  svg.querySelectorAll(".fm-job").forEach(j => j.classList.toggle("on", +j.dataset.i === fmActive));
}
function fmGo(b) {
  { const t = FM_BEATS[Math.max(0, Math.min(FM_BEATS.length - 1, b))] || {}, w = document.querySelector(".fm-wrap");
    if (t.job >= 0) { fmSetBuild(Math.max(fmBuild, 3 + Math.min(t.job, 3))); if (w) w.classList.add("showpanel"); } }
  const prev = fmStop; fmBeat = Math.max(0, Math.min(FM_BEATS.length - 1, b)); const x = FM_BEATS[fmBeat]; fmStop = x.stop; fmActive = x.job; fmRows = x.rows;
  fmFocus(); if (fmStop !== prev) fmMove(prev, fmStop); fmPanel();
  const pb = document.getElementById("fmPlay"); if (pb) pb.innerHTML = fmTimer ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>' : '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
}
function fmPlay() { fmSetBuild(FM_BUILD_MAX); if (fmTimer) { clearInterval(fmTimer); fmTimer = null; fmGo(fmBeat); return; } fmTimer = setInterval(() => { if (fmBeat >= FM_BEATS.length - 1) { clearInterval(fmTimer); fmTimer = null; fmGo(fmBeat); return; } fmGo(fmBeat + 1); }, 3400); fmGo(fmBeat + 1); }
function fmPanel() {
  const p = document.getElementById("fmPanel"); if (!p) return;
  if (fmActive < 0) { p.innerHTML = `<div class="fm-intro"><p>We follow one plan policy from Renee's folder to June's screen.</p><button class="btn primary" data-go="0">Begin the journey →</button></div>`; }
  else { const s = FM_JOBS[fmActive], i = fmActive;
    p.innerHTML = `<div><p class="eyebrow">Job ${i + 1} of 4 · ${esc(s.n)} <a class="fm-see" href="${["how1.html", "how2.html", "how3.html", "prove.html"][i]}">See it run →</a></p><p class="fm-ktl">${esc(s.take)}</p>
     <div class="fm-io"><div><b>What comes in</b>${esc(s.inp)}</div><div><b>What goes out</b>${esc(s.out)}</div></div>
     <ul class="fm-bul"><li><b>What it does</b><span>${esc(s.w)}</span></li><li><b>Why it matters</b><span>${esc(s.y)}</span></li><li><b>How we know</b><span>${esc(s.h)}</span></li></ul>
     ${s.loop ? `<div class="fm-loopx"><p class="eyebrow">${esc(s.loop.t)}</p><ol>${s.loop.s.map(x => `<li><b>${esc(x[0])}</b>${esc(x[1])}</li>`).join("")}</ol></div>` : ""}<p class="eyebrow" style="margin-top:16px">What we check before release</p><ul class="fm-chk">${s.checks.map(c => `<li><span>${esc(c[0])}</span><em>${esc(c[1])}</em></li>`).join("")}</ul></div>
     <div class="fm-deep"><p class="eyebrow">How it runs, step by step</p><ol class="fm-run">${s.run.map((r, k) => `<li class="${k < fmRows ? "show" : ""}${k === fmRows - 1 ? " now" : ""}"><span class="fm-who ${r[0]}">${esc(r[1])}</span><span><span class="rt">${esc(r[2])}</span>${((FM_RUNTECH[fmActive] || [])[k] || []).length ? `<span class="fm-rtech">${FM_RUNTECH[fmActive][k].map(t => `<i>${esc(t)}</i>`).join("")}</span>` : ""}</span></li>`).join("")}</ol>
     
     <div class="fm-legend2"><span class="fm-who rule">System</span> a fixed rule <span class="fm-who ai">AI decides</span> inside rules <span class="fm-who rec">AI recommends</span> a person confirms <span class="fm-who person">Name</span> only a person</div><details><summary>Techniques used</summary><dl class="fm-tech">${s.tags.map(t => `<dt>${esc(t[0])}</dt><dd>${esc(t[1])}</dd>`).join("")}</dl>${((typeof FM_VEND !== "undefined" && FM_VEND[fmActive]) || s.vend || []).length ? `<p class="eyebrow" style="margin-top:10px">Ready to build on</p><ul class="fm-vend">${((typeof FM_VEND !== "undefined" && FM_VEND[fmActive]) || s.vend).map(v => `<li>${esc(v)}</li>`).join("")}</ul>` : ""}</details></div>
     <div class="fm-nav"><button class="btn" data-go="${i - 1}" ${i === 0 ? "disabled" : ""}>← Back a job</button><div class="fm-dots">${FM_JOBS.map((_, j) => `<span class="${j === i ? "on" : ""}"></span>`).join("")}</div>${i < 3 ? `<button class="btn primary" data-go="${i + 1}">Job ${i + 2}: ${esc(FM_JOBS[i + 1].n)} →</button>` : `<button class="btn primary" onclick="document.getElementById('toNew').click()">${esc(FM_NEXT)}</button>`}</div>`; }
  p.querySelectorAll("[data-go]").forEach(b => b.onclick = () => { const j = +b.dataset.go; fmGo(j < 0 ? 0 : FM_BEATS.findIndex(x => x.job === j && x.rows === 0)); });
}
/* Plain-words step text, one line each (same steps; "Start", "First" and "Last" run outside the numbered steps) */
[
  ["Start: pulls each new or changed document and records its hash (a digital fingerprint), version and owner, so any later change is spotted",
   "1. Check: holds back any line that tries to give the AI orders; Renee reviews it",
   "2. Sort: AI suggests what to keep, skip, flag as out of date, or send to a pharmacist; Priya confirms",
   "3. Extract: AI splits the document into short topics and marks Legal's exact words; Priya accepts",
   "4. Date: AI gives every price or fact its year, owner and end date; the owner approves",
   "5. Find every copy: AI compares the documents already pulled in, shows the differences; Priya proposes, the content's approver decides which stays (Tom for Legal's wording)"],
  ["1. Rules check: checks the wording and dates, and that nobody approves their own work; the right approver signs",
   "2. Clinical sign-off: a pharmacist signs, then the medical director, before it goes live",
   "3. Resolve conflicts: AI puts two official wordings side by side; Tom picks one",
   "4. Review clocks: a late review gets a reminder, then goes to a backup reviewer",
   "5. Catch drift: when a source changes, one alert lists every copy; AI drafts the fix; the approver signs once",
   "Last: stores the approved version with its start and end dates and who may read it"],
  ["First: crisis words go straight to 911, 988 and a person, before any search",
   "1. One cited answer: searches only approved, current answers the asker may see, and shows Legal's exact words with the source",
   "2. Right date: serves only today's version; drafts and next year's wording stay hidden",
   "3. No answer, no guess: says 'not yet', offers a person and logs the question",
   "4. Close the gaps: AI groups unanswered questions and drafts answers; Priya writes, Renee confirms",
   "5. Pin the top answer: AI suggests pinning the approved answer to the most-asked question; Renee confirms"],
  ["1. Golden set: the answer key, 21 questions, checked for every role and channel",
   "2. Held-out test set: 11 questions kept locked away and never tuned to; a hash proves nobody changed them",
   "3. Red-team testing: 430 trick questions from someone who never saw the rules, plus 234 regression tests",
   "4. Regression tests: every failure is added as a new test, never fixed quietly",
   "5. Release gate: if any safety rule fails, on any group, nothing ships",
   "Last: Renee signs the release; Legal and Engineering sign the monitoring plan"]
].forEach((rows, j) => rows.forEach((t, k) => { if (FM_JOBS[j] && FM_JOBS[j].run[k]) FM_JOBS[j].run[k][2] = t; }));
