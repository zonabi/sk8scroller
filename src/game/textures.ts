import Phaser from 'phaser';
import type { Feature } from '../core/level';
import { Rng } from '../core/rng';
import { INK, Pix, mix } from './art/pixel';
import { FRAME, GY, OX, POSES, POSE_NAMES, SPIN_FRAMES, drawSkater, drawSpin, type PoseName } from './art/skater';
import { skaterById } from '../core/skaters';
import { featureSprite, shadow, sky, skyline, street, wall, wheelIcon } from './art/world';
import { AH, AW, FONT, GROUND, STREET_TOP } from './view';

export const SPRITE = { frame: FRAME, ox: OX, gy: GY };
export const WALL_H = 96, WALL_W = 1920;

/** Upload a Pix as a crisp (nearest-neighbour) texture. */
function pixTex(scene: Phaser.Scene, key: string, pix: Pix): void {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, pix.w, pix.h)!;
  t.getContext().putImageData(new ImageData(pix.toRGBA() as Uint8ClampedArray<ArrayBuffer>, pix.w, pix.h), 0, 0);
  t.refresh();
  t.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Rasterise a word in a graffiti font to a hard-edged pixel mask (browser only). */
function wordMask(word: string, font: string, size: number): { w: number; h: number; on: (x: number, y: number) => boolean } {
  const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.font = `${size}px ${font}`;
  const w = Math.ceil(ctx.measureText(word).width) + 8, h = Math.ceil(size * 1.5);
  c.width = w; c.height = h;
  ctx.font = `${size}px ${font}`; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(word, 4, h / 2);
  const d = ctx.getImageData(0, 0, w, h).data;
  return { w, h, on: (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 110 };
}

/** Paint a pixel-art graffiti piece onto the wall: block shadow, ink outline, two-tone fade, shine, drips. */
function piece(p: Pix, x0: number, y0: number, word: string, font: string, size: number, c1: number, c2: number, r: Rng): void {
  const m = wordMask(word, font, size);
  const near = (x: number, y: number, d: number) => { for (let j = -d; j <= d; j++) for (let i = -d; i <= d; i++) if (m.on(x + i, y + j)) return true; return false; };
  const block = mix(c2, INK, 0.55);
  for (let y = -2; y < m.h + 4; y++) for (let x = -2; x < m.w + 5; x++) if (near(x - 3, y - 3, 1)) p.set(x0 + x, y0 + y, block);
  for (let y = -2; y < m.h + 2; y++) for (let x = -2; x < m.w + 2; x++) if (near(x, y, 1)) p.set(x0 + x, y0 + y, INK);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!m.on(x, y)) continue;
    const t = y / m.h, shine = !m.on(x, y - 1) || !m.on(x - 1, y);
    p.set(x0 + x, y0 + y, shine && t < 0.6 ? 0xffffff : t + ((x + y) % 2 ? 0.06 : -0.06) > 0.55 ? c2 : c1);
  }
  for (let i = 0; i < m.w / 9; i++) {
    const dx = r.int(2, m.w - 3); let dy = m.h - 1;
    while (dy > 0 && !m.on(dx, dy)) dy--;
    if (dy > m.h * 0.5) for (let k = 2; k < r.int(5, 14); k++) p.set(x0 + dx, y0 + dy + k, c2);
  }
  for (let i = 0; i < m.w / 3; i++) p.set(x0 + r.int(-6, m.w + 6), y0 + r.int(-4, m.h + 4), r.next() < 0.5 ? c1 : c2);
}

/**
 * Boot work, split into labelled steps so the loading screen can show real progress
 * (one step per frame). Each step is safe to run twice.
 */
export function textureSteps(scene: Phaser.Scene): [label: string, run: () => void][] {
  const has = (k: string) => scene.textures.exists(k);
  return [
    ['mixing the sky', () => { if (!has('sky')) pixTex(scene, 'sky', sky(AW, GROUND)); }],
    ['raising the skyline', () => { if (!has('city-far')) { pixTex(scene, 'city-far', skyline(AW, 150, 11, false)); pixTex(scene, 'city-mid', skyline(AW, 190, 29, true)); } }],
    ['pouring concrete', () => { if (!has('street')) { pixTex(scene, 'street', street(256, AH - STREET_TOP)); pixTex(scene, 'wheel', wheelIcon()); pixTex(scene, 'shadow', shadow()); } }],
    ['tagging the wall', () => { if (!has('wall')) pixTex(scene, 'wall', graffitiWall()); }],
  ];
}
/** Runs any boot steps that haven't run yet. */
export function makeTextures(scene: Phaser.Scene): void { for (const [, run] of textureSteps(scene)) run(); }

function graffitiWall(): Pix {
  const { pix, segs } = wall(WALL_W, WALL_H), r = new Rng(77);
  const words = ['SOUL', 'GRIND', 'ROLL', 'FLOW', 'BLADE', 'MAKIO', 'SK8', 'ROYALE', 'STEEZ', 'LOCK IN'];
  const cans: [number, number][] = [[0xff3d6e, 0xffd23f], [0x00d9ff, 0x7b2ff7], [0x3dff8f, 0x00a0c8], [0xffd23f, 0xff7b00], [0xf5f5f5, 0x00d9ff], [0xff7b00, 0xc2255c]];
  let wi = 0;
  for (const s of segs) {
    if (s.kind === 'fence' || s.x + 250 > WALL_W) continue;   // keep pieces off the tile seam
    const [c1, c2] = cans[wi % cans.length], big = s.kind !== 'shutter';
    piece(pix, s.x + r.int(14, 30), r.int(12, 22), words[wi % words.length], big ? FONT.spray : FONT.piece, big ? 46 : 36, c1, c2, r);
    if (big && s.w > 260) piece(pix, s.x + s.w - r.int(80, 100), r.int(40, 56), words[(wi + 5) % words.length].toLowerCase(), FONT.marker, 16, 0xf5f5f5, 0xf5f5f5, r);
    wi++;
  }
  // knock the wall back so the play layer pops
  pix.each((_x, y, c) => c === -1 ? -1 : mix(c, 0x1e1238, 0.3 + (y / WALL_H) * 0.12));
  return pix;
}

export type SkaterFrame = PoseName | `spin${number}`;
/** Texture key for one skater frame, drawn the first time it is asked for. */
export function skaterTex(scene: Phaser.Scene, id: string, frame: SkaterFrame): string {
  const key = `sk-${id}-${frame}`;
  if (!scene.textures.exists(key)) {
    const sk = skaterById(id);
    pixTex(scene, key, frame.startsWith('spin') ? drawSpin(sk, (Number(frame.slice(4)) * 360) / SPIN_FRAMES) : drawSkater(sk, POSES[frame as PoseName]));
  }
  return key;
}
/** Draw every frame of one skater up front so nothing is generated mid-run. */
export function warmSkater(scene: Phaser.Scene, id: string): void {
  for (const n of POSE_NAMES) skaterTex(scene, id, n);
  for (let i = 0; i < SPIN_FRAMES; i++) skaterTex(scene, id, `spin${i}`);
}

const featCache = new Map<number, { ox: number; oy: number }>();
/** Lazily builds the sprite for one level feature. Returns its texture key and anchor. */
export function featureTexture(scene: Phaser.Scene, f: Feature): { key: string; ox: number; oy: number } {
  const key = `feat-${f.kind}-${f.kind === 'cone' || f.kind === 'barrier' ? 0 : f.id}`;
  if (!scene.textures.exists(key)) { const s = featureSprite(f); pixTex(scene, key, s.pix); featCache.set(f.id, s); if (f.kind === 'cone' || f.kind === 'barrier') featCache.set(f.kind === 'cone' ? -1 : -2, s); }
  const a = featCache.get(f.kind === 'cone' ? -1 : f.kind === 'barrier' ? -2 : f.id)!;
  return { key, ox: a.ox, oy: a.oy };
}
export function dropFeatureTexture(scene: Phaser.Scene, f: Feature): void {
  if (f.kind === 'cone' || f.kind === 'barrier') return;
  const key = `feat-${f.kind}-${f.id}`;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  featCache.delete(f.id);
}
