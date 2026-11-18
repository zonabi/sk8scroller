import Phaser from 'phaser';
import { FONT, PAL, Z, hex } from './view';

export interface GrafStyle {
  font?: keyof typeof FONT; size?: number;
  /** One colour, or [top, bottom] for a spray fade. */
  fill?: number | [number, number];
  outline?: number; outlineWidth?: number;
  /** Colour of the offset block shadow (the "3D" of a throw-up). Omit for none. */
  block?: number;
  angle?: number; align?: 'left' | 'center' | 'right';
}

/**
 * Graffiti lettering: fat outline, optional colour fade, optional offset block shadow.
 * Rendered at device resolution (not pixelated). Use this for ALL text.
 */
const scratch = document.createElement('canvas').getContext('2d')!;

export class Graf {
  /** The Text objects that make up the lettering (shadow first). Add these to a Container if you need to. */
  readonly parts: Phaser.GameObjects.Text[] = [];
  private main: Phaser.GameObjects.Text;
  private shadow?: Phaser.GameObjects.Text;
  private size: number;
  private pad: number;
  private d = 0;
  private _x: number; private _y: number; private _angle = 0; private _scale = 1;

  // Deliberately NOT a Container: Phaser 4 mis-draws Text inside nested/scaled containers.
  constructor(scene: Phaser.Scene, x: number, y: number, text: string, s: GrafStyle = {}) {
    this._x = x; this._y = y;
    const size = this.size = s.size ?? 12, font = FONT[s.font ?? 'marker'], ow = s.outlineWidth ?? Math.max(2, size * 0.28);
    this.pad = Math.ceil(size * 0.3);
    const base: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: font, fontSize: `${size}px`, align: s.align ?? 'left', lineSpacing: -size * 0.25,
      padding: { x: Math.ceil(size * 0.35), y: this.pad }, resolution: Z,
    };
    if (s.block !== undefined) {
      this.d = Math.max(1, size * 0.09);
      this.shadow = scene.add.text(0, 0, text, { ...base, color: hex(s.block), stroke: hex(s.block), strokeThickness: ow }).setDepth(100);
      this.parts.push(this.shadow);
    }
    this.main = scene.add.text(0, 0, text, { ...base, color: this.paint(s.fill ?? PAL.white) as string, stroke: hex(s.outline ?? PAL.ink), strokeThickness: ow }).setDepth(100);
    this.parts.push(this.main);
    this.angle = s.angle ?? 0;
  }
  private paint(f: number | [number, number]): string | CanvasGradient {
    if (typeof f === 'number') return hex(f);
    const g = scratch.createLinearGradient(0, this.pad + this.size * 0.15, 0, this.pad + this.size * 1.05);
    g.addColorStop(0, hex(f[0])); g.addColorStop(1, hex(f[1]));
    return g;
  }
  private place(): void {
    this.main.setPosition(this._x, this._y).setAngle(this._angle).setScale(this._scale);
    this.shadow?.setPosition(this._x + this.d * this._scale, this._y + this.d * this._scale).setAngle(this._angle).setScale(this._scale);
  }
  // tweenable properties
  get x(): number { return this._x; } set x(v: number) { this._x = v; this.place(); }
  get y(): number { return this._y; } set y(v: number) { this._y = v; this.place(); }
  get angle(): number { return this._angle; } set angle(v: number) { this._angle = v; this.place(); }
  get scale(): number { return this._scale; } set scale(v: number) { this._scale = v; this.place(); }
  get alpha(): number { return this.main.alpha; } set alpha(v: number) { for (const p of this.parts) p.setAlpha(v); }
  setScale(v: number): this { this.scale = v; return this; }
  setDepth(v: number): this { for (const p of this.parts) p.setDepth(v); return this; }
  destroy(): void { for (const p of this.parts) p.destroy(); }
  /** Change the lettering (and optionally its colour) in a single texture update. */
  setText(t: string, fill?: number | [number, number]): this {
    if (fill !== undefined) (this.main.style as unknown as { color: string | CanvasGradient }).color = this.paint(fill);
    else if (this.main.text === t) return this;
    this.main.setText(t); this.shadow?.setText(t);
    if (fill !== undefined) this.main.updateText();
    return this;
  }
  setOrigin(x: number, y = x): this { for (const p of this.parts) p.setOrigin(x, y); return this; }
  /** Make the lettering tappable. */
  button(onTap: () => void): this {
    this.main.setInteractive({ useHandCursor: true }).on('pointerdown', onTap);
    return this;
  }
  get textWidth(): number { return this.main.width; }
}

export const graf = (scene: Phaser.Scene, x: number, y: number, text: string, s?: GrafStyle): Graf => new Graf(scene, x, y, text, s);

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
