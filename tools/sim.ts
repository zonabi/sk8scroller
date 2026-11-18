/**
 * Headless balance/fairness report. Usage: npm run sim [-- <runs>]
 * Bot-plays N seeded runs and prints survival + scoring stats. Exits non-zero if
 * the bot can't reliably survive, which means generation or tuning became unfair.
 */
import { Sim } from '../src/core/sim';
import { runBot } from '../src/core/bot';
import { SKATERS } from '../src/core/skaters';

const runs = Number(process.argv[2] ?? 200);
const MIN_MEDIAN_DISTANCE = 600; // metres-ish (px/10) over a 180s cap
let fail = false;
for (const skater of SKATERS) {
  const dist: number[] = [], score: number[] = [];
  let survived = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const sim = new Sim({ seed, skater, playerLevel: 1 });
    runBot(sim);
    dist.push(sim.distance); score.push(sim.totalScore);
    if (sim.s.mode !== 'over') survived++;
  }
  dist.sort((a, b) => a - b); score.sort((a, b) => a - b);
  const med = (a: number[]) => a[Math.floor(a.length / 2)];
  console.log(`${skater.name.padEnd(5)} median dist ${med(dist)}  p10 dist ${dist[Math.floor(runs / 10)]}  median score ${med(score)}  survived 180s: ${survived}/${runs}`);
  if (med(dist) < MIN_MEDIAN_DISTANCE) fail = true;
}
if (fail) { console.error('FAIL: bot median distance below threshold — level gen or tuning is unfair.'); process.exit(1); }
