import type { Course } from './level';
import { CFG, DEFAULTS as DEFAULTS_NOW, recordedTuning, withTuning } from './config';
import { isObstacle } from './level';
import { Sim, type Dir, type Input, type Mode, type SimEvent } from './sim';
import { skaterById } from './skaters';
import { TRICKS, trickForSlot } from './tricks';

/**
 * Run recording. The sim is deterministic, so a run is fully described by its options plus the
 * input of every step. Replaying that gives back the exact run — every jump that didn't register,
 * every bail — which is how playtest feedback gets investigated instead of guessed at.
 *
 * Caveat: a recording only replays exactly on the code and tuning it was made with. `cfg` is
 * stored so the analyser can say when tuning has changed since.
 */
export interface Recording {
  v: 1;
  app: string;                 // package version that made it
  at: string;                  // ISO time
  device: string;              // user agent + screen, for context
  seed: number; skaterId: string; playerLevel: number; longRail: boolean;
  /** Which course (absent in recordings made before there was a choice = 'street'). */
  course?: Course;
  cfg: Record<string, number>;
  /** Run-length encoded steps: [count, flags, balance×100] triples, flattened. */
  steps: number[];
  /** Step indices the player flagged with "that felt wrong". */
  marks: number[];
  /** What the live run ended with — replay must reproduce this. */
  result: { steps: number; score: number; distance: number; lives: number; over: boolean };
}

const DIRS: (Dir | null)[] = [null, 'up', 'down', 'left', 'right'];
// bit layout: 1 jumpPressed · 2 jumpHeld · 4-16 trick · 32 push · 64 turn · 128 drop  (new bits must be added above the old ones so old recordings still decode)
const pack = (i: Input): number => (i.jumpPressed ? 1 : 0) | (i.jumpHeld ? 2 : 0) | (DIRS.indexOf(i.trick) << 2) | (i.push ? 32 : 0) | (i.turn ? 64 : 0) | (i.drop ? 128 : 0);
const unpack = (flags: number, bal: number): Input => ({ jumpPressed: !!(flags & 1), jumpHeld: !!(flags & 2), trick: DIRS[(flags >> 2) & 7], balance: bal / 100, push: !!(flags & 32), turn: !!(flags & 64), drop: !!(flags & 128) });

export class Recorder {
  private steps: number[] = [];
  private n = 0;
  readonly marks: number[] = [];
  /** Feed every live input through this and give the RETURNED input to the sim (balance is quantised so replay is exact). */
  push(i: Input): Input {
    const bal = Math.round(Math.max(-1, Math.min(1, i.balance)) * 100), flags = pack(i), s = this.steps, k = s.length - 3;
    if (k >= 0 && s[k + 1] === flags && s[k + 2] === bal) s[k]++; else s.push(1, flags, bal);
    this.n++;
    i.balance = bal / 100;
    return i;
  }
  mark(): void { if (this.marks[this.marks.length - 1] !== this.n) this.marks.push(this.n); }
  get length(): number { return this.n; }
  finish(meta: Pick<Recording, 'app' | 'device' | 'seed' | 'skaterId' | 'playerLevel' | 'longRail' | 'course'>, sim: Sim): Recording {
    return {
      v: 1, at: new Date().toISOString(), ...meta, cfg: { ...CFG }, steps: this.steps, marks: this.marks,
      result: { steps: this.n, score: sim.totalScore, distance: sim.distance, lives: sim.s.lives, over: sim.s.mode === 'over' },
    };
  }
}

export function* inputsOf(rec: Recording): Generator<Input> {
  for (let k = 0; k < rec.steps.length; k += 3) for (let c = 0; c < rec.steps[k]; c++) yield unpack(rec.steps[k + 1], rec.steps[k + 2]);
}
export const simFor = (rec: Recording): Sim => new Sim({ seed: rec.seed, skater: skaterById(rec.skaterId), playerLevel: rec.playerLevel, longRail: rec.longRail, course: rec.course });

// ---- analysis -------------------------------------------------------------------------------

export interface Finding { t: number; kind: string; detail: string }
export interface Analysis {
  exact: boolean;              // replay reproduced the recorded result
  tuningChanged: string[];     // settings this run was played with that differ from the current game
  seconds: number; distance: number; score: number;
  counts: Record<string, number>;
  timeIn: Record<Mode, number>;
  bails: Finding[];
  ignoredJumps: Finding[];
  ignoredTricks: Finding[];
  grinds: { t: number; seconds: number; tricks: string[]; end: string; maxLean: number }[];
  marks: { t: number; context: string[] }[];
  log: Finding[];              // every event, for context around a moment
}

const ms = (steps: number) => Math.round(steps * CFG.dt * 1000);

/** Replays a recording (under the tuning it was played with) and extracts the things that explain how a run *felt*. */
export function analyse(rec: Recording): Analysis { return withTuning(rec.cfg, () => analyseNow(rec)); }

function analyseNow(rec: Recording): Analysis {
  const played = recordedTuning(rec.cfg);
  const sim = simFor(rec), s = sim.s;
  const a: Analysis = {
    exact: false, tuningChanged: (Object.keys(played) as (keyof typeof played)[]).filter(k => played[k] !== DEFAULTS_NOW[k]).map(k => `${k}=${played[k]} (now ${DEFAULTS_NOW[k]})`),
    seconds: 0, distance: 0, score: 0, counts: {}, timeIn: { ground: 0, air: 0, grind: 0, bail: 0, over: 0 },
    bails: [], ignoredJumps: [], ignoredTricks: [], grinds: [], marks: [], log: [],
  };
  const bump = (k: string) => { a.counts[k] = (a.counts[k] ?? 0) + 1; };
  const pendingJumps: { step: number; t: number; why: string }[] = [];
  const groundSwipes: { step: number; t: number; dir: Dir }[] = [];
  let step = 0, leftGroundAt = -1, airByJump = false, grind: Analysis['grinds'][number] | null = null, lastBalIn = 0, balInSteps = 0;

  for (const input of inputsOf(rec)) {
    const before: Mode = s.mode, t = s.t, hadTrick = !!s.airTrick, grindTrick = s.grindTrick;
    a.timeIn[before] += CFG.dt;
    if (before === 'grind') { balInSteps++; if (Math.abs(input.balance) > 0.05) lastBalIn++; }

    // inputs that did nothing — the raw material for "it didn't respond"
    if (input.jumpPressed && before !== 'ground' && before !== 'grind' && !(before === 'air' && s.coyote > 0)) {
      const sinceLeft = step - leftGroundAt;
      const why = before === 'bail' ? 'during a bail'
        : !airByJump && sinceLeft <= 12 ? `${ms(sinceLeft)} ms after rolling off an edge (coyote time would catch ≤ ~100 ms)`
        : 'in the air';
      pendingJumps.push({ step, t, why });
    }
    if (input.trick) {
      let why = '';
      if (before === 'ground') { if (CFG.preJumpMs > 0) groundSwipes.push({ step, t, dir: input.trick }); else why = 'on the ground (tricks only work in the air or on a rail)'; }
      else if (before === 'air' && hadTrick) { if (s.airTrick!.timeLeft * 1000 > CFG.trickBufferMs + 17) why = `while ${TRICKS[s.airTrick!.id].name} was still going (${Math.round(s.airTrick!.timeLeft * 1000)} ms left${CFG.trickBufferMs ? ', beyond the queue window' : ''})`; }
      else if (before === 'air' && !trickForSlot('air', input.trick, rec.playerLevel)) why = `no air trick unlocked for swipe ${input.trick} at level ${rec.playerLevel}`;
      else if (before === 'grind' && !trickForSlot('grind', input.trick, rec.playerLevel)) why = `no grind unlocked for swipe ${input.trick} at level ${rec.playerLevel}`;
      else if (before === 'grind' && trickForSlot('grind', input.trick, rec.playerLevel)!.id === grindTrick) why = `already in that grind (${TRICKS[grindTrick!].name})`;
      else if (before === 'bail' || before === 'over') why = 'during a bail';
      if (why) { a.ignoredTricks.push({ t, kind: `swipe ${input.trick}`, detail: why }); bump('ignored trick swipes'); }
    }

    const speed = s.speed, y = s.y, trickLeft = s.airTrick?.timeLeft ?? 0, trickId = s.airTrick?.id, gTime = s.grindTime;
    const events: SimEvent[] = sim.step(input);
    step++;

    // ground swipes: fine if a take-off followed inside the window, otherwise they did nothing
    if (groundSwipes.length) {
      const took = events.some(e => e.type === 'jump' || e.type === 'launch');
      for (let i = groundSwipes.length - 1; i >= 0; i--) {
        const g = groundSwipes[i], age = (step - 1 - g.step) * CFG.dt * 1000;
        if (took && age <= CFG.preJumpMs) groundSwipes.splice(i, 1);
        else if (age > CFG.preJumpMs) { a.ignoredTricks.push({ t: g.t, kind: `swipe ${g.dir}`, detail: 'on the ground, no jump followed in time' }); bump('ignored trick swipes'); groundSwipes.splice(i, 1); }
      }
    }
    for (const e of events) {
      bump(e.type);
      const tag = 'trickId' in e ? ('fakie' in e && e.fakie ? 'Fakie ' : '') + TRICKS[e.trickId].name : e.type === 'turn' ? (e.fakie ? 'to fakie' : 'to forward') : e.type === 'bank' ? `+${e.points} (${e.count} tricks)` : e.type === 'bail' ? e.reason : '';
      a.log.push({ t: s.t, kind: e.type, detail: tag });
      if (e.type === 'jump' || e.type === 'launch') { airByJump = true; }
      if (e.type === 'land') {
        // a jump pressed shortly before touching down = the classic "jump didn't register"
        for (const p of pendingJumps) {
          const early = step - p.step;
          a.ignoredJumps.push({ t: p.t, kind: 'jump', detail: p.why === 'in the air' ? `${ms(early)} ms before landing${early <= 9 ? ' — a jump buffer (~150 ms) would have caught this' : ''}` : p.why });
          bump('ignored jump presses');
        }
        pendingJumps.length = 0;
      }
      if (e.type === 'grindStart') { grind = { t: s.t, seconds: 0, tricks: [TRICKS[e.trickId].name], end: '', maxLean: 0 }; lastBalIn = 0; balInSteps = 0; }
      if (e.type === 'switchUp' && grind) grind.tricks.push(TRICKS[e.trickId].name);
      if (e.type === 'bail') {
        let detail = '';
        if (e.reason === 'sketchy') detail = `landed with ${TRICKS[trickId!]?.name ?? 'a trick'} ${Math.round(trickLeft * 1000)} ms from finished`;
        else if (e.reason === 'balance') detail = `fell off after ${gTime.toFixed(1)} s in ${TRICKS[grindTrick!]?.name}; balance input on ${balInSteps ? Math.round((lastBalIn / balInSteps) * 100) : 0}% of grind frames`;
        else {
          const f = sim.level.near(s.x, 30).find(o => isObstacle(o) || o.kind === 'ledge');
          detail = `hit ${f?.kind ?? 'obstacle'} while ${before === 'air' ? `in the air (height ${Math.round(y)} of ${f?.h ?? '?'} needed)` : before === 'ground' ? 'rolling — no jump' : before} at speed ${Math.round(speed)}`;
        }
        a.bails.push({ t: s.t, kind: e.reason, detail });
        if (grind) { grind.end = 'bail'; grind.seconds = gTime; a.grinds.push(grind); grind = null; }
        for (const p of pendingJumps) { a.ignoredJumps.push({ t: p.t, kind: 'jump', detail: `${p.why}, then bailed` }); bump('ignored jump presses'); }
        pendingJumps.length = 0;
      }
    }
    if (before === 'grind' && grind) {
      grind.maxLean = Math.max(grind.maxLean, Math.abs(s.balance));
      if (s.mode !== 'grind' && s.mode !== 'bail') { grind.seconds = gTime; grind.end = events.some(e => e.type === 'jump') ? 'jumped off' : events.some(e => e.type === 'drop') ? 'dropped off' : 'rail ended'; a.grinds.push(grind); grind = null; }
    }
    if ((before === 'ground' || before === 'grind') && s.mode === 'air') { leftGroundAt = step; airByJump = events.some(e => e.type === 'jump' || e.type === 'launch'); }
  }

  a.seconds = s.t; a.distance = sim.distance; a.score = sim.totalScore;
  a.exact = step === rec.result.steps && sim.totalScore === rec.result.score && sim.distance === rec.result.distance && s.lives === rec.result.lives;
  for (const m of rec.marks) {
    const t = m * CFG.dt;
    a.marks.push({ t, context: a.log.filter(e => e.t > t - 3 && e.t <= t + 0.5).map(e => `${e.t.toFixed(2)}s ${e.kind}${e.detail ? ' ' + e.detail : ''}`) });
  }
  return a;
}

/** Plain-text report for a human or an agent to read. */
export function report(rec: Recording, a: Analysis = analyse(rec)): string {
  const L: string[] = [], f = (x: Finding) => `  ${x.t.toFixed(2).padStart(7)}s  ${x.kind.padEnd(11)} ${x.detail}`;
  L.push(`RUN ${rec.at}  v${rec.app}  skater ${rec.skaterId}  level ${rec.playerLevel}  seed ${rec.seed}${rec.longRail ? '  (+practice rail)' : ''}`);
  L.push(`device: ${rec.device}`);
  L.push(a.exact ? 'replay: exact match with the live run' : `replay: DOES NOT MATCH the live run (recorded score ${rec.result.score}, replay ${a.score}) — a change leaked outside its switch; treat details below as approximate`);
  if (a.tuningChanged.length) L.push(`played with settings that differ from the current game: ${a.tuningChanged.join(', ')}`);
  L.push(`\n${a.seconds.toFixed(1)} s · ${a.distance} m · score ${a.score} · ended ${rec.result.over ? 'by running out of lives' : 'early (quit)'}`);
  const tot = a.seconds || 1;
  L.push(`time: ${(['ground', 'air', 'grind', 'bail'] as const).map(m => `${m} ${Math.round((a.timeIn[m] / tot) * 100)}%`).join(' · ')}`);
  L.push(`counts: ${Object.entries(a.counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  L.push(`\nBAILS (${a.bails.length})`); a.bails.forEach(b => L.push(f(b)));
  L.push(`\nJUMP PRESSES THAT DID NOTHING (${a.ignoredJumps.length})`); a.ignoredJumps.forEach(b => L.push(f(b)));
  L.push(`\nTRICK SWIPES THAT DID NOTHING (${a.ignoredTricks.length})`); a.ignoredTricks.forEach(b => L.push(f(b)));
  L.push(`\nGRINDS (${a.grinds.length})`);
  a.grinds.forEach(g => L.push(`  ${g.t.toFixed(2).padStart(7)}s  ${g.seconds.toFixed(1)} s  ${g.tricks.join(' → ')}  — ${g.end}, max lean ${Math.round(g.maxLean * 100)}%`));
  if (a.marks.length) { L.push(`\nPLAYER FLAGS (${a.marks.length}) — "that felt wrong", with the 3 s before`); a.marks.forEach(m => { L.push(`  flag at ${m.t.toFixed(2)}s`); m.context.forEach(c => L.push(`      ${c}`)); }); }
  return L.join('\n');
}
