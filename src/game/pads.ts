import type Phaser from 'phaser';
import { CFG } from '../core/config';
import { AH, AW, PAL, Z, hex } from './view';

/**
 * P-13 on-screen button pads (touch layout 1): two faint four-button diamonds that mirror the keyboard.
 *   Left pad  = the arrow keys: ↑ jump · ← turn round / lean left · → push / lean right · ↓ drop off a rail
 *   Right pad = W A S D:        the four trick directions
 * Everything about where they sit and how they look is a tuning knob (touchLayout, padAlpha, padY, padSize,
 * padInset), so a variation is a slider move on the phone, not a code change.
 *
 * Buttons are numbered side × 4 + direction, direction being 0 up · 1 right · 2 down · 3 left.
 */
export const PAD_UP = 0, PAD_RIGHT = 1, PAD_DOWN = 2, PAD_LEFT = 3;
const OX = [0, 1, 0, -1], OY = [-1, 0, 1, 0];

/** Pads are drawn and used on touch screens (or with ?pads, for looking at them on a desktop). */
export function padsActive(): boolean {
  return CFG.touchLayout === 1 && (navigator.maxTouchPoints > 0 || new URLSearchParams(location.search).has('pads'));
}

const G = { size: 0, d: 0, reach: 0, lx: 0, rx: 0, y: 0 };
/** Pad geometry in art units, read from the live tuning. */
function geom(): typeof G {
  const size = CFG.padSize, d = size * 0.76, half = d + size / 2;
  G.size = size; G.d = d;
  G.reach = half + size * 0.3;                       // a thumb that lands a little outside a button still counts
  G.lx = CFG.padInset + half; G.rx = AW - CFG.padInset - half;
  G.y = Math.max(half + 2, Math.min(AH - half - 2, AH * CFG.padY));
  return G;
}

/** Which button is at this art-space point: 0–3 left pad, 4–7 right pad, -1 none. Picks by direction from the pad's centre, so there are no dead gaps between buttons. */
export function padHit(x: number, y: number): number {
  const g = geom(), side = x < AW / 2 ? 0 : 1;
  const dx = x - (side ? g.rx : g.lx), dy = y - g.y, r = Math.hypot(dx, dy);
  if (r > g.reach || r < g.size * 0.12) return -1;
  return side * 4 + (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? PAD_RIGHT : PAD_LEFT) : dy > 0 ? PAD_DOWN : PAD_UP);
}

/**
 * P-14: a touch that lands between two buttons presses both, like a thumb laid across two keys.
 * Given the same point as padHit, returns the second button (the neighbour on the other axis) when the
 * point is within CFG.padChordDeg of the diagonal between them, else -1.
 */
export function padChord(x: number, y: number): number {
  if (CFG.padChordDeg <= 0) return -1;
  const g = geom(), side = x < AW / 2 ? 0 : 1;
  const dx = x - (side ? g.rx : g.lx), dy = y - g.y, r = Math.hypot(dx, dy);
  if (r > g.reach || r < g.d * 0.5) return -1;       // the middle of the pad is nearer to no button than to two
  const off = Math.abs(Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI - 45);
  if (off > CFG.padChordDeg) return -1;
  return side * 4 + (Math.abs(dx) > Math.abs(dy) ? (dy > 0 ? PAD_DOWN : PAD_UP) : dx > 0 ? PAD_RIGHT : PAD_LEFT);
}

/** One pad drawn once to a canvas at full canvas resolution (cached per size), like the lettering. */
function padTexture(scene: Phaser.Scene, side: number, g: typeof G): string {
  const key = `pad-${side}-${g.size}`;
  if (scene.textures.exists(key)) return key;
  const half = g.d + g.size / 2 + 2, c = document.createElement('canvas');
  c.width = c.height = Math.ceil(half * 2 * Z);
  const x = c.getContext('2d')!, r = g.size / 2 - 1, a = g.size * 0.2;
  x.scale(Z, Z); x.translate(half, half);
  for (let dir = 0; dir < 4; dir++) {
    const bx = OX[dir] * g.d, by = OY[dir] * g.d;
    x.beginPath(); x.arc(bx, by, r, 0, Math.PI * 2);
    x.fillStyle = 'rgba(26,16,38,0.5)'; x.fill();
    x.lineWidth = 1.5; x.strokeStyle = hex(side ? PAL.yellow : PAL.white); x.stroke();
    x.save(); x.translate(bx, by); x.rotate(dir * Math.PI / 2);   // an arrowhead pointing the button's way
    x.beginPath(); x.moveTo(0, -a); x.lineTo(a, a * 0.7); x.lineTo(-a, a * 0.7); x.closePath();
    x.fillStyle = hex(side ? PAL.yellow : PAL.white); x.fill(); x.restore();
  }
  scene.textures.addCanvas(key, c);
  return key;
}
function glowTexture(scene: Phaser.Scene, g: typeof G): string {
  const key = `pad-glow-${g.size}`;
  if (scene.textures.exists(key)) return key;
  const c = document.createElement('canvas'); c.width = c.height = Math.ceil(g.size * Z);
  const x = c.getContext('2d')!;
  x.beginPath(); x.arc(c.width / 2, c.width / 2, (g.size / 2 - 1) * Z, 0, Math.PI * 2); x.fillStyle = '#fff'; x.fill();
  scene.textures.addCanvas(key, c);
  return key;
}

/** The pads on screen: two static sprites plus a glow per button that shows while it is held. */
export class PadView {
  private base: Phaser.GameObjects.Image[] = [];
  private glow: Phaser.GameObjects.Image[] = [];
  constructor(scene: Phaser.Scene) {
    const g = geom(), a = CFG.padAlpha, glow = glowTexture(scene, g);
    for (let side = 0; side < 2; side++) {
      const cx = side ? g.rx : g.lx;
      this.base.push(scene.add.image(cx, g.y, padTexture(scene, side, g)).setScale(1 / Z).setAlpha(a).setDepth(96));
      for (let dir = 0; dir < 4; dir++) this.glow.push(scene.add.image(cx + OX[dir] * g.d, g.y + OY[dir] * g.d, glow).setScale(1 / Z).setAlpha(Math.min(0.85, a * 1.5 + 0.1)).setDepth(96).setVisible(false));
    }
  }
  press(btn: number, on: boolean): void { this.glow[btn]?.setVisible(on); }
  hide(): void { for (const i of this.base) i.setVisible(false); for (const i of this.glow) i.setVisible(false); }
}
