import type { Recording } from '../core/replay';

/** A recording to play back instead of live input (set by ?replay=<file|latest>, loaded before the game starts). */
export let playback: Recording | null = null;

export async function loadPlayback(): Promise<void> {
  const name = new URLSearchParams(location.search).get('replay');
  if (!name) return;
  try {
    const r = await fetch(`/__run?file=${encodeURIComponent(name)}`);
    if (r.ok) playback = (await r.json()) as Recording;
    else console.warn(`[sk8] replay "${name}" not found`);
  } catch { console.warn('[sk8] replay needs the dev server'); }
}

const LAST = 'sk8scroller.lastRun';
/**
 * Hand a finished run to the dev server (it lands in runs/ on the dev machine). When there is no
 * dev server — a production build — keep the latest one locally so it can be downloaded.
 * Resolves to the saved file name, or null if it was only kept locally.
 */
export async function saveRun(rec: Recording): Promise<string | null> {
  const body = JSON.stringify(rec);
  try {
    const r = await fetch('/__run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (r.ok) return ((await r.json()) as { file: string }).file;
  } catch { /* no collector */ }
  try { localStorage.setItem(LAST, body); } catch { /* too big or private mode */ }
  return null;
}
/** Download the locally kept run as a file (fallback when there is no collector). */
export function downloadLastRun(): void {
  const body = localStorage.getItem(LAST); if (!body) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
  a.download = `sk8-run-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** The in-game "that felt wrong" flag button (HTML, top centre). */
let onFlag: (() => void) | null = null;
export function bindFlag(fn: (() => void) | null): void {
  onFlag = fn;
  document.body.classList.toggle('in-game', !!fn);
}
export function initFlag(): void {
  const b = document.getElementById('flag'); if (!b) return;
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    onFlag?.();
    b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit');
  });
}
