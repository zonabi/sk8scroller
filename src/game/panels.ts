/**
 * Full-screen HTML sheets over the game: how to play, pause, settings (and the look they share, `.panel` in index.html).
 * Only ever open while no run is being simulated — on the menu, or with the run paused — so they cost nothing per frame.
 * Keys go to the top sheet only, and never reach the game underneath.
 */
const keyStack: ((e: KeyboardEvent) => void)[] = [];
window.addEventListener('keydown', e => {
  const top = keyStack[keyStack.length - 1];
  if (!top) return;
  e.stopPropagation();
  if (!e.repeat) top(e);
}, true);

export interface Panel { root: HTMLElement; close: () => void }
export const panelOpen = (): boolean => keyStack.length > 0;

/** Add an empty sheet. `onKey` gets every key press while it is the top sheet. */
export function openPanel(id: string, onKey: (e: KeyboardEvent) => void): Panel {
  document.getElementById(id)?.remove();
  const root = document.createElement('div'); root.id = id; root.className = 'panel';
  for (const ev of ['pointerdown', 'touchstart']) root.addEventListener(ev, e => e.stopPropagation());
  keyStack.push(onKey);
  document.body.appendChild(root);
  return { root, close: () => { const i = keyStack.lastIndexOf(onKey); if (i >= 0) keyStack.splice(i, 1); root.remove(); } };
}
/** The data-a of the button a click landed on, if any. */
export const actionOf = (e: Event): string | undefined => (e.target as HTMLElement).closest<HTMLElement>('[data-a]')?.dataset.a;
