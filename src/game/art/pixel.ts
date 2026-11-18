/**
 * Tiny software rasteriser for 16-bit-style pixel art. Pure TypeScript (no DOM), so sprites
 * can be generated in the browser at boot *and* dumped to PNG from Node for review
 * (`npm run sprites`). Colours are 0xRRGGBB numbers; -1 is transparent.
 *
 * House style: 3-tone ramps with hue-shifted shadows/highlights, light from the upper left,
 * every body part outlined in ink so limbs read against each other.
 */
export const INK = 0x1a1026;
export type Ramp = [shadow: number, base: number, light: number];

const LX = -0.55, LY = -0.83; // light direction (screen coords, y down)

export function toHsl(c: number): [number, number, number] {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function fromHsl(h: number, s: number, l: number): number {
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return (f(0) << 16) | (f(8) << 8) | f(4);
}
const hueToward = (h: number, target: number, t: number) => {
  const d = ((target - h + 540) % 360) - 180;
  return (h + d * t + 360) % 360;
};
export function mix(a: number, b: number, t: number): number {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
/** Shadow drifts toward violet, highlight toward warm yellow — the classic 16-bit trick. */
export function ramp(base: number): Ramp {
  const [h, s, l] = toHsl(base);
  return [fromHsl(hueToward(h, 265, 0.22), s * 1.05 + 0.04, l * 0.6), base, fromHsl(hueToward(h, 50, 0.15), s * 0.92, l + (1 - l) * 0.42)];
}
export const dim = (r: Ramp, t = 0.3): Ramp => [mix(r[0], INK, t), mix(r[1], INK, t), mix(r[2], INK, t)];
const tone = (r: Ramp | number, nx: number, ny: number): number => {
  if (typeof r === 'number') return r;
  const n = nx * LX + ny * LY;
  return n > 0.36 ? r[2] : n < -0.28 ? r[0] : r[1];
};
/** 4x4 ordered-dither threshold, 0..1. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const bayer = (x: number, y: number): number => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

export class Pix {
  readonly d: Int32Array;
  constructor(public readonly w: number, public readonly h: number) { this.d = new Int32Array(w * h).fill(-1); }
  get(x: number, y: number): number { return x < 0 || y < 0 || x >= this.w || y >= this.h ? -1 : this.d[y * this.w + x]; }
  set(x: number, y: number, c: number): void { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  rect(x: number, y: number, w: number, h: number, c: number): void {
    x = Math.round(x); y = Math.round(y);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  /** Shaded ellipse. */
  disc(cx: number, cy: number, rx: number, ry: number, r: Ramp | number): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) this.set(x, y, tone(r, nx, ny));
    }
  }
  /** Shaded tapered capsule — the building block for limbs. */
  capsule(x1: number, y1: number, x2: number, y2: number, r1: number, r2: number, r: Ramp | number): void {
    const R = Math.max(r1, r2), dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1;
    for (let y = Math.floor(Math.min(y1, y2) - R); y <= Math.ceil(Math.max(y1, y2) + R); y++)
      for (let x = Math.floor(Math.min(x1, x2) - R); x <= Math.ceil(Math.max(x1, x2) + R); x++) {
        const px = x + 0.5, py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
        const rr = r1 + (r2 - r1) * t, ox = px - (x1 + dx * t), oy = py - (y1 + dy * t);
        if (ox * ox + oy * oy <= rr * rr) this.set(x, y, tone(r, ox / rr, oy / rr));
      }
  }
  /** Flat-filled polygon (even-odd scanline at pixel centres). */
  poly(pts: number[][], c: number): void {
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      const sy = y + 0.5, xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.set(x, y, c);
    }
  }
  line(x1: number, y1: number, x2: number, y2: number, c: number): void {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x1 + ((x2 - x1) * i) / n), Math.round(y1 + ((y2 - y1) * i) / n), c);
  }
  /** Paint a 1px outline on transparent pixels touching opaque ones. */
  outline(c: number): this {
    const src = this.d.slice(), w = this.w;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x] !== -1) continue;
      if ((x > 0 && src[y * w + x - 1] !== -1) || (x < w - 1 && src[y * w + x + 1] !== -1) ||
          (y > 0 && src[(y - 1) * w + x] !== -1) || (y < this.h - 1 && src[(y + 1) * w + x] !== -1)) this.d[y * w + x] = c;
    }
    return this;
  }
  blit(src: Pix, dx = 0, dy = 0): void {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.d[y * src.w + x]; if (c !== -1) this.set(x + dx, y + dy, c); }
  }
  /** Draw into a scratch layer, outline it, composite — keeps overlapping parts separated by ink. */
  part(draw: (p: Pix) => void, outline: number = INK): void {
    const t = new Pix(this.w, this.h); draw(t); t.outline(outline); this.blit(t);
  }
  /** Replace colour for pixels where fn says so (textures, dithering, speckle). */
  each(fn: (x: number, y: number, c: number) => number): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const i = y * this.w + x; this.d[i] = fn(x, y, this.d[i]); }
  }
  toRGBA(): Uint8ClampedArray {
    const o = new Uint8ClampedArray(this.w * this.h * 4);
    for (let i = 0; i < this.d.length; i++) {
      const c = this.d[i]; if (c === -1) continue;
      o[i * 4] = (c >> 16) & 255; o[i * 4 + 1] = (c >> 8) & 255; o[i * 4 + 2] = c & 255; o[i * 4 + 3] = 255;
    }
    return o;
  }
}
