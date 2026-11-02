// cuts.mjs against a made-up recording: tones for words, room noise for pauses
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CUTS = new URL('../skills/talking-head/scripts/cuts.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dir = mkdtempSync(join(tmpdir(), 'cuts-'));
const rec = join(dir, 'take.wav');
// Words at 0.5-1.5, 1.6-2.4 (a 0.1 s gap: no pause), 3.0-4.0, 4.5-5.5; quiet room elsewhere, 6 s long
const words = [[0.5, 1.5], [1.6, 2.4], [3.0, 4.0], [4.5, 5.5]];
const on = words.map(([a, b]) => `between(t,${a},${b})`).join('+');
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
  `aevalsrc='0.3*sin(2*PI*220*t)*(${on})+0.003*(random(0)-0.5)':s=16000:d=6`, rec]);
writeFileSync(join(dir, 'take.vtt'), 'WEBVTT\n\n00:00:00.500 --> 00:00:05.500\nso<00:00:01.600>um<00:00:03.000>the<00:00:04.500>law\n');

const run = (...args) => spawnSync('node', [CUTS, ...args], { cwd: dir, encoding: 'utf8' });
const film = (clips) => writeFileSync(join(dir, 'film.html'), `<!doctype html><html><body><section>\n${clips
  .map(([a, b, at]) => `<video src="take.wav#t=${a},${b}" at="${at}"></video>`).join('\n')}\n</section></body></html>`);

test('pauses are found in the sound, not in the transcript', () => {
  const r = JSON.parse(run('pauses', 'take.wav', '--json').stdout);
  const has = (a, b) => r.pauses.some(([x, y]) => Math.abs(x - a) < 0.05 && Math.abs(y - b) < 0.05);
  assert.ok(has(2.4, 3.0), JSON.stringify(r.pauses));
  assert.ok(has(4.0, 4.5));
  assert.ok(!r.pauses.some(([x, y]) => x > 1.45 && y < 1.65), 'a 0.1 s gap is no pause');
});

test('check passes cuts in pauses and names the ones that are not', () => {
  film([[0, 2.7, 0], [4.25, 6, 2.7]]);
  let r = run('check');
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /all 2 cut points/);
  film([[0, 1.55, 0], [4.25, 6, 1.55]]);
  r = run('check');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /out 1\.55 .* not in a pause/);
});

test('joined writes the clips back to back', () => {
  film([[0, 2.7, 0], [4.25, 6, 2.7]]);
  const r = run('joined', '--out', 'joined.wav');
  assert.equal(r.status, 0, r.stderr);
  const d = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(dir, 'joined.wav')]).toString();
  assert.ok(Math.abs(d - 4.45) < 0.05, `joined is ${d} s`);
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
