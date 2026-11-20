import type { Input, Sim } from './sim';
import { isGrindable } from './level';

/**
 * A simple autoplayer. It is the fairness check for level generation and tuning:
 * if the bot's survival distance drops after a change, the change made the game
 * unfair (or broke something). It is also handy for attract-mode demos.
 */
export function botInput(sim: Sim): Input {
  const s = sim.s;
  const input: Input = { jumpPressed: false, jumpHeld: true, trick: null, balance: 0, push: false };
  const next = sim.level.features.find(f => f.x > s.x && f.kind !== 'kicker');
  if (s.mode === 'ground') {
    if (next && !sim.level.kickerAt(s.x)) {
      const lead = s.speed * (isGrindable(next) ? 0.3 : 0.26);
      if (next.x - s.x <= lead) input.jumpPressed = true;
    }
  } else if (s.mode === 'air') {
    // only trick when there is clearly time: early in the rise
    if (!s.airTrick && s.vy > 180 && s.y > 12) input.trick = 'up';
  } else if (s.mode === 'grind') {
    input.balance = Math.max(-1, Math.min(1, -(s.balance * 6 + s.balanceVel * 2)));
    if (s.grindTime > 0.35 && s.grindTime < 0.37) input.trick = 'up';
  }
  return input;
}

export function runBot(sim: Sim, maxSeconds = 180): void {
  const steps = maxSeconds * 60;
  for (let i = 0; i < steps && sim.s.mode !== 'over'; i++) sim.step(botInput(sim));
}
