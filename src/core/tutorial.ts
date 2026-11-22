import type { Sim, SimEvent } from './sim';

/**
 * The playable tutorial: eight short lessons on an otherwise empty course ('tutorial').
 * Each lesson lays its own obstacle ahead of the skater and waits for the one thing it teaches.
 * Miss it and the same lesson comes round again; nothing costs a life. Pure rules, no drawing:
 * the game layer shows a prompt for `lesson` and reacts to the events step() returns.
 */
export type LessonId = 'jump' | 'grind' | 'balance' | 'switch' | 'trick' | 'drop' | 'push' | 'fakie';
export const LESSONS: readonly LessonId[] = ['jump', 'grind', 'balance', 'switch', 'trick', 'drop', 'push', 'fakie'];

export type TutorialEvent =
  | { type: 'lesson'; id: LessonId; index: number; retry: boolean }
  | { type: 'passed'; id: LessonId }
  | { type: 'finished' };

/** World px of clear street before a lesson's obstacle: about three seconds to read the prompt. */
const LEAD = 430;
/** Seconds a lesson stays on screen after it is passed, before the next begins. */
const BREATHER = 0.9;
/** How long the balance lesson asks you to stay on the rail. */
export const BALANCE_SECS = 1.5;

export class Tutorial {
  /** `skip`: lessons this player's controls cannot do. */
  constructor(private skip: readonly LessonId[] = []) {}
  index = -1;
  finished = false;
  private passedAt = -1;
  /** World x where the current lesson's obstacle ends (0 = the lesson has none). */
  private toX = 0;
  private bailed = false;

  get lesson(): LessonId | null { return this.finished || this.index < 0 ? null : LESSONS[this.index]; }

  private begin(sim: Sim, index: number, retry: boolean, out: TutorialEvent[]): void {
    const id = LESSONS[index], x = Math.max(sim.s.x + LEAD, this.toX + 120), lv = sim.level;
    this.index = index; this.passedAt = -1; this.bailed = false; this.toX = 0;
    const lay = (kind: 'cone' | 'rail', w: number, h: number) => { lv.add(kind, x, w, h); this.toX = x + w; };
    if (id === 'jump') lay('cone', 8, 10);
    else if (id === 'grind') lay('rail', 300, 24);
    else if (id === 'balance') lay('rail', 520, 24);
    else if (id === 'switch' || id === 'drop') lay('rail', 420, 24);
    // old obstacles are far behind by now; keep the list short
    while (lv.features.length && lv.features[0].x + lv.features[0].w < sim.s.x - 600) lv.features.shift();
    out.push({ type: 'lesson', id, index, retry });
  }

  /** Index of the next lesson after `i` that is not skipped. */
  private after(i: number): number { do i++; while (i < LESSONS.length && this.skip.includes(LESSONS[i])); return i; }
  /** How many lessons this player will see. */
  get count(): number { return LESSONS.filter(l => !this.skip.includes(l)).length; }
  /** 1-based position of the current lesson among those. */
  get number(): number { return LESSONS.slice(0, this.index + 1).filter(l => !this.skip.includes(l)).length; }

  private met(id: LessonId, sim: Sim, ev: SimEvent[]): boolean {
    const s = sim.s, saw = (t: SimEvent['type']) => ev.some(e => e.type === t);
    switch (id) {
      case 'jump': return !this.bailed && s.x > this.toX + 4;             // over the cone without touching it
      case 'grind': return saw('grindStart');
      case 'balance': return s.mode === 'grind' && s.grindTime >= BALANCE_SECS;
      case 'switch': return saw('switchUp');
      case 'trick': return saw('airTrickDone');
      case 'drop': return saw('drop');
      case 'push': return saw('push');
      case 'fakie': return saw('turn');
    }
  }

  /** Call once after every sim.step with that step's events. */
  step(sim: Sim, ev: SimEvent[]): TutorialEvent[] {
    const out: TutorialEvent[] = [], s = sim.s;
    if (this.finished) return out;
    if (this.index < 0) { this.begin(sim, this.after(-1), false, out); return out; }
    const id = LESSONS[this.index];
    if (ev.some(e => e.type === 'bail')) this.bailed = true;
    if (this.passedAt < 0) {
      if (this.met(id, sim, ev)) { this.passedAt = s.t; out.push({ type: 'passed', id }); }
      // rolled past the obstacle without doing it: the same lesson again
      else if (this.toX > 0 && s.mode === 'ground' && s.x > this.toX + 40) this.begin(sim, this.index, true, out);
    } else if (s.t - this.passedAt >= BREATHER && s.mode === 'ground' && s.x > this.toX) {
      const next = this.after(this.index);
      if (next >= LESSONS.length) { this.finished = true; out.push({ type: 'finished' }); }
      else this.begin(sim, next, false, out);
    }
    return out;
  }
}
