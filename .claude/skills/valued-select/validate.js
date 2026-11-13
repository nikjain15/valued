#!/usr/bin/env node
// Validates a /valued-select output folder: select.json and cards.json against the shape in SKILL.md
// ("Output" section and the card schema). Prints every problem and exits 1, or prints "Valid" and exits 0.
// Usage: node validate.js [dir]   (dir defaults to out/select; pass the same folder given to --out)
const fs = require("fs");
const path = require("path");

const dir = path.resolve(process.argv[2] || "out/select");
const problems = [];
const bad = (where, msg) => problems.push(`${where}: ${msg}`);
const load = (f) => {
  const p = path.join(dir, f);
  if (!fs.existsSync(p)) { bad(f, "missing"); return null; }
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { bad(f, `not valid JSON (${e.message})`); return null; }
};
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isStr = (v) => typeof v === "string";
const need = (obj, where, key, test, desc) => {
  if (!isObj(obj) || !(key in obj)) { bad(where, `missing "${key}"`); return; }
  if (test && !test(obj[key])) bad(`${where}.${key}`, `expected ${desc}`);
};
const strOrNull = (v) => v === null || isStr(v);
const score = (v) => isNum(v) && v >= 1 && v <= 5;
const STATUS = ["answered", "assumed", "client to confirm"];
const GATES = ["S", "Frame", "V", "A", "L", "U", "E", "D"];

const s = load("select.json");
if (s) {
  if (!isObj(s)) bad("select.json", "expected an object");
  else {
    need(s, "select", "audience", isStr, "a string");
    need(s, "select", "options", (v) => Array.isArray(v) && v.length > 0, "a non-empty array");
    const ids = new Set();
    (Array.isArray(s.options) ? s.options : []).forEach((o, i) => {
      const w = `select.options[${i}]`;
      need(o, w, "id", isStr, "a string"); need(o, w, "name", isStr, "a string");
      if (isObj(o) && isStr(o.id)) { if (ids.has(o.id)) bad(w, `duplicate id ${o.id}`); ids.add(o.id); }
      need(o, w, "lever", isObj, "an object");
      if (isObj(o) && isObj(o.lever)) {
        const l = o.lever, lw = `${w}.lever`;
        need(l, lw, "pool", (v) => v === null || isNum(v) || isStr(v), "a number, string or null");
        need(l, lw, "poolKey", strOrNull, "a string or null");
        need(l, lw, "units", Array.isArray, "an array");
        (Array.isArray(l.units) ? l.units : []).forEach((u, j) => {
          const uw = `${lw}.units[${j}]`;
          need(u, uw, "unit", isStr, "a string"); need(u, uw, "value", (v) => isNum(v) || isStr(v) || v === null, "a number, string or null");
          need(u, uw, "formula", isStr, "a string"); need(u, uw, "keys", Array.isArray, "an array");
        });
        need(l, lw, "pricedRange", (v) => v === null || isStr(v) || isObj(v) || Array.isArray(v), "a range or null");
        need(l, lw, "tail", strOrNull, "a string or null");
        need(l, lw, "noBenchmark", Array.isArray, "an array");
      }
      need(o, w, "chainStrength", score, "a number 1 to 5");
      need(o, w, "scores", isObj, "an object");
      if (isObj(o) && isObj(o.scores)) for (const k of ["attractiveness", "feasibility", "financial", "member", "strategic", "audience"]) need(o.scores, `${w}.scores`, k, score, "a number 1 to 5");
      need(o, w, "lensWins", Array.isArray, "an array");
      need(o, w, "qaExposure", Array.isArray, "an array");
      need(o, w, "rubricRows", (v) => isStr(v) || Array.isArray(v) || v === null, "a string, array or null");
    });
    need(s, "select", "weightings", isObj, "an object");
    if (isObj(s.weightings)) for (const k of ["client", "direct", "platform", "purePlatform"]) need(s.weightings, "select.weightings", k, isObj, "an object");
    need(s, "select", "recommendation", isObj, "an object");
    if (isObj(s.recommendation)) {
      const r = s.recommendation, rw = "select.recommendation";
      need(r, rw, "options", (v) => Array.isArray(v) && v.length >= 2 && v.length <= 3, "an array of 2 to 3 options");
      (Array.isArray(r.options) ? r.options : []).forEach((o, i) => { need(o, `${rw}.options[${i}]`, "label", isStr, "a string"); need(o, `${rw}.options[${i}]`, "tradeoff", isStr, "a string"); });
      need(r, rw, "preferred", isStr, "a string");
      if (isStr(r.preferred) && ids.size && !ids.has(r.preferred)) bad(`${rw}.preferred`, `"${r.preferred}" is not an option id`);
      need(r, rw, "why", isStr, "a string"); need(r, rw, "changeMind", isStr, "a string");
      need(r, rw, "tieBreaker", strOrNull, "a string or null");
    }
    need(s, "select", "citations", isObj, "an object");
    if (isObj(s.citations)) for (const k of ["P", "S", "AJI"]) need(s.citations, "select.citations", k, (v) => Number.isInteger(v) && v >= 0, "a count");
    need(s, "select", "governance", Array.isArray, "an array");
    (Array.isArray(s.governance) ? s.governance : []).forEach((g, i) => {
      const gw = `select.governance[${i}]`;
      need(g, gw, "question", isStr, "a string"); need(g, gw, "answer", isStr, "a string");
      need(g, gw, "status", (v) => STATUS.includes(v), STATUS.join(" | ")); need(g, gw, "owner", isStr, "a string");
    });
    need(s, "select", "assumptions", Array.isArray, "an array");
  }
}

const c = load("cards.json");
if (c) {
  if (!Array.isArray(c)) bad("cards.json", "expected an array");
  else {
    if (c.length < 2) bad("cards.json", `expected the 2 select cards, found ${c.length}`);
    c.forEach((k, i) => {
      const w = `cards[${i}]`;
      need(k, w, "id", isStr, "a string");
      need(k, w, "round", (v) => [0, 1, 2, 3].includes(v), "0 | 1 | 2 | 3");
      need(k, w, "gate", (v) => GATES.includes(v), GATES.join(" | "));
      need(k, w, "role", isStr, "a string"); need(k, w, "question", isStr, "a string"); need(k, w, "format", isStr, "a string");
      need(k, w, "options", (v) => Array.isArray(v) && v.length >= 2 && v.length <= 4, "an array of 2 to 4 options");
      (Array.isArray(k && k.options) ? k.options : []).forEach((o, j) => { need(o, `${w}.options[${j}]`, "label", isStr, "a string"); need(o, `${w}.options[${j}]`, "tradeoff", isStr, "a string"); });
      need(k, w, "multi", (v) => typeof v === "boolean", "a boolean");
      need(k, w, "decision", strOrNull, "a string or null"); need(k, w, "by", strOrNull, "a string or null");
      need(k, w, "effect", isStr, "a string");
    });
    if (!c.some((k) => k && k.gate === "S")) bad("cards.json", 'no card with gate "S"');
  }
}

if (problems.length) { console.log(`Invalid (${problems.length} problems) in ${dir}:`); for (const p of problems) console.log(`- ${p}`); process.exit(1); }
console.log("Valid");
