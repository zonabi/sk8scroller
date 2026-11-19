/** Controls the HTML loading screen in index.html (it must exist before any JS or fonts have loaded). */
const el = () => document.getElementById('loading');
export const loading = {
  /** Fonts are in: reveal the lettering. */
  fontsReady(): void { el()?.classList.add('fonts'); },
  stage(label: string, progress: number): void {
    const e = el(); if (!e) return;
    e.style.setProperty('--p', String(Math.min(1, progress)));
    const l = e.querySelector('.stage'); if (l) l.textContent = label + '…';
  },
  /** Fade out and remove. Returns true the first time. */
  done(): boolean {
    const e = el(); if (!e || e.classList.contains('done')) return false;
    e.style.setProperty('--p', '1'); e.classList.add('done');
    setTimeout(() => e.remove(), 400);
    return true;
  },
};

/** Boot timeline: where the time between page load and the first menu frame goes. Shown by ?fps and logged. */
const marks: [string, number][] = [];
export const bootMark = (label: string): void => { marks.push([label, performance.now()]); };
export const bootSummary = (): string => marks.map(([l, t], i) => `${l} ${(t - (i ? marks[i - 1][1] : 0)).toFixed(0)}`).join(' · ');
