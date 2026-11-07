// What a viewer would skip in a recording, and how much of it a finished film took out, whichever way the film was made.
//   node slips.mjs <film.html> <recording name> <recording file> <recording.vtt> [--detail]
// clean: slips with a pause on both sides, so a cut can take only them. flush: the rest. air: silences of 0.8 s or more.
// Each is out, in, or partly (a share of its cut, or of its words for flush ones, kept by the film).
import { basename } from 'node:path';
import { clipsOf, levels, pausesOf, slipsOf, wordsOf } from '../skills/talking-head/scripts/cuts.mjs';

const [film, name, file, vtt] = process.argv.slice(2);
const lv = await levels(file);
const list = slipsOf(lv, pausesOf(lv), wordsOf(vtt));
const own = clipsOf(film).filter((c) => basename(c.file) === name);
const clips = (own.some((c) => c.tag === 'video') ? own.filter((c) => c.tag === 'video') : own).map((c) => ({ in: c.in, out: c.out ?? lv.duration }));
const kept = (a, b) => clips.reduce((n, c) => n + Math.max(0, Math.min(b, c.out) - Math.max(a, c.in)), 0) / Math.max(b - a, 1e-6);
const row = () => ({ total: 0, out: 0, in: 0, partly: 0 });
const rows = { clean: row(), flush: row(), air: row() };
const detail = [];
for (const x of list) {
  const group = x.kind === 'air' ? 'air' : x.cut ? 'clean' : 'flush';
  const span = x.air ?? x.cut ?? [x.s, x.s + 0.5];
  const k = Math.min(kept(...span), 1);
  const state = x.air ? (k > 0.95 ? 'in' : 'out') : k >= 0.7 ? 'in' : k <= 0.3 ? 'out' : 'partly';
  rows[group].total++;
  rows[group][state]++;
  detail.push(`${state.padEnd(6)} ${group.padEnd(5)} ${x.s.toFixed(2)} ${x.kind} ${x.text}`);
}
console.log(JSON.stringify({ film, slips: list.length, ...rows }));
if (process.argv.includes('--detail')) console.log(detail.join('\n'));
