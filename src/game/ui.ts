import Phaser from 'phaser';
import { PAL, hex } from './view';

/** Placeholder UI text: chunky monospace with an ink outline. Replace with a bitmap font later. */
export function label(scene: Phaser.Scene, x: number, y: number, text: string, size = 10, color: number = PAL.white): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: `${size}px`, fontStyle: 'bold',
    color: hex(color), stroke: hex(PAL.ink), strokeThickness: 3,
  }).setDepth(100);
}
