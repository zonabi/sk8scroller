import type { LessonId } from '../core/tutorial';
import { PAD_DOWN, PAD_LEFT, PAD_RIGHT, PAD_UP } from './pads';

/** Which controls the player is holding: the tutorial words its prompts for them. */
export type ControlKind = 'pads' | 'keys' | 'zones';

/** Thumb zones (touch layout 0) have no gesture for dropping off a rail, so that lesson is left out there. */
export const lessonsToSkip = (kind: ControlKind): LessonId[] => (kind === 'zones' ? ['drop'] : []);

/** [title, what to press] for a lesson. `lefty` swaps which pad is which. */
export function lessonText(id: LessonId, kind: ControlKind, lefty: boolean): [string, string] {
  const move = lefty ? 'right pad' : 'left pad', trick = lefty ? 'left pad' : 'right pad';
  const by = <T,>(pads: T, keys: T, zones: T): T => (kind === 'pads' ? pads : kind === 'keys' ? keys : zones);
  switch (id) {
    case 'jump': return ['JUMP THE CONE', by(`${move}: top button`, 'UP arrow or SPACE', 'tap the left side of the screen')];
    case 'grind': return ['GRIND THE RAIL', 'jump onto it'];
    case 'balance': return ['STAY ON!', by(`${move}: left and right keep the needle green`, 'LEFT and RIGHT arrows keep the needle green', 'hold the left side and drag to keep the needle green')];
    case 'switch': return ['SWITCH UP', by(`on the rail, press a button on the ${trick}`, 'on the rail, press W, A, S or D', 'on the rail, swipe on the right side')];
    case 'trick': return ['AIR TRICK', by(`jump, then press a button on the ${trick}`, 'jump, then press W, A, S or D', 'jump, then swipe on the right side')];
    case 'drop': return ['DROP OFF THE RAIL', by(`on the rail, ${move}: bottom button`, 'on the rail, DOWN arrow', '')];
    case 'push': return ['PUSH FOR SPEED', by(`${move}: right button`, 'RIGHT arrow', 'tap the right side of the screen')];
    case 'fakie': return ['GO FAKIE', by(`${move}: left button turns you round`, 'LEFT arrow turns you round', 'swipe left on the right side')];
  }
}
/** The pad button to light up for a lesson (-1 = none). Buttons 0–3 are the movement pad, 4–7 the trick pad. */
export function lessonHint(id: LessonId): number {
  switch (id) {
    case 'jump': case 'grind': return PAD_UP;
    case 'switch': case 'trick': return 4 + PAD_UP;
    case 'drop': return PAD_DOWN;
    case 'push': return PAD_RIGHT;
    case 'fakie': return PAD_LEFT;
    default: return -1;
  }
}
