// cuts.mjs slips and check against a made-up talk: tones for words, room noise for pauses
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CUTS = new URL('../skills/talking-head/scripts/cuts.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = mkdtempSync(join(tmpdir(), 'slips-'));
// so | um (alone) | the law | it was | it was again | long silence | end | and um then (um flush with both)
const sound = [[0.5, 1.1], [1.7, 2.3], [2.9, 3.4], [3.5, 4.0], [4.7, 5.0], [5.05, 5.4], [6.0, 6.35], [6.4, 6.7], [7.7, 8.4], [9.0, 10.6]];
const on = sound.map(([a, b]) => `between(t,${a},${b})`).join('+');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `aevalsrc='0.3*sin(2*PI*220*t)*(${on})+0.003*(random(0)-0.5)':s=16000:d=11.2`, join(dir, 'talk.wav')]);
// A word starts where the one before it ended, as a transcript's do
writeFileSync(join(dir, 'talk.vtt'), 'WEBVTT\n\n00:00:00.500 --> 00:00:10.600\nso<00:00:01.100>um<00:00:02.300>the<00:00:03.500>law<00:00:04.000>it<00:00:04.950>was<00:00:05.400>it<00:00:06.050>was<00:00:06.700>end<00:00:08.400>and<00:00:09.500>um<00:00:10.000>then\n');
copyFileSync(join(dir, 'talk.wav'), join(dir, 'lone.wav'));
mkdirSync(join(dir, 'pages'));
writeFileSync(join(dir, 'pages', 'law.html'), '<!doctype html><html><head><style>b{color:red}</style></head><body><b>law</b></body></html>');

const run = (...args) => spawnSync('node', [CUTS, ...args], { cwd: dir, encoding: 'utf8' });
const film = (clips, pages = [], file = 'talk.wav') => writeFileSync(join(dir, 'film.html'), `<!doctype html><html><body><section>\n${pages
  .map(([src, at]) => `<iframe src="${src}#t=0,1" at="${at}"></iframe>`).join('\n')}\n</section><section>\n${clips
  .map(([a, b, at]) => `<video src="${file}#t=${a},${b}" at="${at}"></video>`).join('\n')}\n</section></body></html>`);
// The film with the um, the first "it was" and the long silence out
const tidy = [[0, 1.4, 0], [2.6, 4.35, 1.4], [5.7, 6.95, 3.15], [7.45, 11.2, 4.4]];

test('slips finds what can come out whole, and says why the rest stays', () => {
  const r = run('slips', 'talk.wav', '--json');
  assert.equal(r.status, 0, r.stderr);
  const list = JSON.parse(r.stdout);
  const near = (c, a, b) => c && Math.abs(c[0] - a) < 0.05 && Math.abs(c[1] - b) < 0.05;
  assert.ok(list.some((x) => x.kind === 'filler' && near(x.cut, 1.4, 2.6)), r.stdout);
  assert.ok(list.some((x) => x.kind === 'repeat' && near(x.cut, 4.35, 5.7)), r.stdout);
  assert.ok(list.some((x) => x.kind === 'air' && near(x.cut, 6.95, 7.45)), r.stdout);
  const flush = list.find((x) => x.kind === 'filler' && x.s > 9);
  assert.equal(flush.cut, null);
  assert.match(flush.why, /no pause/);
});

test('check fails while an um, a repeat and a long silence are in, and says what to do', () => {
  film([[0, 11.2, 0]]);
  const r = run('check');
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /still in: .*filler "um"/);
  assert.match(r.stdout, /still in: .*repeat "it was"/);
  assert.match(r.stdout, /still in: .*silence of 0\.9\d s/);
  assert.match(r.stdout, /To do:\n- Cut each "still in"/);
});

test('check passes a film with them cut in pauses, and lists the um that has no pause', () => {
  film(tidy);
  const r = run('check');
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /✓ all 6 cut points/);
  assert.match(r.stdout, /· stays: .*filler "um", no pause before it/);
  assert.match(r.stdout, /nothing to fix/);
});

test('--keep leaves one the person wants', () => {
  film([[0, 11.2, 0]]);
  const r = run('check', '--keep', '1.2,4.8,6.9');
  assert.equal(r.status, 0, r.stdout);
});

test('check fails clips that say a line out of order', () => {
  film([[0, 1.4, 0], [4.35, 5.7, 1.4], [2.6, 4.35, 2.75]]);
  const r = run('check');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /out of order or said twice/);
});

test('check fails a film with no transcript beside the recording', () => {
  film(tidy, [], 'lone.wav');
  const r = run('check');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no transcript beside lone\.wav/);
});

test('check fails an empty film', () => {
  writeFileSync(join(dir, 'film.html'), '<!doctype html><html><body><section></section></body></html>');
  const r = run('check');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /no video or audio clip/);
});

test('check reads key words against when they are said', () => {
  film(tidy, [['pages/law.html', 2.3]]);
  let r = run('check');
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /law\.html at 2\.30: "law" is [+-]0\.00 s/);
  film(tidy, [['pages/law.html', 2.9]]);
  r = run('check');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /✗ pages\/law\.html at 2\.90: "law" is \+0\.60 s/);
  assert.match(r.stdout, /Move each ✗ key word page/);
});

test('a clip that is a stray sound fails, unless the person wants it kept', () => {
  film([[0, 1.4, 0], [2.6, 2.95, 1.4], [5.7, 11.2, 1.75]]);
  let r = run('check');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /plays 2\.60-2\.95 .*0\.35 s: a stray sound or half a word/);
  r = run('check', '--keep', '2.7');
  assert.doesNotMatch(r.stdout, /stray sound/);
});

test('slips says when the transcript puts the next word inside a clean cut', () => {
  // The recording's um sits between two pauses; "the" is timed at the end of the um, inside the cut that is silent there
  const r = run('slips', 'talk.wav');
  assert.match(r.stdout, /filler "um"\s+cut 1\.\d\d-2\.\d\d .*\(the transcript times "the" at 2\.30 inside it, but the sound is silent there until 2\.\d\d\)/);
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
