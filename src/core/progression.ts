import { TRICK_LIST, type TrickDef } from './tricks';

export const MAX_LEVEL = 10;
/** XP needed to *reach* a level (level 1 = 0). */
export const xpForLevel = (level: number): number => Math.round(150 * (level - 1) ** 1.6);
export function levelForXp(xp: number): number {
  let lvl = 1;
  while (lvl < MAX_LEVEL && xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}
export const xpFromRun = (totalScore: number): number => Math.floor(totalScore / 20);
export const unlocksAt = (level: number): TrickDef[] => TRICK_LIST.filter(t => t.unlockLevel === level);
