// Key word timing: page `at` against when the word is said, mapped to film time
// node keywords.mjs <film.html> <recording name> <words.vtt> '<at>=<said>;...'
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
const [film, rec, vtt, spec] = process.argv.slice(2);
const html = readFileSync(film, 'utf8');
const clips = [...html.matchAll(/<video\b[^>]*src="([^"#]+)#t=([\d.]+),([\d.]+)"[^>]*at="([\d.]+)"/g)]
  .filter((m) => basename(decodeURI(m[1])) === rec).map((m) => ({ in: +m[2], out: +m[3], at: +m[4] }));
const clock = (t) => t.split(':').reduce((a, b) => a * 60 + +b, 0);
const words = [];
for (const block of readFileSync(vtt, 'utf8').split(/\r?\n\r?\n/)) {
  const m = block.match(/([\d:.]+)\s*-->\s*([\d:.]+)[^\n]*\n([\s\S]*)/);
  if (!m) continue;
  const parts = m[3].replace(/\r?\n/g, ' ').split(/<([\d:.]+)>/);
  let t = clock(m[1]);
  for (let k = 0; k < parts.length; k += 2) {
    if (k) t = clock(parts[k - 1]);
    for (const w of parts[k].trim().split(/\s+/).filter(Boolean)) words.push({ w: w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''), s: t });
  }
}
// Each spoken occurrence in film time
const stream = words.map((w) => w.w).join('');
const owner = [];
words.forEach((w) => { for (let i = 0; i < w.w.length; i++) owner.push(w); });
const toFilm = (s) => { const c = clips.find((x) => s >= x.in - 0.15 && s < x.out); return c ? c.at + Math.max(s - c.in, 0) : null; };
const rows = [];
for (const pair of spec.split(';')) {
  const [at, said] = pair.split('=');
  const hits = [];
  for (let i = stream.indexOf(said); i >= 0; i = stream.indexOf(said, i + 1)) {
    const f = toFilm(owner[i].s);
    if (f != null) hits.push(f);
  }
  const best = hits.sort((a, b) => Math.abs(a - +at) - Math.abs(b - +at))[0];
  rows.push({ at: +at, said, film_s: best == null ? null : +best.toFixed(2), off: best == null ? null : +(+at - best).toFixed(2) });
}
const offs = rows.filter((r) => r.off != null).map((r) => Math.abs(r.off)).sort((a, b) => a - b);
console.log(JSON.stringify(rows));
console.log(`median |off| ${offs[Math.floor(offs.length / 2)]} s, within 0.25 s: ${offs.filter((o) => o <= 0.25).length}/${rows.length}, largest ${offs.at(-1)}`);
