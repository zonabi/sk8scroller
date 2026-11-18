/** All gameplay tuning lives here. Units: pixels and seconds at the 480x270 internal resolution. */
export const CFG = {
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
} as const;
