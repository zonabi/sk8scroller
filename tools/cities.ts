/**
 * CONCEPT ART ONLY — nothing here is used by the game.
 * Paints one mock screen per planned city (docs/CITIES.md) with the game's own pixel helpers, so the look can be
 * judged before any level is built. Usage: npm run cities   →  docs/concept/city-<name>.png, docs/concept/city-stages.png
 */
import fs from 'node:fs';
import { Rng } from '../src/core/rng';
import { SKATERS } from '../src/core/skaters';
import { INK, Pix, bayer, mix, ramp } from '../src/game/art/pixel';
import { GY, OX, POSES, drawSkater } from '../src/game/art/skater';
import { writePng } from './sprites';

const W = 640, H = 360, WALL_TOP = 201, STREET_TOP = 297, GROUND = 304;
type Time = 'day' | 'sunset' | 'night';
type Light = [x: number, y: number, w: number, h: number, c: number];
interface Ctx { p: Pix; r: Rng; time: Time; lights: Light[] }
interface City { id: string; name: string; tag: string; sky: Record<Time, [number, number][]>; paint: (c: Ctx) => void }

// ---- helpers ------------------------------------------------------------------------------------------------------
const FONT: Record<string, string> = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01111100001000010000100001000001111', D: '11110100011000110001100011000111110',
  E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000', G: '01111100001000010011100011000101111', H: '10001100011000111111100011000110001',
  I: '11111001000010000100001000010011111', J: '00111000010000100001000011000101110', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110', P: '11110100011000111110100001000010000',
  Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001', S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100',
  U: '10001100011000110001100011000101110', V: '10001100011000110001100010101000100', W: '10001100011000110101101011101110001', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
  '3': '11110000010000101110000010000111110', '4': '10010100101001011111000100001000010', '-': '00000000000000011111000000000000000', '·': '00000000000000000100000000000000000',
};
function text(p: Pix, x: number, y: number, s: string, scale: number, c: number, shadow = INK): number {
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch];
    if (g) for (let i = 0; i < 35; i++) if (g[i] === '1') { const gx = x + (i % 5) * scale, gy = y + Math.floor(i / 5) * scale; p.rect(gx + 1, gy + 1, scale, scale, shadow); }
    if (g) for (let i = 0; i < 35; i++) if (g[i] === '1') p.rect(x + (i % 5) * scale, y + Math.floor(i / 5) * scale, scale, scale, c);
    x += (ch === ' ' ? 4 : 6) * scale;
  }
  return x;
}
const textW = (s: string, scale: number) => [...s].reduce((n, ch) => n + (ch === ' ' ? 4 : 6) * scale, 0) - scale;

function gradient(p: Pix, y0: number, y1: number, stops: [number, number][]): void {
  const at = (t: number) => { for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (t - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0])); return stops[stops.length - 1][1]; };
  const BANDS = 20;
  for (let y = y0; y < y1; y++) for (let x = 0; x < p.w; x++) { const f = ((y - y0) / (y1 - y0)) * BANDS, b = Math.floor(f); p.set(x, y, at((b + (f - b > bayer(x, y) ? 1 : 0)) / BANDS)); }
}
/** How much of the light is gone, and what colour the dark is, per time of day. */
const AMBIENT: Record<Time, [number, number]> = { day: [0, 0], sunset: [0.22, 0x7a2a5a], night: [0.5, 0x1a1040] };
const amb = (c: Ctx, col: number, extra = 0): number => { const [t, k] = AMBIENT[c.time]; return mix(col, k, Math.min(0.85, t + extra)); };
const litChance = (c: Ctx) => (c.time === 'night' ? 0.4 : c.time === 'sunset' ? 0.2 : 0.03);

/** A plain building with a window grid. `far` thins the detail and pushes it into the haze. */
function block(c: Ctx, x: number, top: number, w: number, col: number, far: number, bottom = WALL_TOP + 6): void {
  const base = amb(c, col, far);
  c.p.rect(x, top, w, bottom - top, base);
  c.p.rect(x, top, w, 1, mix(base, 0xffffff, 0.18)); c.p.rect(x, top, 1, bottom - top, mix(base, INK, 0.3)); c.p.rect(x + w - 1, top, 1, bottom - top, mix(base, 0xffffff, 0.08));
  const pw = far > 0.3 ? 5 : 7, ph = far > 0.3 ? 7 : 9;
  for (let wy = top + 5; wy < bottom - 5; wy += ph) for (let wx = x + 3; wx < x + w - 4; wx += pw) {
    if (c.r.next() < litChance(c)) c.lights.push([wx, wy, pw - 3, ph - 4, c.r.next() < 0.5 ? 0xffd98a : 0xffa860]);
    else c.p.rect(wx, wy, pw - 3, ph - 4, mix(base, c.time === 'day' ? 0x9fd0ff : INK, c.time === 'day' ? 0.35 : 0.3));
  }
}
function row(c: Ctx, y0: number, y1: number, cols: number[], far: number, wMin: number, wMax: number): void {
  for (let x = -10; x < W;) { const w = c.r.int(wMin, wMax); block(c, x, c.r.int(y0, y1), w, c.r.pick(cols), far); x += w + c.r.int(0, 6); }
}
function street(c: Ctx, pave: number, road: number, opts: { tiles?: number; planks?: boolean } = {}): void {
  const p = c.p, pv = amb(c, pave), rd = amb(c, road);
  p.rect(0, STREET_TOP, W, 13, pv); p.rect(0, STREET_TOP, W, 1, mix(pv, 0xffffff, 0.3)); p.rect(0, STREET_TOP + 13, W, 2, mix(pv, INK, 0.5));
  if (opts.planks) for (let x = 0; x < W; x += 14) p.rect(x, STREET_TOP + 1, 1, 12, mix(pv, INK, 0.35));
  else for (let x = 0; x < W; x += opts.tiles ?? 44) p.rect(x, STREET_TOP + 1, 1, 12, mix(pv, INK, 0.25));
  if (opts.tiles && opts.tiles < 30) for (let x = 0; x < W; x += opts.tiles) for (let y = STREET_TOP + 1; y < STREET_TOP + 13; y += 6) if (((x / opts.tiles) + (y >> 2)) % 2 === 0) p.rect(x + 1, y, opts.tiles - 1, 6, mix(pv, 0xffffff, 0.12));
  p.rect(0, STREET_TOP + 15, W, H - STREET_TOP - 15, rd);
  for (let i = 0; i < 900; i++) { const x = c.r.int(0, W), y = c.r.int(STREET_TOP + 16, H); p.set(x, y, mix(rd, c.r.next() < 0.5 ? 0xffffff : INK, 0.12)); }
  for (let x = 6; x < W; x += 64) p.rect(x, 338, 30, 3, amb(c, 0xe8c840));
}
function rail(c: Ctx, x: number, w: number, h: number, col = 0xb8c2d8): number {
  const y = GROUND - h, s = ramp(amb(c, col));
  for (let px = x + 4; px < x + w - 2; px += 46) { c.p.rect(px, y + 3, 3, h - 3, s[0]); c.p.rect(px, y + 3, 1, h - 3, s[1]); c.p.rect(px - 1, GROUND - 2, 5, 2, s[0]); }
  c.p.rect(x - 1, y - 1, w + 2, 5, INK); c.p.rect(x, y, w, 1, s[2]); c.p.rect(x, y + 1, w, 1, s[1]); c.p.rect(x, y + 2, w, 1, s[0]);
  return y;
}
function ledge(c: Ctx, x: number, w: number, h: number, col: number, speck?: number[]): number {
  const y = GROUND - h, s = ramp(amb(c, col));
  c.p.rect(x - 1, y - 1, w + 2, h + 2, INK); c.p.rect(x, y, w, h, s[1]); c.p.rect(x, y, w, 2, s[2]); c.p.rect(x, y + h - 3, w, 3, s[0]);
  if (speck) for (let i = 0; i < w * h / 5; i++) c.p.rect(x + c.r.int(0, w - 2), y + c.r.int(2, h - 2), 2, 2, amb(c, c.r.pick(speck)));
  c.p.rect(x, y, w, 1, amb(c, 0xdfe6f2));
  return y;
}
function skater(c: Ctx, x: number, feetY: number, pose: keyof typeof POSES, who = 0): void {
  const s = drawSkater(SKATERS[who], POSES[pose]);
  c.p.blit(s, x - OX, feetY - GY);
}
function awning(c: Ctx, x: number, y: number, w: number, a: number, b: number, drop = 16): void {
  const A = ramp(amb(c, a)), B = ramp(amb(c, b));
  for (let px = x; px < x + w; px++) { const k = (px - x) % 10, col = Math.floor((px - x) / 10) % 2 ? B : A, hem = drop - (k === 0 || k === 9 ? 3 : k === 1 || k === 8 ? 1 : 0); for (let i = 0; i < hem; i++) c.p.set(px, y + 4 + i, i < 3 ? col[2] : i > hem - 4 ? col[0] : col[1]); }
  const st = ramp(amb(c, 0xb8c2d8)); c.p.rect(x - 1, y - 1, w + 2, 5, INK); c.p.rect(x, y, w, 1, st[2]); c.p.rect(x, y + 1, w, 2, st[1]);
}
function sign(c: Ctx, cx: number, y: number, s: string, neon: number, scale = 2): void {
  const w = textW(s, scale) + 12, x = Math.round(cx - w / 2);
  c.p.rect(x, y, w, 7 * scale + 8, INK); c.p.rect(x + 1, y + 1, w - 2, 7 * scale + 6, mix(INK, neon, 0.12));
  text(c.p, x + 6, y + 4, s, scale, c.time === 'day' ? mix(neon, 0xffffff, 0.2) : neon, mix(neon, INK, 0.65));
}
function palm(c: Ctx, x: number, base: number, h: number): void {
  const t = amb(c, 0x6b4a2e), g = ramp(amb(c, 0x2f8f4e));
  for (let i = 0; i < h; i++) c.p.rect(x + Math.round(Math.sin(i / 14) * 3), base - i, 3, 1, i % 4 ? t : mix(t, INK, 0.3));
  const tx = x + Math.round(Math.sin(h / 14) * 3) + 1, ty = base - h;
  for (const [dx, dy] of [[-18, 4], [-14, -6], [-4, -11], [8, -9], [17, -2], [19, 7], [-20, 10]]) for (let i = 0; i <= 12; i++) { const px = tx + (dx * i) / 12, py = ty + (dy * i) / 12 + (i * i) / 30; c.p.rect(px, py, 2, 2, i > 8 ? g[0] : g[1]); c.p.set(px, py - 1, g[2]); }
}
function label(p: Pix, city: City, stage: string): void {
  p.rect(0, 0, W, 30, mix(INK, 0x000000, 0.2));
  const x = text(p, 10, 6, city.name, 3, 0xffd23f);
  text(p, x + 10, 13, `${stage} · ${city.tag}`, 1, 0xf5f5f5);
  text(p, W - textW('CONCEPT ART', 1) - 10, 13, 'CONCEPT ART', 1, 0xff3d6e);
}

// ---- the five cities ----------------------------------------------------------------------------------------------
const CITIES: City[] = [
  {
    id: 'new-york', name: 'NEW YORK', tag: 'STOOPS SCAFFOLDS FIRE ESCAPES',
    sky: { day: [[0, 0x6fa8e8], [1, 0xcfe6ff]], sunset: [[0, 0x2a1f6e], [0.55, 0xc2456e], [1, 0xffb060]], night: [[0, 0x0b0820], [0.6, 0x2a1650], [1, 0x7a2a6e]] },
    paint: c => {
      const { p, r } = c;
      // far: setback towers with spires
      for (const [x, top, w] of [[40, 70, 34], [150, 44, 30], [300, 86, 40], [430, 58, 28], [560, 92, 36]]) {
        const col = amb(c, 0x4a4470, 0.35);
        block(c, x, top + 30, w, 0x4a4470, 0.35); block(c, x + 5, top + 12, w - 10, 0x4a4470, 0.35, top + 31); block(c, x + 10, top, w - 20, 0x4a4470, 0.35, top + 13);
        p.rect(x + (w >> 1), top - 16, 1, 16, col);
      }
      row(c, 110, 150, [0x5a4a86, 0x6a4f7c, 0x4a3f78], 0.2, 30, 60);
      // water towers
      for (const x of [90, 262, 470]) { const y = 122, t = amb(c, 0x3a2a40, 0.1); p.rect(x, y - 12, 12, 9, t); p.rect(x + 1, y - 15, 10, 3, t); p.rect(x + 1, y - 3, 1, 5, t); p.rect(x + 10, y - 3, 1, 5, t); }
      // wall: brownstone fronts with stoops and a fire escape
      for (let x = 0; x < W; x += 128) {
        const col = amb(c, r.pick([0x7a3b34, 0x6a3a4a, 0x8a4a38]));
        p.rect(x, WALL_TOP, 126, STREET_TOP - WALL_TOP, col); p.rect(x, WALL_TOP, 126, 3, mix(col, INK, 0.4));
        for (let y = WALL_TOP + 6; y < STREET_TOP; y += 6) for (let bx = x + ((y / 6) % 2 ? 0 : 6); bx < x + 126; bx += 12) p.set(bx, y, mix(col, INK, 0.35));
        for (const wx of [x + 14, x + 52, x + 90]) { p.rect(wx - 1, WALL_TOP + 13, 20, 26, mix(col, INK, 0.55)); if (r.next() < litChance(c) * 1.6 + 0.1) c.lights.push([wx, WALL_TOP + 14, 18, 24, 0xffc870]); else p.rect(wx, WALL_TOP + 14, 18, 24, amb(c, 0x4a6a9a)); p.rect(wx + 8, WALL_TOP + 14, 1, 24, mix(col, INK, 0.55)); }
        const fe = amb(c, 0x2a2a34); p.rect(x + 8, WALL_TOP + 42, 70, 2, fe); for (let fx = x + 8; fx < x + 78; fx += 5) p.rect(fx, WALL_TOP + 34, 1, 8, fe); p.rect(x + 8, WALL_TOP + 33, 70, 1, fe); p.line(x + 78, WALL_TOP + 44, x + 100, WALL_TOP + 76, fe); p.line(x + 80, WALL_TOP + 44, x + 102, WALL_TOP + 76, fe);
      }
      street(c, 0x9a9aac, 0x3a3a48);
      flush(c);
      // spots: scaffold (two decks), stoop ledge, hydrant, hot-dog cart
      const sc = amb(c, 0x4a6a5a); for (const x of [330, 400, 470, 540]) p.rect(x, GROUND - 78, 3, 78, sc); p.rect(326, GROUND - 46, 222, 6, amb(c, 0x2f5a46)); for (let x = 330; x < 544; x += 14) p.line(x, GROUND - 40, x + 14, GROUND - 78, mix(sc, INK, 0.3));
      const top = rail(c, 326, 222, 78, 0x9aa8b8); rail(c, 326, 222, 46, 0x9aa8b8);
      skater(c, 430, top, 'soul');
      const st = ledge(c, 60, 150, 18, 0x8a7a70); p.rect(60, st - 10, 6, 10, amb(c, 0x6a5a50)); p.rect(204, st - 10, 6, 10, amb(c, 0x6a5a50));
      const hy = ramp(amb(c, 0xd62839)); p.rect(250, GROUND - 14, 8, 14, hy[1]); p.rect(248, GROUND - 10, 12, 3, hy[0]); p.rect(251, GROUND - 17, 6, 3, hy[2]);
      p.rect(580, GROUND - 22, 44, 18, amb(c, 0xc8ccd8)); p.rect(580, GROUND - 22, 44, 2, amb(c, 0xf5f5f5)); p.rect(586, GROUND - 4, 4, 4, INK); p.rect(614, GROUND - 4, 4, 4, INK); awning(c, 576, GROUND - 46, 52, 0xffd23f, 0x2a6ad8, 9); p.rect(578, GROUND - 42, 2, 20, INK); p.rect(624, GROUND - 42, 2, 20, INK);
      sign(c, 190, WALL_TOP - 22, 'BODEGA', 0x00d9ff);
    },
  },
  {
    id: 'austin', name: 'AUSTIN', tag: 'FOOD TRUCKS LIMESTONE MURALS',
    sky: { day: [[0, 0x58a8e8], [1, 0xd8efff]], sunset: [[0, 0x3a2a7a], [0.45, 0xe0506a], [0.8, 0xffa040], [1, 0xffe08a]], night: [[0, 0x0a0a2a], [0.7, 0x2a1a5a], [1, 0x6a2a5a]] },
    paint: c => {
      const { p, r } = c;
      if (c.time !== 'night') { for (let y = -30; y <= 30; y++) for (let x = -30; x <= 30; x++) if (x * x + y * y <= 900) p.set(470 + x, 150 + y, c.time === 'day' ? 0xfff6c8 : y < -8 ? 0xfff0a0 : 0xffc050); }
      // far: a low glass skyline, a domed capitol, a moonlight tower
      for (const [x, top, w] of [[30, 120, 26], [70, 96, 22], [330, 104, 30], [372, 80, 24], [404, 112, 34], [560, 100, 26], [596, 124, 30]]) block(c, x, top, w, 0x5a7aa8, 0.3);
      const dc = amb(c, 0xd8b8a0, 0.3); p.rect(196, 150, 84, 60, dc); p.rect(214, 132, 48, 20, dc); for (let x = 200; x < 278; x += 8) p.rect(x, 156, 2, 50, mix(dc, INK, 0.25));
      p.disc(238, 132, 20, 22, dc); p.rect(218, 132, 40, 22, dc); p.rect(234, 100, 8, 12, dc); p.rect(237, 90, 2, 10, dc);
      const mt = amb(c, 0x4a4a5a, 0.2); p.rect(140, 70, 2, 140, mt); p.line(141, 70, 128, 200, mt); p.line(141, 70, 154, 200, mt); p.rect(133, 68, 17, 2, mt); if (c.time !== 'day') for (let i = 0; i < 6; i++) c.lights.push([134 + i * 3, 66, 2, 2, 0xcfe8ff]);
      if (c.time === 'sunset') for (let i = 0; i < 70; i++) { const x = 280 + i * 4 + r.int(-3, 3), y = 60 + Math.round(Math.sin(i / 9) * 14) + r.int(-5, 5); p.set(x, y, INK); p.set(x + 1, y - 1, INK); p.set(x - 1, y - 1, INK); }   // bats at dusk
      row(c, 150, 176, [0xc8a888, 0xb89070, 0xd8c0a0], 0.12, 44, 80);
      // wall: limestone blocks with painted murals
      const ls = amb(c, 0xe0d0b0); p.rect(0, WALL_TOP, W, STREET_TOP - WALL_TOP, ls);
      for (let y = WALL_TOP; y < STREET_TOP; y += 12) { p.rect(0, y, W, 1, mix(ls, INK, 0.2)); for (let x = (y / 12) % 2 ? 0 : 16; x < W; x += 32) p.rect(x, y, 1, 12, mix(ls, INK, 0.16)); }
      for (let i = 0; i < 1400; i++) p.set(r.int(0, W), r.int(WALL_TOP, STREET_TOP), mix(ls, r.next() < 0.5 ? 0xffffff : 0x8a6a4a, 0.12));
      const mural = (x: number, w: number, cols: number[]) => { for (let i = 0; i < cols.length; i++) p.rect(x + (w / cols.length) * i, WALL_TOP + 14, Math.ceil(w / cols.length), 64, amb(c, cols[i])); p.rect(x - 2, WALL_TOP + 12, w + 4, 2, INK); p.rect(x - 2, WALL_TOP + 78, w + 4, 2, INK); };
      mural(20, 150, [0x2a9d8f, 0xe9c46a, 0xf4a261, 0xe76f51]); text(p, 34, WALL_TOP + 30, 'HOWDY', 4, amb(c, 0xf5f5f5), amb(c, 0x1a3a4a));
      mural(470, 150, [0x6a4c93, 0x1982c4, 0x8ac926]); for (let i = 0; i < 5; i++) { const cx = 496 + i * 26; p.disc(cx, WALL_TOP + 46, 9, 9, amb(c, 0xffca3a)); p.rect(cx - 1, WALL_TOP + 55, 2, 16, amb(c, 0x2a6a2a)); }
      street(c, 0xcfc4ac, 0x4a4650);
      flush(c);
      // spots: food truck with a grindable awning, picnic-table ledge, long limestone ledge
      const tk = ramp(amb(c, 0x2ab0a0)); p.rect(230, GROUND - 58, 150, 50, INK); p.rect(231, GROUND - 57, 148, 48, tk[1]); p.rect(231, GROUND - 57, 148, 4, tk[2]); p.rect(231, GROUND - 16, 148, 7, tk[0]);
      p.rect(250, GROUND - 46, 84, 22, INK); if (c.time === 'day') p.rect(251, GROUND - 45, 82, 20, amb(c, 0x3a4a5a)); else c.lights.push([251, GROUND - 45, 82, 20, 0xffd080]);
      for (const wx of [256, 352]) { p.disc(wx, GROUND - 6, 8, 8, INK); p.disc(wx, GROUND - 6, 4, 4, amb(c, 0x8a8a9a)); }
      const ay = GROUND - 66; awning(c, 240, ay, 104, 0xff7b00, 0xf2ead8, 14); sign(c, 338, GROUND - 92, 'TACOS', 0xffd23f);
      skater(c, 262, ay, 'royale', 1);
      ledge(c, 430, 190, 16, 0xd8c8a8); const tb = amb(c, 0x8a5a3a); p.rect(70, GROUND - 16, 90, 4, tb); p.rect(60, GROUND - 9, 110, 3, tb); p.line(78, GROUND - 12, 70, GROUND, tb); p.line(152, GROUND - 12, 160, GROUND, tb);
    },
  },
  {
    id: 'barcelona', name: 'BARCELONA', tag: 'PLAZAS MOSAIC BENCHES MARBLE',
    sky: { day: [[0, 0x3a9ae8], [0.7, 0xa8dcff], [1, 0xffe8c8]], sunset: [[0, 0x4a3a8a], [0.5, 0xf07a6a], [1, 0xffd08a]], night: [[0, 0x0a1030], [0.7, 0x2a2a6a], [1, 0x6a3a6a]] },
    paint: c => {
      const { p, r } = c;
      // far: a hill with a tower, a many-spired church with a crane
      const hill = amb(c, 0x5a8a7a, 0.3); p.poly([[380, 210], [470, 120], [560, 108], [640, 150], [640, 210]], hill); p.rect(557, 70, 1, 40, amb(c, 0x8a8a9a, 0.3)); p.rect(556, 84, 3, 26, amb(c, 0x8a8a9a, 0.3)); p.disc(557.5, 92, 6, 2.5, amb(c, 0x8a8a9a, 0.3));
      const ch = amb(c, 0xb89a80, 0.28);
      for (const [x, h, w] of [[150, 96, 10], [168, 116, 12], [190, 126, 12], [212, 112, 12], [232, 92, 10]]) { p.poly([[x, 208], [x + w / 2 - 1, 208 - h], [x + w / 2 + 1, 208 - h], [x + w, 208]], ch); p.disc(x + w / 2, 208 - h, 3, 3, amb(c, 0xe8c85a, 0.2)); for (let y = 208 - h + 14; y < 204; y += 9) p.rect(x + w / 2 - 1, y, 2, 4, mix(ch, INK, 0.35)); }
      p.rect(146, 176, 100, 34, ch); const cr = amb(c, 0xd8a020, 0.2); p.rect(258, 86, 2, 124, cr); p.rect(228, 86, 62, 2, cr); p.line(259, 78, 288, 86, cr); p.line(259, 78, 232, 86, cr);
      // mid: chamfered apartment blocks with balconies and shutters
      for (let x = -10; x < W;) { const w = r.int(54, 84), top = r.int(128, 156), col = r.pick([0xe8c8a0, 0xf0d8b0, 0xd8a888, 0xe8b890]), b = amb(c, col, 0.1);
        p.rect(x, top, w, 80, b); p.rect(x, top, w, 3, mix(b, 0xb85a3a, 0.5));
        for (let wy = top + 9; wy < 204; wy += 15) for (let wx = x + 6; wx < x + w - 9; wx += 13) { if (r.next() < litChance(c)) c.lights.push([wx, wy, 6, 9, 0xffd98a]); else p.rect(wx, wy, 6, 9, amb(c, r.pick([0x3a7a6a, 0x4a5a8a, 0x6a4a3a]), 0.1)); p.rect(wx - 2, wy + 9, 10, 1, mix(b, INK, 0.5)); p.rect(wx - 2, wy + 6, 1, 3, mix(b, INK, 0.5)); p.rect(wx + 7, wy + 6, 1, 3, mix(b, INK, 0.5)); }
        x += w + r.int(2, 8); }
      // wall: ochre stucco arcade with a tile band
      const oc = amb(c, 0xe0a85a); p.rect(0, WALL_TOP, W, STREET_TOP - WALL_TOP, oc);
      for (let x = 0; x < W; x += 8) p.rect(x, WALL_TOP + 2, 8, 6, amb(c, [0x1982c4, 0xf5f5f5, 0xe9c46a, 0x2a9d8f][(x / 8) % 4]));
      for (let x = 20; x < W; x += 104) { const dk = amb(c, 0x5a3a2a); p.rect(x, WALL_TOP + 36, 64, 60, dk); p.disc(x + 32, WALL_TOP + 36, 32, 22, dk); p.rect(x + 4, WALL_TOP + 40, 56, 56, mix(dk, INK, 0.4)); p.disc(x + 32, WALL_TOP + 40, 28, 18, mix(dk, INK, 0.4)); if (c.time !== 'day') c.lights.push([x + 26, WALL_TOP + 50, 12, 16, 0xffc060]); }
      for (let i = 0; i < 1200; i++) p.set(r.int(0, W), r.int(WALL_TOP + 9, STREET_TOP), mix(oc, r.next() < 0.5 ? 0xffffff : 0x8a4a2a, 0.1));
      street(c, 0xe8e0d0, 0xb8a890, { tiles: 22 });
      flush(c);
      // spots: wavy mosaic bench, marble plaza ledges on two levels, palms
      palm(c, 30, GROUND - 2, 92); palm(c, 606, GROUND - 2, 80);
      const tiles = [0x1982c4, 0xffca3a, 0xe76f51, 0x2a9d8f, 0xf5f5f5, 0x6a4c93];
      for (let x = 70; x < 250; x++) { const top = GROUND - 22 - Math.round(Math.sin((x - 70) / 22) * 5); for (let y = top; y < GROUND; y++) p.set(x, y, (x + y) % 5 === 0 || (x * 3 + y * 7) % 11 === 0 ? mix(amb(c, 0xf5f5f5), INK, 0.3) : amb(c, tiles[((x >> 2) * 7 + (y >> 2) * 3) % tiles.length])); p.set(x, top - 1, INK); p.set(x, top, amb(c, 0xf5f5f5)); }
      const m1 = ledge(c, 300, 250, 14, 0xe8e4f0); ledge(c, 380, 170, 30, 0xdcd8e8);
      skater(c, 450, GROUND - 30, 'makio', 2); void m1;
      sign(c, 572, WALL_TOP + 14, 'TAPAS', 0xff3d6e, 1);
    },
  },
  {
    id: 'sydney', name: 'SYDNEY', tag: 'HARBOUR PROMENADE HANDRAILS',
    sky: { day: [[0, 0x2a90e0], [0.75, 0x9adcf8], [1, 0xe8f8ff]], sunset: [[0, 0x3a3a8a], [0.5, 0xe86a7a], [1, 0xffc890]], night: [[0, 0x081028], [0.7, 0x1a2a5a], [1, 0x3a4a7a]] },
    paint: c => {
      const { p, r } = c;
      // far shore and towers
      for (const [x, top, w] of [[20, 110, 24], [50, 86, 20], [76, 120, 28], [520, 104, 24], [550, 78, 20], [576, 96, 26], [606, 118, 30]]) block(c, x, top, w, 0x6a8ab0, 0.32, 190);
      const nd = amb(c, 0x8a8aa0, 0.3); p.rect(118, 60, 2, 130, nd); p.rect(111, 86, 16, 8, nd); p.rect(114, 82, 10, 4, amb(c, 0xd8a020, 0.3));
      // the harbour
      const sea = amb(c, 0x1a78b8); p.rect(0, 188, W, WALL_TOP - 188 + 30, sea); for (let i = 0; i < 260; i++) { const x = r.int(0, W), y = r.int(190, WALL_TOP + 28); p.rect(x, y, r.int(3, 9), 1, mix(sea, 0xffffff, 0.3)); }
      // arch bridge
      const br = amb(c, 0x4a5568, 0.15); for (let x = 150; x <= 400; x++) { const t = (x - 150) / 250, y = 170 - Math.round(Math.sin(t * Math.PI) * 62); p.rect(x, y, 1, 3, br); if ((x - 150) % 10 === 0) p.rect(x, y, 1, 172 - y, br); const y2 = 172 - Math.round(Math.sin(t * Math.PI) * 44); p.rect(x, y2, 1, 2, br); }
      p.rect(120, 170, 310, 4, br); for (const x of [140, 404]) { p.rect(x, 138, 12, 52, amb(c, 0xc8b898, 0.15)); p.rect(x - 1, 136, 14, 3, amb(c, 0xc8b898, 0.15)); }
      // the sail-roofed hall on its point
      const sh = amb(c, 0xf2f0e8, 0.05), sd = amb(c, 0xb8bcc8, 0.05); p.rect(424, 178, 150, 12, amb(c, 0xb8a890, 0.1));
      for (const [bx, s] of [[440, 1], [470, 1.25], [506, 1.05], [538, 0.75]] as [number, number][]) { const hh = 46 * s, ww = 34 * s; p.poly([[bx, 178], [bx + ww * 0.15, 178 - hh * 0.7], [bx + ww * 0.55, 178 - hh], [bx + ww, 178]], sh); p.poly([[bx + ww * 0.55, 178 - hh], [bx + ww * 0.7, 178 - hh * 0.5], [bx + ww, 178]], sd); }
      // wall: sandstone sea wall with a glass balustrade and the water above it
      const ss = amb(c, 0xd8b888); p.rect(0, WALL_TOP + 30, W, STREET_TOP - WALL_TOP - 30, ss);
      for (let y = WALL_TOP + 30; y < STREET_TOP; y += 11) { p.rect(0, y, W, 1, mix(ss, INK, 0.22)); for (let x = (y % 2 ? 0 : 20); x < W; x += 40) p.rect(x, y, 1, 11, mix(ss, INK, 0.15)); }
      p.rect(0, WALL_TOP + 28, W, 3, amb(c, 0xf0e0c0)); for (let x = 0; x < W; x += 36) p.rect(x, WALL_TOP + 8, 2, 22, amb(c, 0xc8d0dc)); p.rect(0, WALL_TOP + 7, W, 2, amb(c, 0xe8eef8));
      for (let i = 0; i < 900; i++) p.set(r.int(0, W), r.int(WALL_TOP + 32, STREET_TOP), mix(ss, r.next() < 0.5 ? 0xffffff : 0x8a6a3a, 0.12));
      street(c, 0xc8a878, 0x5a6a7a, { planks: true });
      flush(c);
      // spots: one very long handrail, a surf-shop awning, a kicker, a lifeguard chair
      const hy = rail(c, 150, 330, 26, 0xd8e0ec); skater(c, 300, hy, 'frontside', 3);
      const sp = amb(c, 0x2ab8c8); p.rect(20, GROUND - 74, 110, 72, INK); p.rect(21, GROUND - 73, 108, 70, sp); if (c.time === 'day') p.rect(32, GROUND - 40, 50, 30, amb(c, 0x2a4a5a)); else c.lights.push([32, GROUND - 40, 50, 30, 0xffd890]); p.rect(92, GROUND - 44, 26, 42, amb(c, 0x1a5a6a));
      awning(c, 16, GROUND - 60, 118, 0xffd23f, 0xf5f5f5, 13); sign(c, 75, GROUND - 92, 'SURF', 0xff7b00);
      for (const [x, col] of [[36, 0xff3d6e], [48, 0xf5f5f5], [60, 0x3dff8f]] as [number, number][]) { p.disc(x + 4, GROUND - 24, 4, 14, amb(c, col)); }
      p.poly([[500, GROUND], [560, GROUND - 22], [560, GROUND]], amb(c, 0x9a7a5a)); p.line(500, GROUND, 560, GROUND - 22, amb(c, 0xe8e0d0));
      const lg = amb(c, 0xf5f5f5); p.rect(590, GROUND - 56, 30, 22, lg); p.rect(588, GROUND - 60, 34, 4, amb(c, 0xd62839)); p.line(592, GROUND - 34, 586, GROUND, lg); p.line(618, GROUND - 34, 624, GROUND, lg);
    },
  },
  {
    id: 'mexico-city', name: 'MEXICO CITY', tag: 'MARKETS BUNTING PAINTED WALLS',
    sky: { day: [[0, 0x4a9ae0], [1, 0xfff0d0]], sunset: [[0, 0x3a2a7a], [0.45, 0xd8457a], [0.8, 0xff8a40], [1, 0xffd870]], night: [[0, 0x0a0824], [0.65, 0x3a1a5a], [1, 0x8a2a5a]] },
    paint: c => {
      const { p, r } = c;
      // far: two volcanoes, a modern tower, a twin-towered cathedral with a dome
      const vo = amb(c, 0x6a6a9a, 0.4), sn = amb(c, 0xf0f0ff, 0.25);
      p.poly([[330, 210], [450, 96], [470, 100], [600, 210]], vo); p.poly([[430, 115], [450, 96], [470, 100], [488, 118], [470, 112], [456, 120], [444, 110]], sn);
      p.poly([[500, 210], [590, 120], [640, 150], [640, 210]], vo); p.poly([[574, 136], [590, 120], [612, 134], [596, 130], [586, 140]], sn);
      block(c, 60, 66, 22, 0x5a6a9a, 0.3); p.rect(70, 50, 2, 16, amb(c, 0x5a6a9a, 0.3));
      const ca = amb(c, 0xb8a090, 0.22);
      p.rect(150, 150, 150, 60, ca); for (const x of [150, 268]) { p.rect(x, 108, 32, 100, ca); p.rect(x + 4, 96, 24, 12, ca); p.disc(x + 16, 96, 9, 9, ca); p.rect(x + 15, 80, 2, 10, ca); for (let y = 116; y < 196; y += 16) p.rect(x + 11, y, 10, 9, mix(ca, INK, 0.4)); }
      p.disc(225, 150, 30, 26, amb(c, 0xc8a070, 0.2)); p.rect(195, 150, 60, 20, ca); p.rect(222, 116, 6, 10, ca); p.rect(210, 172, 30, 38, mix(ca, INK, 0.35));
      // mid: flat-roofed colour blocks with rooftop tanks
      for (let x = -10; x < W;) { const w = r.int(40, 70), top = r.int(150, 176), b = amb(c, r.pick([0xe86a8a, 0x4ab0c8, 0xf0b040, 0x8a6ad0, 0x5ac878]), 0.12);
        p.rect(x, top, w, 60, b); p.rect(x, top, w, 2, mix(b, 0xffffff, 0.25)); if (r.next() < 0.5) { const tx = x + r.int(4, w - 14); p.rect(tx, top - 9, 10, 9, amb(c, 0x2a2a34, 0.1)); }
        for (let wy = top + 8; wy < 204; wy += 14) for (let wx = x + 6; wx < x + w - 8; wx += 14) { if (r.next() < litChance(c)) c.lights.push([wx, wy, 6, 8, 0xffd98a]); else p.rect(wx, wy, 6, 8, mix(b, INK, 0.45)); }
        x += w + r.int(0, 4); }
      // wall: brightly painted fronts, with strings of cut-paper bunting overhead
      for (let x = 0; x < W;) { const w = r.int(70, 120), col = amb(c, r.pick([0xe8457a, 0x2a9ad8, 0xf0b030, 0x3ab878, 0xf06a30, 0x7a5ad0]));
        p.rect(x, WALL_TOP, w, STREET_TOP - WALL_TOP, col); p.rect(x, WALL_TOP, w, 4, mix(col, 0xffffff, 0.35)); p.rect(x, STREET_TOP - 16, w, 16, mix(col, INK, 0.3)); p.rect(x + w - 1, WALL_TOP, 1, 96, mix(col, INK, 0.4));
        const dk = mix(col, INK, 0.6); p.rect(x + 12, WALL_TOP + 44, 22, 52, dk); p.rect(x + 14, WALL_TOP + 46, 18, 50, amb(c, 0x5a3a2a));
        if (w > 84) { p.rect(x + 46, WALL_TOP + 22, 28, 30, dk); if (r.next() < litChance(c) + 0.15) c.lights.push([x + 48, WALL_TOP + 24, 24, 26, 0xffc870]); else p.rect(x + 48, WALL_TOP + 24, 24, 26, amb(c, 0x3a5a7a)); for (let gx = x + 52; gx < x + 72; gx += 5) p.rect(gx, WALL_TOP + 24, 1, 26, dk); }
        x += w; }
      for (const [y0, sag] of [[WALL_TOP - 30, 16], [WALL_TOP - 12, 12], [WALL_TOP + 6, 9]]) for (let x = 0; x < W; x += 2) { const t = (x % 214) / 214, y = y0 + Math.round(Math.sin(t * Math.PI) * sag); p.set(x, y, INK); if (x % 12 === 0) { const col = amb(c, [0xff3d6e, 0xffd23f, 0x00d9ff, 0x3dff8f, 0xff7b00, 0xc86ae8][(x / 12) % 6]); p.rect(x, y + 1, 9, 8, col); p.rect(x + 2, y + 3, 2, 2, mix(col, INK, 0.5)); p.rect(x + 5, y + 5, 2, 2, mix(col, INK, 0.5)); for (let k = 0; k < 9; k += 2) p.set(x + k, y + 9, col); } }
      street(c, 0xb8a898, 0x44404a);
      flush(c);
      // spots: a run of market-stall awnings (grindable), a taco stand, crates to hop
      const ay = GROUND - 58; for (const [x, a] of [[150, 0xd62839], [262, 0x2a9d4f], [374, 0xf0a020]] as [number, number][]) { awning(c, x, ay, 104, a, 0xf5f5f5, 15); p.rect(x + 2, ay + 4, 2, 54, INK); p.rect(x + 100, ay + 4, 2, 54, INK); p.rect(x + 6, GROUND - 22, 92, 20, amb(c, 0x8a5a3a)); p.rect(x + 6, GROUND - 22, 92, 2, amb(c, 0xc89a6a)); for (let i = 0; i < 7; i++) p.disc(x + 14 + i * 12, GROUND - 25, 4, 3, amb(c, r.pick([0xff7b00, 0xd62839, 0x3ab04a, 0xffd23f]))); }
      skater(c, 310, ay, 'soul', 0);
      for (const [x, y] of [[40, 0], [58, 0], [49, -14]]) { const cr = amb(c, 0xa87a4a); p.rect(x, GROUND - 14 + y, 16, 14, INK); p.rect(x + 1, GROUND - 13 + y, 14, 12, cr); p.rect(x + 1, GROUND - 8 + y, 14, 1, mix(cr, INK, 0.4)); }
      const tx = 520; p.rect(tx, GROUND - 30, 70, 28, amb(c, 0xc8ccd8)); p.rect(tx, GROUND - 30, 70, 2, amb(c, 0xf5f5f5)); p.rect(tx + 6, GROUND - 2, 4, 2, INK); p.rect(tx + 60, GROUND - 2, 4, 2, INK); p.rect(tx + 30, GROUND - 62, 3, 32, amb(c, 0x8a8a9a)); p.disc(tx + 31, GROUND - 52, 7, 12, amb(c, 0xb85a2a));
      sign(c, tx + 35, GROUND - 92, 'TACOS', 0x3dff8f); if (c.time !== 'day') c.lights.push([tx + 4, GROUND - 68, 62, 2, 0xfff0a0]);
    },
  },
];

/** Switch on every light collected so far. Called before the street furniture is drawn, so lit windows stay behind it. */
function flush(c: Ctx): void {
  for (const [x, y, w, h, col] of c.lights) { c.p.rect(x, y, w, h, col); c.p.rect(x, y, w, 1, mix(col, 0xffffff, 0.5)); }
  c.lights.length = 0;
}

function render(city: City, time: Time, stage: string, seed = 5): Pix {
  const p = new Pix(W, H), c: Ctx = { p, r: new Rng(seed + city.id.length * 31), time, lights: [] };
  gradient(p, 0, WALL_TOP + 8, city.sky[time]);
  if (time === 'night') for (let i = 0; i < 110; i++) p.set(c.r.int(0, W), c.r.int(30, 150), c.r.next() < 0.25 ? 0xffffff : 0x9a8ad0);
  city.paint(c);
  flush(c);
  label(p, city, stage);
  return p;
}

fs.mkdirSync('docs/concept', { recursive: true });
const STAGE_TIME: [string, Time][] = [['STAGE 1', 'day'], ['STAGE 2', 'sunset'], ['STAGE 3', 'night']];
/** Which stage each city is shown at in its hero shot, so the set shows off all three times of day. */
const HERO: Record<string, number> = { 'new-york': 2, austin: 1, barcelona: 0, sydney: 0, 'mexico-city': 1 };
for (const city of CITIES) { const [stage, time] = STAGE_TIME[HERO[city.id]]; writePng(`docs/concept/city-${city.id}.png`, render(city, time, stage), 2); }
// one city across its three stages, side by side
const strip = new Pix(W * 3 + 8, H);
STAGE_TIME.forEach(([stage, time], i) => strip.blit(render(CITIES[1], time, stage), i * (W + 4), 0));
writePng('docs/concept/city-stages.png', strip, 1, INK);
// all five on one sheet
const sheet = new Pix(W, H * CITIES.length + (CITIES.length - 1) * 4);
CITIES.forEach((city, i) => { const [stage, time] = STAGE_TIME[HERO[city.id]]; sheet.blit(render(city, time, stage), 0, i * (H + 4)); });
writePng('docs/concept/cities.png', sheet, 1, INK);
console.log(`docs/concept/city-{${CITIES.map(c => c.id).join(',')}}.png, docs/concept/city-stages.png, docs/concept/cities.png`);

// ---- terrain concepts (docs/TERRAIN.md) ---------------------------------------------------------------------------
/** A street whose surface follows `gy(x)` (art px above the normal street line; negative = lower). */
function terrain(title: string, sub: string, gy: (x: number) => number, props: (c: Ctx, feet: (x: number) => number) => void, pit?: [number, number]): Pix {
  const p = new Pix(W, H), c: Ctx = { p, r: new Rng(title.length * 13 + 3), time: 'sunset', lights: [] };
  gradient(p, 0, WALL_TOP + 60, [[0, 0x3a2a7a], [0.5, 0xd8556a], [1, 0xffb060]]);
  row(c, 96, 150, [0x5a4a86, 0x6a4f7c, 0x4a3f78], 0.25, 28, 58);
  const wallC = amb(c, 0x7a4a52), pave = amb(c, 0x9a9aac), road = amb(c, 0x3a3a48);
  for (let x = 0; x < W; x++) {
    const inPit = pit && x >= pit[0] && x < pit[1], top = STREET_TOP - Math.round(gy(x));
    for (let y = WALL_TOP; y < (inPit ? H : top); y++) p.set(x, y, (y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 6) % 12 === 0) ? mix(wallC, INK, 0.3) : wallC);
    if (inPit) { for (let y = top + 2; y < H; y++) p.set(x, y, mix(INK, 0x000000, 0.3)); continue; }
    for (let y = top; y < top + 13; y++) p.set(x, y, y === top ? mix(pave, 0xffffff, 0.35) : x % 44 === 0 ? mix(pave, INK, 0.25) : pave);
    p.set(x, top + 13, mix(pave, INK, 0.5)); p.set(x, top + 14, mix(pave, INK, 0.5));
    for (let y = top + 15; y < H; y++) p.set(x, y, (x * 7 + y * 13) % 37 === 0 ? mix(road, 0xffffff, 0.12) : road);
    if (x % 64 < 30) for (let y = top + 41; y < top + 44; y++) p.set(x, y, amb(c, 0xe8c840));
  }
  p.rect(0, WALL_TOP, W, 3, mix(wallC, INK, 0.4));
  flush(c);
  props(c, x => GROUND - Math.round(gy(x)));
  p.rect(0, 0, W, 30, mix(INK, 0x000000, 0.2));
  const x = text(p, 10, 6, title, 3, 0xffd23f); text(p, x + 10, 13, sub, 1, 0xf5f5f5); text(p, W - textW('CONCEPT ART', 1) - 10, 13, 'CONCEPT ART', 1, 0xff3d6e);
  return p;
}
/** A handrail between two points (for stairs and slopes). */
function slopeRail(c: Ctx, x1: number, y1: number, x2: number, y2: number, footAt: (x: number) => number): void {
  const s = ramp(amb(c, 0xc8d0dc));
  for (let x = x1 + 6; x < x2; x += 34) { const y = y1 + ((y2 - y1) * (x - x1)) / (x2 - x1); c.p.rect(x, y + 2, 2, footAt(x) - y - 2, s[0]); }
  for (let i = -1; i <= 3; i++) c.p.line(x1, y1 + i, x2, y2 + i, i < 0 || i > 2 ? INK : s[2 - i]);
}
const arrow = (c: Ctx, x1: number, y1: number, x2: number, y2: number, col: number) => { for (let i = 0; i < 1; i += 0.06) c.p.rect(x1 + (x2 - x1) * i, y1 + (y2 - y1) * i, 3, 2, col); c.p.poly([[x2 + 8, y2], [x2 - 2, y2 - 6], [x2 - 2, y2 + 6]], col); };

const clampT = (t: number) => Math.max(0, Math.min(1, t));
const TERRAIN: [string, Pix][] = [
  ['slopes', terrain('1 SLOPES', 'DOWNHILL BUILDS SPEED · UPHILL SPENDS IT', x => 34 - 60 * clampT((x - 110) / 250) + 44 * clampT((x - 430) / 170), (c, feet) => {
    skater(c, 200, feet(200), 'roll1', 1);
    for (let i = 0; i < 4; i++) c.p.rect(150 - i * 14, feet(200) - 26 - i * 3, 9, 1, 0xf5f5f5);                                  // speed lines
    arrow(c, 250, feet(250) - 44, 330, feet(330) - 44, 0x3dff8f); text(c.p, 262, feet(250) - 62, 'FASTER', 1, 0x3dff8f);
    arrow(c, 450, feet(450) - 40, 540, feet(540) - 40, 0xff7b00); text(c.p, 462, feet(450) - 58, 'SLOWER', 1, 0xff7b00);
    ledge(c, 372, 50, 12, 0xb8b0c0);
  })],
  ['stairs', terrain('2 STAIRS', 'GRIND THE HANDRAIL OR JUMP THE SET · ROLLING DOWN THEM SLAMS', x => (x < 250 ? 36 : x < 370 ? 36 - 12 * Math.ceil((x - 249) / 30) : -12), (c, feet) => {
    slopeRail(c, 246, feet(240) - 26, 376, feet(380) - 26, feet);
    skater(c, 300, feet(240) - 26 + ((feet(380) - feet(240)) * (300 - 246)) / 130, 'soul', 0);
    for (let i = 0; i < 12; i++) c.p.rect(170 + i * 20, feet(240) - 60 - Math.round(Math.sin((i / 11) * Math.PI) * 30) + i * 3, 4, 2, 0x00d9ff);   // the jump line
    text(c.p, 196, feet(240) - 110, 'OR JUMP IT', 1, 0x00d9ff);
    text(c.p, 388, feet(300) - 6, 'ROLL DOWN THE STEPS AND YOU SLAM', 1, 0xff3d6e);
  })],
  ['plaza', terrain('3 PLAZA', 'A RAISED DECK FURTHER BACK · HIGH ROAD OR LOW ROAD', () => 0, (c, feet) => {
    const s = ramp(amb(c, 0xb0a8c0)), top = feet(0) - 40;                                                                          // the deck sits at the wall, behind the street
    c.p.rect(199, top - 1, 322, 36, INK); c.p.rect(200, top, 320, 34, mix(s[1], 0x1e1238, 0.2)); c.p.rect(200, top, 320, 3, s[2]);
    for (let x = 200; x < 520; x += 40) c.p.rect(x, top + 3, 1, 31, mix(s[0], INK, 0.3));
    for (let i = 0; i < 3; i++) { c.p.rect(170 + i * 10, top + 34 - (i + 1) * 11, 30 - i * 10 + 1, 11, mix(s[1], 0x1e1238, 0.2)); c.p.rect(170 + i * 10, top + 34 - (i + 1) * 11, 30 - i * 10 + 1, 1, s[2]); }
    c.p.rect(300, top - 12, 150, 12, INK); c.p.rect(301, top - 11, 148, 10, amb(c, 0xdcd8e8)); c.p.rect(301, top - 11, 148, 2, 0xf5f5f5);   // a ledge on the deck
    skater(c, 380, top - 12, 'makio', 2);
    text(c.p, 250, top - 44, 'HIGH ROAD', 1, 0xffd23f);
    for (const x of [300, 370, 440]) { const hy = ramp(amb(c, 0xff7b00)); c.p.poly([[x, feet(x)], [x + 5, feet(x) - 12], [x + 10, feet(x)]], hy[1]); c.p.rect(x - 1, feet(x) - 2, 12, 2, hy[0]); }
    skater(c, 250, feet(250), 'roll2', 3); text(c.p, 540, feet(0) + 26, 'LOW ROAD', 1, 0xf5f5f5);
  })],
  ['gap', terrain('4 GAP', 'CLEAR IT OR TAKE THE RAIL ACROSS · FALLING IN COSTS A LIFE', () => 0, (c, feet) => {
    for (const x of [262, 380]) { c.p.rect(x - 6, feet(x) - 20, 4, 20, amb(c, 0xff7b00)); c.p.rect(x - 12, feet(x) - 20, 16, 5, amb(c, 0xf5f5f5)); c.p.rect(x - 12, feet(x) - 18, 16, 1, amb(c, 0xff7b00)); }
    for (let i = 0; i < 13; i++) c.p.rect(200 + i * 20, feet(0) - 34 - Math.round(Math.sin((i / 12) * Math.PI) * 44), 4, 2, 0x00d9ff);
    skater(c, 320, feet(0) - 78, 'mute', 1);
    text(c.p, 286, 338, 'TRENCH', 1, 0xff3d6e);
  }, [270, 372])],
];
for (const [id, pix] of TERRAIN) writePng(`docs/concept/terrain-${id}.png`, pix, 2);
const tsheet = new Pix(W * 2 + 4, H * 2 + 4);
TERRAIN.forEach(([, pix], i) => tsheet.blit(pix, (i % 2) * (W + 4), Math.floor(i / 2) * (H + 4)));
writePng('docs/concept/terrain.png', tsheet, 1, INK);
console.log(`docs/concept/terrain-{${TERRAIN.map(t => t[0]).join(',')}}.png, docs/concept/terrain.png`);
