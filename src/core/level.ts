import { Rng } from './rng';

export type FeatureKind = 'rail' | 'ledge' | 'kicker' | 'cone' | 'barrier';
export interface Feature {
  id: number; kind: FeatureKind;
  x: number; w: number;
  /** Height above the street. For rails: height at the start. */
  h: number;
  /** Rails only: height at the end (sloped rails). */
  h2?: number;
}

export const isGrindable = (f: Feature): boolean => f.kind === 'rail' || f.kind === 'ledge';
export const isObstacle = (f: Feature): boolean => f.kind === 'cone' || f.kind === 'barrier';
/** Height of a grindable surface at world x. */
export function railY(f: Feature, x: number): number {
  if (f.h2 === undefined) return f.h;
  const t = Math.min(1, Math.max(0, (x - f.x) / f.w));
  return f.h + (f.h2 - f.h) * t;
}

/** Which course a level is. 'street' and 'stacks' are endless generated runs with different pattern pools; 'tutorial' starts empty and is laid out lesson by lesson (core/tutorial.ts). */
export type Course = 'street' | 'stacks' | 'tutorial';
/** Courses a player can pick on the menu. */
export const COURSES: readonly { id: Course; name: string; blurb: string }[] = [
  { id: 'street', name: 'STREET', blurb: 'one level of rails' },
  { id: 'stacks', name: 'STACKS', blurb: 'rails above rails' },
];

/** Length of the practice rail: about 10 seconds of grinding at early-run speed. */
export const LONG_RAIL = 2000;

type Pattern = (lv: Level, x: number, d: number) => number; // returns pattern length incl. clearance

/**
 * Pattern library. Each pattern places features starting at x and returns how much
 * room it used. Every pattern must be clearable with a baseline skater — `npm run sim`
 * checks this with the bot. `d` is difficulty 0..1.
 */
const PATTERNS: { name: string; weight: number; minD: number; make: Pattern }[] = [
  { name: 'cone', weight: 3, minD: 0, make: (lv, x) => { lv.add('cone', x, 8, 10); return 8; } },
  { name: 'cones', weight: 2, minD: 0.1, make: (lv, x) => {
      const n = lv.rng.int(2, 3);
      for (let i = 0; i < n; i++) lv.add('cone', x + i * 16, 8, 10);
      return n * 16;
    } },
  { name: 'barrier', weight: 2, minD: 0.05, make: (lv, x) => { lv.add('barrier', x, 12, 22); return 12; } },
  { name: 'rail', weight: 4, minD: 0, make: (lv, x) => {
      const w = lv.rng.int(180, 320);
      lv.add('rail', x, w, lv.rng.int(22, 28));
      return w + 60;
    } },
  { name: 'downrail', weight: 2, minD: 0.1, make: (lv, x) => {
      const w = lv.rng.int(200, 300);
      lv.add('rail', x, w, 34, 18);
      return w + 60;
    } },
  { name: 'uprail', weight: 1.5, minD: 0.2, make: (lv, x) => {
      const w = lv.rng.int(200, 300);
      lv.add('rail', x, w, 22, 40);
      return w + 90;
    } },
  { name: 'rail-over-cones', weight: 2, minD: 0.15, make: (lv, x) => {
      const w = lv.rng.int(240, 320);
      lv.add('rail', x, w, 26);
      for (let cx = x + 50; cx < x + w - 30; cx += 55) lv.add('cone', cx, 8, 10);
      return w + 60;
    } },
  { name: 'ledge', weight: 3, minD: 0, make: (lv, x) => {
      const w = lv.rng.int(130, 220);
      lv.add('ledge', x, w, 16);
      return w + 60;
    } },
  { name: 'double-rail', weight: 1.5, minD: 0.3, make: (lv, x) => {
      lv.add('rail', x, 200, 24);
      lv.add('rail', x + 290, 220, 28);
      return 570;
    } },
  { name: 'kicker', weight: 2, minD: 0, make: (lv, x) => { lv.add('kicker', x, 40, 18); return 40 + 260; } },
  { name: 'kicker-to-rail', weight: 1.5, minD: 0.2, make: (lv, x) => {
      lv.add('kicker', x, 40, 18);
      lv.add('rail', x + 40 + 70, 340, 54, 46);
      return 40 + 70 + 340 + 120;
    } },
];

/**
 * STACKS (T-16): grindables on two and three levels. Rails can be passed through from below and landed on
 * from above, so you climb by jumping from one to the next and come down with ↓ (P-17) or off the end.
 * Upper levels are always rails — a ledge is solid and would be a wall. Nothing up high is compulsory:
 * every pattern can be cleared along the bottom by the bot.
 */
const STACK_PATTERNS: typeof PATTERNS = [
  // a low ledge with a rail running above it and on past its end
  { name: 'ledge-under-rail', weight: 4, minD: 0, make: (lv, x) => {
      const w = lv.rng.int(260, 340);
      lv.add('ledge', x, w, 16);
      lv.add('rail', x + 80, w + 40, 46);
      return w + 120 + 60;
    } },
  // two rails, the upper starting later and ending later
  { name: 'double-decker', weight: 4, minD: 0, make: (lv, x) => {
      const w = lv.rng.int(320, 420);
      lv.add('rail', x, w, 24);
      lv.add('rail', x + 130, w, 50);
      return w + 130 + 60;
    } },
  // three rails stepping up: hop from each to the next
  { name: 'steps-up', weight: 3, minD: 0.05, make: (lv, x) => {
      lv.add('rail', x, 230, 22);
      lv.add('rail', x + 180, 230, 40);
      lv.add('rail', x + 360, 260, 58);
      return 620 + 90;
    } },
  // a kicker onto the top of three rails stepping down: ride each off its end, or drop early
  { name: 'steps-down', weight: 3, minD: 0.05, make: (lv, x) => {
      lv.add('kicker', x, 40, 18);
      lv.add('rail', x + 110, 220, 60);
      lv.add('rail', x + 290, 220, 42);
      lv.add('rail', x + 470, 240, 24);
      return 710 + 70;
    } },
  // high rail over a line of cones: stay up, or drop and thread them
  { name: 'rail-over-cones-high', weight: 2, minD: 0.15, make: (lv, x) => {
      const w = lv.rng.int(300, 380);
      lv.add('rail', x, w, 40);
      for (let cx = x + 70; cx < x + w - 40; cx += 75) lv.add('cone', cx, 8, 10);
      return w + 60;
    } },
  // three decks at once
  { name: 'triple-decker', weight: 1.5, minD: 0.3, make: (lv, x) => {
      lv.add('ledge', x, 380, 16);
      lv.add('rail', x + 90, 340, 42);
      lv.add('rail', x + 200, 320, 68);
      return 520 + 70;
    } },
  // breathers from the street course
  { name: 'cone', weight: 2, minD: 0, make: (lv, x) => { lv.add('cone', x, 8, 10); return 8; } },
  { name: 'rail', weight: 2, minD: 0, make: (lv, x) => { const w = lv.rng.int(180, 300); lv.add('rail', x, w, lv.rng.int(22, 28)); return w + 60; } },
  { name: 'kicker', weight: 1.5, minD: 0, make: (lv, x) => { lv.add('kicker', x, 40, 18); return 40 + 260; } },
  { name: 'barrier', weight: 1, minD: 0.1, make: (lv, x) => { lv.add('barrier', x, 12, 22); return 12; } },
];

export class Level {
  features: Feature[] = [];
  readonly rng: Rng;
  private genX = 500; // empty runway at the start
  private nextId = 1;
  /** Practice aid: world x at which to drop one very long flat rail (0 = none). */
  private longRailAt: number;
  readonly course: Course;
  constructor(seed: number, opts: { longRailAt?: number; course?: Course } = {}) { this.rng = new Rng(seed); this.longRailAt = opts.longRailAt ?? 0; this.course = opts.course ?? 'street'; }

  add(kind: FeatureKind, x: number, w: number, h: number, h2?: number): Feature {
    const f: Feature = { id: this.nextId++, kind, x, w, h, h2 };
    this.features.push(f);
    return f;
  }

  /** Generate features up to world x and drop ones far behind `behindX`. */
  ensure(x: number, behindX = -Infinity): void {
    while (this.course !== 'tutorial' && this.genX < x) {
      if (this.longRailAt && this.genX >= this.longRailAt) {
        this.add('rail', this.genX, LONG_RAIL, 24);
        this.genX += LONG_RAIL + 320; this.longRailAt = 0;
        continue;
      }
      const d = Math.min(1, this.genX / 15000);
      const pool = (this.course === 'stacks' ? STACK_PATTERNS : PATTERNS).filter(p => p.minD <= d);
      let r = this.rng.next() * pool.reduce((s, p) => s + p.weight, 0);
      let p = pool[0];
      for (const c of pool) { r -= c.weight; if (r <= 0) { p = c; break; } }
      const len = p.make(this, this.genX, d);
      // breathing room shrinks as difficulty rises, but never below a full jump arc at top speed
      this.genX += len + this.rng.range(230 - 50 * d, 330 - 80 * d);
      this.features.sort((a, b) => a.x - b.x);
    }
    if (behindX > -Infinity) {
      while (this.features.length && this.features[0].x + this.features[0].w < behindX - 600) this.features.shift();
    }
  }

  near(x: number, range = 40): Feature[] {
    return this.features.filter(f => f.x + f.w > x - range && f.x < x + range);
  }
  kickerAt(x: number): Feature | null {
    for (const f of this.features) if (f.kind === 'kicker' && x >= f.x && x < f.x + f.w) return f;
    return null;
  }
  /** Rideable ground height at x (kicker ramps rise above the street). */
  groundY(x: number): number {
    const k = this.kickerAt(x);
    return k ? (k.h * (x - k.x)) / k.w : 0;
  }
}
