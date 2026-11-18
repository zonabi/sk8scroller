import { describe, expect, it } from 'vitest';
import { Sim, comboValue, NO_INPUT, type Input } from '../src/core/sim';
import { runBot } from '../src/core/bot';
import { SKATERS } from '../src/core/skaters';
import { levelForXp, xpForLevel } from '../src/core/progression';
import { trickForSlot } from '../src/core/tricks';
import { CFG } from '../src/core/config';

const mk = (seed = 1, playerLevel = 1) => {
  const sim = new Sim({ seed, skater: SKATERS[0], playerLevel });
  sim.level.features.length = 0; // tests place their own features
  return sim;
};
const press = (p: Partial<Input>): Input => ({ ...NO_INPUT, jumpHeld: true, ...p });
const run = (sim: Sim, steps: number, input: Input = press({})) => { for (let i = 0; i < steps; i++) sim.step(input); };

describe('sim', () => {
  it('is deterministic for a seed', () => {
    const a = new Sim({ seed: 42, skater: SKATERS[0], playerLevel: 3 });
    const b = new Sim({ seed: 42, skater: SKATERS[0], playerLevel: 3 });
    runBot(a, 60); runBot(b, 60);
    expect(a.s).toEqual(b.s);
  });

  it('jumps and lands', () => {
    const sim = mk();
    sim.step(press({ jumpPressed: true }));
    expect(sim.s.mode).toBe('air');
    run(sim, 120);
    expect(sim.s.mode).toBe('ground');
  });

  it('bails on an obstacle and loses a life', () => {
    const sim = mk();
    sim.level.add('barrier', 100, 12, 22);
    run(sim, 60);
    expect(sim.s.lives).toBe(CFG.lives - 1);
  });

  it('locks onto a rail, scores the grind, and banks after landing', () => {
    const sim = mk();
    sim.level.add('rail', 80, 200, 24);
    while (sim.s.x < 80 - sim.s.speed * 0.3) sim.step(press({}));
    sim.step(press({ jumpPressed: true }));
    while (sim.s.mode === 'air') sim.step(press({}));
    expect(sim.s.mode).toBe('grind');
    expect(sim.s.combo[0].trickId).toBe('frontside');
    sim.step(press({ trick: 'up' })); // switch-up to soul
    expect(sim.s.combo.map(c => c.trickId)).toEqual(['frontside', 'soul']);
    // hold balance with a simple controller until the rail ends and we land
    while (sim.s.mode === 'grind') sim.step(press({ balance: -(sim.s.balance * 6 + sim.s.balanceVel * 2) }));
    run(sim, 120);
    expect(sim.s.mode).toBe('ground');
    expect(sim.s.score).toBeGreaterThan(300);
    expect(sim.s.combo).toEqual([]);
  });

  it('falls off the rail with no balance input', () => {
    const sim = mk(7);
    sim.level.add('rail', 80, 3000, 24);
    while (sim.s.x < 80 - sim.s.speed * 0.3) sim.step(press({}));
    sim.step(press({ jumpPressed: true }));
    run(sim, 60 * 12);
    expect(sim.s.lives).toBeLessThan(CFG.lives);
  });

  it('bails when landing mid-trick', () => {
    const sim = mk(1, 8);
    sim.step(press({ jumpPressed: true }));
    run(sim, 30); // near the apex, too late for a 0.55s misty
    sim.step(press({ trick: 'right' }));
    run(sim, 60);
    expect(sim.s.lives).toBe(CFG.lives - 1);
  });

  it('combo value multiplies by count and decays repeats', () => {
    const e = (id: string, points: number) => ({ trickId: id, name: id, points });
    expect(comboValue([e('a', 100), e('b', 100)])).toBe(400);
    expect(comboValue([e('a', 100), e('a', 100)])).toBe(Math.round(170 * 2));
  });
});

describe('progression', () => {
  it('levels are monotonic', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(xpForLevel(4))).toBe(4);
    expect(levelForXp(xpForLevel(4) - 1)).toBe(3);
  });
  it('higher level upgrades a slot', () => {
    expect(trickForSlot('grind', 'up', 1)!.id).toBe('soul');
    expect(trickForSlot('grind', 'up', 4)!.id).toBe('topsoul');
    expect(trickForSlot('air', 'right', 1)).toBeNull();
  });
});

describe('fairness', () => {
  it('bot survives a meaningful distance on generated levels', () => {
    const d: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const sim = new Sim({ seed, skater: SKATERS[0], playerLevel: 1 });
      runBot(sim, 120);
      d.push(sim.distance);
    }
    d.sort((a, b) => a - b);
    expect(d[20]).toBeGreaterThan(600);
  });
});
