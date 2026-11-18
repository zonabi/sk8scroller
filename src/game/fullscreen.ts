/**
 * Full-screen button (HTML, not Phaser: browsers only allow entering full screen from inside a
 * real tap handler, and Phaser delivers its pointer events a frame later).
 *
 * iPhone Safari has no full-screen API for web pages. There the button explains the only route:
 * Share → Add to Home Screen, which launches the game chrome-less via the web manifest.
 */
type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

export function initFullscreen(): void {
  const btn = document.getElementById('fs'), toast = document.getElementById('fs-toast');
  if (!btn || !toast) return;
  const d = document as FsDoc, root = document.documentElement as FsEl;
  const installed = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (installed) { btn.remove(); return; }           // already chrome-less
  const supported = !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  const active = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
  const sync = () => btn.classList.toggle('on', active());
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);

  btn.addEventListener('click', async () => {
    if (!supported) {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 5000);
      return;
    }
    try {
      if (active()) { await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.()); return; }
      await (root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen?.());
      // Android can also be held in landscape while full screen; elsewhere this just rejects
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape').catch(() => {});
    } catch { /* user declined or the browser refused: nothing to do */ }
  });
}

/** The button is only offered on the menu, so it can't be hit by a stray swipe mid-run. */
export const showFullscreenButton = (show: boolean): void => { document.body.classList.toggle('in-menu', show); };
