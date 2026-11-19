export interface Save { xp: number; best: number; skaterId: string; tilt: boolean; mute: boolean }
const KEY = 'sk8scroller.save.v1';
const DEFAULT: Save = { xp: 0, best: 0, skaterId: 'rio', tilt: false, mute: false };

export function loadSave(): Save {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULT }; }
}
export function writeSave(s: Save): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. */ }
}
