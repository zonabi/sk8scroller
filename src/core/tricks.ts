import type { Dir } from './sim';

export interface TrickDef {
  id: string; name: string;
  type: 'grind' | 'air';
  /** Swipe direction that triggers it. `null` = the default grind you lock into. */
  slot: Dir | null;
  points: number;
  /** Grinds: balance instability multiplier. Air: unused. */
  difficulty: number;
  /** Air tricks: seconds to complete. Landing before it finishes = bail. */
  duration: number;
  unlockLevel: number;
}

/**
 * Tricks implemented in the game. The full researched vocabulary is in docs/TRICKS.md —
 * to add one, append here (and give it a pose in game/textures.ts if it needs one).
 * Per slot, the highest unlocked trick is the one that fires.
 */
export const TRICK_LIST: TrickDef[] = [
  // grinds
  { id: 'frontside', name: 'Frontside', type: 'grind', slot: null, points: 100, difficulty: 0.8, duration: 0, unlockLevel: 1 },
  { id: 'soul', name: 'Soul', type: 'grind', slot: 'up', points: 150, difficulty: 1.0, duration: 0, unlockLevel: 1 },
  { id: 'makio', name: 'Makio', type: 'grind', slot: 'down', points: 200, difficulty: 1.2, duration: 0, unlockLevel: 1 },
  { id: 'royale', name: 'Royale', type: 'grind', slot: 'left', points: 220, difficulty: 1.25, duration: 0, unlockLevel: 2 },
  { id: 'mizou', name: 'Mizou', type: 'grind', slot: 'right', points: 220, difficulty: 1.25, duration: 0, unlockLevel: 3 },
  { id: 'topsoul', name: 'Top Soul', type: 'grind', slot: 'up', points: 300, difficulty: 1.45, duration: 0, unlockLevel: 4 },
  { id: 'backslide', name: 'Backslide', type: 'grind', slot: 'left', points: 350, difficulty: 1.6, duration: 0, unlockLevel: 5 },
  { id: 'fishbrain', name: 'Fishbrain', type: 'grind', slot: 'down', points: 400, difficulty: 1.7, duration: 0, unlockLevel: 6 },
  { id: 'unity', name: 'Unity', type: 'grind', slot: 'right', points: 420, difficulty: 1.75, duration: 0, unlockLevel: 7 },
  // air
  { id: 'mute', name: 'Mute Grab', type: 'air', slot: 'up', points: 150, difficulty: 1, duration: 0.3, unlockLevel: 1 },
  { id: 'spin180', name: '180', type: 'air', slot: 'left', points: 120, difficulty: 1, duration: 0.28, unlockLevel: 1 },
  { id: 'safety', name: 'Safety Grab', type: 'air', slot: 'down', points: 170, difficulty: 1, duration: 0.32, unlockLevel: 2 },
  { id: 'spin360', name: '360', type: 'air', slot: 'left', points: 300, difficulty: 1, duration: 0.4, unlockLevel: 3 },
  { id: 'rocket', name: 'Rocket Air', type: 'air', slot: 'up', points: 320, difficulty: 1, duration: 0.4, unlockLevel: 4 },
  { id: 'backflip', name: 'Backflip', type: 'air', slot: 'right', points: 450, difficulty: 1, duration: 0.5, unlockLevel: 5 },
  { id: 'spin540', name: '540', type: 'air', slot: 'left', points: 550, difficulty: 1, duration: 0.52, unlockLevel: 6 },
  { id: 'liukang', name: 'Liu Kang', type: 'air', slot: 'down', points: 500, difficulty: 1, duration: 0.45, unlockLevel: 7 },
  { id: 'misty', name: 'Misty Flip', type: 'air', slot: 'right', points: 700, difficulty: 1, duration: 0.55, unlockLevel: 8 },
];

export const TRICKS: Record<string, TrickDef> = Object.fromEntries(TRICK_LIST.map(t => [t.id, t]));

export function trickForSlot(type: 'grind' | 'air', slot: Dir | null, level: number): TrickDef | null {
  let best: TrickDef | null = null;
  for (const t of TRICK_LIST) {
    if (t.type === type && t.slot === slot && t.unlockLevel <= level && (!best || t.unlockLevel > best.unlockLevel)) best = t;
  }
  return best;
}
