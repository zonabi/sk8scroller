import { CFG } from './config';
import { Level, isGrindable, isObstacle, railY, type Feature } from './level';
import { Rng } from './rng';
import type { SkaterDef } from './skaters';
import { TRICKS, trickForSlot } from './tricks';

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Mode = 'ground' | 'air' | 'grind' | 'bail' | 'over';

/** One fixed step of player intent. The game layer (touch/keys/tilt) and the bot both produce this. */
export interface Input {
  jumpPressed: boolean;
  jumpHeld: boolean;
  trick: Dir | null;
  /** -1..1, pushes the grind balance left/right. */
  balance: number;
}
export const NO_INPUT: Input = { jumpPressed: false, jumpHeld: false, trick: null, balance: 0 };

export interface ComboEntry { trickId: string; name: string; points: number }
export type SimEvent =
  | { type: 'jump' } | { type: 'launch' } | { type: 'land' }
  | { type: 'grindStart'; trickId: string } | { type: 'switchUp'; trickId: string }
  | { type: 'airTrickStart'; trickId: string } | { type: 'airTrickDone'; trickId: string }
  | { type: 'bank'; points: number; count: number }
  | { type: 'bail'; reason: 'obstacle' | 'balance' | 'sketchy' }
  | { type: 'over' };

export interface SimState {
  t: number; x: number; y: number; vy: number; speed: number;
  mode: Mode;
  grind: Feature | null; grindTrick: string | null; grindTime: number;
  /** Seconds in the current stance (resets on lock-on and on every switch-up). */
  stanceTime: number;
  balance: number; balanceVel: number;
  airTrick: { id: string; timeLeft: number } | null;
  combo: ComboEntry[]; comboTimer: number;
  score: number; bestCombo: number;
  lives: number; invuln: number; bailTimer: number;
}

export interface SimOptions {
  seed: number; skater: SkaterDef; playerLevel: number;
  /** Practice aid (?rail): one very long rail about 10 seconds into the run. */
  longRail?: boolean;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Difficulty of the default lock-in grind; other stances are measured against it. */
const EASIEST = 0.8;

/** Score of a combo: repeated tricks decay, then everything is multiplied by the trick count. */
export function comboValue(combo: ComboEntry[]): number {
  const seen: Record<string, number> = {};
  let sum = 0;
  for (const e of combo) {
    const n = seen[e.trickId] ?? 0;
    sum += e.points * CFG.repeatPenalty ** n;
    seen[e.trickId] = n + 1;
  }
  return Math.round(sum * combo.length);
}

/**
 * The whole game, with no rendering and no browser APIs. Deterministic for a given
 * seed + input sequence, so it can be unit-tested and bot-played headlessly.
 */
export class Sim {
  readonly level: Level;
  readonly s: SimState;
  private readonly rng: Rng;
  private readonly skater: SkaterDef;
  private readonly playerLevel: number;

  constructor(opts: SimOptions) {
    this.level = new Level(opts.seed, { longRailAt: opts.longRail ? 1350 : 0 });
    this.rng = new Rng(opts.seed ^ 0x9e3779b9);
    this.skater = opts.skater;
    this.playerLevel = opts.playerLevel;
    this.s = {
      t: 0, x: 0, y: 0, vy: 0, speed: CFG.baseSpeed * opts.skater.speed, mode: 'ground',
      grind: null, grindTrick: null, grindTime: 0, stanceTime: 0, balance: 0, balanceVel: 0, airTrick: null,
      combo: [], comboTimer: 0, score: 0, bestCombo: 0,
      lives: CFG.lives, invuln: 0, bailTimer: 0,
    };
    this.level.ensure(1500);
  }

  get distance(): number { return Math.floor(this.s.x / 10); }
  get totalScore(): number { return this.s.score + this.distance; }
  get targetSpeed(): number {
    return (CFG.baseSpeed + Math.min(CFG.maxSpeedBonus, this.s.x * CFG.speedRamp)) * this.skater.speed;
  }

  step(input: Input): SimEvent[] {
    const s = this.s, dt = CFG.dt, ev: SimEvent[] = [];
    if (s.mode === 'over') return ev;
    s.t += dt;
    this.level.ensure(s.x + 1500, s.x);
    if (s.invuln > 0) s.invuln -= dt;
    const prevX = s.x, prevY = s.y;

    switch (s.mode) {
      case 'bail': {
        s.x += s.speed * dt;
        const gy = this.level.groundY(s.x);
        s.vy -= CFG.gravity * dt;
        s.y = Math.max(gy, s.y + s.vy * dt);
        s.bailTimer -= dt;
        if (s.bailTimer <= 0 && s.y <= gy) {
          if (s.lives <= 0) { s.mode = 'over'; ev.push({ type: 'over' }); }
          else { s.mode = 'ground'; s.vy = 0; }
        }
        return ev;
      }
      case 'ground': {
        s.speed += (this.targetSpeed - s.speed) * Math.min(1, CFG.accel * dt);
        s.x += s.speed * dt;
        const k = this.level.kickerAt(prevX);
        if (k && s.x >= k.x + k.w) {
          s.y = k.h; s.vy = CFG.kickerV * this.skater.air; s.mode = 'air';
          ev.push({ type: 'launch' });
        } else {
          s.y = this.level.groundY(s.x);
          if (input.jumpPressed) { s.vy = CFG.jumpV * this.skater.air; s.mode = 'air'; ev.push({ type: 'jump' }); }
        }
        if (s.mode === 'ground' && s.combo.length) {
          s.comboTimer -= dt;
          if (s.comboTimer <= 0) this.bank(ev);
        }
        break;
      }
      case 'air': {
        s.x += s.speed * dt;
        if (!input.jumpHeld && s.vy > 0) s.vy -= CFG.jumpCutGravity * dt;
        s.vy -= CFG.gravity * dt;
        s.y += s.vy * dt;
        if (s.airTrick) {
          s.airTrick.timeLeft -= dt;
          if (s.airTrick.timeLeft <= 0) {
            const tr = TRICKS[s.airTrick.id];
            s.combo.push({ trickId: tr.id, name: tr.name, points: tr.points });
            ev.push({ type: 'airTrickDone', trickId: tr.id });
            s.airTrick = null;
          }
        } else if (input.trick) {
          const tr = trickForSlot('air', input.trick, this.playerLevel);
          if (tr) { s.airTrick = { id: tr.id, timeLeft: tr.duration }; ev.push({ type: 'airTrickStart', trickId: tr.id }); }
        }
        // catch a rail/ledge on the way down
        if (s.vy <= 0) {
          for (const f of this.level.near(s.x)) {
            if (!isGrindable(f) || s.x < f.x || s.x > f.x + f.w) continue;
            const ry = railY(f, s.x);
            if (prevY >= ry - 3 && s.y <= ry) {
              s.y = ry;
              if (s.airTrick) { this.bail('sketchy', ev); return ev; }
              this.startGrind(f, ev);
              break;
            }
          }
        }
        if (s.mode === 'air') {
          const gy = this.level.groundY(s.x);
          if (s.y <= gy) {
            s.y = gy; s.vy = 0;
            if (s.airTrick) { this.bail('sketchy', ev); return ev; }
            s.mode = 'ground'; s.comboTimer = CFG.comboGrace;
            ev.push({ type: 'land' });
          }
        }
        break;
      }
      case 'grind': {
        const f = s.grind!, tr = TRICKS[s.grindTrick!];
        s.x += s.speed * dt;
        s.grindTime += dt; s.stanceTime += dt;
        if (s.x > f.x + f.w) {
          s.mode = 'air'; s.vy = CFG.railEndPop; s.grind = null;
          break;
        }
        s.y = railY(f, s.x);
        // P-01: only part of a stance's difficulty speeds up the lean (EASIEST is the baseline stance)
        const hard = CFG.stanceHardness === 1 ? tr.difficulty : EASIEST + (tr.difficulty - EASIEST) * CFG.stanceHardness;
        const k = (CFG.balanceInstability * hard * (1 + s.grindTime * CFG.balanceTimeRamp)) / this.skater.balance;
        const noise = (this.rng.next() * 2 - 1) * CFG.balanceNoise * tr.difficulty;
        // P-01: steering scales with the stance so hard stances stay saveable; a fresh stance is calm for a moment
        const control = Math.max(CFG.balanceControl, (CFG.balanceControlScale * CFG.balanceInstability * hard) / this.skater.balance);
        const settle = CFG.balanceSettleMs > 0 ? Math.min(1, (s.stanceTime * 1000) / CFG.balanceSettleMs) : 1;
        s.balanceVel += ((k * s.balance + noise) * settle + clamp(input.balance, -1, 1) * control) * dt;
        s.balanceVel *= 1 - CFG.balanceDamp * dt;
        s.balance += s.balanceVel * dt;
        s.combo[s.combo.length - 1].points += tr.points * CFG.grindPointsRate * dt;
        if (Math.abs(s.balance) > 1) { this.bail('balance', ev); return ev; }
        if (input.trick) {
          const nt = trickForSlot('grind', input.trick, this.playerLevel);
          if (nt && nt.id !== s.grindTrick) {
            s.grindTrick = nt.id;
            s.combo.push({ trickId: nt.id, name: nt.name, points: nt.points });
            s.balanceVel += (this.rng.next() < 0.5 ? -1 : 1) * CFG.switchUpKick * nt.difficulty; // switch-ups wobble you
            s.stanceTime = 0;
            ev.push({ type: 'switchUp', trickId: nt.id });
          }
        }
        if (input.jumpPressed) {
          s.mode = 'air'; s.vy = CFG.jumpV * this.skater.air; s.grind = null;
          ev.push({ type: 'jump' });
        }
        break;
      }
    }

    // collisions
    if (s.invuln <= 0) {
      for (const f of this.level.near(s.x)) {
        if (isObstacle(f)) {
          if (s.x + CFG.halfW > f.x && s.x - CFG.halfW < f.x + f.w && s.y < f.h) { this.bail('obstacle', ev); break; }
        } else if (f.kind === 'ledge' && s.grind !== f) {
          // only the front face hurts: crossing it below the top
          if (prevX < f.x && s.x >= f.x && s.y < f.h - 3) { this.bail('obstacle', ev); break; }
        }
      }
    }
    return ev;
  }

  private startGrind(f: Feature, ev: SimEvent[]): void {
    const s = this.s, tr = trickForSlot('grind', null, this.playerLevel)!;
    s.mode = 'grind'; s.grind = f; s.grindTrick = tr.id; s.grindTime = 0; s.stanceTime = 0; s.vy = 0;
    s.balance = (this.rng.next() * 2 - 1) * 0.15; s.balanceVel = 0;
    s.combo.push({ trickId: tr.id, name: tr.name, points: tr.points * 0.5 });
    ev.push({ type: 'grindStart', trickId: tr.id });
  }

  private bank(ev: SimEvent[]): void {
    const s = this.s, pts = comboValue(s.combo);
    s.score += pts;
    s.bestCombo = Math.max(s.bestCombo, pts);
    ev.push({ type: 'bank', points: pts, count: s.combo.length });
    s.combo = [];
  }

  private bail(reason: 'obstacle' | 'balance' | 'sketchy', ev: SimEvent[]): void {
    const s = this.s;
    s.mode = 'bail'; s.combo = []; s.airTrick = null; s.grind = null; s.grindTrick = null;
    s.lives -= 1; s.bailTimer = CFG.bailTime; s.invuln = CFG.bailTime + CFG.invulnTime;
    s.speed *= CFG.bailSpeedFactor; s.vy = 0;
    ev.push({ type: 'bail', reason });
  }
}
