// A click at each join of a render: high-frequency energy in 6 ms at the join against the median of the 6 ms windows around it.
//   node clicks.mjs <film.html> <recording name> <render.mp4> [dB]   (12 dB unless told)
// A join is flagged when it is that much louder in the band above 4 kHz than its surroundings. Needs ffmpeg on the PATH.
import { spawn } from 'node:child_process';
import { basename } from 'node:path';
import { clipsOf } from '../skills/talking-head/scripts/cuts.mjs';

const [film, name, mp4, limit = '12'] = process.argv.slice(2);
const SR = 48000;
const raw = await new Promise((ok, fail) => {
  const p = spawn('ffmpeg', ['-hide_banner', '-nostdin', '-loglevel', 'error', '-i', mp4, '-vn', '-ac', '1', '-ar', String(SR), '-af', 'highpass=f=4000', '-f', 'f32le', '-'], { windowsHide: true });
  const out = [];
  p.stdout.on('data', (d) => out.push(d));
  p.on('close', (c) => (c ? fail(new Error('ffmpeg failed')) : ok(Buffer.concat(out))));
});
const s = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
const own = clipsOf(film).filter((c) => basename(c.file) === name && c.tag === 'video').sort((a, b) => a.at - b.at);
const W = Math.round(0.006 * SR);
const energy = (t) => { const i = Math.round(t * SR) - W / 2; let e = 0; for (let k = Math.max(i, 0); k < Math.min(i + W, s.length); k++) e += s[k] * s[k]; return e / W; };
const rows = [];
for (let k = 1; k < own.length; k++) {
  const t = own[k].at;
  const around = [];
  for (let d = -0.1; d <= 0.1; d += 0.006) if (Math.abs(d) > 0.012) around.push(energy(t + d));
  around.sort((a, b) => a - b);
  const med = around[Math.floor(around.length / 2)] + 1e-12;
  // A join may land a frame off: the loudest window within 12 ms
  const here = Math.max(...[-0.012, -0.006, 0, 0.006, 0.012].map((d) => energy(t + d)));
  rows.push({ t: +t.toFixed(2), dB: +(10 * Math.log10(here / med)).toFixed(1) });
}
const bad = rows.filter((r) => r.dB > +limit);
console.log(JSON.stringify({ joins: rows.length, clicks: bad.length, limit_dB: +limit, worst: rows.map((r) => r.dB).sort((a, b) => b - a).slice(0, 5), at: bad.map((r) => `${r.t}:${r.dB}`) }));
