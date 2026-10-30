#!/usr/bin/env node
// valued-deep check: keys resolve, no em-dashes outside quotes, no placeholder names, register counts.
// Usage: node .claude/skills/valued-deep/check.js <out dir, default out/deep>
const fs = require('fs'), path = require('path');
const dir = process.argv[2] || 'out/deep';
const read = f => { const p = path.join(dir, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; };
const reg = read('citations.md');
if (!reg) { console.error(`no citations.md under ${dir}`); process.exit(2); }
const have = new Set([...reg.matchAll(/^\|\s*([A-Z]{1,3}-[A-Z]?-?\d+)\s*\|/gm)].map(m => m[1]));
const docs = ['strategy.md', 'plan.md', 'decision-log.md'].filter(f => read(f));
const placeholder = /\b(Acme|Contoso|Globex|Initech|Example Corp)\b/g;
// real organisations: same list the audit uses; allowed in citations.md only
const realCo = /\b(Anthem|Aetna|UnitedHealth|Cigna|Humana|JPMorgan|Wells Fargo|Bank of America|Citibank|Capital One|Delta Air|United Airlines|American Airlines|Walmart|Geico|Allstate|State Farm|Kaiser|Mayo Clinic|Cleveland Clinic|CVS|Walgreens|Duke Energy|PG&E|Salesforce)\b/g;
let realHits = [];
const notes = read('run-notes.md') || '';
const allowed = new Set(((notes.match(/^Allowed real names:\s*(.+)$/m) || [])[1] || '').split(/\s*,\s*/).filter(Boolean));
let unresolved = new Set(), dashes = 0, names = [];
for (const f of docs) {
  const t = read(f);
  for (const m of t.matchAll(/\[((?:[A-Z]{1,3}-[A-Z]?-?\d+)(?:\s*,\s*[A-Z]{1,3}-[A-Z]?-?\d+)*)\]/g))
    for (const k of m[1].split(/\s*,\s*/)) if (!have.has(k)) unresolved.add(`${f}:${k}`);
  for (const m of t.matchAll(/(DF-[A-G]-\d+) to (\d+)/g)) { /* ranges: check endpoints */
    const end = m[1].replace(/\d+$/, m[2].padStart(2, '0')); if (!have.has(end)) unresolved.add(`${f}:${end}`); }
  // em-dashes outside double quotes (verbatim source quotes are allowed to keep them)
  const stripped = t.replace(/"[^"\n]*"/g, '').replace(/“[^”\n]*”/g, '');
  dashes += (stripped.match(/\u2014/g) || []).length;
  for (const line of t.split('\n')) { const hits = [...line.matchAll(placeholder)].map(m => m[1]);
    if (hits.length && hits.length < 3) names.push(`${f}:${hits.join('/')}`);
    const rh = [...line.matchAll(realCo)].map(m => m[1]).filter(n => !allowed.has(n)); if (rh.length && !/\[[A-Z]{1,3}-/.test(line)) realHits.push(`${f}:${rh[0]}`); } // a line naming 3+ placeholders is quoting the rule; a keyed line is citing a source
}
const counts = {};
for (const m of reg.matchAll(/^\|[^\n]*\|\s*\*?\*?(P|S|A|J|I|computed|not found)\*?\*?\s*\|/gm)) counts[m[1]] = (counts[m[1]] || 0) + 1;
if (allowed.size) console.log('allowed real names (run-notes.md): ' + [...allowed].join(', '));
console.log(`${unresolved.size} unresolved keys · ${dashes} em-dashes · ${names.length} placeholder names · ${realHits.length} real-company names outside citations`);
if (realHits.length) console.log('real names (first 20): ' + realHits.slice(0, 20).join(', '));
if (unresolved.size) console.log('unresolved: ' + [...unresolved].slice(0, 40).join(', '));
if (names.length) console.log('placeholders: ' + names.join(', '));
console.log('register tags (by last column, approximate): ' + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ') + ` · keys ${have.size}`);
process.exit(unresolved.size || dashes || names.length || realHits.length ? 1 : 0);
