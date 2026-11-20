import { describe, expect, it } from 'vitest';
import { Sim, comboValue, NO_INPUT, type Input } from '../src/core/sim';
import { botInput, runBot } from '../src/core/bot';
import { Recorder, analyse, inputsOf, report } from '../src/core/replay';
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

describe('practice rail', () => {
  it('?rail puts one long rail about 10 seconds in', () => {
    const sim = new Sim({ seed: 3, skater: SKATERS[0], playerLevel: 1, longRail: true });
    sim.level.ensure(6000);
    const long = sim.level.features.filter(f => f.kind === 'rail' && f.w >= 2000);
    expect(long.length).toBe(1);
    expect(long[0].x / CFG.baseSpeed).toBeGreaterThan(9);
    expect(long[0].x / CFG.baseSpeed).toBeLessThan(13);
  });
});

describe('P-02 rail landings', () => {
  const ontoRail = (playerLevel: number, during: (sim: Sim, framesToRail: number) => Partial<Input>) => {
    const sim = mk(1, playerLevel);
    sim.level.add('rail', 80, 400, 24);
    while (sim.s.x < 80 - sim.s.speed * 0.3) sim.step(press({}));
    sim.step(press({ jumpPressed: true }));
    // dry-run the same jump to learn which frame touches the rail
    const probe = mk(1, playerLevel); probe.level.add('rail', 80, 400, 24);
    while (probe.s.x < 80 - probe.s.speed * 0.3) probe.step(press({}));
    probe.step(press({ jumpPressed: true }));
    let total = 0; while (probe.s.mode === 'air') { probe.step(press({})); total++; }
    for (let i = 0; i < total && sim.s.mode === 'air'; i++) sim.step(press(during(sim, total - i)));
    return sim;
  };
  it('a swipe within 100 ms of the rail picks the stance and drops the air trick', () => {
    const sim = ontoRail(1, (_s, left) => (left === 4 ? { trick: 'up' } : {}));
    expect(sim.s.mode).toBe('grind');
    expect(sim.s.grindTrick).toBe('soul');
    expect(sim.s.combo.map(c => c.trickId)).toEqual(['soul']);
  });
  it('a finished air trick picks the stance', () => {
    const sim = ontoRail(1, (_s, left) => (left === 30 ? { trick: 'up' } : {}));   // mute (0.3 s) finishes in time
    expect(sim.s.mode).toBe('grind');
    expect(sim.s.combo.map(c => c.trickId)).toEqual(['mute', 'soul']);
  });
  it('an unfinished older trick still slams', () => {
    const sim = ontoRail(8, (_s, left) => (left === 15 ? { trick: 'right' } : {}));  // misty needs 0.55 s, has 0.25
    expect(sim.s.mode).toBe('bail');
  });
});

describe('P-03 landing grace', () => {
  const landWith = (msShort: number) => {
    const sim = mk(1, 1);
    sim.step(press({ jumpPressed: true }));
    const probe = mk(1, 1); probe.step(press({ jumpPressed: true }));
    let total = 0; while (probe.s.mode === 'air') { probe.step(press({})); total++; }
    const startAt = total - Math.round((300 - msShort) / (1000 / 60));       // mute takes 300 ms
    for (let i = 0; i < total + 2; i++) sim.step(press(i === startAt ? { trick: 'up' } : {}));
    return sim;
  };
  it('a trick ~80 ms from finished lands clean', () => {
    const sim = landWith(80);
    expect(sim.s.lives).toBe(CFG.lives);
    expect(sim.s.combo.map(c => c.trickId)).toEqual(['mute']);
  });
  it('a trick 200 ms from finished still slams', () => { expect(landWith(200).s.lives).toBe(CFG.lives - 1); });
});

describe('P-04 inputs that did nothing', () => {
  it('a swipe made as a trick is finishing fires when it ends', () => {
    const sim = mk(1, 1);
    sim.level.add('kicker', 60, 40, 18);                     // kicker air: room for two tricks
    while (sim.s.mode !== 'air') sim.step(press({}));
    sim.step(press({ trick: 'up' }));
    for (let i = 0; i < 12; i++) sim.step(press({}));        // 200 ms into a 300 ms mute
    sim.step(press({ trick: 'left' }));                      // ~85 ms before it ends
    for (let i = 0; i < 8; i++) sim.step(press({}));
    expect(sim.s.combo.map(c => c.trickId)).toEqual(['mute']);
    expect(sim.s.airTrick?.id).toBe('spin180');
  });
  it('a jump just after the rail runs out still works', () => {
    const sim = mk(1, 1);
    sim.level.add('rail', 80, 120, 24);
    while (sim.s.x < 80 - sim.s.speed * 0.3) sim.step(press({}));
    sim.step(press({ jumpPressed: true }));
    while (sim.s.mode !== 'grind') sim.step(press({}));
    while (sim.s.mode === 'grind') sim.step(press({ balance: -(sim.s.balance * 6 + sim.s.balanceVel * 2) }));
    for (let i = 0; i < 4; i++) sim.step(press({}));         // ~65 ms late
    const vy = sim.s.vy;
    sim.step(press({ jumpPressed: true }));
    expect(sim.s.vy).toBeGreaterThan(vy + 150);
  });
});

describe('P-07 trick just before take-off', () => {
  it('a swipe 100 ms before jumping fires as the jump leaves', () => {
    const sim = mk(1, 1);
    for (let i = 0; i < 10; i++) sim.step(press({}));
    sim.step(press({ trick: 'left' }));
    for (let i = 0; i < 5; i++) sim.step(press({}));
    sim.step(press({ jumpPressed: true }));
    expect(sim.s.airTrick?.id).toBe('spin180');
  });
  it('a swipe 400 ms before jumping does not', () => {
    const sim = mk(1, 1);
    sim.step(press({ trick: 'left' }));
    for (let i = 0; i < 24; i++) sim.step(press({}));
    sim.step(press({ jumpPressed: true }));
    expect(sim.s.airTrick).toBeNull();
  });
});

describe('P-05 push', () => {
  it('lifts speed for a moment, then it fades, and has a cooldown', () => {
    const sim = mk(1, 1), cruise = () => sim.s.speed / sim.targetSpeed;
    for (let i = 0; i < 60; i++) sim.step(press({}));
    expect(cruise()).toBeCloseTo(1, 1);
    expect(sim.step(press({ push: true })).some(e => e.type === 'push')).toBe(true);
    for (let i = 0; i < 40; i++) sim.step(press({}));
    expect(cruise()).toBeGreaterThan(1.14);
    expect(sim.step(press({ push: true })).some(e => e.type === 'push')).toBe(false);     // still cooling down
    for (let i = 0; i < 200; i++) sim.step(press({}));
    expect(cruise()).toBeLessThan(1.03);
  });
  it('survives a recording round trip', () => {
    const sim = mk(1, 1), rec = new Recorder();
    for (let i = 0; i < 120; i++) sim.step(rec.push({ ...NO_INPUT, jumpHeld: true, push: i === 30 }));
    const saved = JSON.parse(JSON.stringify(rec.finish({ app: 't', device: 't', seed: 1, skaterId: 'rio', playerLevel: 1, longRail: false }, sim)));
    expect([...inputsOf(saved)].filter(i => i.push).length).toBe(1);
  });
});

describe('P-06 fakie', () => {
  const air = (sim: Sim) => { sim.step(press({ jumpPressed: true })); };
  const land = (sim: Sim) => { while (sim.s.mode === 'air') sim.step(press({})); };
  it('turning round toggles fakie on the ground', () => {
    const sim = mk(1, 1);
    expect(sim.step(press({ turn: true })).some(e => e.type === 'turn')).toBe(true);
    expect(sim.s.fakie).toBe(true);
    for (let i = 0; i < 30; i++) sim.step(press({}));
    sim.step(press({ turn: true }));
    expect(sim.s.fakie).toBe(false);
  });
  it('a 180 leaves you fakie, a 360 does not', () => {
    const a = mk(1, 1); air(a); a.step(press({ trick: 'left' })); land(a);
    expect(a.s.fakie).toBe(true);
    const b = mk(1, 2); air(b); b.step(press({ trick: 'left' })); land(b);       // level 2: left is the 360
    expect(b.s.combo.map(c => c.trickId)).toEqual(['spin360']);
    expect(b.s.fakie).toBe(false);
  });
  it('fakie tricks are named and scored separately', () => {
    const sim = mk(1, 1);
    sim.step(press({ turn: true }));
    for (let i = 0; i < 30; i++) sim.step(press({}));
    air(sim); sim.step(press({ trick: 'up' })); land(sim);
    expect(sim.s.combo[0]).toEqual({ trickId: 'fakie-mute', name: 'Fakie Mute Grab', points: 150 * 1.25 });
  });
  it('a left swipe that turns you, then an immediate jump, is a trick — the turn is undone', () => {
    const sim = mk(1, 2);
    sim.step(press({ trick: 'left', turn: true }));
    for (let i = 0; i < 3; i++) sim.step(press({}));
    sim.step(press({ jumpPressed: true }));
    expect(sim.s.airTrick?.id).toBe('spin360');
    expect(sim.s.airTrick?.fakie).toBe(false);
    expect(sim.s.fakie).toBe(false);
  });
  it('a bail puts you back to forward', () => {
    const sim = mk(1, 1);
    sim.step(press({ turn: true }));
    sim.level.add('barrier', sim.s.x + 60, 12, 22);
    for (let i = 0; i < 60; i++) sim.step(press({}));
    expect(sim.s.fakie).toBe(false);
  });
});

describe('recording', () => {
  it('replays a recorded run exactly and survives a JSON round trip', () => {
    const sim = new Sim({ seed: 9, skater: SKATERS[1], playerLevel: 4 });
    const rec = new Recorder();
    for (let i = 0; i < 60 * 40 && sim.s.mode !== 'over'; i++) {
      const input = botInput(sim);
      input.balance += Math.sin(i * 0.37) * 0.013;       // un-round values, as touch input would give
      sim.step(rec.push(input));
    }
    rec.mark();
    const saved = JSON.parse(JSON.stringify(rec.finish({ app: 't', device: 't', seed: 9, skaterId: SKATERS[1].id, playerLevel: 4, longRail: false }, sim)));
    const a = analyse(saved);
    expect(a.exact).toBe(true);
    expect(a.score).toBe(sim.totalScore);
    expect(a.grinds.length).toBeGreaterThan(0);
    expect(a.marks.length).toBe(1);
    expect(report(saved, a)).toContain('exact match');
  });
  it('flags a jump pressed just before landing', () => {
    const sim = new Sim({ seed: 1, skater: SKATERS[0], playerLevel: 1 });
    sim.level.features.length = 0;
    const rec = new Recorder(), go = (p: Partial<Input>) => sim.step(rec.push({ ...NO_INPUT, jumpHeld: true, ...p }));
    go({ jumpPressed: true });
    while (sim.s.mode === 'air' && !(sim.s.vy < 0 && sim.s.y < 6)) go({});
    go({ jumpPressed: true });                             // too early: still airborne
    for (let i = 0; i < 30; i++) go({});
    const a = analyse(rec.finish({ app: 't', device: 't', seed: 1, skaterId: 'rio', playerLevel: 1, longRail: false }, sim));
    expect(a.ignoredJumps.length).toBe(1);
    expect(a.ignoredJumps[0].detail).toContain('jump buffer');
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
    expect(trickForSlot('air', 'right', 1)!.id).toBe('stale');          // P-04: every direction has a trick from level 1
    for (const d of ['up', 'down', 'left', 'right'] as const) { expect(trickForSlot('air', d, 1)).not.toBeNull(); expect(trickForSlot('grind', d, 1)).not.toBeNull(); }
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
