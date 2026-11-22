import { legacyLevelForXp, xpForLevel } from '../core/progression';

export interface Save { /** 2 = XP on the P-11 curve */ v: number; xp: number; best: number; skaterId: string; tilt: boolean; mute: boolean; /** the how-to-play card has been shown once */ seenHow: boolean; /** P-13: swap the touch pads (tricks left, movement right) */ lefty: boolean }
const KEY = 'sk8scroller.save.v1';
const DEFAULT: Save = { v: 2, xp: 0, best: 0, skaterId: 'rio', tilt: false, mute: false, seenHow: false, lefty: false };

export function loadSave(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Save>;
    // P-11 changed what XP is worth: an older save keeps the level it had reached, at the start of that level
    if (raw.v !== 2 && typeof raw.xp === 'number') raw.xp = xpForLevel(legacyLevelForXp(raw.xp));
    return { ...DEFAULT, ...raw, v: 2 };
  } catch { return { ...DEFAULT }; }
}
export function writeSave(s: Save): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. */ }
}
