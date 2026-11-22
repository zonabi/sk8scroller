import { sfx } from './audio';
import { openHowTo } from './howto';
import { InputController } from './input';
import { actionOf, openPanel } from './panels';
import { loadSave, writeSave } from './storage';

/** The in-game pause button (HTML, top centre beside the flag). GameScene binds what it does for the length of a run. */
let onPause: (() => void) | null = null;
export function bindPause(fn: (() => void) | null): void {
  onPause = fn;
  document.body.classList.toggle('can-pause', !!fn);
}
export function initPause(): void {
  document.getElementById('pause')?.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); onPause?.(); });
}

/** The pause sheet. Exactly one of the three callbacks runs, after the sheet has gone. */
export function openPause(on: { resume: () => void; restart: () => void; menu: () => void }): void {
  const leave = (then: () => void) => { p.close(); then(); };
  const p = openPanel('pause-sheet', e => { if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape' || e.key === 'p' || e.key === 'P') { e.preventDefault(); leave(on.resume); } });
  p.root.innerHTML = `<div class="box narrow"><header><h2>PAUSED</h2></header><div class="menu">
    <button data-a="resume" class="x">RESUME</button><button data-a="restart">restart run</button>
    <button data-a="how">how to play</button><button data-a="settings">settings</button><button data-a="menu">quit to menu</button></div></div>`;
  p.root.addEventListener('click', e => {
    const a = actionOf(e);
    if (a === 'resume') leave(on.resume);
    if (a === 'restart') leave(on.restart);
    if (a === 'menu') leave(on.menu);
    if (a === 'how') openHowTo(() => {});   // no tutorial button here: a run is in progress
    if (a === 'settings') openSettings(() => {}, true);
  });
}

/** Shown when the last tutorial lesson is passed. */
export function openTutorialDone(on: { skate: () => void; again: () => void; menu: () => void }): void {
  const leave = (then: () => void) => { p.close(); then(); };
  const p = openPanel('pause-sheet', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); leave(on.skate); } if (e.key === 'Escape') { e.preventDefault(); leave(on.menu); } });
  p.root.innerHTML = `<div class="box narrow"><header><h2>YOU'RE READY!</h2></header><p class="lead">That is every control. String tricks together for combos, and land before a trick finishes.</p><div class="menu">
    <button data-a="skate" class="x">SKATE!</button><button data-a="again">tutorial again</button><button data-a="menu">menu</button></div></div>`;
  p.root.addEventListener('click', e => { const a = actionOf(e); if (a === 'skate') leave(on.skate); if (a === 'again') leave(on.again); if (a === 'menu') leave(on.menu); });
}

/**
 * Settings: sound, tilt, left-handed pads, and (from the menu) wiping progress.
 * `onClose(reset)` — reset is true when progress was wiped, so the menu can redraw.
 */
export function openSettings(onClose: (reset: boolean) => void, midRun = false): void {
  let armed = false, wiped = false;
  const done = () => { p.close(); onClose(wiped); };
  const p = openPanel('settings-sheet', e => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); done(); } });
  const row = (a: string, label: string, hint: string, on: boolean) =>
    `<div class="set"><div><b>${label}</b><small>${hint}</small></div><button data-a="${a}" class="${on ? 'x' : ''}">${on ? 'ON' : 'off'}</button></div>`;
  const draw = () => {
    const s = loadSave();
    p.root.innerHTML = `<div class="box narrow"><header><h2>SETTINGS</h2><button data-a="close" class="x">done</button></header>
      ${row('sound', 'Sound', 'M on a keyboard', !s.mute)}
      ${row('lefty', 'Left-handed pads', `tricks under the left thumb, jump and steer under the right${midRun ? ' · from your next run' : ''}`, s.lefty)}
      ${row('tilt', 'Tilt to balance', `tip the phone to lean on rails${midRun ? ' · from your next run' : ''}`, s.tilt)}
      ${midRun ? '' : `<div class="set"><div><b>Progress</b><small>${wiped ? 'wiped: back to level 1' : 'back to level 1, best score cleared'}</small></div><button data-a="wipe" class="${armed ? 'warn' : ''}">${armed ? 'tap again to wipe' : 'reset'}</button></div>`}
    </div>`;
  };
  p.root.addEventListener('click', async e => {
    const a = actionOf(e); if (!a) return;
    if (a === 'close') { done(); return; }
    const s = loadSave();
    if (a === 'sound') { s.mute = !s.mute; sfx.setMuted(s.mute); }
    if (a === 'lefty') s.lefty = !s.lefty;
    if (a === 'tilt') s.tilt = !s.tilt && (await InputController.requestTilt());
    if (a === 'wipe') { if (armed) { s.xp = 0; s.best = 0; wiped = true; armed = false; } else armed = true; } else armed = false;
    writeSave(s); sfx.play('tap'); draw();
  });
  draw();
}
