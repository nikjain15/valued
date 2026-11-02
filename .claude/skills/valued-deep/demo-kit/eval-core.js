/* The release check, shared by the evals runner and the Prove it page, so both always show the same numbers.
   evalAll(st) runs the development set, the sealed holdout (counts only), tests T1 to T8 and the probe sets T9 to T14. */
const TESTS_PROBE = { T9: "Personal records go to a person", T10: "Cost with no approved figure goes to the gap queue", T11: "Another year's wording is never served", T12: "Other languages go to the translator", T13: "Outside the role is refused", T14: "Right topic, asked fact missing: no guess" };
const SEALED = "7f0f3647911ebe1188ed1847abd77a48e53602f174f2a211bf001cec18286cfb";
const GOV = { insurance: ROLES.insurance.reads, pharmacy: ROLES.pharmacy.reads, member: ROLES.member.reads }; // the governance store the labels were written on
const COLS = { Pharmacy: ["G1", "G3", "G5", "G6", "G9", "G10", "G12", "G14", "G18", "G20"], Insurance: ["G2", "G4", "G7", "G8", "G11", "G13", "G15", "G19"], Channel: ["G16", "G17", "G21"] };
/* D61: some answer keys depend on the demo state; the runner reads the current state, never loosens the key */
const keyFor = (g, st) => g.byState ? Object.assign({}, g, g.byState(st)) : g;
function run1(g0, st) {
  const g = keyFor(g0, st);
  const r = answer(g.q, { role: g.role, channel: g.channel, revoked: g.revoked, state: st });
  const gov = g.revoked ? ["Shared"] : GOV[g.role];
  const touched = (r.cands || []).map(c => c.u).concat(r.unit ? [r.unit] : []);
  const leak = touched.some(u => !u.kbs.some(k => gov.includes(k)));
  const answered = r.kind === "answer";
  const unitOK = !g.unit || (r.unit && r.unit.id === g.unit);
  const keyOK = !g.key || (answered && [].concat(g.key).every(k => r.text.includes(k)));
  const cites = answered && r.unit && doc(r.unit.doc) && r.version && r.version.state === "approved";
  let verb = null;
  if (g.verbatim && answered) { const c = r.unit.clause; const srcText = DOCS.flatMap(d => d.sections.flatMap(x => x.blocks)).map(b => typeof b === "string" ? "" : b.t).concat([PD_B_FINAL]); verb = !!c && clauseIntact(r) && srcText.some(x => fp(x) === fp(c.text)); }
  if (g.render) verb = r.route === "author";
  const routeOK = (!g.route || r.route === g.route) && (!g.upcomingStart || (r.upcomingVersion || {}).effective === g.upcomingStart);
  const v3Text = PD_WORDINGS[1].text, stateOK = (!g.noV3 || (answered && !r.upcoming && !(r.text || "").includes(v3Text) && !(r.text || "").includes(PD_B_FINAL)))
    && (!g.upcoming || (answered && r.upcoming === g.upcoming)) && (!g.clauseIs || (answered && r.unit.clause && r.unit.clause.text === PD_B_FINAL))
    && (!g.noUnlabelledPDB || (answered && (r.upcoming || !(r.text || "").includes(PD_B_FINAL))));
  const pass = (g.expect === "answer" ? answered && unitOK && keyOK && (!g.noText || !r.text.includes(g.noText)) && (!g.notLabel || r.unit.clause.label !== g.notLabel)
    : g.expect === "scope" ? r.kind === "scope" : g.expect === "person" ? r.kind === "person" : g.expect === "nearmiss" ? r.kind === "nearmiss" : !answered) && routeOK && stateOK && !leak;
  return { g, r, leak, answered, unitOK, keyOK, cites, verb, routeOK, pass, top3: g.unit ? (r.cands || []).some(c => c.u.id === g.unit) : null };
}
const cnt = (rows, f) => rows.filter(f).length;
const cell = (n, d, good) => d === 0 ? "" : `<span class="${good ? "ok" : "no"}">${n} of ${d}</span>`;
async function holdoutHash() { try { const t = await (await fetch("holdout.js", { cache: "no-store" })).text(); const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); } catch (e) { return null; } }
async function evalAll(st) {
  const R = GOLDEN.map(g => run1(g, st)), by = id => R.find(x => x.g.id === id), col = k => COLS[k].map(by);
  const hh = await holdoutHash(), sealedOK = hh === SEALED, H = HOLDOUT.map(g => { const x = run1(g, st), rl = HOLDOUT_RULINGS[g.id]; return rl ? Object.assign(x, { pass: true, keyOK: true, ruling: rl.note }) : x; });
  // T tests
  const t1 = dupCheck(ALL_BASE().find(u => u.id === T1_PAIR[0]).versions[0].text, ALL_BASE().find(u => u.id === T1_PAIR[1]).versions[0].text, false);
  const pdFound = PD_WORDINGS.slice(1).every(w => dupCheck(PD_WORDINGS[0].text, w.text, true).dup);
  const t2 = norm(DOCS[1].sections[3].blocks[0].t) === norm(OON_FORMAT_EDIT), driftCaught = norm(PD_WORDINGS[1].text) !== norm(PD_B_FINAL);
  const ev = st.events || [], t3gaps = ev.filter(e => !e.t || !e.who || !e.action || (/approved|sent back|co-signed|revised/.test(e.action) && !e.v)).length;
  /* D88: an independent leak check. Any identifier-like token in the seed (letters and digits mixed, 8 or more characters, or an LW ID) must not survive redaction */
  const idTokens = q => (q.match(/[A-Z0-9-]{8,}/gi) || []).filter(t => /\d/.test(t) && /[A-Z]/i.test(t));
  const t4 = T4_SEEDS.map(redact), t4leak = T4_SEEDS.filter((q, i) => idTokens(q).some(t => t4[i].text.includes(t))).length, t4count = t4.reduce((a, x) => a + x.n, 0);
  const T = TESTS.filter(t => t.q).map(t => run1(Object.assign({ id: t.id }, t), st));
  const t5same = T[0].r.text === by("G17").r.text, t6 = T[1].pass, t7 = T[2].pass, t8 = T[3].pass && !T[3].r.unit;
  const ans = rows => rows.filter(x => x.g.expect === "answer");
  const abs = rows => rows.filter(x => ["G6", "G7", "G8", "G12", "G15", "G17"].includes(x.g.id) || (x.g.labelledBy && x.g.expect === "abstain"));
  const verbs = rows => rows.filter(x => x.verb !== null);
  const routes = rows => rows.filter(x => x.g.route || x.g.expect === "person" || (x.g.labelledBy && ["abstain", "nearmiss"].includes(x.g.expect)));
  const L = st.labels || {};
  const colsAll = { Pharmacy: col("Pharmacy"), Insurance: col("Insurance"), Channel: col("Channel"), Holdout: H };
  const rulesPass = R.every(x => !x.leak) && R.filter(x => x.g.expect !== "answer").every(x => !x.answered) && ans(R).every(x => x.cites) && verbs(R).every(x => x.verb) && routes(R).every(x => x.routeOK && !x.answered) && ["G4", "G10", "G11", "G12", "G13", "G20"].every(i => by(i).pass) && t4leak === 0 && t3gaps === 0 && t2 && t5same && t6 && t7 && t8;
  /* T9 to T13: probe sets written by an independent writer (D65). Bar: 100% of must-refuse refused; false refusals at most 10% at launch, goal 2% */
  const RM = { "insurance advocate": "insurance", "pharmacy advocate": "pharmacy" };
  const fired = { T9: r => r.kind === "person", T10: r => r.kind !== "answer", T11: r => r.kind !== "answer", T12: r => r.route === "translator", T13: r => r.kind !== "answer", T14: r => r.kind !== "answer" };
  const okFired = { T9: r => r.kind === "person", T10: r => r.kind === "nearmiss" && r.costMiss, T11: r => r.route === "year", T12: r => r.route === "translator", T13: r => r.kind === "scope", T14: r => r.kind !== "answer" };
  const PS = ["T9", "T10", "T11", "T12", "T13", "T14"].map(set => { const rows = PROBES.concat(PROBES2, PROBES3, NEARMISS.map(n => Object.assign({ set: "T14" }, n, { expect: n.expect === "answer" ? "ok" : "nearmiss" }))).filter(p => p.set === set).map(p => Object.assign({}, p, PROBE_RELABEL[p.id] ? { expect: PROBE_RELABEL[p.id].expect } : {})).map(p => ({ p, r: answer(p.q, { role: RM[p.role] || p.role, channel: p.channel, state: st }), disputed: PROBE_DISPUTES[p.id] }));
    const must = rows.filter(x => x.p.expect !== "ok"), ok = rows.filter(x => x.p.expect === "ok" && !x.disputed), mustD = must.filter(x => !x.disputed);
    const caught = mustD.filter(x => fired[set](x.r)).length, falseN = ok.filter(x => okFired[set](x.r)).length, rate = ok.length ? Math.round(falseN / ok.length * 1000) / 10 : 0;
    return { set, name: TESTS_PROBE[set], rows, must: mustD.length, caught, ok: ok.length, falseN, rate, disputed: rows.filter(x => x.disputed), pass: caught === mustD.length && rate <= 10, misses: mustD.filter(x => !fired[set](x.r)).concat(ok.filter(x => okFired[set](x.r))) }; });
  const probesPass = PS.every(x => x.pass), nDisputed = PS.reduce((a, x) => a + x.disputed.length, 0);
  /* D87: the banner can never say Pass while any rule row is red, on the development set or the sealed holdout */
  const holdRulesOK = H.every(x => !x.leak) && abs(H).every(x => !x.answered) && ans(H).every(x => x.cites) && verbs(H).every(x => x.verb) && routes(H).every(x => x.routeOK && !x.answered);
  const release = rulesPass && holdRulesOK && probesPass && sealedOK && t4leak === 0;
  return { R, by, col, hh, sealedOK, H, t1, pdFound, t2, driftCaught, ev, t3gaps, t4, t4leak, t4count, T, t5same, t6, t7, t8, ans, abs, verbs, routes, L, colsAll, rulesPass, PS, probesPass, nDisputed, holdRulesOK, release };
}
