import { CFG } from '../core/config';
import { padsActive, padsLefty } from './pads';
import { actionOf, openPanel } from './panels';
import { loadSave } from './storage';

/**
 * The "how to play" card: what every button does, plus the five things worth knowing before a first run.
 * Plain HTML like the tuning panel — it is only ever open on the menu, never mid-run.
 * It draws the controls the player actually has: the touch pads, the keyboard, or (touch layout 0) thumb zones.
 */
type View = 'pads' | 'keys' | 'zones';
const touchScreen = (): boolean => navigator.maxTouchPoints > 0;
const firstView = (): View => (padsActive() ? 'pads' : touchScreen() ? 'zones' : 'keys');

/** First launch shows the card once before the first run. Test and replay URLs skip it so tools are never blocked. */
export function howToIsDue(seen: boolean): boolean {
  if (seen) return false;
  const q = new URLSearchParams(location.search);
  return !(q.has('bot') || q.has('seed') || q.has('replay'));
}

const pad = (cls: string, title: string, glyph: [string, string, string, string], label: [string, string, string, string], foot: string): string => `
  <div class="pad ${cls}"><h3>${title}</h3><div class="d">
    <b class="u">${glyph[0]}</b><b class="r">${glyph[1]}</b><b class="dn">${glyph[2]}</b><b class="l">${glyph[3]}</b>
    <span class="u">${label[0]}</span><span class="r">${label[1]}</span><span class="dn">${label[2]}</span><span class="l">${label[3]}</span>
  </div><p>${foot}</p></div>`;

function body(v: View): string {
  if (v === 'zones') return `<div class="zones">
    <div><h3>LEFT THUMB</h3><p>Press to jump, hold for more height.<br>On a rail: hold and drag sideways to balance, quick tap to hop off.</p></div>
    <div><h3>RIGHT THUMB</h3><p>Swipe up, down, left or right for a trick.<br>On a rail: swipe to switch stance.<br>On the ground: tap to push, swipe left to turn fakie.</p></div></div>`;
  const keys = v === 'keys';
  const move: [string, string, string, string] = ['JUMP<i>hold = higher</i>', 'PUSH<i>on a rail: lean</i>', 'DROP OFF<i>on a rail</i>', 'FAKIE<i>on a rail: lean</i>'];
  const trick: [string, string, string, string] = ['trick', 'trick', 'trick', 'trick'];
  const swap = !keys && (padsLefty() || loadSave().lefty);          // left-handed pads: tricks on the left
  const mv = pad('mv', keys ? 'ARROW KEYS' : swap ? 'RIGHT THUMB' : 'LEFT THUMB', ['▲', '▶', '▼', '◀'], move, keys ? 'SPACE also jumps' : 'slide between ◀ ▶ to balance');
  const tr = pad('tr', keys ? 'W A S D' : swap ? 'LEFT THUMB' : 'RIGHT THUMB', keys ? ['W', 'D', 'S', 'A'] : ['▲', '▶', '▼', '◀'], trick, 'in the air: a trick · on a rail: switch stance');
  return `<div class="pads">${swap ? tr + mv : mv + tr}</div>`;
}

const TIPS = [
  'Jump onto a rail or ledge to <b>grind</b>. Keep the needle in the green with ◀ ▶.',
  'Press a trick button just before you touch a rail to <b>pick your grind</b>; press another on the rail to <b>switch up</b>.',
  'Tricks need air: land before one finishes and you <b>slam</b>. Jam trick buttons on a rail and you fall.',
  'String tricks together. The <b>combo</b> banks about a second after you land.',
  '<b>Fakie</b> (rolling backwards) scores 25% more.',
];

/**
 * Opens the card. `first` = the first-launch flow: the buttons offer the tutorial or a straight run.
 * `tutorial` = also offer the tutorial (menu). onClose gets 'tutorial' when the player chose it.
 */
export function openHowTo(onClose: (choice?: 'tutorial') => void, opts: { first?: boolean; tutorial?: boolean } = {}): void {
  let view = firstView();
  const other = (): View => (view === 'keys' ? (CFG.touchLayout === 1 ? 'pads' : 'zones') : 'keys');
  const name = (v: View) => (v === 'keys' ? 'keyboard' : 'touch');
  const close = (choice?: 'tutorial') => { p.close(); onClose(choice); };
  const p = openPanel('how', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); close(opts.first ? 'tutorial' : undefined); }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  const draw = () => {
    const buttons = opts.first
      ? '<button data-a="close">skip — just skate</button><button data-a="tutorial" class="x">PLAY THE TUTORIAL</button>'
      : `<button data-a="swap">show ${name(other())}</button>${opts.tutorial ? '<button data-a="tutorial">play tutorial</button>' : ''}<button data-a="close" class="x">got it</button>`;
    p.root.innerHTML = `<div class="box"><header><h2>HOW TO PLAY</h2>${buttons}</header>
      ${body(view)}<ol>${TIPS.map(t => `<li>${t}</li>`).join('')}</ol>
      <p class="foot">Find this again on the menu: <b>how to play</b>${view === 'keys' ? ' (or press H) · P or ESC pauses · M mutes' : ' · the ❙❙ button at the top pauses'}.</p></div>`;
  };
  p.root.addEventListener('click', e => {
    const a = actionOf(e);
    if (a === 'swap') { view = other(); draw(); }
    if (a === 'close') close();
    if (a === 'tutorial') close('tutorial');
  });
  draw();
}
