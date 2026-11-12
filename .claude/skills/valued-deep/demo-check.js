#!/usr/bin/env node
// valued-deep demo check (P-011, P-012, P-013): run on the prototype folder before every showing.
// 1. Rates beside counts agree ("4 of 253 (3.3%)" fails: 4 of 253 is 1.6%).
// 2. A shared script or stylesheet carries the same ?v= stamp on every page (a stale copy breaks pages).
// 3. The single build list (build-list.json) appears word for word on the Roadmap and in the PRD.
// 4. The talk track names every story step and every Prove it tab, and states the right tab count.
// 5. No em dashes in on-screen files.
// Usage: node .claude/skills/valued-deep/demo-check.js <proto dir> [--talk out/<case>-final-story.md]
//        [--build out/<case>-build-list.json] [--prd prd-data.js] [--roadmap plan.html]
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), dir = args[0] || '.';
const opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : null; };
const files = fs.readdirSync(dir).filter(f => /\.(html|js|md)$/.test(f) && !/holdout/i.test(f));
const read = f => fs.readFileSync(path.isAbsolute(f) ? f : path.join(dir, f), 'utf8');
const fail = [], warn = [];

// 1. rate beside count
const rateRe = /(\d+) of (\d+)[^()\n%\d]{0,60}?\((\d+(?:\.\d+)?)%\)/g;
const scan = (name, t) => { for (const m of t.matchAll(rateRe)) { const want = +m[1] / +m[2] * 100;
  if (Math.abs(want - +m[3]) > 0.15) fail.push(`rate: ${name}: "${m[0].slice(0, 80)}" (${m[1]} of ${m[2]} is ${want.toFixed(1)}%)`); } };
files.forEach(f => scan(f, read(f)));
const talk = opt('--talk'); if (talk && fs.existsSync(talk)) scan(path.basename(talk), fs.readFileSync(talk, 'utf8'));

// 2. version stamps
const stamps = {}, storySrc = files.includes('story-shared.js') ? read('story-shared.js') : '';
const storyPages = new Set([...((storySrc.match(/STORY5\s*=\s*\[([\s\S]*?)\];/) || [, ''])[1]).matchAll(/"([\w-]+\.html)/g)].map(m => m[1]).concat(['prove.html', 'prd.html']));
files.filter(f => f.endsWith('.html') && (!storyPages.size || storyPages.has(f))).forEach(f => { for (const m of read(f).matchAll(/(?:src|href)="([\w.-]+\.(?:js|css))\?v=([\w.-]+)"/g))
  (stamps[m[1]] = stamps[m[1]] || {})[m[2]] = (stamps[m[1]][m[2]] || []).concat(f); });
for (const [s, v] of Object.entries(stamps)) if (Object.keys(v).length > 1)
  fail.push(`stamp: ${s} is loaded as ${Object.entries(v).map(([k, p]) => `v=${k} (${p.join(', ')})`).join(' and ')}; bump every page together`);

// 3. single build list
const bl = opt('--build');
if (bl && fs.existsSync(bl)) { const L = JSON.parse(fs.readFileSync(bl, 'utf8'));
  const targets = [opt('--roadmap') || 'plan.html', opt('--prd') || 'prd-data.js'].filter(f => fs.existsSync(path.join(dir, f)));
  for (const kind of ['build', 'buy', 'today']) for (const item of L[kind] || []) for (const t of targets)
    if (!read(t).toLowerCase().includes(item.toLowerCase())) fail.push(`build list: "${item}" (${kind}) not found in ${t}`);
} else warn.push('build list: no --build file given; the Roadmap and PRD are not compared');

// 4. talk track coverage
if (talk && fs.existsSync(talk)) { const T = fs.readFileSync(talk, 'utf8');
  const steps = (read('story-shared.js').match(/STORY5\s*=\s*\[([\s\S]*?)\];/) || [, ''])[1];
  const stepNames = [...steps.matchAll(/\["([^"]+)",\s*"[\w.?=-]+"\]/g)].map(m => m[1]);
  stepNames.forEach(n => { if (!T.includes(n)) fail.push(`talk track: story step "${n}" not mentioned`); });
  if (files.includes('prove.html')) { const tabs = [...read('prove.html').matchAll(/\{\s*label:\s*"([^"]+)"/g)].map(m => m[1]);
    tabs.forEach(n => { if (!T.toLowerCase().includes(n.toLowerCase().split(':')[0])) fail.push(`talk track: Prove it tab "${n}" not mentioned`); });
    const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    for (const m of T.matchAll(/\b(one|two|three|four|five|six|seven|eight|nine|\d+) tabs\b/gi)) { const n = isNaN(m[1]) ? words.indexOf(m[1].toLowerCase()) : +m[1];
      if (n !== tabs.length) fail.push(`talk track: says "${m[0]}", Prove it has ${tabs.length}`); } }
} else warn.push('talk track: no --talk file given; coverage not checked');

// 5. em dashes
files.forEach(f => { const n = (read(f).match(/—/g) || []).length; if (n) fail.push(`em dash: ${f} (${n})`); });

warn.forEach(w => console.log('warn  ' + w));
fail.forEach(x => console.log('FAIL  ' + x));
console.log(fail.length ? `${fail.length} problem(s)` : 'Clean');
process.exit(fail.length ? 1 : 0);
