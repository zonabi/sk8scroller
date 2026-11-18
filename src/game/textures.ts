import Phaser from 'phaser';
import { Rng } from '../core/rng';
import { SKATERS, type SkaterDef } from '../core/skaters';
import { GROUND, H, PAL, W, hex } from './view';

export type Pose = 'roll' | 'air' | 'grab' | 'grind' | 'bail';
export const POSES: Pose[] = ['roll', 'air', 'grab', 'grind', 'bail'];
export const SPR_W = 24, SPR_H = 30;

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, color: string, x: number, y: number, w = 1, h = 1) => { c.fillStyle = color; c.fillRect(x, y, w, h); };

/** Placeholder pixel skater, drawn from rectangles. Feet are at the bottom-centre of the frame. */
function drawSkater(c: Ctx, sk: SkaterDef, pose: Pose): void {
  const { skin, hair, top, pants, skate } = sk.colors;
  const ink = hex(PAL.ink), wheel = hex(PAL.yellow);
  const boot = (x: number, y: number) => {
    px(c, ink, x - 1, y - 4, 7, 5); px(c, skate, x, y - 3, 5, 3);
    px(c, wheel, x, y, 2, 2); px(c, wheel, x + 3, y, 2, 2);
  };
  if (pose === 'bail') {
    // flat on the ground, limbs everywhere
    px(c, ink, 2, 21, 20, 7); px(c, pants, 3, 22, 8, 5); px(c, top, 11, 22, 7, 5);
    px(c, skin, 18, 21, 4, 4); px(c, hair, 20, 20, 3, 3);
    boot(2, 20); px(c, wheel, 9, 16, 2, 2); px(c, skate, 7, 17, 4, 3);
    return;
  }
  const crouch = pose === 'grind' || pose === 'grab' ? 3 : pose === 'air' ? 1 : 0;
  const top0 = 4 + crouch;
  // head
  px(c, ink, 9, top0 - 1, 8, 8); px(c, skin, 10, top0, 6, 6); px(c, hair, 9, top0 - 1, 7, 3); px(c, ink, 14, top0 + 3, 1, 1);
  // torso (hoodie)
  px(c, ink, 7, top0 + 6, 10, 9); px(c, top, 8, top0 + 7, 8, 7);
  // arms
  if (pose === 'grab') { px(c, top, 14, top0 + 9, 3, 6); px(c, skin, 15, top0 + 15, 2, 2); }
  else if (pose === 'roll') { px(c, top, 5, top0 + 8, 3, 5); px(c, skin, 5, top0 + 13, 2, 2); px(c, top, 16, top0 + 8, 3, 4); px(c, skin, 18, top0 + 11, 2, 2); }
  else { px(c, top, 3, top0 + 6, 5, 3); px(c, skin, 2, top0 + 5, 2, 2); px(c, top, 16, top0 + 6, 5, 3); px(c, skin, 20, top0 + 5, 2, 2); }
  // legs + skates
  const hip = top0 + 14;
  if (pose === 'roll') {
    px(c, pants, 8, hip, 4, 26 - hip); px(c, pants, 13, hip, 4, 26 - hip); boot(6, 27); boot(13, 27);
  } else if (pose === 'air') {
    px(c, pants, 7, hip, 4, 5); px(c, pants, 13, hip, 5, 4); boot(4, hip + 8); boot(15, hip + 7);
  } else if (pose === 'grab') {
    px(c, pants, 8, hip, 9, 4); boot(8, hip + 7); boot(14, hip + 6);
  } else { // grind: wide stance, soul foot forward
    px(c, pants, 5, hip, 5, 26 - hip); px(c, pants, 14, hip, 5, 26 - hip); boot(2, 27); boot(16, 27);
  }
}

function canvasTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h)!;
  draw(t.getContext());
  t.refresh();
}

/** Generates every placeholder texture. Swap for real sprite sheets later without touching scenes. */
export function makeTextures(scene: Phaser.Scene): void {
  for (const sk of SKATERS) for (const pose of POSES) {
    canvasTex(scene, `sk-${sk.id}-${pose}`, SPR_W, SPR_H, c => drawSkater(c, sk, pose));
  }

  canvasTex(scene, 'sky', W, H, c => {
    const bands = [PAL.ink, PAL.night, PAL.plum, PAL.magenta, PAL.orange, PAL.yellow];
    const hs = [40, 50, 46, 34, 26, 30];
    let y = 0;
    bands.forEach((b, i) => { px(c, hex(b), 0, y, W, hs[i]); y += hs[i]; });
    px(c, hex(PAL.yellow), 330, 130, 44, 44); px(c, hex(PAL.orange), 330, 152, 44, 4); px(c, hex(PAL.orange), 330, 162, 44, 6);
    const r = new Rng(3);
    for (let i = 0; i < 40; i++) px(c, hex(PAL.white), r.int(0, W), r.int(0, 80));
  });

  canvasTex(scene, 'city-far', W, 140, c => {
    const r = new Rng(11);
    for (let x = 0; x < W;) {
      const bw = r.int(22, 48), bh = r.int(40, 130);
      px(c, hex(PAL.night), x, 140 - bh, bw, bh);
      for (let wy = 140 - bh + 5; wy < 136; wy += 7) for (let wx = x + 3; wx < x + bw - 3; wx += 6) {
        if (r.next() < 0.3) px(c, hex(r.next() < 0.5 ? PAL.yellow : PAL.orange), wx, wy, 2, 3);
      }
      x += bw + r.int(0, 6);
    }
  });

  canvasTex(scene, 'wall', W, 70, c => {
    const r = new Rng(23);
    px(c, hex(PAL.concreteDark), 0, 0, W, 70); px(c, hex(PAL.ink), 0, 0, W, 2);
    for (let y = 8; y < 70; y += 8) px(c, '#00000030', 0, y, W, 1);
    const cols = [PAL.pink, PAL.cyan, PAL.green, PAL.yellow, PAL.orange, PAL.white];
    // throw-ups: blobby block letters with outline + drips
    for (let x = 14; x < W - 60; x += r.int(70, 110)) {
      const col = hex(r.pick(cols)), col2 = hex(r.pick(cols)), n = r.int(3, 5), y0 = r.int(14, 30);
      for (let i = 0; i < n; i++) {
        const lx = x + i * 13, lh = r.int(18, 26), ly = y0 + r.int(-3, 3);
        px(c, hex(PAL.ink), lx - 1, ly - 1, 13, lh + 2); px(c, col, lx, ly, 11, lh);
        px(c, col2, lx + 2, ly + 2, 7, 3); px(c, hex(PAL.ink), lx + r.int(3, 6), ly + r.int(7, 12), 3, r.int(4, 8));
        if (r.next() < 0.5) px(c, col, lx + r.int(1, 8), ly + lh, 2, r.int(3, 10));
      }
      for (let i = 0; i < 6; i++) px(c, col2, x + r.int(-8, n * 13 + 6), y0 + r.int(-8, 30), 2, 2);
    }
  });

  canvasTex(scene, 'street', 64, H - GROUND, c => {
    const r = new Rng(5);
    px(c, hex(PAL.asphalt), 0, 0, 64, H - GROUND); px(c, hex(PAL.concrete), 0, 0, 64, 2); px(c, hex(PAL.ink), 0, 2, 64, 1);
    for (let i = 0; i < 40; i++) px(c, hex(PAL.asphaltLight), r.int(0, 63), r.int(4, H - GROUND - 1));
    px(c, hex(PAL.yellow), 6, 22, 26, 3);
  });

  canvasTex(scene, 'spark', 2, 2, c => px(c, hex(PAL.yellow), 0, 0, 2, 2));
  canvasTex(scene, 'wheel', 7, 7, c => {
    px(c, hex(PAL.ink), 1, 0, 5, 7); px(c, hex(PAL.ink), 0, 1, 7, 5); px(c, hex(PAL.yellow), 1, 1, 5, 5); px(c, hex(PAL.ink), 3, 3, 1, 1);
  });
}
