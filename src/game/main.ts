import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { MenuScene } from './MenuScene';
import { H, PAL, W } from './view';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  pixelArt: true,
  backgroundColor: PAL.ink,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [MenuScene, GameScene],
});
// handy for debugging and for agents driving the game from a browser console
(window as unknown as { __sk8: unknown }).__sk8 = game;
