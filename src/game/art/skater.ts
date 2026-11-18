import type { SkaterDef } from '../../core/skaters';
import { INK, Pix, dim, mix, ramp, type Ramp } from './pixel';

/** Skin gets a gentler ramp than cloth so faces don't go muddy. */
const skinRamp = (c: number): Ramp => { const r = ramp(c); return [mix(c, r[0], 0.55), c, mix(c, r[2], 0.6)]; };

/** Frame size and the pixel the feet stand on. */
export const FRAME = 72, OX = 34, GY = 69;

type Foot = [x: number, y: number, pitch?: number, view?: 'side' | 'front'];
/**
 * A pose is authored as targets, not joint angles: where the hips are, where each skate's
 * sole is, where each hand is. Knees and elbows are solved by IK. Units are sprite pixels,
 * x forward from the body centre, y UP from the ground. Skater faces right.
 */
export interface Pose {
  hip: [number, number];
  lean: number;            // torso tilt in degrees, + = forward
  footF: Foot; footB: Foot; // F = near-side limb (drawn on top), B = far side
  handF: [number, number]; handB: [number, number];
  head?: number;           // extra head tilt, degrees
}

export const POSES = {
  // rolling stride
  roll0: { hip: [-1, 29], lean: 12, footF: [5, 0], footB: [-6, 0], handF: [9, 33], handB: [-8, 32] },
  roll1: { hip: [0, 29], lean: 16, footF: [4, 0], footB: [-10, 2, -18], handF: [11, 36], handB: [-9, 29] },
  roll2: { hip: [1, 30], lean: 19, footF: [3, 0], footB: [-13, 5, -32], handF: [12, 38], handB: [-10, 27] },
  roll3: { hip: [0, 30], lean: 13, footF: [4, 0], footB: [-7, 3, -10], handF: [9, 34], handB: [-7, 31] },
  // air
  jump: { hip: [0, 27], lean: 14, footF: [6, 7, 12], footB: [-4, 8, -6], handF: [10, 46], handB: [-7, 44] },
  fall: { hip: [0, 31], lean: 6, footF: [5, 1, -12], footB: [-5, 2, -6], handF: [12, 40], handB: [-11, 41] },
  land: { hip: [-2, 22], lean: 30, footF: [6, 0], footB: [-6, 0], handF: [11, 24], handB: [-9, 28] },
  mute: { hip: [0, 26], lean: 24, footF: [7, 9, 18], footB: [-3, 9, -4], handF: [8, 18], handB: [-9, 46], head: -8 },
  safety: { hip: [0, 26], lean: 8, footF: [3, 9, 6], footB: [-3, 10, -4], handF: [1, 17], handB: [-11, 44] },
  rocket: { hip: [-5, 22], lean: 38, footF: [15, 15, 62], footB: [12, 18, 62], handF: [17, 27], handB: [14, 29], head: -18 },
  liukang: { hip: [-2, 24], lean: 12, footF: [15, 19, 55], footB: [-2, 9, -8], handF: [-1, 18], handB: [-11, 42] },
  // grinds (sole y=0 is the rail)
  frontside: { hip: [0, 24], lean: 4, footF: [8, 0, 0, 'front'], footB: [-8, 0, 0, 'front'], handF: [13, 35], handB: [-13, 35] },
  soul: { hip: [-1, 23], lean: 10, footF: [9, 0, 0, 'front'], footB: [-6, 0], handF: [12, 33], handB: [-11, 36] },
  makio: { hip: [0, 25], lean: 8, footF: [8, 13, 22], footB: [-1, 0], handF: [8, 22], handB: [-12, 37] },
  mizou: { hip: [1, 23], lean: 6, footF: [6, 0], footB: [-8, 0, 0, 'front'], handF: [6, 42], handB: [-13, 31] },
  royale: { hip: [-3, 23], lean: -8, footF: [9, 0, 0, 'front'], footB: [-7, 0, 24, 'front'], handF: [10, 37], handB: [-14, 33] },
  backslide: { hip: [-2, 24], lean: -4, footF: [9, 14, 30], footB: [-3, 0, 0, 'front'], handF: [10, 23], handB: [-13, 37] },
  topsoul: { hip: [0, 21], lean: 24, footF: [9, 0, 0, 'front'], footB: [-6, 1, -22], handF: [14, 29], handB: [-9, 35] },
  fishbrain: { hip: [0, 23], lean: 20, footF: [9, 12, 26], footB: [-1, 1, -20], handF: [10, 21], handB: [-10, 39] },
  unity: { hip: [0, 23], lean: 0, footF: [-5, 0, 0, 'front'], footB: [6, 0, 0, 'front'], handF: [13, 35], handB: [-13, 35] },
  // bails
  bail0: { hip: [0, 28], lean: -28, footF: [9, 12, 40], footB: [-6, 5, -30], handF: [5, 50], handB: [-13, 40], head: -15 },
  bail1: { hip: [-3, 7], lean: -72, footF: [13, 4, 55], footB: [10, 0, 15], handF: [-4, 3], handB: [-15, 9], head: 20 },
} satisfies Record<string, Pose>;
export type PoseName = keyof typeof POSES;
export const POSE_NAMES = Object.keys(POSES) as PoseName[];

const THIGH = 9, SHIN = 9, TORSO = 13, UARM = 7, FARM = 6;
const rad = (d: number) => (d * Math.PI) / 180;

/** 2-bone IK. Returns the middle joint; `fwd` picks which way it bends. */
function ik(ax: number, ay: number, bx: number, by: number, l1: number, l2: number, fwd: boolean): [number, number, number, number] {
  let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.2;
  if (d > max) { bx = ax + (dx / d) * max; by = ay + (dy / d) * max; dx = bx - ax; dy = by - ay; d = max; }
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const mx = ax + (dx * a) / d, my = ay + (dy * a) / d;
  const k1: [number, number] = [mx + (h * dy) / d, my - (h * dx) / d], k2: [number, number] = [mx - (h * dy) / d, my + (h * dx) / d];
  const k = (k1[0] > k2[0]) === fwd ? k1 : k2;
  return [k[0], k[1], bx, by];
}

/** Aggressive skate: chunky boot, cuff, soul plate, flat frame, four small wheels. */
function skate(p: Pix, sx: number, sy: number, pitch: number, view: 'side' | 'front', boot: Ramp, wheel: number): [number, number] {
  const c = Math.cos(rad(pitch)), s = Math.sin(rad(pitch));
  const T = (lx: number, ly: number): [number, number] => [sx + lx * c - ly * s, sy - (lx * s + ly * c)];
  const P = (pts: number[][], col: number) => p.poly(pts.map(q => T(q[0], q[1])), col);
  const frame = 0x4a4a5c, plate = mix(boot[0], INK, 0.35);
  if (view === 'front') {
    P([[-1.5, 0], [1.5, 0], [1.5, 3.6], [-1.5, 3.6]], wheel);
    P([[-2, 3.4], [2, 3.4], [2, 4.8], [-2, 4.8]], frame);
    P([[-5, 4.6], [5, 4.6], [5, 6.2], [-5, 6.2]], plate);
    P([[-4, 6], [4, 6], [4, 11], [3, 13.5], [-3, 13.5], [-4, 11]], boot[1]);
    P([[-4, 6], [-2, 6], [-2, 13], [-3, 13.5], [-4, 11]], boot[2]);
    P([[2.5, 6], [4, 6], [4, 11], [3, 13.5], [2.5, 13]], boot[0]);
    P([[-4, 9.3], [4, 9.3], [4, 10.5], [-4, 10.5]], wheel);
    return T(0, 11.5);
  }
  for (const wx of [-5.2, -1.8, 1.8, 5.2]) { const [x, y] = T(wx, 1.7); p.disc(x, y, 1.8, 1.8, wheel); p.set(x, y, INK); }
  P([[-6.8, 2.6], [6.8, 2.6], [6.2, 4.4], [-6.2, 4.4]], frame);
  P([[-7, 4.2], [8, 4.2], [8.4, 5.8], [-7, 5.8]], plate);
  P([[-6, 5.6], [8, 5.6], [8.2, 7.2], [5.5, 9], [1, 9.6], [0, 13.6], [-6, 13.2]], boot[1]);
  P([[-6, 11.2], [-0.4, 11.8], [0, 13.6], [-6, 13.2]], boot[2]);          // cuff top
  P([[3.5, 8.6], [8.2, 7.2], [8, 5.8], [5, 5.8]], boot[2]);                // toe cap
  P([[-6, 5.6], [2, 5.6], [2, 6.8], [-6, 6.8]], boot[0]);                  // sole shadow
  P([[-5.5, 9.4], [1, 9.2], [1, 10.4], [-5.5, 10.6]], wheel);              // buckle strap
  return T(-2.6, 11.5);
}

function head(p: Pix, cx: number, cy: number, sk: SkaterDef): void {
  const skin = skinRamp(sk.colors.skin), hair = ramp(sk.colors.hair), look = sk.look.head;
  if (look === 'puffs') { p.disc(cx - 6, cy - 5.5, 4.6, 4.6, hair); p.disc(cx + 0.5, cy - 8, 4.4, 4.2, hair); }
  if (look === 'mohawk') for (let i = 0; i < 5; i++) {
    const bx = cx + 4 - i * 2.8, by = cy - 5.5 + Math.abs(i - 1.5) * 0.9;
    p.poly([[bx - 1.8, by + 1.5], [bx + 1.8, by + 1.5], [bx - 0.8, by - 5.5]], i % 2 ? hair[1] : hair[2]);
  }
  p.disc(cx, cy, 6.6, 7, skin);
  p.set(cx + 6, cy + 1, skin[1]); p.set(cx + 7, cy + 1, skin[2]); p.set(cx + 6, cy + 2, skin[0]);       // nose
  p.rect(cx - 3, cy, 2, 3, skin[0]);                                                                     // ear
  p.rect(cx + 2, cy - 2, 3, 2, 0xffffff); p.rect(cx + 4, cy - 2, 1, 2, INK); p.rect(cx + 1, cy - 3, 5, 1, INK);  // eye + brow
  p.rect(cx + 3, cy + 4, 3, 1, mix(skin[0], INK, 0.5));                                                 // mouth
  if (look === 'beanie') {
    for (let y = -8; y <= -2; y++) for (let x = -7; x <= 7; x++) {
      const nx = x / 7, ny = (y + 1) / 7.6;
      if (nx * nx + ny * ny <= 1) p.set(cx + x, cy + y, y >= -3 ? hair[0] : nx * -0.55 + ny * -0.83 > 0.5 ? hair[2] : hair[1]);
    }
    p.rect(cx - 6, cy - 3, 13, 1, hair[2]);
    p.disc(cx - 1, cy - 9.5, 2, 2, hair);
  } else if (look === 'cap') {
    for (let y = -8; y <= -3; y++) for (let x = -7; x <= 6; x++) {
      const nx = x / 7, ny = y / 7.6;
      if (nx * nx + ny * ny <= 1) p.set(cx + x, cy + y, nx * -0.55 + ny * -0.83 > 0.55 ? hair[2] : hair[1]);
    }
    p.poly([[cx - 6, cy - 4], [cx - 12, cy - 2], [cx - 12, cy - 0.5], [cx - 6, cy - 2]], hair[0]);       // brim, worn backwards
    p.rect(cx + 2, cy - 4, 4, 1, mix(sk.colors.skin, INK, 0.6));                                         // fringe
  } else if (look === 'puffs') {
    for (let x = -6; x <= 4; x++) for (let y = -7; y <= -4; y++) { const nx = x / 6.6, ny = y / 7; if (nx * nx + ny * ny <= 1 && y < -4 + (x < 0 ? 2 : 0)) p.set(cx + x, cy + y, hair[1]); }
  } else if (look === 'mohawk') {
    p.rect(cx - 5, cy - 2, 4, 1, mix(sk.colors.skin, INK, 0.25));
  }
}

/** Render one pose of one skater into a FRAME×FRAME sprite. */
export function drawSkater(sk: SkaterDef, pose: Pose): Pix {
  const p = new Pix(FRAME, FRAME), C = sk.colors;
  const top = ramp(C.top), pants = ramp(C.pants), skin = skinRamp(C.skin), boot = ramp(C.skate);
  const X = (x: number) => OX + x, Y = (y: number) => GY - y;
  const hx = X(pose.hip[0]), hy = Y(pose.hip[1]);
  const sx = hx + Math.sin(rad(pose.lean)) * TORSO, sy = hy - Math.cos(rad(pose.lean)) * TORSO;
  const ha = rad(pose.lean * 0.6 + (pose.head ?? 0));
  const hcx = sx + Math.sin(ha) * 8 + 1, hcy = sy - Math.cos(ha) * 8;

  const leg = (f: Foot, far: boolean) => {
    const pr = far ? dim(pants) : pants, br = far ? dim(boot) : boot, sr = far ? dim(skin) : skin;
    const wheel = far ? mix(C.wheel, INK, 0.3) : C.wheel, off = far ? 1.5 : -1;
    let ankle: [number, number] = [0, 0];
    p.part(q => { ankle = skate(q, X(f[0]), Y(f[1]), f[2] ?? 0, f[3] ?? 'side', br, wheel); });
    const [kx, ky, ax, ay] = ik(hx + off, hy, ankle[0], ankle[1], THIGH, SHIN, true);
    p.part(q => {
      if (sk.look.legs === 'shorts') {
        q.capsule(kx, ky, ax, ay, 2.3, 2.1, sr);
        q.capsule(ax, ay - 1, ax, ay + 0.5, 2.6, 2.6, 0xf5f5f5);                 // sock
        q.capsule(hx + off, hy, kx + (hx - kx) * 0.12, ky + (hy - ky) * 0.12, 4, 3.6, pr);
      } else {
        q.capsule(hx + off, hy, kx, ky, 3.9, 3.3, pr);
        q.capsule(kx, ky, ax, ay, 3.2, 4, pr);                                   // baggy cuff flares over the boot
      }
    });
  };
  const arm = (h: [number, number], far: boolean) => {
    const tr = far ? dim(top) : top, sr = far ? dim(skin) : skin, off = far ? 1.5 : -1.5;
    const [ex, ey, wx, wy] = ik(sx + off, sy + 1.5, X(h[0]), Y(h[1]), UARM, FARM, false);
    p.part(q => {
      q.capsule(ex, ey, wx, wy, 2.2, 2, sk.look.sleeves === 'long' ? tr : sr);
      q.capsule(sx + off, sy + 1.5, ex, ey, 2.8, 2.4, tr);
      q.disc(wx, wy, 2.5, 2.5, sr);
    });
  };

  arm(pose.handB, true);
  leg(pose.footB, true);
  p.part(q => {
    q.capsule(hx, hy, sx, sy, 4.6, 5.6, top);
    // hem + a chest stripe so the torso isn't a blank blob
    const nx = -Math.cos(rad(pose.lean)), ny = -Math.sin(rad(pose.lean));
    for (let t = -6; t <= 6; t += 0.5) {
      const bx = hx + nx * t, by = hy + ny * t; if (q.get(bx | 0, by | 0) !== -1) q.set(bx, by, top[0]);
      const cx = hx + (sx - hx) * 0.62 + nx * t, cy = hy + (sy - hy) * 0.62 + ny * t; if (q.get(cx | 0, cy | 0) !== -1) q.set(cx, cy, C.hair);
    }
  });
  p.part(q => head(q, Math.round(hcx), Math.round(hcy), sk));
  leg(pose.footF, false);
  arm(pose.handF, false);
  return p;
}
