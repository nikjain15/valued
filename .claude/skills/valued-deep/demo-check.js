#!/usr/bin/env node
// valued-deep demo check (P-011, P-012, P-013, P-016): run on the prototype folder before every showing.
// 1. Rates beside counts agree ("4 of 253 (3.3%)" fails: 4 of 253 is 1.6%).
// 2. A shared script or stylesheet carries the same ?v= stamp on every page, subfolders included.
// 3. The single build list (build-list.json) appears word for word on the Roadmap and in the PRD.
// 4. The talk track names every story step, Prove it, the PRD and every Prove it tab, and states the tab count.
// 5. No em dashes in on-screen files, subfolders, the talk track, the build list or the PRD file.
// Usage: node .claude/skills/valued-deep/demo-check.js <proto dir> (--talk <file> | --no-talk)
//        (--build <file> | --no-build) [--prd prd-data.js] [--roadmap plan.html]
// Exit: 0 clean, 1 problems found, 2 usage error or missing proto folder.
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), dir = args[0];
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null; };
const usage = m => { console.log('FAIL  ' + m); process.exit(2); };
if (!dir || dir.startsWith('--') || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) usage(`proto folder "${dir || ''}" not found`);
if (!fs.existsSync(path.join(dir, 'story-shared.js'))) usage(`story-shared.js not found in ${dir}`);
const talk = opt('--talk'), bl = opt('--build');
if (!talk && !args.includes('--no-talk')) usage('give --talk <file> (or --no-talk on purpose)');
if (!bl && !args.includes('--no-build')) usage('give --build <file> (or --no-build on purpose)');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(path.join(d, e.name)) : [path.relative(dir, path.join(d, e.name))]);
const files = walk(dir).filter(f => /\.(html|js|md)$/.test(f) && !/holdout/i.test(f));
const read = f => fs.readFileSync(path.join(dir, f), 'utf8');
const fail = [];
const T = talk && fs.existsSync(talk) ? fs.readFileSync(talk, 'utf8') : null;
if (talk && T === null) fail.push(`talk track: ${talk} not found`);
if (bl && !fs.existsSync(bl)) fail.push(`build list: ${bl} not found`);

// 1. rate beside count
const rateRe = /(\d+) of (\d+)[^()\n%\d]{0,60}?\((\d+(?:\.\d+)?)%\)/g;
const scan = (name, t) => { for (const m of t.matchAll(rateRe)) { const want = +m[1] / +m[2] * 100;
  if (Math.abs(want - +m[3]) > 0.15) fail.push(`rate: ${name}: "${m[0].slice(0, 80)}" (${m[1]} of ${m[2]} is ${want.toFixed(1)}%)`); } };
files.forEach(f => scan(f, read(f)));
if (T) scan(path.basename(talk), T);

// 2. version stamps, every .html page
const stamps = {};
files.filter(f => f.endsWith('.html')).forEach(f => { for (const m of read(f).matchAll(/(?:src|href)="([\w./-]+\.(?:js|css))\?v=([\w.-]+)"/g))
  (stamps[m[1]] = stamps[m[1]] || {})[m[2]] = (stamps[m[1]][m[2]] || []).concat(f); });
for (const [s, v] of Object.entries(stamps)) if (Object.keys(v).length > 1)
  fail.push(`stamp: ${s} is loaded as ${Object.entries(v).map(([k, p]) => `v=${k} (${p.join(', ')})`).join(' and ')}; bump every page together`);

// 3. single build list
const roadmap = opt('--roadmap') || 'plan.html', prd = opt('--prd') || 'prd-data.js';
if (bl && fs.existsSync(bl)) { const L = JSON.parse(fs.readFileSync(bl, 'utf8'));
  const targets = [roadmap, prd].filter(f => fs.existsSync(path.join(dir, f)) || !fail.push(`build list: target ${f} not found in ${dir}`));
  for (const kind of ['build', 'buy', 'today']) for (const item of L[kind] || []) for (const t of targets)
    if (!read(t).toLowerCase().includes(item.toLowerCase())) fail.push(`build list: "${item}" (${kind}) not found in ${t}`);
}

// 4. talk track coverage
if (T) { const lower = T.toLowerCase();
  const steps = (read('story-shared.js').match(/STORY5\s*=\s*\[([\s\S]*?)\];/) || [, ''])[1];
  const names = [...steps.matchAll(/\["([^"]+)",\s*"[\w.?=-]+"\]/g)].map(m => m[1]).concat(['Prove it', 'PRD']);
  names.forEach(n => { if (!T.includes(n)) fail.push(`talk track: "${n}" not mentioned`); });
  if (files.includes('prove.html')) { const tabs = [...read('prove.html').matchAll(/\{\s*label:\s*"([^"]+)"/g)].map(m => m[1]);
    tabs.forEach(n => { if (!lower.includes(n.toLowerCase())) fail.push(`talk track: Prove it tab "${n}" not mentioned by its full label`); });
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const counts = [...T.matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|\d+) tabs\b/gi)];
    if (!counts.length) fail.push(`talk track: never states the tab count (Prove it has ${tabs.length} tabs)`);
    for (const m of counts) { const n = isNaN(m[1]) ? words.indexOf(m[1].toLowerCase()) : +m[1];
      if (n !== tabs.length) fail.push(`talk track: says "${m[0]}", Prove it has ${tabs.length}`); } }
}

// 5. em dashes
const dash = (name, t) => { const n = (t.match(/\u2014/g) || []).length; if (n) fail.push(`em dash: ${name} (${n})`); };
files.forEach(f => dash(f, read(f)));
[[talk, T], [bl, bl && fs.existsSync(bl) && fs.readFileSync(bl, 'utf8')]].forEach(([n, t]) => t && dash(n, t));
if (opt('--prd') && !files.includes(prd) && fs.existsSync(prd)) dash(prd, fs.readFileSync(prd, 'utf8'));

fail.forEach(x => console.log('FAIL  ' + x));
console.log(fail.length ? `${fail.length} problem(s)` : 'Clean');
process.exit(fail.length ? 1 : 0);
