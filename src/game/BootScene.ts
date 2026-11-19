import Phaser from 'phaser';
import { SKATERS } from '../core/skaters';
import { bootMark, loading } from './loading';
import { skaterTex, textureSteps } from './textures';

/** Generates the art one step per frame so the loading screen keeps moving and shows real progress. */
export class BootScene extends Phaser.Scene {
  private steps: [string, () => void][] = [];
  private i = 0;
  constructor() { super('boot'); }
  create(): void {
    this.steps = [
      ...textureSteps(this),
      ['lacing skates', () => { for (const s of SKATERS) skaterTex(this, s.id, 'roll0'); }],
    ];
    this.i = 0;
    bootMark('engine');
    loading.stage(this.steps[0][0], 0.2);
  }
  update(): void {
    // ?hold freezes on the loading screen so it can be looked at / styled
    if (this.i === 2 && new URLSearchParams(location.search).has('hold')) return;
    if (this.i >= this.steps.length) { this.scene.start('menu'); return; }
    const label = this.steps[this.i][0];
    this.steps[this.i][1]();
    bootMark(label.split(' ').pop()!);
    this.i++;
    // label shows the step that runs on the NEXT frame, so it is on screen while that work happens
    loading.stage(this.steps[this.i]?.[0] ?? 'dropping in', 0.2 + (0.8 * this.i) / this.steps.length);
  }
}
