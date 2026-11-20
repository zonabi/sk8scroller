/** Dumps every skater pose to a PNG contact sheet for review. Usage: npm run sprites [out.png] [scale] */
import zlib from 'node:zlib';
import fs from 'node:fs';
import { SKATERS } from '../src/core/skaters';
import { FAKIE_FRAMES, FRAME, POSES, POSE_NAMES, SPIN_FRAMES, drawFakie, drawSkater, drawSpin } from '../src/game/art/skater';
import { Pix } from '../src/game/art/pixel';

export function writePng(file: string, pix: Pix, scale = 1, bg = 0x6a6a7e): void {
  const w = pix.w * scale, h = pix.h * scale, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = pix.get((x / scale) | 0, (y / scale) | 0); if (c === -1) c = bg;
    raw.writeUInt8((c >> 16) & 255, y * (w * 3 + 1) + 1 + x * 3); raw.writeUInt8((c >> 8) & 255, y * (w * 3 + 1) + 2 + x * 3); raw.writeUInt8(c & 255, y * (w * 3 + 1) + 3 + x * 3);
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}

if (process.argv[1]?.includes('sprites')) {
  const out = process.argv[2] ?? 'shots/sprites.png', scale = Number(process.argv[3] ?? 3), cols = 8;
  const only = process.argv[4];
  const list = SKATERS.filter(s => !only || s.id === only);
  const rowsPer = Math.ceil(POSE_NAMES.length / cols) + 2;   // last two rows of each block = spin turnaround, fakie roll
  const sheet = new Pix(cols * FRAME, rowsPer * FRAME * list.length);
  list.forEach((sk, si) => {
    POSE_NAMES.forEach((n, i) => sheet.blit(drawSkater(sk, POSES[n]), (i % cols) * FRAME, (si * rowsPer + Math.floor(i / cols)) * FRAME));
    for (let i = 0; i < SPIN_FRAMES; i++) sheet.blit(drawSpin(sk, (i * 360) / SPIN_FRAMES), i * FRAME, (si * rowsPer + rowsPer - 2) * FRAME);
    for (let i = 0; i < FAKIE_FRAMES; i++) sheet.blit(drawFakie(sk, i), i * FRAME, (si * rowsPer + rowsPer - 1) * FRAME);
  });
  fs.mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  writePng(out, sheet, scale);
  console.log(`${out}: ${POSE_NAMES.join(' ')}`);
}
