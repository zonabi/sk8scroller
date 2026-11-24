import { Rng } from '../../core/rng';
import type { Feature } from '../../core/level';
import { INK, Pix, bayer, mix, ramp } from './pixel';

/** Environment + obstacle pixel art. Pure (no DOM) so it can be previewed from Node. */

const STEEL: [number, number, number, number] = [0xf4f7ff, 0xb8c2d8, 0x8a94ae, 0x565f7a];

export function sky(w: number, h: number): Pix {
  const p = new Pix(w, h), r = new Rng(3);
  const stops: [number, number][] = [[0, 0x120a26], [0.2, 0x26134c], [0.42, 0x54206e], [0.62, 0xa82c6c], [0.8, 0xee5a3c], [0.93, 0xffa64a], [1, 0xffd98a]];
  const at = (t: number) => { for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])); return stops[stops.length - 1][1]; };
  const BANDS = 18;
  p.each((x, y) => { const f = (y / h) * BANDS, b = Math.floor(f); return at((b + (f - b > bayer(x, y) ? 1 : 0)) / BANDS); });
  for (let i = 0; i < 90; i++) { const y = r.int(0, h * 0.4); p.set(r.int(0, w), y, r.next() < 0.2 ? 0xffffff : 0x9a8ad0); }
  // low sun with scanline cuts
  const sx = w * 0.72, sy = h * 0.8, R = 44;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    if (x * x + y * y > R * R) continue;
    if (y > 4 && ((y - 4) % 9) < Math.min(5, 1 + (y - 4) / 9)) continue;
    p.set(sx + x, sy + y, y < -R * 0.3 ? 0xfff6c8 : y < R * 0.2 ? 0xffe27a : 0xffb347);
  }
  // clouds lit from below
  for (let i = 0; i < 6; i++) {
    const cx = r.int(20, w - 20), cy = r.int(h * 0.3, h * 0.66), n = r.int(4, 7), base = cy + 5;
    for (let j = 0; j < n; j++) {
      const bx = cx + (j - n / 2) * 13 + r.int(-3, 3), br = r.int(7, 13);
      for (let y = -br; y <= 0; y++) for (let x = -br; x <= br; x++) if (x * x + y * y * 1.6 <= br * br) {
        const yy = base + y; p.set(bx + x, yy, y > -3 ? 0xff8a6a : y > -6 && bayer(bx + x, yy) > 0.5 ? 0xd0508a : 0x8a2f7e);
      }
    }
  }
  return p;
}

export function skyline(w: number, h: number, seed: number, near: boolean): Pix {
  const p = new Pix(w, h), r = new Rng(seed);
  const tones = near ? [0x3a2a6e, 0x46317c, 0x30245c] : [0x2a1650, 0x321a5a];
  for (let x = 0; x < w;) {
    const bw = r.int(near ? 44 : 26, near ? 84 : 56), bh = r.int(h * 0.35, h * 0.95), col = r.pick(tones), top = h - bh;
    const right = Math.min(w, x + bw);
    p.rect(x, top, right - x, bh, col);
    p.rect(x, top, right - x, near ? 2 : 1, mix(col, 0xff9a8a, 0.35));                  // sunlit parapet
    p.rect(right - (near ? 3 : 1), top, near ? 3 : 1, bh, mix(col, 0xff7b6b, 0.3));     // sunlit side
    p.rect(x, top, 1, bh, mix(col, INK, 0.35));
    const pw = near ? 8 : 5, ph = near ? 10 : 7, ww = near ? 4 : 2, wh = near ? 5 : 3;
    for (let wy = top + 6; wy < h - 4; wy += ph) for (let wx = x + 4; wx < right - ww - 4; wx += pw) {
      const lit = r.next() < (near ? 0.22 : 0.3);
      p.rect(wx, wy, ww, wh, lit ? (r.next() < 0.5 ? 0xffd98a : 0xff9a5a) : mix(col, INK, 0.3));
      if (lit && near) p.rect(wx, wy, ww, 1, 0xfff6c8);
    }
    const deco = r.next();
    if (deco < 0.25) { // water tower
      const tx = x + r.int(6, Math.max(7, bw - 16)), tc = mix(col, INK, 0.2);
      p.rect(tx, top - 12, 10, 8, tc); p.rect(tx + 1, top - 14, 8, 2, tc); p.rect(tx + 1, top - 4, 1, 4, tc); p.rect(tx + 8, top - 4, 1, 4, tc);
    } else if (deco < 0.45) { p.rect(x + r.int(4, bw - 4), top - r.int(8, 18), 1, 18, mix(col, INK, 0.2)); }
    else if (deco < 0.6 && near) { // billboard
      const bx = x + 6, bc = r.pick([0xff3d6e, 0x00d9ff, 0x3dff8f, 0xffd23f]);
      p.rect(bx, top - 18, 30, 14, INK); p.rect(bx + 1, top - 17, 28, 12, bc); p.rect(bx + 4, top - 14, 14, 3, 0xffffff); p.rect(bx + 4, top - 9, 20, 2, mix(bc, INK, 0.4));
      p.rect(bx + 6, top - 4, 2, 4, INK); p.rect(bx + 22, top - 4, 2, 4, INK);
    }
    x = right + r.int(0, near ? 10 : 4);
  }
  return p;
}

export type WallSeg = { x: number; w: number; kind: 'brick' | 'shutter' | 'fence' | 'concrete' };
/** The wall right behind the pavement. Returns the segments so graffiti can be placed on solid ones. */
export function wall(w: number, h: number): { pix: Pix; segs: WallSeg[] } {
  const p = new Pix(w, h), r = new Rng(23), segs: WallSeg[] = [];
  const kinds: WallSeg['kind'][] = ['brick', 'shutter', 'brick', 'fence', 'concrete', 'brick', 'shutter', 'concrete'];
  for (let x = 0, i = 0; x < w; i++) {
    const kind = kinds[i % kinds.length], sw = Math.min(w - x, kind === 'fence' ? 150 : kind === 'shutter' ? 130 : r.int(240, 330));
    segs.push({ x, w: sw, kind });
    if (kind === 'brick') {
      const br = [0x5a2f48, 0x6b3850, 0x7a4258, 0x643450];
      for (let y = 0; y < h; y++) for (let xx = 0; xx < sw; xx++) {
        const row = Math.floor(y / 7), bx = xx + (row % 2 ? 8 : 0), col = Math.floor(bx / 16);
        const mortar = y % 7 === 6 || bx % 16 === 15;
        const hsh = ((row * 73856093) ^ (col * 19349663) ^ i) >>> 0;
        p.set(x + xx, y, mortar ? 0x351c34 : y % 7 === 0 ? mix(br[hsh % 4], 0xffa0a0, 0.14) : br[hsh % 4]);
      }
    } else if (kind === 'concrete') {
      for (let y = 0; y < h; y++) for (let xx = 0; xx < sw; xx++)
        p.set(x + xx, y, xx % 80 === 0 ? 0x3c3c52 : r.next() < 0.06 ? 0x5a5a72 : y > h - 14 && bayer(xx, y) > (h - y) / 14 ? 0x44445a : 0x4e4e66);
    } else if (kind === 'shutter') {
      for (let y = 0; y < h; y++) for (let xx = 0; xx < sw; xx++) {
        const frame = xx < 6 || xx >= sw - 6 || y < 8;
        p.set(x + xx, y, frame ? (xx === 5 || xx === sw - 6 || y === 7 ? 0x2a2a40 : 0x4a4460) : [0x6a7aa0, 0x566488, 0x465274, 0x3a4462][y % 4]);
      }
    } else { // chain-link: see-through
      for (let y = 6; y < h; y++) for (let xx = 0; xx < sw; xx++) if ((xx + y) % 8 === 0 || (xx - y + 800) % 8 === 0) p.set(x + xx, y, 0x8088a8);
      p.rect(x, 4, sw, 2, 0xb8c2d8);
      for (let px = 0; px < sw; px += 50) { p.rect(x + px, 2, 3, h - 2, 0xb8c2d8); p.rect(x + px + 2, 2, 1, h - 2, 0x6a7490); }
    }
    if (kind !== 'fence') { p.rect(x, 0, sw, 3, kind === 'shutter' ? 0x4a4460 : 0x8a6a80); p.rect(x, 3, sw, 1, 0x2a1830); p.rect(x, 0, 1, h, 0x2a1830); }
    x += sw;
  }
  return { pix: p, segs };
}

export function street(w: number, h: number): Pix {
  const p = new Pix(w, h), r = new Rng(5);
  p.each((x, y) => {
    if (y === 0) return 0xd8d8e8;
    if (y < 13) return x % 40 === 0 ? 0x6e6e84 : r.next() < 0.05 ? 0x8a8aa0 : 0x9c9cb0;      // pavement slabs
    if (y < 15) return 0xc0c0d2;                                                            // curb lip
    if (y < 20) return 0x62627a;                                                            // curb face
    if (y === 20) return INK;
    const n = r.next();
    return n < 0.07 ? 0x45455e : n < 0.12 ? 0x2a2a3e : 0x363650;                            // asphalt
  });
  for (let x = 6; x < w; x += 64) { p.rect(x, 38, 36, 3, 0xe8c84a); p.rect(x, 41, 36, 1, 0xa88a2a); }
  return p;
}

const K = 4 / 3; // world units → art pixels (kept in sync with view.ts)

/** 5×7 capitals for shop signs (only the letters the shop names use). */
const SIGN_FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'], E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'], O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'], S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'], Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
};
/** The businesses an awning can belong to: name on the sign, wall paint, awning stripe, sign lettering. */
const SHOPS: { name: string; paint: number; stripe: number; neon: number }[] = [
  { name: 'PIZZA', paint: 0x8a3a30, stripe: 0xd62839, neon: 0xffd23f },
  { name: 'TACOS', paint: 0x2f7a62, stripe: 0xff7b00, neon: 0xff3d6e },
  { name: 'DELI', paint: 0x35557f, stripe: 0x2a9d8f, neon: 0xf5f5f5 },
  { name: 'NOODLES', paint: 0x5a4288, stripe: 0xc2255c, neon: 0x00d9ff },
  { name: 'SLICE', paint: 0x7a5a2a, stripe: 0x3d8f3d, neon: 0xffd23f },
];

/** Height of the back wall, art px. Must equal WALL_H in textures.ts (which imports this file, so it cannot be imported here). */
const WALL_H = 96;
/** Art px from the foot of the back wall down to the line the skates roll on (view.ts: GROUND − STREET_TOP). */
const CURB = 7;

/**
 * A shop awning you can grind, with the shop it belongs to: painted front, lit windows, a door, and a sign above.
 * The shop is part of the back wall: exactly as tall as the wall, standing where the wall stands (not out on the
 * pavement), and dimmed like it. Only the awning reaches out toward the street, so it and its bar stay bright.
 * The grindable edge is the awning's metal front bar, in exactly the place a plain rail's bar would be.
 */
function shopfront(f: Feature, w: number): { pix: Pix; ox: number; oy: number } {
  const H = Math.round(f.h * K) + 4, oy = WALL_H + CURB + 1, T = oy - H, PH = WALL_H, D = 20;   // T: wall above the bar (the sign goes there), D: how far the canvas hangs
  const far = (c: number) => mix(c, 0x1e1238, 0.28);                                            // as far back as the wall
  const shop = SHOPS[f.id % SHOPS.length], wallC = ramp(far(shop.paint)), a = ramp(shop.stripe), cream = ramp(0xf2ead8), r = new Rng(f.id * 7 + 1);
  const p = new Pix(w + 4, PH), L = 2, R = w + 2, glow = ramp(0xf0b85a), frame = far(mix(shop.paint, INK, 0.55));
  p.part(q => {
    // the building front, wall top to wall foot
    q.rect(L, 3, w, PH - 3, wallC[1]);
    q.each((x, y, c) => c === -1 ? -1 : y < 3 ? c : (x * 7 + y * 13) % 23 === 0 ? wallC[0] : (x * 5 + y * 11) % 31 === 0 ? wallC[2] : c);       // weathered paint
    q.rect(L - 1, 0, w + 2, 3, wallC[2]); q.rect(L - 1, 2, w + 2, 1, wallC[0]);                                                                   // cornice
    q.rect(L, 3, 2, PH - 3, wallC[0]); q.rect(R - 2, 3, 2, PH - 3, wallC[0]); q.rect(L, PH - 4, w, 4, far(mix(shop.paint, INK, 0.5)));           // edges, kick plate
    // sign board with the name, centred in the wall above the awning (as big as that space allows)
    const S = T >= 36 ? 3 : T >= 26 ? 2 : 0;
    if (S) {
      const name = shop.name, tw = name.length * 6 * S - S, bh = 7 * S + 8, by = Math.max(4, Math.round((T - bh) / 2)), bw = Math.min(w - 16, tw + 14 * S), bx = L + Math.round((w - bw) / 2);
      q.rect(bx, by, bw, bh, INK); q.rect(bx + 1, by + 1, bw - 2, bh - 2, mix(shop.paint, INK, 0.75)); q.rect(bx + 1, by + 1, bw - 2, 1, mix(shop.neon, INK, 0.5));
      let tx = bx + Math.round((bw - tw) / 2);
      for (const ch of name) { const g = SIGN_FONT[ch]; if (g) for (let gy = 0; gy < 7; gy++) for (let gx = 0; gx < 5; gx++) if (g[gy][gx] === '1') { q.rect(tx + gx * S + 1, by + 4 + gy * S + 1, S, S, mix(shop.neon, INK, 0.6)); q.rect(tx + gx * S, by + 4 + gy * S, S, S, shop.neon); } tx += 6 * S; }
    }
    // windows and a door under the awning
    const top = T + D + 8, bot = PH - 5;
    if (bot - top >= 10) {
      const doorW = 24, doorX = r.next() < 0.5 ? L + 12 : R - 12 - doorW;
      q.rect(doorX - 1, top - 2, doorW + 2, bot - top + 4, frame); q.rect(doorX + 1, top, doorW - 2, bot - top + 2, far(mix(shop.paint, INK, 0.35)));
      q.rect(doorX + 4, top + 3, doorW - 8, Math.max(4, (bot - top) >> 1), glow[0]); q.rect(doorX + doorW - 6, top + ((bot - top) >> 1) + 3, 2, 3, STEEL[0]);
      const from = doorX < w / 2 ? doorX + doorW + 10 : L + 12, to = doorX < w / 2 ? R - 12 : doorX - 10;
      for (let x0 = from; x0 + 30 <= to; x0 += 70) {
        const ww = Math.min(62, to - x0);
        q.rect(x0 - 1, top - 1, ww + 2, bot - top + 2, frame);
        for (let y = top; y < bot; y++) for (let x = x0; x < x0 + ww; x++) q.set(x, y, bayer(x, y) < (y - top) / (bot - top) * 0.8 ? glow[0] : (x - x0 + (y - top)) % 19 < 3 ? glow[2] : glow[1]);   // lit from inside, a streak of glare
        q.rect(x0 + (ww >> 1), top, 1, bot - top, frame);
        if (bot - top > 16) q.rect(x0 + 4, bot - 7, ww - 8, 2, mix(glow[0], INK, 0.45));                                                                                                           // counter inside
      }
    }
    // shadow the awning throws on the wall behind it
    for (let x = L; x < R; x++) for (let y = T + D + 2; y < T + D + 7 && y < PH; y++) if (bayer(x, y) < 0.6) q.set(x, y, mix(wallC[0], INK, 0.45));
    // the awning: striped canvas hanging from the bar, scalloped hem
    for (let x = L; x < R; x++) {
      const k = (x - L) % 10, c = Math.floor((x - L) / 10) % 2 ? cream : a;
      const hem = D - (k === 0 || k === 9 ? 4 : k === 1 || k === 8 ? 2 : k === 2 || k === 7 ? 1 : 0);
      for (let y = 0; y < hem; y++) q.set(x, T + 6 + y, y < 3 ? c[2] : y > hem - 5 ? c[0] : c[1]);
    }
    for (let x = L; x < R; x++) q.set(x, T + 6 + D - 6, mix(a[0], INK, 0.3));                                                                    // valance seam
    for (let x = L; x < R; x++) for (let i = 0; i < 4; i++) q.set(x, T + 2 + i, STEEL[i]);                                                        // the bar you grind
  });
  return { pix: p, ox: 2, oy };
}

/** Sprite for a level feature. `oy` = pixels from the sprite top to the ground line. */
export function featureSprite(f: Feature): { pix: Pix; ox: number; oy: number } {
  const w = Math.round(f.w * K);
  if (f.kind === 'rail' && f.skin === 'fence' && f.h2 === undefined) {
    // chain-link fence: you grind the top bar. Posts and mesh run down to the street.
    const H = Math.round(f.h * K) + 4, p = new Pix(w + 4, H + 2), mesh = mix(STEEL[2], INK, 0.25);
    p.part(q => {
      for (let y = 5; y < H - 3; y++) for (let x = 3; x < w + 1; x++) if ((x + y) % 6 === 0 || (x - y + 6000) % 6 === 0) q.set(x, y, mesh);
      for (let x = 2; x < w + 2; x++) { q.set(x, H - 4, STEEL[2]); q.set(x, H - 3, STEEL[3]); }
      for (let x = 2; x <= w; x += 48) { const px = Math.min(x, w - 1); q.rect(px, 4, 1, H - 4, STEEL[1]); q.rect(px + 1, 4, 1, H - 4, STEEL[2]); q.rect(px + 2, 4, 1, H - 4, STEEL[3]); q.rect(px - 1, H - 2, 5, 2, STEEL[3]); }
      q.rect(w - 1, 4, 1, H - 4, STEEL[1]); q.rect(w, 4, 1, H - 4, STEEL[2]); q.rect(w + 1, 4, 1, H - 4, STEEL[3]);
      for (let x = 2; x < w + 2; x++) for (let i = 0; i < 4; i++) q.set(x, 2 + i, STEEL[i]);
    });
    return { pix: p, ox: 2, oy: H };
  }
  if (f.kind === 'rail' && f.skin === 'awning' && f.h2 === undefined) return shopfront(f, w);
  if (f.kind === 'rail') {
    const h1 = Math.round(f.h * K), h2 = Math.round((f.h2 ?? f.h) * K), H = Math.max(h1, h2) + 4;
    const p = new Pix(w + 4, H + 2), yAt = (x: number) => H - (h1 + ((h2 - h1) * x) / w);
    p.part(q => {
      for (let x = 2; x < w + 2; x += 1) {
        const post = (x - 6) % 60 === 0 || x === w - 4;
        if (post && x > 2) { for (let y = Math.round(yAt(x)) + 2; y < H; y++) { q.set(x, y, STEEL[1]); q.set(x + 1, y, STEEL[2]); q.set(x + 2, y, STEEL[3]); } q.rect(x - 2, H - 2, 7, 2, STEEL[3]); }
      }
      for (let x = 2; x < w + 2; x++) { const y = Math.round(yAt(x - 2)); for (let i = 0; i < 4; i++) q.set(x, y + i - 2, STEEL[i]); }
    });
    return { pix: p, ox: 2, oy: H };
  }
  if (f.kind === 'ledge') {
    const h = Math.round(f.h * K), p = new Pix(w + 2, h + 2), c = ramp(0x9a9ab0), r = new Rng(f.id);
    p.part(q => {
      q.rect(1, 1, w, h, c[1]);
      q.each((x, y, col) => col === -1 ? -1 : y > h - 5 ? c[0] : r.next() < 0.08 ? c[0] : r.next() < 0.05 ? c[2] : col);
      for (let x = 1; x <= w; x++) { q.set(x, 1, STEEL[0]); q.set(x, 2, STEEL[1]); q.set(x, 3, STEEL[2]); q.set(x, 4, STEEL[3]); }   // coping
      for (let x = 49; x < w; x += 48) q.rect(x, 5, 1, h - 4, c[0]);
      q.rect(1, 5, 2, h - 4, c[2]);
      const tx = r.int(8, Math.max(9, w - 30)), tc = r.pick([0xff3d6e, 0x00d9ff, 0x3dff8f, 0xffd23f]);
      q.rect(tx, 9, 9, 2, tc); q.rect(tx + 2, 11, 2, 5, tc); q.rect(tx + 11, 8, 5, 6, tc); q.rect(tx + 13, 10, 1, 2, c[1]);       // little tag
    });
    return { pix: p, ox: 1, oy: h + 1 };
  }
  if (f.kind === 'kicker') {
    const h = Math.round(f.h * K), p = new Pix(w + 4, h + 4), wood = ramp(0xc98a3a);
    p.part(q => {
      q.poly([[1, h + 2], [w + 1, h + 2], [w + 1, 2]], wood[1]);
      q.each((x, y, col) => col === -1 ? -1 : (x + y * 2) % 11 === 0 ? wood[0] : col);                      // grain
      for (let x = 1; x <= w + 1; x++) { const y = Math.round(h + 2 - ((x - 1) * h) / w); q.set(x, y, wood[2]); q.set(x, y - 1, 0xffe0a0); }
      q.rect(w - 1, 2, 3, h, wood[0]); q.rect(w + 1, 2, 1, h, mix(wood[0], INK, 0.4));
      q.line(Math.round(w * 0.45), h + 1, w - 1, Math.round(h * 0.5), wood[0]);
      q.rect(1, h, 5, 2, STEEL[1]);
    });
    return { pix: p, ox: 1, oy: h + 2 };
  }
  if (f.kind === 'cone') {
    const p = new Pix(17, 20), o = ramp(0xff6a1a);
    p.part(q => {
      for (let y = 0; y < 15; y++) { const hw = 1 + (y * 4.4) / 15; for (let x = -hw; x <= hw; x++) q.set(8 + x, 2 + y, x < -hw * 0.3 ? o[2] : x > hw * 0.45 ? o[0] : o[1]); }
      for (const y of [6, 7, 11, 12]) { const hw = 1 + (y * 4.4) / 15; for (let x = -hw; x <= hw; x++) q.set(8 + x, 2 + y, x > hw * 0.45 ? 0xc0c0d2 : 0xffffff); }
      q.rect(1, 17, 15, 2, o[0]); q.rect(1, 17, 15, 1, o[1]);
    });
    return { pix: p, ox: 8 - Math.round(w / 2), oy: 19 };
  }
  // barrier: striped construction barricade with a warning light
  const h = Math.round(f.h * K), p = new Pix(24, h + 8);
  p.part(q => {
    const b = h + 6;
    q.rect(4, 9, 2, b - 9, STEEL[2]); q.rect(18, 9, 2, b - 9, STEEL[2]); q.rect(2, b - 2, 6, 2, STEEL[3]); q.rect(16, b - 2, 6, 2, STEEL[3]);
    for (const by of [8, 19]) for (let y = 0; y < 7; y++) for (let x = 1; x < 23; x++) q.set(x, by + y, Math.floor((x + y) / 4) % 2 ? 0xff6a1a : 0xffffff);
    q.rect(1, 14, 22, 1, 0xc0c0d2); q.rect(1, 25, 22, 1, 0xc0c0d2);
    q.rect(10, 2, 5, 6, 0xffd23f); q.rect(11, 3, 2, 2, 0xfff6c8); q.rect(10, 7, 5, 1, 0xa88a2a);
  });
  return { pix: p, ox: 12 - Math.round(w / 2), oy: h + 7 };
}

export function wheelIcon(): Pix {
  const p = new Pix(16, 16);
  p.part(q => { q.disc(8, 8, 6.5, 6.5, ramp(0xffd23f)); q.disc(8, 8, 2.6, 2.6, ramp(0x8a94ae)); q.set(8, 8, INK); });
  return p;
}
export function shadow(): Pix {
  const p = new Pix(34, 7);
  p.each((x, y) => { const nx = (x - 16.5) / 17, ny = (y - 3) / 3.5, d = nx * nx + ny * ny; return d < 0.55 || (d < 1 && bayer(x, y) > 0.5) ? INK : -1; });
  return p;
}
