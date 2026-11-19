import Phaser from 'phaser';
import { FONT, PAL, Z, hex } from './view';

/**
 * Graffiti lettering, drawn once to a texture and then shown as a plain sprite.
 *
 * PERFORMANCE RULES (the first version broke these and ran at <10 fps):
 *  - Never use Phaser `Text`. It re-rasterises on every change, and stroking these fonts is slow
 *    (Rubik Spray Paint is ~10x slower than the others — its glyphs are made of thousands of points).
 *  - `graf()` caches by text+style: fine for fixed strings (titles, trick names, buttons).
 *  - Text that changes every frame (score, combo total) must use `num()`, which lays out
 *    pre-drawn glyph sprites and never rasterises after its first use.
 *  - One-off strings (e.g. "+1240") pass `ephemeral: true` so their texture is freed.
 */
export interface GrafStyle {
  font?: keyof typeof FONT; size?: number;
  /** One colour, or [top, bottom] for a spray fade. */
  fill?: number | [number, number];
  outline?: number; outlineWidth?: number;
  /** Colour of the offset block shadow (the "3D" of a throw-up). Omit for none. */
  block?: number;
  angle?: number; align?: 'left' | 'center' | 'right';
  ephemeral?: boolean;
}

/** Counters read by tools/perf.mjs. `stamps` must not grow during steady gameplay. */
export const uiPerf = { stamps: 0, stampMs: 0, frames: 0, cpuMs: 0, bootMs: 0 };

interface Stamp { key: string; w: number; h: number; adv: number; pad: number }
const cache = new Map<string, Stamp>();
let uid = 0;

const scratch = document.createElement('canvas').getContext('2d')!;
const mk = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  // willReadFrequently keeps these CPU canvases: predictable cost, no GPU readback on upload
  return [c, c.getContext('2d', { willReadFrequently: true })!];
};
/** Recolour everything already drawn on a canvas (flat colour or a vertical fade per line). */
const tintAll = (ctx: CanvasRenderingContext2D, style: string | CanvasGradient) => {
  ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = style; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.globalCompositeOperation = 'source-over';
};

function stamp(scene: Phaser.Scene, text: string, s: GrafStyle): Stamp {
  const size = s.size ?? 12, fontName = FONT[s.font ?? 'marker'], ow = s.outlineWidth ?? Math.max(2, size * 0.28);
  const id = `${s.font}|${size}|${s.fill}|${s.outline}|${ow}|${s.block}|${s.align}|${text}`;
  if (!s.ephemeral) { const hit = cache.get(id); if (hit) return hit; }
  const t0 = performance.now();
  const font = `${size * Z}px ${fontName}`, lines = text.split('\n');
  scratch.font = font;
  const m = scratch.measureText('Mg'), asc = m.fontBoundingBoxAscent ?? size * Z * 0.9, desc = m.fontBoundingBoxDescent ?? size * Z * 0.3;
  const widths = lines.map(l => scratch.measureText(l).width), maxW = Math.max(1, ...widths);
  const r = (ow * Z) / 2;                                  // outline radius in canvas px
  const d = s.block !== undefined ? Math.max(1, size * 0.09) * Z : 0, pad = Math.ceil(r + 2 * Z), lineH = (asc + desc) * 0.8;
  const W = Math.ceil(maxW + pad * 2 + d), H = Math.ceil(asc + desc + (lines.length - 1) * lineH + pad * 2 + d);

  // 1. glyphs, fill only. NEVER strokeText: stroking these fonts with a fat round-joined line took
  //    seconds on macOS (5 s of menu build). The outline is made by smearing the glyph mask instead.
  const [glyphs, gx] = mk(W, H);
  gx.font = font; gx.textBaseline = 'alphabetic'; gx.fillStyle = '#fff';
  lines.forEach((l, i) => gx.fillText(l, pad + (s.align === 'center' ? (maxW - widths[i]) / 2 : s.align === 'right' ? maxW - widths[i] : 0), pad + asc + i * lineH));

  // 2. silhouette = glyph mask stamped around a circle of radius r (cheap image blits)
  const [out, ox] = mk(W, H);
  if (r > 0) {
    const [sc, sx] = mk(W, H);
    for (let rr = r; rr > 0.75; rr -= Math.max(2, r * 0.5)) {
      const n = Math.max(8, Math.min(28, Math.ceil(rr * 1.6)));
      for (let k = 0; k < n; k++) sx.drawImage(glyphs, Math.cos((k / n) * Math.PI * 2) * rr, Math.sin((k / n) * Math.PI * 2) * rr);
    }
    sx.drawImage(glyphs, 0, 0);
    if (s.block !== undefined) {                           // offset block shadow: the silhouette again, recoloured
      const [bc, bx] = mk(W, H); bx.drawImage(sc, 0, 0); tintAll(bx, hex(s.block)); ox.drawImage(bc, d, d);
    }
    tintAll(sx, hex(s.outline ?? PAL.ink));
    ox.drawImage(sc, 0, 0);
  } else if (s.block !== undefined) {
    const [bc, bx] = mk(W, H); bx.drawImage(glyphs, 0, 0); tintAll(bx, hex(s.block)); ox.drawImage(bc, d, d);
  }

  // 3. coloured fill on top
  const fill = s.fill ?? PAL.white;
  if (typeof fill === 'number') tintAll(gx, hex(fill));
  else {
    const g = gx.createLinearGradient(0, 0, 0, H);
    lines.forEach((_l, i) => {                              // the fade restarts on every line
      const y0 = (pad + asc + i * lineH - asc * 0.75) / H, y1 = (pad + asc + i * lineH + desc * 0.2) / H;
      g.addColorStop(Math.max(0, Math.min(1, y0)), hex(fill[0])); g.addColorStop(Math.max(0, Math.min(1, y1)), hex(fill[1]));
    });
    tintAll(gx, g);
  }
  ox.drawImage(glyphs, 0, 0);

  const key = `graf-${uid++}`;
  scene.textures.addCanvas(key, out);
  const st: Stamp = { key, w: W / Z, h: H / Z, adv: widths[0] / Z, pad: pad / Z };
  if (!s.ephemeral) cache.set(id, st);
  uiPerf.stamps++; uiPerf.stampMs += performance.now() - t0;
  return st;
}

/** Draw lettering now so showing it later costs nothing. */
export const warm = (scene: Phaser.Scene, text: string, s: GrafStyle): void => { stamp(scene, text, s); };

/** A piece of lettering. Behaves like a sprite: tween x / y / scale / angle / alpha freely. */
export class Graf {
  readonly img: Phaser.GameObjects.Image;
  /** For adding to a Container. */
  get parts(): Phaser.GameObjects.Image[] { return [this.img]; }
  private st: Stamp;
  private text: string;
  private _scale = 1;

  constructor(private scene: Phaser.Scene, x: number, y: number, text: string, private style: GrafStyle = {}) {
    this.text = text;
    this.st = stamp(scene, text || ' ', style);
    this.img = scene.add.image(x, y, this.st.key).setOrigin(0).setScale(1 / Z).setDepth(100).setAngle(style.angle ?? 0);
    this.img.setVisible(text !== '');
  }
  get x(): number { return this.img.x; } set x(v: number) { this.img.x = v; }
  get y(): number { return this.img.y; } set y(v: number) { this.img.y = v; }
  get angle(): number { return this.img.angle; } set angle(v: number) { this.img.angle = v; }
  get alpha(): number { return this.img.alpha; } set alpha(v: number) { this.img.alpha = v; }
  get scale(): number { return this._scale; } set scale(v: number) { this._scale = v; this.img.setScale(v / Z); }
  setScale(v: number): this { this.scale = v; return this; }
  setDepth(v: number): this { this.img.setDepth(v); return this; }
  setOrigin(x: number, y = x): this { this.img.setOrigin(x, y); return this; }
  setText(t: string): this {
    if (t === this.text) return this;
    this.text = t;
    this.img.setVisible(t !== '');
    if (t === '') return this;
    const old = this.st;
    this.st = stamp(this.scene, t, this.style);
    this.img.setTexture(this.st.key);
    if (this.style.ephemeral) this.scene.textures.remove(old.key);
    return this;
  }
  /** Make the lettering tappable. */
  button(onTap: () => void): this { this.img.setInteractive({ useHandCursor: true }).on('pointerdown', onTap); return this; }
  get textWidth(): number { return this.st.w; }
  destroy(): void { this.img.destroy(); if (this.style.ephemeral) this.scene.textures.remove(this.st.key); }
}
export const graf = (scene: Phaser.Scene, x: number, y: number, text: string, s?: GrafStyle): Graf => new Graf(scene, x, y, text, s);

/**
 * Fast-changing lettering (score, combo). Each character is a pre-drawn glyph sprite, so
 * setText() only moves sprites around. Colour changes use tint, so draw glyphs light.
 */
export class Num extends Phaser.GameObjects.Container {
  private pool: Phaser.GameObjects.Image[] = [];
  private text = '';
  constructor(scene: Phaser.Scene, x: number, y: number, private style: GrafStyle, private anchor: 0 | 0.5 | 1 = 0, charset = '0123456789x+ ') {
    super(scene, x, y);
    for (const ch of charset) if (ch !== ' ') stamp(scene, ch, style); // warm the glyphs now, not mid-run
    this.setDepth(100).setAngle(style.angle ?? 0);
    scene.add.existing(this);
  }
  setText(t: string): this {
    if (t === this.text) return this;
    this.text = t;
    const size = this.style.size ?? 12;
    let x = 0, n = 0;
    for (const ch of t) {
      if (ch === ' ') { x += size * 0.35; continue; }
      const g = stamp(this.scene, ch, this.style);
      const img = this.pool[n] ?? (this.pool[n] = this.scene.add.image(0, 0, g.key).setOrigin(0).setScale(1 / Z), this.add(this.pool[n]), this.pool[n]);
      img.setTexture(g.key).setPosition(x - g.pad, -g.h / 2).setVisible(true);
      x += g.adv + size * 0.04; n++;
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i].setVisible(false);
    for (let i = 0; i < n; i++) this.pool[i].x -= x * this.anchor;
    return this;
  }
  setTint(c: number): this { for (const i of this.pool) i.setTint(c); return this; }
}
export const num = (scene: Phaser.Scene, x: number, y: number, s: GrafStyle, anchor: 0 | 0.5 | 1 = 0, charset?: string): Num => new Num(scene, x, y, s, anchor, charset);

/** Spray drips + overspray dots under a piece of lettering. */
export function drips(scene: Phaser.Scene, x: number, y: number, w: number, color: number, seed = 1): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(99);
  let a = seed * 9301 + 49297;
  const rnd = () => ((a = (a * 233280 + 49297) % 2147483647) / 2147483647);
  g.fillStyle(color, 1);
  for (let i = 0; i < Math.max(3, w / 28); i++) {
    const dx = x + rnd() * w, len = 6 + rnd() * 20, th = 1.5 + rnd() * 1.5;
    g.fillRoundedRect(dx, y, th, len, th / 2); g.fillCircle(dx + th / 2, y + len, th * 0.8);
  }
  for (let i = 0; i < w / 6; i++) g.fillCircle(x - 10 + rnd() * (w + 20), y - 30 + rnd() * 50, 0.4 + rnd() * 0.9);
  return g;
}
