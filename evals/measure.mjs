#!/usr/bin/env node
// Measures a finished talking-head film against its recording, whichever way it was made. Needs ffmpeg on the PATH.
//   node measure.mjs <film.html> <recording name> [--words <recording.vtt>] [--spans <a-b;a-b>] [--mp4 <render>] [--ref <a.vtt> --heard <b.vtt>]
// --words: the recording's word-timed transcript. --spans: stretches of the recording to look for, in its seconds (stumbles read from the transcript).
// --mp4: the render, for the picture at each join.
// --ref / --heard: the recording and the render transcribed by one same model, to diff what is heard.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

const argOf = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const [filmPath, recName] = process.argv.slice(2);
const dir = dirname(filmPath);
const html = readFileSync(filmPath, 'utf8');

function ffmpeg(args) {
  return new Promise((ok, fail) => {
    const p = spawn('ffmpeg', ['-hide_banner', '-nostdin', '-loglevel', 'error', ...args], { windowsHide: true });
    const out = []; let err = '';
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (c) => (c ? fail(new Error(err)) : ok(Buffer.concat(out))));
  });
}

// Every clip of the film
const clips = [];
for (const m of html.matchAll(/<(video|audio|iframe|img)\b([^>]*)>/g)) {
  const attr = (n) => m[2].match(new RegExp(`(?:^|\\s)${n}="([^"]*)"`))?.[1];
  const src = attr('src');
  if (!src) continue;
  const [file, frag] = src.split('#');
  const t = frag?.match(/^t=([\d.]*)(?:,([\d.]*))?$/);
  clips.push({ tag: m[1], file: decodeURI(file), in: t?.[1] ? +t[1] : 0, out: t?.[2] ? +t[2] : null, at: +(attr('at') ?? 0), speed: +(attr('speed') ?? 1), look: `${attr('class') ?? ''}|${attr('style') ?? ''}`, muted: / muted/.test(m[2]) });
}
const own = clips.filter((c) => basename(c.file) === recName && c.tag !== 'iframe');
const video = own.filter((c) => c.tag === 'video').sort((a, b) => a.at - b.at);
const talk = (video.length ? video : own).sort((a, b) => a.at - b.at);
const recPath = resolve(dir, talk[0]?.file ?? recName);

// Level of the recording per 10 ms
const raw = await ffmpeg(['-i', recPath, '-vn', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-']);
const s = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
const db = Array.from({ length: Math.floor(s.length / 160) }, (_, i) => {
  let e = 0;
  for (let j = i * 160; j < (i + 1) * 160; j++) e += s[j] * s[j];
  return 10 * Math.log10(e / 160 + 1e-12);
});
const sorted = [...db].sort((a, b) => a - b);
const room = sorted[Math.floor(db.length * 0.05)], speech = sorted[Math.floor(db.length * 0.9)];
const quietLine = room + 0.3 * Math.max(speech - room, 6), loudLine = room + 0.6 * Math.max(speech - room, 6);
const duration = db.length / 100;
const end = (c) => c.out ?? duration;
for (const c of talk) c.out = end(c);

// Each cut point: the loudest 10 ms within 30 ms of it
const peak = (t) => Math.max(...db.slice(Math.max(Math.round(t * 100) - 3, 0), Math.round(t * 100) + 3));
const points = [];
talk.forEach((c, k) => {
  if (c.in > 0.05) points.push({ clip: k, side: 'in', t: c.in, peak: peak(c.in) });
  if (c.out < duration - 0.05) points.push({ clip: k, side: 'out', t: c.out, peak: peak(c.out) });
});
const clean = points.filter((p) => p.peak <= quietLine), loud = points.filter((p) => p.peak > loudLine);

// Length, order, what went
const length = talk.reduce((n, c) => n + (c.out - c.in) / c.speed, 0);
const inOrder = talk.every((c, k) => !k || c.in >= talk[k - 1].out - 0.01);
const gaps = [];
let last = 0;
for (const c of [...talk].sort((a, b) => a.in - b.in)) { if (c.in > last + 0.01) gaps.push([last, c.in]); last = Math.max(last, c.out); }
if (last < duration - 0.05) gaps.push([last, duration]);

// Quiet stretches of 0.5 s or more left in what is kept, level over 30 ms
const kept = (t) => talk.some((c) => t >= c.in && t < c.out);
let air = 0, longest = 0, run = 0;
for (let i = 0; i <= db.length; i++) {
  const near = i < db.length ? Math.max(db[Math.max(i - 1, 0)], db[i], db[Math.min(i + 1, db.length - 1)]) : 0;
  if (i < db.length && near <= quietLine && kept(i / 100)) { run++; continue; }
  if (run >= 50) { air += run / 100; longest = Math.max(longest, run / 100); }
  run = 0;
}

// Transcript words, cut into characters for Chinese
function vttWords(file) {
  const clock = (t) => t.split(':').reduce((a, b) => a * 60 + +b, 0);
  const out = [];
  for (const block of readFileSync(file, 'utf8').split(/\r?\n\r?\n/)) {
    const m = block.match(/([\d:.]+)\s*-->\s*([\d:.]+)[^\n]*\n([\s\S]*)/);
    if (!m) continue;
    const parts = m[3].replace(/\r?\n/g, ' ').split(/<([\d:.]+)>/);
    let t = clock(m[1]);
    const cue = [];
    for (let k = 0; k < parts.length; k += 2) {
      if (k) t = clock(parts[k - 1]);
      for (const w of parts[k].trim().split(/\s+/).filter(Boolean)) cue.push({ w, s: t });
    }
    cue.forEach((x, k) => (x.e = k + 1 < cue.length ? cue[k + 1].s : clock(m[2])));
    out.push(...cue);
  }
  return out;
}
const tokens = (file) => vttWords(file).flatMap((x) => x.w.toLowerCase().replace(/[^\p{L}\p{N}'\s]/gu, '').match(/\p{Script=Han}|[^\p{Script=Han}\s]+/gu) ?? []);

const report = { film: filmPath, recording: recName, source_s: +duration.toFixed(1), talk_s: +length.toFixed(1), clips: talk.length, joins: Math.max(talk.length - 1, 0), in_order: inOrder,
  cut_points: points.length, in_quiet: clean.length, in_loud_speech: loud.length, room_db: +room.toFixed(1), speech_db: +speech.toFixed(1), air_left_s: +air.toFixed(1), longest_air_s: longest,
  film_clips: clips.length, other_media: [...new Set(clips.filter((c) => c.tag !== 'iframe' && basename(c.file) !== recName).map((c) => c.file))] };

// Share of [a, b] of the recording that the film keeps
const share = (a, b) => (b > a ? talk.reduce((n, c) => n + Math.max(0, Math.min(b, c.out) - Math.max(a, c.in)), 0) / (b - a) : 0);
const sayKept = (f) => (f >= 0.7 ? 'kept' : f <= 0.3 ? 'gone' : 'partly');

// Fillers in the transcript, gone or kept, and words inside each long gap. A transcript's times run a few tenths off, so each
// filler is judged over its own stretch and the three answers are counted apart
const wordsFile = argOf('words');
if (wordsFile) {
  const words = vttWords(wordsFile);
  const FILL = /^(um+|uh+|erm|er|ah|mm+|hmm+|嗯+|呃+|啊+|唔+|额+)[,.!?，。！？-]*$/i;
  const fill = words.filter((w) => FILL.test(w.w));
  const verdict = fill.map((w) => sayKept(share(w.s, Math.max(Math.min(w.e, w.s + 0.6), w.s + 0.3))));
  report.fillers_in_source = fill.length;
  report.fillers = { gone: verdict.filter((v) => v === 'gone').length, partly: verdict.filter((v) => v === 'partly').length, kept: verdict.filter((v) => v === 'kept').length };
  report.words_in_source = words.length;
  report.words_cut = words.filter((w) => !kept((w.s + w.e) / 2)).length;
  report.points_inside_word = points.filter((p) => words.some((w) => p.t > w.s + 0.03 && p.t < w.e - 0.03)).length;
  report.removed = gaps.filter(([a, b]) => b - a > 0.3).map(([a, b]) => `${a.toFixed(2)}-${b.toFixed(2)} ${words.filter((w) => (w.s + w.e) / 2 >= a && (w.s + w.e) / 2 < b).map((w) => w.w).join(' ')}`);
}
if (argOf('spans')) report.spans = argOf('spans').split(';').map((x) => { const [a, b] = x.split('-').map(Number); return { span: x, kept: +share(a, b).toFixed(2), is: sayKept(share(a, b)) }; });

// Order-preserving diff of the recording and the film, both transcribed by one same model
if (argOf('ref') && argOf('heard')) {
  const a = tokens(argOf('ref')), b = tokens(argOf('heard'));
  const dp = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const lost = [], added = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { lost.push('|'); added.push('|'); i++; j++; }
    else if (j >= b.length || (i < a.length && dp[i + 1][j] >= dp[i][j + 1])) lost.push(a[i++]);
    else added.push(b[j++]);
  }
  const runs = (x) => x.join(' ').split('|').map((r) => r.trim()).filter(Boolean);
  report.heard = { tokens_ref: a.length, tokens_film: b.length, common: dp[0][0], lost: runs(lost), new: runs(added) };
}

// The picture on both sides of each join in the render
if (argOf('mp4')) {
  const gray = (t) => ffmpeg(['-ss', t.toFixed(3), '-i', argOf('mp4'), '-frames:v', '1', '-vf', 'scale=160:90,format=gray', '-f', 'rawvideo', '-']);
  const ncc = (a, b) => {
    const n = Math.min(a.length, b.length);
    if (!n) return 0;
    let ma = 0, mb = 0;
    for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let sa = 0, sb = 0, sab = 0;
    for (let i = 0; i < n; i++) { sa += (a[i] - ma) ** 2; sb += (b[i] - mb) ** 2; sab += (a[i] - ma) * (b[i] - mb); }
    return sab / Math.sqrt(sa * sb + 1e-9);
  };
  const joins = [];
  for (let k = 1; k < talk.length; k++) {
    const t = talk[k].at;
    const c = ncc(await gray(Math.max(t - 0.05, 0)), await gray(t + 0.05));
    joins.push({ film_s: +t.toFixed(2), corr: +c.toFixed(3), same_css: talk[k].look === talk[k - 1].look });
  }
  report.joins_same_framing = joins.filter((j) => j.corr >= 0.8).length;
  report.join_list = joins;
}

// Pages laid over the film, for reading by eye
report.pages = clips.filter((c) => c.tag === 'iframe').map((c) => `${c.at.toFixed(2)} ${c.file} ${c.in}-${c.out}`);
console.log(JSON.stringify(report, null, 1));
