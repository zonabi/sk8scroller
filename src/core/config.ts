/**
 * All gameplay tuning lives here. Units: pixels and seconds at the 480x270 world scale.
 *
 * Every playtest change gets its own key(s) here, an ID (P-01, P-02 …) and an entry in
 * docs/PLAYTEST.md. Three things follow from that, and they are what make changes reversible:
 *   1. DEFAULTS is the current game. CFG is the live copy the sim reads; the tuning panel
 *      (and `?t=key:value`) overrides it at runtime, so a change can be turned off with a tap.
 *   2. LEGACY holds, for each key added by a change, the value that reproduces the behaviour
 *      from BEFORE that change. Old recordings don't contain the key, so they replay with it.
 *   3. So `npm run replay -- --verify` must keep passing: every old run still replays exactly.
 *      If it fails, a change leaked outside its switch.
 */
const DEF = {
  dt: 1 / 60,
  // movement
  baseSpeed: 150,
  maxSpeedBonus: 110,
  speedRamp: 0.006, // bonus px/s per px travelled
  accel: 2.5,
  gravity: 900,
  jumpV: 330,
  jumpCutGravity: 1400, // extra gravity while rising with jump released (short hops)
  kickerV: 400,
  railEndPop: 90,
  // player hitbox
  halfW: 5,
  // grind balance (inverted pendulum: lean accelerates the lean)
  balanceInstability: 8,
  balanceTimeRamp: 0.25,
  balanceNoise: 8,
  balanceControl: 6,
  balanceDamp: 4,
  grindPointsRate: 1.0, // fraction of a trick's points earned per second held
  // combos
  comboGrace: 0.9, // seconds on the ground before a combo banks
  repeatPenalty: 0.7,
  // bails
  lives: 3,
  bailTime: 0.8,
  invulnTime: 1.6,
  bailSpeedFactor: 0.4,
};
export type CfgKey = keyof typeof DEF;
export const DEFAULTS: Readonly<Record<CfgKey, number>> = Object.freeze({ ...DEF });
/** The live values. Read this everywhere; never cache a value across steps. */
export const CFG: Record<CfgKey, number> = { ...DEF };

/** Pre-change values for keys introduced by a playtest change (see header). */
export const LEGACY: Partial<Record<CfgKey, number>> = {};

/** A control shown in the tuning panel. */
export interface Knob {
  key: CfgKey; group: string; label: string;
  kind: 'toggle' | 'slider';
  min?: number; max?: number; step?: number;
  /** One line on what it does, in player terms. */
  hint?: string;
}
/** Panel layout. Groups are change IDs (newest work first) then base feel. */
export const KNOBS: Knob[] = [
  { key: 'jumpV', group: 'Base feel', label: 'Jump power', kind: 'slider', min: 240, max: 420, step: 5 },
  { key: 'gravity', group: 'Base feel', label: 'Gravity', kind: 'slider', min: 600, max: 1300, step: 25 },
  { key: 'baseSpeed', group: 'Base feel', label: 'Starting speed', kind: 'slider', min: 100, max: 220, step: 5 },
  { key: 'maxSpeedBonus', group: 'Base feel', label: 'Extra speed late in a run', kind: 'slider', min: 0, max: 220, step: 10 },
  { key: 'balanceInstability', group: 'Base feel', label: 'How fast a lean runs away', kind: 'slider', min: 3, max: 14, step: 0.5 },
  { key: 'balanceTimeRamp', group: 'Base feel', label: 'Harder the longer you grind', kind: 'slider', min: 0, max: 0.6, step: 0.05 },
  { key: 'balanceNoise', group: 'Base feel', label: 'Random wobble', kind: 'slider', min: 0, max: 14, step: 0.5 },
  { key: 'comboGrace', group: 'Base feel', label: 'Seconds before a combo banks', kind: 'slider', min: 0.3, max: 2, step: 0.1 },
];

const known = (k: string): k is CfgKey => k in DEF && k !== 'dt';
/** Override live tuning. Unknown keys and non-numbers are ignored. */
export function setTuning(over: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(over)) if (known(k) && typeof v === 'number' && Number.isFinite(v)) CFG[k] = v;
}
export function resetTuning(): void { Object.assign(CFG, DEFAULTS); }
/** Only the keys that currently differ from the defaults. */
export function tuningOverrides(): Partial<Record<CfgKey, number>> {
  const o: Partial<Record<CfgKey, number>> = {};
  for (const k of Object.keys(DEF) as CfgKey[]) if (CFG[k] !== DEFAULTS[k]) o[k] = CFG[k];
  return o;
}
/** The full tuning a recording was played with: its stored values, LEGACY for keys it predates. */
export function recordedTuning(cfg: Record<string, number>): Record<CfgKey, number> {
  const t = { ...DEFAULTS } as Record<CfgKey, number>;
  for (const k of Object.keys(DEF) as CfgKey[]) {
    if (k === 'dt') continue;
    if (typeof cfg[k] === 'number') t[k] = cfg[k];
    else if (LEGACY[k] !== undefined) t[k] = LEGACY[k]!;
  }
  return t;
}
/** Run `fn` under a recording's tuning, then put the live tuning back. */
export function withTuning<T>(cfg: Record<string, number>, fn: () => T): T {
  const saved = { ...CFG };
  Object.assign(CFG, recordedTuning(cfg));
  try { return fn(); } finally { Object.assign(CFG, saved); }
}
