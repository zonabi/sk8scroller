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
  balanceDamp: 6, // was 4 before P-01 (recordings carry their own value)
  grindPointsRate: 1.0, // fraction of a trick's points earned per second held
  // combos
  comboGrace: 0.9, // seconds on the ground before a combo banks
  repeatPenalty: 0.7,
  // bails
  lives: 3,
  bailTime: 0.8,
  invulnTime: 1.6,
  bailSpeedFactor: 0.4,

  // ---- playtest changes (docs/PLAYTEST.md). Each key needs a LEGACY value below. ----
  // P-01 balance you can actually save
  balanceControlScale: 0.9, // steering strength as a fraction of the stance's own pull (never below balanceControl)
  balanceSettleMs: 400,     // after locking into a stance, the lean takes this long to start running away
  switchUpKick: 0.25,       // shove a switch-up gives the lean, × stance difficulty
  // P-02 rail landings: your swipe picks the grind
  railIntentMs: 100,        // a swipe this close before touching a rail means "grind in this stance", not an air trick
  railTrickPicksGrind: 1,   // a completed air trick's direction picks the stance you lock into
  // P-03 near-miss landings count
  landGraceMs: 100,         // a trick this close to finished when you touch down lands clean
  // P-04 inputs that used to do nothing
  trickBufferMs: 150,       // a swipe made while a trick is finishing fires as soon as it ends, if it ends within this
  coyoteMs: 110,            // you can still jump this long after a rail runs out under you
  allSlotsFromStart: 1,     // every swipe direction has a trick from level 1
  // P-07 trick pressed just before take-off
  preJumpMs: 140,           // a swipe on the ground this close before a jump fires as the jump leaves
  // P-05 push for a burst of speed
  pushBoost: 0.22,          // extra speed while a push lasts, as a fraction (0 = pushing disabled)
  pushSecs: 1.5,            // how long one push lasts
  pushCooldown: 2.2,        // seconds from one push to the next
  // P-06 fakie: roll backwards, same direction
  fakieEnabled: 1,          // turning round, and 180s/540s leaving you fakie
  fakieBonus: 0.25,         // extra points for anything done fakie, as a fraction
  fakieBalance: 0.15,       // how much faster a lean runs away when grinding fakie
  // P-12 turn round in the air; jump on the very last frame of a rail
  airTurn: 1,               // the turn input in the air does a 180 (always available, whatever the left trick slot holds)
  railEndJump: 1,           // a jump pressed on the frame the rail runs out still jumps
  // P-13 touch controls that mirror the keyboard (read by game/input.ts and game/pads.ts; the sim never looks at these)
  touchLayout: 1,           // 0 = thumb zones and swipes · 1 = two on-screen button pads (left = arrow keys, right = W A S D)
  padAlpha: 0.22,           // how visible the pads are (0 = invisible, 1 = solid)
  padY: 0.38,               // height of the pads' centre as a fraction of the screen, from the top
  padSize: 44,              // button diameter, art px (the screen is 640 wide)
  padInset: 14,             // gap from the side of the screen to the pad, art px
  stanceHardness: 0.4,      // how much of a stance's difficulty speeds up the lean (1 = all of it, 0 = every stance tips like the easiest)
};
export type CfgKey = keyof typeof DEF;
export const DEFAULTS: Readonly<Record<CfgKey, number>> = Object.freeze({ ...DEF });
/** The live values. Read this everywhere; never cache a value across steps. */
export const CFG: Record<CfgKey, number> = { ...DEF };

/** Pre-change values for keys introduced by a playtest change (see header). */
export const LEGACY: Partial<Record<CfgKey, number>> = {
  balanceControlScale: 0, balanceSettleMs: 0, switchUpKick: 0.4, stanceHardness: 1,
  railIntentMs: 0, railTrickPicksGrind: 0, landGraceMs: 0, trickBufferMs: 0, coyoteMs: 0, allSlotsFromStart: 0, preJumpMs: 0, pushBoost: 0, fakieEnabled: 0, airTurn: 0, railEndJump: 0, touchLayout: 0,
};

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
  { key: 'touchLayout', group: 'P-13 Touch controls', label: 'Touch layout', kind: 'slider', min: 0, max: 1, step: 1, hint: '0 = thumb zones and swipes (before) · 1 = button pads: left is the arrow keys (jump, turn, push), right is W A S D (tricks)' },
  { key: 'padAlpha', group: 'P-13 Touch controls', label: 'Pad visibility', kind: 'slider', min: 0.05, max: 0.8, step: 0.01, hint: 'Lower = fainter' },
  { key: 'padY', group: 'P-13 Touch controls', label: 'Pad height on screen', kind: 'slider', min: 0.2, max: 0.8, step: 0.01, hint: '0.5 = centred, lower numbers = nearer the top' },
  { key: 'padSize', group: 'P-13 Touch controls', label: 'Button size', kind: 'slider', min: 30, max: 64, step: 1 },
  { key: 'padInset', group: 'P-13 Touch controls', label: 'Gap from the screen edge', kind: 'slider', min: 0, max: 80, step: 2 },
  { key: 'fakieEnabled', group: 'P-06 Fakie', label: 'Fakie stance', kind: 'toggle', hint: 'Turn round on the ground; a 180 or 540 leaves you facing the other way' },
  { key: 'fakieBonus', group: 'P-06 Fakie', label: 'Fakie points bonus', kind: 'slider', min: 0, max: 0.6, step: 0.05 },
  { key: 'fakieBalance', group: 'P-06 Fakie', label: 'Extra balance difficulty when fakie', kind: 'slider', min: 0, max: 0.5, step: 0.05 },
  { key: 'pushBoost', group: 'P-05 Push', label: 'Push strength', kind: 'slider', min: 0, max: 0.45, step: 0.01, hint: 'Extra speed while a push lasts (0.22 = 22%). 0 = no pushing' },
  { key: 'pushSecs', group: 'P-05 Push', label: 'Push length (s)', kind: 'slider', min: 0.5, max: 3, step: 0.1 },
  { key: 'pushCooldown', group: 'P-05 Push', label: 'Time between pushes (s)', kind: 'slider', min: 0.5, max: 5, step: 0.1 },
  { key: 'airTurn', group: 'P-12 Turn in the air', label: 'Turn round mid-jump (a 180)', kind: 'toggle', hint: '← on keyboard, right-thumb tap on touch. Off: tap in the air is the up trick again' },
  { key: 'railEndJump', group: 'P-12 Turn in the air', label: 'Jump on the last frame of a rail', kind: 'toggle' },
  { key: 'preJumpMs', group: 'P-07 Trick just before take-off', label: 'Swipe-before-jump window (ms)', kind: 'slider', min: 0, max: 300, step: 10, hint: 'A trick swipe on the ground this close before you jump fires as you leave. 0 = off' },
  { key: 'trickBufferMs', group: 'P-04 Inputs that did nothing', label: 'Trick queue window (ms)', kind: 'slider', min: 0, max: 400, step: 10, hint: 'Swipe while a trick is finishing: it fires when the first one ends. 0 = off' },
  { key: 'coyoteMs', group: 'P-04 Inputs that did nothing', label: 'Late jump off a rail end (ms)', kind: 'slider', min: 0, max: 300, step: 10 },
  { key: 'allSlotsFromStart', group: 'P-04 Inputs that did nothing', label: 'A trick in every direction from level 1', kind: 'toggle' },
  { key: 'landGraceMs', group: 'P-03 Near-miss landings', label: 'Landing forgiveness (ms)', kind: 'slider', min: 0, max: 250, step: 10, hint: 'A trick this close to finished when you touch down counts as landed. 0 = off' },
  { key: 'railIntentMs', group: 'P-02 Swipe picks the grind', label: 'Swipe-before-rail window (ms)', kind: 'slider', min: 0, max: 300, step: 10, hint: 'A swipe this close to touching a rail picks the stance instead of starting an air trick. 0 = off' },
  { key: 'railTrickPicksGrind', group: 'P-02 Swipe picks the grind', label: 'Finished air trick picks the stance', kind: 'toggle', hint: 'Land a trick, then a rail: you lock into the stance for that swipe direction' },
  { key: 'balanceControlScale', group: 'P-01 Balance you can save', label: 'Steering strength vs the stance', kind: 'slider', min: 0, max: 1.3, step: 0.05, hint: 'Higher = a lean can be pulled back from further over' },
  { key: 'balanceSettleMs', group: 'P-01 Balance you can save', label: 'Calm moment after locking in (ms)', kind: 'slider', min: 0, max: 900, step: 50, hint: 'Time before a new stance starts to tip' },
  { key: 'stanceHardness', group: 'P-01 Balance you can save', label: 'How much faster hard stances tip', kind: 'slider', min: 0, max: 1, step: 0.05, hint: '1 = Unity tips over twice as fast as Frontside; lower = closer together' },
  { key: 'balanceDamp', group: 'P-01 Balance you can save', label: 'Lean damping', kind: 'slider', min: 2, max: 9, step: 0.5, hint: 'Higher = the lean builds more slowly (was 4)' },
  { key: 'switchUpKick', group: 'P-01 Balance you can save', label: 'Shove from a switch-up', kind: 'slider', min: 0, max: 0.6, step: 0.05 },
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
