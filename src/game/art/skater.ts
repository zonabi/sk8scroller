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
  stale: { hip: [0, 26], lean: 2, footF: [4, 9, 8], footB: [-5, 11, -10], handF: [10, 43], handB: [-6, 14], head: -6 },
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
function skate(p: Pix, sx: number, sy: number, pitch: number, view: 'side' | 'front', boot: Ramp, wheel: number, xs = 1): [number, number] {
  const c = Math.cos(rad(pitch)), s = Math.sin(rad(pitch));
  // xs squashes/flips the skate along its length: used by the turnaround frames
  const T = (lx: number, ly: number): [number, number] => [sx + lx * xs * c - ly * s, sy - (lx * xs * s + ly * c)];
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

/** Number of turnaround frames for spins (360° / SPIN_FRAMES per frame). */
export const SPIN_FRAMES = 8;

type V = [number, number, number];
/**
 * A pose in 3D for views the side-on rig can't do: turnarounds, and rolling fakie where the hips
 * face one way and the head looks back the other. Coordinates are body-local: x forward (the way
 * the hips face), y up from the ground, z toward the skater's near side. `yaw` turns the whole
 * body about the vertical axis (0 = facing right, 90 = back to camera, 180 = facing left,
 * 270 = facing camera); `torsoYaw` and `headYaw` twist the shoulders and head independently.
 * Index 0 of legs/arms is the near (+z) limb.
 */
export interface Pose3 {
  yaw: number; torsoYaw?: number; headYaw?: number;
  hip: [number, number]; chest: [number, number]; head: [number, number];
  legs: [{ knee: V; foot: V; pitch?: number }, { knee: V; foot: V; pitch?: number }];
  arms: [{ elbow: V; hand: V }, { elbow: V; hand: V }];
}
const TUCK: Omit<Pose3, 'yaw'> = {
  hip: [0, 27], chest: [2, 39], head: [3, 48],
  legs: [{ knee: [7, 20, 5.5], foot: [4, 8, 4.5], pitch: 10 }, { knee: [5, 21, -5.5], foot: [-2, 10, -4.5], pitch: 10 }],
  arms: [{ elbow: [1, 31, 8.5], hand: [7, 32, 6] }, { elbow: [1, 31, -8.5], hand: [7, 32, -6] }],
};
/** Turnaround frame for spins: the tucked pose at a given yaw. This is what makes a 360 read as a body turning. */
export const drawSpin = (sk: SkaterDef, yawDeg: number): Pix => drawPose3(sk, { ...TUCK, yaw: yawDeg });

/**
 * Rolling fakie (backwards, still travelling right): hips face left, deep seated crouch with the
 * hips pushed back toward the direction of travel, shoulders opened toward the camera, head turned
 * to look over the shoulder at where you're going, hands low in front for balance. Four frames of
 * the feet scissoring, as in a backward stride.
 */
export const FAKIE_FRAMES = 4;
export function drawFakie(sk: SkaterDef, frame: number): Pix {
  const f = [4, 1.5, -4, -1.5][frame % 4], up = frame % 2 ? 1 : 0, sway = frame % 2 ? 0 : (frame === 0 ? 1 : -1);
  return drawPose3(sk, {
    yaw: 180, torsoYaw: 222, headYaw: 318,
    hip: [-5, 23 + up], chest: [2.5 + sway * 0.5, 34 + up], head: [3.5, 43 + up],
    legs: [{ knee: [6 + f * 0.25, 19 + up, 5], foot: [1 + f, 0, 4.5], pitch: 0 }, { knee: [6 - f * 0.25, 19 + up, -5], foot: [1 - f, 0, -4.5], pitch: 0 }],
    arms: [{ elbow: [6, 28 + up, 8], hand: [11, 25 + up + sway, 7] }, { elbow: [4, 28 + up, -8.5], hand: [9, 24 + up - sway, -8] }],
  });
}

/** Renders a Pose3: every part is projected, then drawn back-to-front. */
export function drawPose3(sk: SkaterDef, P: Pose3): Pix {
  const yawDeg = P.yaw, tYaw = P.torsoYaw ?? P.yaw, hYaw = P.headYaw ?? tYaw;
  const p = new Pix(FRAME, FRAME), C = sk.colors, cy = Math.cos(rad(yawDeg)), sy = Math.sin(rad(yawDeg));
  const top = ramp(C.top), pants = ramp(C.pants), skin = skinRamp(C.skin), boot = ramp(C.skate), hair = ramp(C.hair);
  /** model (x fwd, y up, z toward camera) → [screen x, screen y, depth] */
  const R = (v: V): V => [OX + v[0] * cy + v[2] * sy, GY - v[1], -v[0] * sy + v[2] * cy];
  // the torso can be twisted relative to the hips: rotate about the chest instead
  const ct = Math.cos(rad(tYaw)), st = Math.sin(rad(tYaw)), chestW = R([P.chest[0], P.chest[1], 0]);
  const RT = (v: V): V => tYaw === yawDeg ? R(v) : [chestW[0] + (v[0] - P.chest[0]) * ct + v[2] * st, GY - v[1], chestW[2] - (v[0] - P.chest[0]) * st + v[2] * ct];
  const side = Math.abs(cy), front = Math.abs(st);
  const parts: { z: number; draw: () => void }[] = [];
  const shade = <T extends Ramp>(r: T, z: number): Ramp => (z < -1.5 ? dim(r) : r);

  const hip = R([P.hip[0], P.hip[1], 0]), sh = chestW, hd = RT([P.head[0], P.head[1], 0]);
  parts.push({ z: 0, draw: () => p.part(q => {
    q.capsule(hip[0], hip[1], sh[0], sh[1], 4.6 + front * 1.2, 5.6 + front * 1.6, top);
    for (let t = -8; t <= 8; t += 0.5) { const y = hip[1] + (sh[1] - hip[1]) * 0.62; if (q.get((sh[0] + t) | 0, y | 0) !== -1) q.set(sh[0] + t, y, C.hair); }
  }) });

  for (const s of [1, -1]) {
    const L = P.legs[s > 0 ? 0 : 1], A = P.arms[s > 0 ? 0 : 1];
    const hj = R([P.hip[0], P.hip[1], 3 * s]), kn = R(L.knee), ft = R(L.foot);
    const zl = (kn[2] + ft[2]) / 2;
    parts.push({ z: zl + (s > 0 ? 0.01 : 0), draw: () => {
      let ankle: [number, number] = [0, 0];
      const far = zl < -1.5, pitch = L.pitch ?? 0;
      p.part(q => {
        ankle = side > 0.5
          ? skate(q, ft[0], ft[1], cy > 0 ? pitch : -pitch, 'side', far ? dim(boot) : boot, far ? mix(C.wheel, INK, 0.3) : C.wheel, Math.sign(cy) * Math.max(0.62, side))
          : skate(q, ft[0], ft[1], 0, 'front', far ? dim(boot) : boot, far ? mix(C.wheel, INK, 0.3) : C.wheel);
      });
      p.part(q => {
        const pr = shade(pants, zl), sr = shade(skin, zl);
        if (sk.look.legs === 'shorts') { q.capsule(kn[0], kn[1], ankle[0], ankle[1], 2.3, 2.1, sr); q.capsule(ankle[0], ankle[1] - 1, ankle[0], ankle[1] + 0.5, 2.6, 2.6, 0xf5f5f5); q.capsule(hj[0], hj[1], kn[0] + (hj[0] - kn[0]) * 0.12, kn[1] + (hj[1] - kn[1]) * 0.12, 4, 3.6, pr); }
        else { q.capsule(hj[0], hj[1], kn[0], kn[1], 3.9, 3.3, pr); q.capsule(kn[0], kn[1], ankle[0], ankle[1], 3.2, 4, pr); }
      });
    } });
    const sj = RT([P.chest[0], P.chest[1] - 1, 5.8 * s]), el = RT(A.elbow), ha = RT(A.hand);
    const za = (el[2] + ha[2]) / 2;
    parts.push({ z: za + (s > 0 ? 0.02 : 0), draw: () => p.part(q => {
      const tr = shade(top, za), sr = shade(skin, za);
      q.capsule(el[0], el[1], ha[0], ha[1], 2.2, 2, sk.look.sleeves === 'long' ? tr : sr);
      q.capsule(sj[0], sj[1], el[0], el[1], 2.8, 2.4, tr);
      q.disc(ha[0], ha[1], 2.5, 2.5, sr);
    }) });
  }

  parts.push({ z: 0.5, draw: () => p.part(q => {
    // the head has its own yaw; inside this block cy/sy/side mean the HEAD's
    const cy = Math.cos(rad(hYaw)), sy = Math.sin(rad(hYaw)), side = Math.abs(cy);
    const hx = Math.round(hd[0]), hy = Math.round(hd[1]), look = sk.look.head;
    const faceZ = -sy;                      // +1 facing camera, -1 facing away
    const pt = (x: number, y: number, z: number): V => [hx + x * cy + z * sy, hy - y, -x * sy + z * cy];
    if (look === 'puffs') for (const s of [-1, 1]) { const u = pt(-3, 7, 5 * s); q.disc(u[0], u[1], 4.4, 4.4, shade(hair, u[2])); }
    if (look === 'mohawk') for (let i = 0; i < 5; i++) {
      const u = pt(4 - i * 2.8, 5.5 - Math.abs(i - 1.5) * 0.9, 0);
      q.poly([[u[0] - 1.8, u[1] + 1.5], [u[0] + 1.8, u[1] + 1.5], [u[0] - 0.8 * cy, u[1] - 5.5]], i % 2 ? hair[1] : hair[2]);
    }
    q.disc(hx, hy, 6.6, 7, skin);
    // back of the head: hair or headwear wraps round
    if (faceZ < -0.3 && look === 'puffs') for (let y = -7; y <= 2; y++) for (let x = -7; x <= 7; x++) { const nx = x / 6.6, ny = y / 7; if (nx * nx + ny * ny <= 1) q.set(hx + x, hy + y, x * -0.55 + y * -0.83 > 3 ? hair[2] : y > 0 ? hair[0] : hair[1]); }
    // face features, each placed by projecting its position on the head
    for (const s of [1, -1]) {
      const e = pt(5.6, 1, 2.6 * s);
      if (e[2] > 0.8) { const ex = Math.round(e[0]) - 1, ey = Math.round(e[1]) - 1; q.rect(ex, ey, 2, 2, 0xffffff); q.set(ex + (cy > 0.3 ? 1 : cy < -0.3 ? 0 : s > 0 ? 0 : 1), ey, INK); q.set(ex + (cy > 0.3 ? 1 : cy < -0.3 ? 0 : s > 0 ? 0 : 1), ey + 1, INK); q.rect(ex - 1, ey - 1, 4, 1, INK); }
    }
    const nose = pt(6.8, -1, 0), mouth = pt(5.6, -4, 0);
    if (side > 0.4) { q.set(nose[0], nose[1], skin[1]); q.set(nose[0] + Math.sign(cy), nose[1], skin[2]); }
    else if (faceZ > 0) q.rect(hx, hy + 1, 1, 2, skin[0]);
    if (mouth[2] > -1.5 || side > 0.6) q.rect(Math.round(mouth[0]) - 1, mouth[1], 3, 1, mix(skin[0], INK, 0.5));
    if (side > 0.5) { const ear = pt(-2, -1, 0); q.rect(Math.round(ear[0]) - 1, ear[1], 2, 3, skin[0]); }
    // headwear
    if (look === 'beanie') {
      for (let y = -8; y <= -2; y++) for (let x = -7; x <= 7; x++) { const nx = x / 7, ny = (y + 1) / 7.6; if (nx * nx + ny * ny <= 1) q.set(hx + x, hy + y, y >= -3 ? hair[0] : nx * -0.55 + ny * -0.83 > 0.5 ? hair[2] : hair[1]); }
      q.rect(hx - 6, hy - 3, 13, 1, hair[2]); q.disc(hx - cy, hy - 9.5, 2, 2, hair);
    } else if (look === 'cap') {
      for (let y = -8; y <= -3; y++) for (let x = -7; x <= 6; x++) { const nx = x / 7, ny = y / 7.6; if (nx * nx + ny * ny <= 1) q.set(hx + x, hy + y, nx * -0.55 + ny * -0.83 > 0.55 ? hair[2] : hair[1]); }
      const b = pt(-11, 1.5, 0);                                                    // brim, worn backwards
      if (side > 0.4) q.poly([[hx - 6 * cy, hy - 4], [b[0], hy - 2], [b[0], hy - 0.5], [hx - 6 * cy, hy - 2]], hair[0]);
      else if (faceZ < 0) q.rect(hx - 5, hy - 3, 10, 3, hair[0]);
    } else if (look === 'puffs' && faceZ > -0.3) {
      for (let x = -6; x <= 6; x++) for (let y = -7; y <= -5; y++) { const nx = x / 6.6, ny = y / 7; if (nx * nx + ny * ny <= 1) q.set(hx + x, hy + y, hair[1]); }
    }
  }) });

  parts.sort((a, b) => a.z - b.z).forEach(pt => pt.draw());
  return p;
}
