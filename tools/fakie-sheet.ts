// Fakie roll, jump, fall and landing for two skaters, as drawn in game (travel is to the right). `npm run fakie`
import { SKATERS } from '../src/core/skaters';
import { POSES, drawFakie, drawSkater } from '../src/game/art/skater';
import { Pix } from '../src/game/art/pixel';
import { mkdirSync } from 'fs';
import { mirror, writePng } from './sprites';
const sheet = new Pix(4 * 64, 2 * 70);
[SKATERS[0], SKATERS[2]].forEach((sk, r) => {
  sheet.blit(drawFakie(sk, 0), -4, r * 70 - 2);
  sheet.blit(mirror(drawSkater(sk, POSES.jump, true)), 64 - 4, r * 70 - 2);
  sheet.blit(mirror(drawSkater(sk, POSES.fall, true)), 128 - 4, r * 70 - 2);
  sheet.blit(mirror(drawSkater(sk, POSES.land, true)), 192 - 4, r * 70 - 2);
});
mkdirSync('shots', { recursive: true });
writePng(process.argv[2] ?? 'shots/fakie.png', sheet, 6);
