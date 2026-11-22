import { TRICK_LIST, levelOf, type TrickDef } from './tricks';

export const MAX_LEVEL = 10;
/**
 * P-11 pacing: about one level per 1–2 runs of 3–5 minutes, i.e. roughly five minutes of skating a level.
 * XP comes from time on the board as well as points, because points are wildly uneven (combos multiply:
 * recorded runs range from 200 to 267,000) and a single lucky run should not skip three levels.
 * A typical minute earns 75–150 XP: 60 for the minute, the rest from points.
 */
const FIRST_LEVEL_XP = 450, STEP_XP = 50;
/** XP needed to *reach* a level (level 1 = 0). Each level costs 50 more than the last: 450, 500, 550 … */
export const xpForLevel = (level: number): number => { const n = level - 1; return n * FIRST_LEVEL_XP + STEP_XP * (n * (n - 1)) / 2; };
export function levelForXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}
/** XP for a finished run: one per second skated plus one per 1,000 points. */
export const xpFromRun = (totalScore: number, seconds: number): number => Math.floor(seconds + totalScore / 1000);
/** The curve before P-11 (one good run reached the top). Only used to carry an old save's level across. */
export const legacyLevelForXp = (xp: number): number => { let lvl = 1; while (lvl < MAX_LEVEL && xp >= Math.round(150 * lvl ** 1.6)) lvl++; return lvl; };
export const unlocksAt = (level: number): TrickDef[] => TRICK_LIST.filter(t => levelOf(t) === level);
