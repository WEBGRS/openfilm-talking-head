#!/usr/bin/env node
// Pauses in a recording, measured in its sound, what a viewer would skip, and a film checked against both. Needs ffmpeg on the PATH.
//   node cuts.mjs pauses <recording> [--vtt <file>] [--json]   every pause of 0.12 s or more, with the words around it
//   node cuts.mjs slips <recording> [--vtt <file>] [--json]    every um, repeat, restart, stray sound and long silence, with the cut that takes only it
//   node cuts.mjs check [film.html] [--keep <s>,<s>]           cut points, what is still in, order, key words, the transcript; run it last
//   node cuts.mjs joined [film.html] --out <file.wav>          one recording's clips back to back, to transcribe again
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const STEP = 0.01; // s per level frame
const MIN_PAUSE = 0.12; // s
const QUIET = 0.3; // a frame is quiet below this share of the way from the room's floor to its speech
const LOUD = 0.6; // and is sound above this share
const MARGIN = 0.02; // s of pause kept on each side of a cut point
const AIR = 0.8; // s: a pause this long is dead air
const AIR_KEEP = 0.25; // s of dead air that stays on each side of its cut
const SLACK = 0.15; // s a transcript's word time may be off a pause
const LATE = 0.25; // s a key word may be off the word
const FILLER = /^(um+|uh+|uhm|erm?|ah+|hm+|mm+|mhm|嗯+|呃+|唔+)$/;

function run(args, { binary = false } = {}) {
  return new Promise((ok, fail) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-nostdin', '-loglevel', 'error', ...args], { windowsHide: true });
    const out = [];
    let err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => (err += d));
    p.on('error', (e) => fail(new Error(e.code === 'ENOENT' ? 'ffmpeg is not on the PATH' : e.message)));
    p.on('close', (code) => (code ? fail(new Error(`ffmpeg: ${err.trim() || `exit ${code}`}`)) : ok(binary ? Buffer.concat(out) : '')));
  });
}

// Level per 10 ms frame in dB, and the room's floor
export async function levels(file) {
  const raw = await run(['-i', file, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], { binary: true });
  const s = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const n = Math.floor(s.length / 160);
  const e = new Float64Array(n), db = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = i * 160; j < (i + 1) * 160; j++) e[i] += s[j] * s[j];
    e[i] /= 160;
  }
  // Level over 30 ms, so a room's flicker does not split a pause
  for (let i = 0; i < n; i++) db[i] = 10 * Math.log10((e[Math.max(i - 1, 0)] + e[i] + e[Math.min(i + 1, n - 1)]) / 3 + 1e-12);
  const sorted = [...db].sort((a, b) => a - b);
  const floor = sorted[Math.floor(n * 0.05)] ?? -90, speech = sorted[Math.floor(n * 0.9)] ?? floor;
  const span = Math.max(speech - floor, 6);
  return { db, floor, speech, quiet: floor + QUIET * span, loud: floor + LOUD * span, duration: n * STEP };
}

// Runs of quiet frames lasting MIN_PAUSE or more
export function pausesOf({ db, quiet: q }) {
  const quiet = (i) => db[i] <= q;
  const out = [];
  for (let i = 0; i < db.length; ) {
    if (!quiet(i)) { i++; continue; }
    let j = i;
    while (j < db.length && quiet(j)) j++;
    if ((j - i) * STEP >= MIN_PAUSE - 1e-9) out.push([i * STEP, j * STEP]);
    i = j;
  }
  return out;
}

const clock = (t) => { const [h, m, s] = t.split(':').length === 3 ? t.split(':') : ['0', ...t.split(':')]; return +h * 3600 + +m * 60 + +s; };

// Words with their start times from an OpenFilm VTT (a cue per line, a timestamp tag before each later word)
export function wordsOf(vtt) {
  const words = [];
  for (const block of readFileSync(vtt, 'utf8').split(/\r?\n\r?\n/)) {
    const m = block.match(/([\d:.]+)\s*-->\s*([\d:.]+)[^\n]*\n([\s\S]*)/);
    if (!m) continue;
    let t = clock(m[1]);
    const end = clock(m[2]);
    const parts = m[3].replace(/\r?\n/g, ' ').split(/<([\d:.]+)>/);
    const cue = [];
    for (let k = 0; k < parts.length; k += 2) {
      if (k) t = clock(parts[k - 1]);
      for (const w of parts[k].trim().split(/\s+/).filter(Boolean)) cue.push({ w, s: t });
    }
    cue.forEach((x, k) => (x.e = k + 1 < cue.length ? cue[k + 1].s : end));
    words.push(...cue);
  }
  return words;
}

const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');
const isHan = (t) => /^\p{Script=Han}$/u.test(t);

// Words as units to compare: a Latin word is one, a Chinese word is one per character; punctuation-only words are dropped
export function unitsOf(words) {
  const out = [];
  words.forEach((w, k) => {
    const t = norm(w.w);
    if (!t) return;
    const parts = t.match(/\p{Script=Han}|[^\p{Script=Han}]+/gu) ?? [];
    const d = Math.max(w.e - w.s, 0);
    parts.forEach((p, i) => out.push({ t: p, s: w.s + (d * i) / parts.length, e: w.s + (d * (i + 1)) / parts.length, w: k, filler: parts.length === 1 && FILLER.test(t) }));
  });
  return out;
}

const fmt = (t) => t.toFixed(2);
const around = (words, t, n = 4) => {
  const k = words.findIndex((x) => x.s >= t);
  const before = (k < 0 ? words : words.slice(0, k)).slice(-n).map((x) => x.w).join(' ');
  const after = (k < 0 ? [] : words.slice(k, k + n)).map((x) => x.w).join(' ');
  return `${before} | ${after}`;
};

// Transcript gaps holding sound: a word it left out may be there
export function hiddenOf(lv, words) {
  const hidden = [];
  for (let k = 1; k < words.length; k++) {
    const a = words[k - 1].e, b = words[k].s;
    if (b - a < 0.3) continue;
    const loud = [];
    for (let i = Math.ceil(a / STEP) + 5; i < Math.floor(b / STEP) - 5; i++) if (lv.db[i] > lv.loud) loud.push(i);
    if (loud.length * STEP >= 0.15) hidden.push([loud[0] * STEP, (loud.at(-1) + 1) * STEP, k]);
  }
  return hidden;
}

// Each word belongs to the stretch of sound it starts in; a word the transcript starts inside a pause belongs to the sound after it
function runsOf(units, edges) {
  return units.map((u) => {
    let m = 0;
    while (m + 2 < edges.length && edges[m + 1][0] <= u.s + 0.15) m++;
    return m;
  });
}

// What a viewer would skip: fillers, a line said twice (the first copy and what came between go), sound the transcript left out, dead air.
// A slip comes out whole when it is a stretch of sound of its own: a pause on each side, no other word in it.
export function slipsOf(lv, ps, words) {
  const units = unitsOf(words);
  const edges = [[0, 0], ...ps, [lv.duration, lv.duration]];
  const mid = (p) => (p[0] + p[1]) / 2;
  const run = runsOf(units, edges);
  const n = units.length;
  const said = (i, j) => words.slice(units[i].w, units[j - 1].w + 1).map((x) => x.w).join(' ');
  const room = (i, j) => units.slice(i, j).reduce((x, u) => x + (isHan(u.t) ? 0.35 : 0.6), 0.4);
  // The cut that takes units i..j-1 and nothing else, or null
  const whole = (i, j) => {
    if (!(i === 0 || run[i - 1] < run[i]) || !(j === n || run[j] > run[j - 1])) return null;
    const a = edges[run[i]], b = edges[run[j - 1] + 1], len = b[0] - a[1];
    return len < 0.1 || len > Math.max(room(i, j), 1) ? null : [mid(a), mid(b)];
  };
  const list = [];
  const unitSlip = (kind, i, j) => {
    const slip = { kind, i, j, s: units[i].s, text: said(i, j), cut: whole(i, j) };
    if (!slip.cut) {
      const next = (j < n && run[j] === run[j - 1]) ? `"${units[j].t}"` : null, prev = i > 0 && run[i - 1] === run[i] ? `"${units[i - 1].t}"` : null;
      slip.why = prev && next ? `no pause before it (${prev}) or after it (${next})` : prev ? `no pause between ${prev} and it` : next ? `no pause between it and ${next}` : 'its sound is not where the transcript puts it';
      // The nearest cut that also takes a word or two beside it
      for (let t = 1; t <= 2 && !slip.widen; t++) {
        for (let x = 0; x <= t && !slip.widen; x++) {
          const a = i - x, b = j + (t - x);
          if (a >= 0 && b <= n && whole(a, b)) slip.widen = { cut: whole(a, b), also: [...(a < i ? [said(a, i)] : []), ...(b > j ? [said(j, b)] : [])].join(' ... ') };
        }
      }
    }
    list.push(slip);
  };
  units.forEach((u, k) => u.filler && unitSlip('filler', k, k + 1));
  for (let i = 0, last = 0; i < n; i++) {
    let found = null;
    for (let len = 6; len >= 1 && !found; len--) {
      for (let g = 0; g <= 4 && !found; g++) {
        const k = i + len + g;
        if (k + len > n || (len === 1 && (g > 0 || isHan(units[i].t))) || units[i].filler) continue;
        if (units.slice(i, i + len).every((u, m) => u.t === units[k + m].t)) found = [i, k];
      }
    }
    if (found && i >= last) { unitSlip('repeat', found[0], found[1]); last = found[1]; }
  }
  // Sound the transcript has no word for, in a stretch of its own
  for (const [a, b] of hiddenOf(lv, words)) {
    let m = 0;
    while (m + 2 < edges.length && edges[m + 1][0] <= (a + b) / 2) m++;
    if (!run.includes(m)) list.push({ kind: 'sound', i: 0, j: 0, s: a, text: '', cut: [mid(edges[m]), mid(edges[m + 1])] });
  }
  for (const [a, b] of ps) {
    if (b - a < AIR) continue;
    list.push({ kind: 'air', i: 0, j: 0, s: a, text: '', air: [a, b], cut: [a <= 0.01 ? 0 : a + AIR_KEEP, b >= lv.duration - 0.01 ? lv.duration : b - AIR_KEEP] });
  }
  // A slip inside a repeat that comes out whole is not listed again
  const big = list.filter((x) => x.cut && x.kind === 'repeat');
  return list.filter((x) => !(x.i < x.j && x.kind !== 'repeat' && big.some((y) => y.i <= x.i && x.j <= y.j))).sort((x, y) => x.s - y.s);
}

// Recording clips of a film: <video>/<audio> with their file, in and out points, and place
export function clipsOf(film) {
  const html = readFileSync(film, 'utf8');
  const out = [];
  for (const m of html.matchAll(/<(video|audio)\b([^>]*)>/g)) {
    const attr = (name) => m[2].match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
    const src = attr('src');
    if (!src) continue;
    const [file, frag] = src.split('#');
    const t = frag?.match(/^t=([\d.]*)(?:,([\d.]*))?$/);
    out.push({ id: attr('id') ?? file, tag: m[1], file: decodeURI(file), in: t?.[1] ? +t[1] : 0, out: t?.[2] ? +t[2] : null, at: +(attr('at') ?? 0), speed: +(attr('speed') ?? 1) });
  }
  return out;
}

// Pages of a film: <iframe> with their file and place
function pagesOf(film) {
  const out = [];
  for (const m of readFileSync(film, 'utf8').matchAll(/<iframe\b([^>]*)>/g)) {
    const attr = (name) => m[1].match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
    const src = attr('src');
    if (src) out.push({ id: attr('id') ?? src, file: decodeURI(src.split('#')[0]), at: +(attr('at') ?? 0) });
  }
  return out;
}

// The text a page shows, one line per element
function linesOf(html) {
  const body = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<head\b[\s\S]*?<\/head>/i, ' ');
  return body.split(/<[^>]+>/).map((x) => x.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).trim()).filter(Boolean);
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const vttOf = (file) => arg('--vtt') ?? file.replace(/\.[^.\\/]+$/, '.vtt');

async function pauses(file) {
  const lv = await levels(file);
  const ps = pausesOf(lv);
  const vtt = vttOf(file);
  const words = existsSync(vtt) ? wordsOf(vtt) : null;
  const hidden = words ? hiddenOf(lv, words) : [];
  if (process.argv.includes('--json')) {
    const unheard = hidden.map(([a, b, k]) => ({ start: a, end: b, after: words[k - 1].w, before: words[k].w }));
    console.log(JSON.stringify({ duration: lv.duration, room: lv.floor, speech: lv.speech, pauses: ps, unheard }));
    return;
  }
  console.log(`${file}: ${fmt(lv.duration)} s, room ${lv.floor.toFixed(1)} dB, speech ${lv.speech.toFixed(1)} dB, ${ps.length} pauses of ${MIN_PAUSE} s or more`);
  for (const [a, b] of ps) console.log(`  ${fmt(a)}-${fmt(b)}  (${fmt(b - a)} s)${words ? `  ${around(words, (a + b) / 2)}` : ''}`);
  if (hidden.length) {
    console.log(`\nsound where the transcript has no word (an um or a stumble it left out may be there):`);
    for (const [a, b, k] of hidden) console.log(`  ${fmt(a)}-${fmt(b)}  ${words[k - 1].w} [?] ${words[k].w}`);
  }
}

const describe = (x, words) => {
  const what = x.kind === 'air' ? `silence of ${fmt(x.air[1] - x.air[0])} s` : x.kind === 'sound' ? 'sound with no word in the transcript' : `${x.kind} "${x.text}"`;
  const where = x.kind === 'air' ? '' : `  [${around(words, x.s)}]`;
  const span = (c) => `${fmt(c[0])}-${fmt(c[1])} (${fmt(c[1] - c[0])} s)`;
  const how = x.cut ? `cut ${span(x.cut)}` : `stays: ${x.why}${x.widen ? `; cut ${span(x.widen.cut)} takes "${x.widen.also}" with it` : ''}`;
  return `${fmt(x.s)}  ${what}  ${how}${where}`;
};

async function slips(file) {
  const lv = await levels(file);
  const vtt = vttOf(file);
  if (!existsSync(vtt)) throw new Error(`no transcript at ${vtt}: slips needs the words (npx openfilm get asr --src ${file}, or --vtt <file>)`);
  const words = wordsOf(vtt);
  const list = slipsOf(lv, pausesOf(lv), words);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(list)); return; }
  const clean = list.filter((x) => x.cut);
  console.log(`${file}: ${list.length} things a viewer would skip, ${clean.length} with a cut in a pause on both sides\n`);
  for (const x of list) console.log(`${x.cut ? '  ' : '· '}${describe(x, words)}`);
  console.log(`\nEach "cut" takes out only that slip: both of its points are pauses of ${MIN_PAUSE} s or more with no other word between them. Take those out, leave a "stays" where it is, and run check.`);
}

function inPause(ps, t) {
  return ps.some(([a, b]) => t >= a + MARGIN - 1e-9 && t <= b - MARGIN + 1e-9);
}

// Seconds of [a, b] that the clips keep
const kept = (clips, a, b) => clips.reduce((n, c) => n + Math.max(0, Math.min(b, c.out) - Math.max(a, c.in)), 0);

async function check(film) {
  const dir = dirname(film);
  const all = clipsOf(film);
  const keep = (arg('--keep') ?? '').split(',').filter(Boolean).map(Number);
  const todo = [];
  let bad = 0;
  const fail = (line, advice) => { bad++; console.log(`✗ ${line}`); if (advice && !todo.includes(advice)) todo.push(advice); };
  if (!all.length) fail('film.html has no video or audio clip of the recording', 'Put the recording in film.html as clips: each one the same file with its own #t=in,out.');
  let main = null;
  for (const [file, clips] of Map.groupBy(all, (c) => c.file)) {
    const path = resolve(dir, file);
    if (!existsSync(path)) { fail(`${file} is not there`, 'Point every clip at a file that exists.'); continue; }
    const lv = await levels(path);
    const ps = pausesOf(lv);
    const vtt = path.replace(/\.[^.\\/]+$/, '.vtt');
    const words = existsSync(vtt) ? wordsOf(vtt) : null;
    const own = clips.some((c) => c.tag === 'video') ? clips.filter((c) => c.tag === 'video') : clips;
    for (const c of own) c.out ??= lv.duration;
    own.sort((a, b) => a.at - b.at);
    const length = own.reduce((n, c) => n + (c.out - c.in) / c.speed, 0);
    if (!main || length > main.length) main = { file, own, words, ps, length, lv };
    // Lines in the order they were said
    own.forEach((c, k) => { if (k && c.in < own[k - 1].out - 0.01) fail(`${c.id} plays ${fmt(c.in)}-${fmt(c.out)} in ${file}, before where ${own[k - 1].id} ended (${fmt(own[k - 1].out)}): their words are out of order or said twice`, 'Put the clips in the order the person said them; a line said twice appears once.'); });
    // Every cut point in a pause
    let points = 0, off = 0;
    for (const c of clips) {
      for (const [side, t] of [['in', c.in], ['out', c.out ?? lv.duration]]) {
        if (t <= 0.05 || t >= lv.duration - 0.05) continue; // the recording's own start and end
        points++;
        if (inPause(ps, t)) continue;
        off++;
        const near = ps.reduce((best, p) => (Math.abs((p[0] + p[1]) / 2 - t) < Math.abs((best[0] + best[1]) / 2 - t) ? p : best), [Infinity, Infinity]);
        fail(`${c.id} ${side} ${fmt(t)} in ${file} is not in a pause${words ? ` (${around(words, t)})` : ''}; nearest pause ${fmt(near[0])}-${fmt(near[1])}`, 'Move each cut point named above into a pause: the middle of the pause printed with it.');
      }
    }
    console.log(off ? `${off} of ${points} cut points in ${file} are not in a pause` : `✓ all ${points} cut points in ${file} fall in a pause of ${MIN_PAUSE} s or more`);
    // The transcript, beside the recording, so subtitles follow the trims
    if (!words) { fail(`no transcript beside ${file}`, `Put ${file.replace(/\.[^.\\/]+$/, '.vtt')} beside the recording (npx openfilm get asr --src ${file} writes it there): subtitles follow the trims from it, and check reads what was left in.`); continue; }
    // What a viewer would skip and is still in
    const list = slipsOf(lv, ps, words);
    const left = list.filter((x) => x.cut && !keep.some((t) => t >= x.s - 0.3 && t <= x.cut[1] + 0.3) && (x.air ? kept(own, ...x.air) >= AIR : kept(own, ...x.cut) >= 0.5 * (x.cut[1] - x.cut[0])));
    const stays = list.filter((x) => !x.cut && kept(own, x.s, x.s + 0.1) > 0);
    for (const x of left) fail(`still in: ${describe(x, words)}`, 'Cut each "still in" slip at the points printed with it (they take only that slip), then run check again. Keep one only if the person wants it, and tell them: --keep <seconds>.');
    for (const x of stays) console.log(`· stays: ${fmt(x.s)} ${x.kind} "${x.text}", ${x.why}${x.widen ? `; cut ${fmt(x.widen.cut[0])}-${fmt(x.widen.cut[1])} takes "${x.widen.also}" with it` : ''}`);
    console.log(`${list.length - stays.length - left.length} of ${list.length} slips are out or kept on purpose; ${left.length} still in; ${stays.length} stay for want of a pause`);
  }
  if (main) {
    const { file, own, words, length } = main;
    // What the film took out, for the person's report
    const gaps = [];
    let last = 0;
    for (const c of [...own].sort((a, b) => a.in - b.in)) { if (c.in > last + 0.01) gaps.push([last, c.in]); last = Math.max(last, c.out); }
    if (main.lv.duration > last + 0.05) gaps.push([last, main.lv.duration]);
    console.log(`\n${file}: ${fmt(main.lv.duration)} s in, ${fmt(length)} s on the film, ${own.length} clips, ${Math.max(own.length - 1, 0)} joins`);
    const us = words ? unitsOf(words) : [];
    const slipWords = words ? new Set(slipsOf(main.lv, main.ps, words).flatMap((x) => us.slice(x.i, x.j).map((u) => u.w))) : new Set();
    for (const [a, b] of gaps) {
      const inside = words ? words.map((x, k) => ({ ...x, k })).filter((x) => (x.s + x.e) / 2 >= a && (x.s + x.e) / 2 < b) : [];
      if (b - a >= 2) console.log(`  took out ${fmt(a)}-${fmt(b)} (${fmt(b - a)} s)${words ? `: ${inside.map((x) => x.w).join(' ')}` : ''}`);
      const other = inside.filter((x) => !slipWords.has(x.k) && norm(x.w));
      if (other.length) console.log(`  ${b - a >= 2 ? '  ' : `took out ${fmt(a)}-${fmt(b)}: `}words that are not slips, say so: ${other.map((x) => `${x.w} (${fmt(x.s)})`).join(' ')}`);
    }
    if (words) {
      const off = keyWords(film, main, unitsOf(words));
      bad += off;
      if (off) todo.push(`Move each ✗ key word page to when the word is said: its start in the sound where it follows a pause, else the transcript's time (${LATE} s at most).`);
    }
  }
  if (bad) console.log(`\n${bad} problems. To do:\n${todo.map((t) => `- ${t}`).join('\n')}`);
  else console.log('\n✓ nothing to fix. Hear it again (joined), then tell the person the length before and after, the cuts above, and what stayed.');
  process.exitCode = bad ? 1 : 0;
}

// Each key word page against the word, in the transcript and in the sound
function keyWords(film, { own, ps }, units) {
  const dir = dirname(film);
  const toFilm = (s) => { const c = own.find((x) => s >= x.in - 0.15 && s < x.out); return c ? c.at + Math.max(s - c.in, 0) / c.speed : null; };
  const center = (k) => (units[k].s + units[k].e) / 2;
  // The sound's own start of a word that follows a pause
  const onset = (k) => {
    const p = ps.filter(([, b]) => Math.abs(b - units[k].s) <= 0.4).sort((x, y) => Math.abs(x[1] - units[k].s) - Math.abs(y[1] - units[k].s))[0];
    return p && (k === 0 || center(k - 1) <= (p[0] + p[1]) / 2 + 0.1) ? p[1] : null;
  };
  const rows = [];
  for (const page of pagesOf(film)) {
    const path = resolve(dir, page.file);
    if (!existsSync(path)) continue;
    let best = null;
    for (const line of linesOf(readFileSync(path, 'utf8'))) {
      const q = unitsOf(line.split(/\s+/).map((w) => ({ w, s: 0, e: 0 })));
      if (!q.length) continue;
      for (let k = 0; k + q.length <= units.length; k++) {
        if (!q.every((u, m) => u.t === units[k + m].t)) continue;
        const f = toFilm(units[k].s);
        if (f == null || Math.abs(page.at - f) > 2) continue;
        if (!best || q.length > best.n || (q.length === best.n && Math.abs(page.at - f) < Math.abs(best.off))) best = { n: q.length, line, k, off: page.at - f };
      }
    }
    const start = best ? onset(best.k) : null, at = start != null ? toFilm(start) : null;
    rows.push({ page, best, on: at != null ? page.at - at : null });
  }
  if (!rows.length) return 0;
  console.log('\nOn screen, against when it is said (+ is late):');
  for (const { page, best, on } of rows) {
    if (!best) { console.log(`  ${page.file} at ${fmt(page.at)}: none of its words are said near it (a card or the cover?)`); continue; }
    const off = Math.abs(on ?? best.off) > LATE;
    console.log(`  ${off ? '✗' : ' '} ${page.file} at ${fmt(page.at)}: "${best.line}" is ${best.off >= 0 ? '+' : ''}${fmt(best.off)} s from the transcript${on != null ? `, ${on >= 0 ? '+' : ''}${fmt(on)} s from the sound's start of it` : ''}`);
  }
  return rows.filter(({ best, on }) => best && Math.abs(on ?? best.off) > LATE).length;
}

async function joined(film) {
  const out = arg('--out');
  if (!out) throw new Error('joined needs --out <file.wav>');
  const clips = clipsOf(film).sort((a, b) => a.at - b.at);
  const file = arg('--src') ?? Map.groupBy(clips, (c) => c.file).entries().reduce((best, e) => (e[1].length > best[1].length ? e : best))[0];
  const own = clips.filter((c) => c.file === file);
  const path = resolve(dirname(film), file);
  const graph = own.map((c, k) => `[0:a]atrim=${c.in}${c.out != null ? `:${c.out}` : ''},asetpts=PTS-STARTPTS${c.speed !== 1 ? `,atempo=${c.speed}` : ''}[a${k}];`).join('')
    + own.map((_, k) => `[a${k}]`).join('') + `concat=n=${own.length}:v=0:a=1[o]`;
  await run(['-y', '-i', path, '-filter_complex', graph, '-map', '[o]', '-ac', '1', '-ar', '16000', out]);
  console.log(`${out}: ${own.length} clips of ${file}, back to back`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [cmd, target] = process.argv.slice(2);
  const films = (t) => (t && !t.startsWith('--') ? t : 'film.html');
  try {
    if (cmd === 'pauses' && target) await pauses(target);
    else if (cmd === 'slips' && target) await slips(target);
    else if (cmd === 'check') await check(films(target));
    else if (cmd === 'joined') await joined(films(target));
    else { console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 6).map((l) => l.replace(/^\/\/ ?/, '')).join('\n')); process.exitCode = cmd ? 2 : 0; }
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
