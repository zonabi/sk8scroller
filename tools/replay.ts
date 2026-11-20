/**
 * Playtest report. Usage:
 *   npm run replay                 newest run in runs/
 *   npm run replay -- <file>       a specific run (name or path)
 *   npm run replay -- --all [dir]  one line per run + totals (default runs/; try tests/golden-runs)
 *   npm run replay -- --verify     exit 1 unless every run still replays exactly (run after any rule change)
 */
import fs from 'node:fs';
import path from 'node:path';
import { analyse, report, type Recording } from '../src/core/replay';

const dir = path.resolve('runs'), arg = process.argv[2];
const golden = path.resolve('tests/golden-runs');
const list = (d: string) => (fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).sort().map(f => path.join(d, f)) : []);
const files = list(dir);
const load = (f: string): Recording => JSON.parse(fs.readFileSync(fs.existsSync(f) ? f : path.join(dir, f.endsWith('.json') ? f : f + '.json'), 'utf8'));

if (arg === '--verify') {
  // golden runs are committed playtest sessions; runs/ is whatever has been played on this machine since
  const all = [...list(golden), ...files];
  const bad = all.filter(f => !analyse(load(f)).exact);
  console.log(bad.length ? `REPLAY MISMATCH in ${bad.length} of ${all.length} runs:\n  ${bad.join('\n  ')}\nA change is not fully behind its switch (see LEGACY in src/core/config.ts).` : `all ${all.length} recorded runs still replay exactly (${list(golden).length} golden, ${files.length} local)`);
  process.exit(bad.length ? 1 : 0);
} else if (arg === '--all') {
  const files = process.argv[3] ? list(path.resolve(process.argv[3])) : list(dir);   // e.g. --all tests/golden-runs
  if (!files.length) { console.log('no runs in runs/ yet — play with the dev server running'); process.exit(0); }
  const tot: Record<string, number> = {}; let secs = 0, buffer = 0, coyote = 0, ignoredJ = 0;
  const add = (k: string, n = 1) => { tot[k] = (tot[k] ?? 0) + n; };
  for (const f of files) {
    const rec = load(f), a = analyse(rec);
    secs += a.seconds;
    for (const b of a.bails) add(`bail: ${b.kind}`);
    for (const j of a.ignoredJumps) { ignoredJ++; if (j.detail.includes('jump buffer')) buffer++; if (j.detail.includes('coyote')) coyote++; }
    add('ignored trick swipes', a.ignoredTricks.length); add('player flags', a.marks.length); add('grinds', a.grinds.length);
    add('grinds ended by bail', a.grinds.filter(g => g.end === 'bail').length);
    console.log(`${path.basename(f)}  ${a.seconds.toFixed(0).padStart(4)}s ${String(a.distance).padStart(5)}m ${String(a.score).padStart(7)}pts  bails ${a.bails.map(b => b.kind[0]).join('') || '-'}  flags ${a.marks.length}${a.exact ? '' : '  (INEXACT replay)'}`);
  }
  console.log(`\n${files.length} runs, ${(secs / 60).toFixed(1)} minutes of play`);
  console.log(Object.entries(tot).sort((x, y) => y[1] - x[1]).map(([k, v]) => `  ${String(v).padStart(4)}  ${k}`).join('\n'));
  console.log(`  ${String(ignoredJ).padStart(4)}  jump presses that did nothing — ${buffer} a jump buffer would catch, ${coyote} coyote time would catch`);
} else {
  if (!arg && !files.length) { console.log('no runs in runs/ yet — play with the dev server running'); process.exit(0); }
  console.log(report(load(arg ?? files[files.length - 1])));
}
