import { CFG, DEFAULTS, KNOBS, LEGACY, resetTuning, setTuning, tuningOverrides, type CfgKey } from '../core/config';

/**
 * Live tuning: lets the player switch playtest changes on/off and nudge feel values between runs,
 * on the device they are playing on. Overrides are kept in localStorage, can be seeded from the URL
 * (`?t=jumpV:350,railIntentMs:0`), and are written into every recording.
 */
const KEY = 'sk8scroller.tuning';

export function loadTuning(): void {
  try { setTuning(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { /* ignore bad data */ }
  const t = new URLSearchParams(location.search).get('t');
  if (t) setTuning(Object.fromEntries(t.split(',').map(p => { const [k, v] = p.split(':'); return [k, Number(v)]; })));
}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(tuningOverrides())); } catch { /* private mode */ } };
export const tuningCount = (): number => Object.keys(tuningOverrides()).length;

const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

/** Opens the panel (plain HTML — it is only used on the menu, never mid-run). */
export function openTuningPanel(onClose: () => void): void {
  document.getElementById('tune')?.remove();
  const root = document.createElement('div'); root.id = 'tune';
  const groups = [...new Set(KNOBS.map(k => k.group))];
  const row = (k: (typeof KNOBS)[number]) => {
    const legacy = LEGACY[k.key], def = DEFAULTS[k.key];
    const was = legacy !== undefined ? `<span class="was">before: ${k.kind === 'toggle' ? (legacy ? 'on' : 'off') : fmt(legacy)}</span>` : '';
    const ctl = k.kind === 'toggle'
      ? `<label class="sw"><input type="checkbox" data-k="${k.key}" ${CFG[k.key] ? 'checked' : ''}><i></i></label>`
      : `<input type="range" data-k="${k.key}" min="${k.min}" max="${k.max}" step="${k.step}" value="${CFG[k.key]}"><output data-o="${k.key}">${fmt(CFG[k.key])}</output>`;
    return `<div class="r${CFG[k.key] !== def ? ' ch' : ''}" data-r="${k.key}"><div class="l"><b>${k.label}</b>${k.hint ? `<small>${k.hint}</small>` : ''}<small>default ${k.kind === 'toggle' ? (def ? 'on' : 'off') : fmt(def)} ${was}</small></div><div class="c">${ctl}</div></div>`;
  };
  root.innerHTML = `<div class="box"><header><h2>TUNING</h2><span class="n"></span>
      <button data-a="defaults">current game</button><button data-a="legacy">everything as before</button><button data-a="close" class="x">done</button></header>
    <p>Changes apply to your next run and are saved with its recording. Blue rows differ from the current game.</p>
    ${groups.map(g => `<section><h3>${g}</h3>${KNOBS.filter(k => k.group === g).map(row).join('')}</section>`).join('')}</div>`;
  const refresh = () => {
    for (const k of KNOBS) {
      root.querySelector(`[data-r="${k.key}"]`)?.classList.toggle('ch', CFG[k.key] !== DEFAULTS[k.key]);
      const i = root.querySelector<HTMLInputElement>(`[data-k="${k.key}"]`); if (i) { if (k.kind === 'toggle') i.checked = !!CFG[k.key]; else i.value = String(CFG[k.key]); }
      const o = root.querySelector(`[data-o="${k.key}"]`); if (o) o.textContent = fmt(CFG[k.key]);
    }
    const n = tuningCount(); root.querySelector('.n')!.textContent = n ? `${n} changed` : 'all default';
  };
  root.addEventListener('input', e => {
    const i = e.target as HTMLInputElement, k = i.dataset.k as CfgKey | undefined; if (!k) return;
    setTuning({ [k]: i.type === 'checkbox' ? (i.checked ? (DEFAULTS[k] || LEGACY[k] || 1) : 0) : Number(i.value) });
    persist(); refresh();
  });
  root.addEventListener('click', e => {
    const a = (e.target as HTMLElement).dataset.a; if (!a) return;
    if (a === 'defaults') resetTuning();
    if (a === 'legacy') { resetTuning(); setTuning(LEGACY as Record<string, number>); }
    if (a === 'close') { root.remove(); onClose(); return; }
    persist(); refresh();
  });
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) root.addEventListener(ev, e => e.stopPropagation());
  document.body.appendChild(root);
  refresh();
}
