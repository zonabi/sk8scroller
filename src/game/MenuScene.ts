import Phaser from 'phaser';
import { MAX_LEVEL, levelForXp, xpForLevel } from '../core/progression';
import { SKATERS } from '../core/skaters';
import { InputController } from './input';
import { loadSave, writeSave, type Save } from './storage';
import { makeTextures } from './textures';
import { label } from './ui';
import { H, PAL, W } from './view';

export class MenuScene extends Phaser.Scene {
  private save!: Save;
  constructor() { super('menu'); }

  create(): void {
    makeTextures(this);
    this.save = loadSave();
    this.add.image(0, 0, 'sky').setOrigin(0);
    this.add.tileSprite(0, H - 70, W, 70, 'wall').setOrigin(0).setAlpha(0.9);

    label(this, W / 2, 10, 'SK8SCROLLER', 28, PAL.yellow).setOrigin(0.5, 0).setAngle(-3);
    label(this, W / 2, 44, 'grind the city', 10, PAL.pink).setOrigin(0.5, 0);

    const lvl = levelForXp(this.save.xp);
    const next = lvl < MAX_LEVEL ? `${this.save.xp}/${xpForLevel(lvl + 1)} XP` : 'MAX';
    label(this, 8, 6, `LVL ${lvl}  ${next}`, 9, PAL.green);
    label(this, W - 8, 6, `BEST ${this.save.best}`, 9, PAL.cyan).setOrigin(1, 0);

    // skater select
    const marker = this.add.rectangle(0, 0, 96, 92).setStrokeStyle(2, PAL.yellow).setFillStyle(PAL.ink, 0.55);
    SKATERS.forEach((sk, i) => {
      const cx = 72 + i * 112, cy = 112;
      const card = this.add.rectangle(cx, cy, 96, 92, PAL.ink, 0.35).setInteractive({ useHandCursor: true });
      this.add.image(cx, cy - 8, `sk-${sk.id}-roll`).setScale(2);
      label(this, cx, cy - 44, sk.name, 11, PAL.white).setOrigin(0.5, 0);
      label(this, cx, cy + 22, sk.blurb, 7, PAL.steel).setOrigin(0.5, 0);
      ([['SPD', sk.speed, PAL.pink], ['AIR', sk.air, PAL.cyan], ['BAL', sk.balance, PAL.green]] as const).forEach(([, v, col], j) => {
        this.add.rectangle(cx - 30, cy + 35 + j * 4, 60, 2, PAL.ink).setOrigin(0, 0);
        this.add.rectangle(cx - 30, cy + 35 + j * 4, Math.round((v - 0.7) * 100), 2, col).setOrigin(0, 0);
      });
      const pick = () => { this.save.skaterId = sk.id; writeSave(this.save); marker.setPosition(cx, cy); };
      card.on('pointerdown', pick);
      if (sk.id === this.save.skaterId) marker.setPosition(cx, cy);
    });

    const tilt = label(this, 8, H - 18, '', 9, PAL.cyan).setInteractive({ useHandCursor: true });
    const showTilt = () => tilt.setText(`TILT BALANCE: ${this.save.tilt ? 'ON' : 'OFF'}`);
    showTilt();
    tilt.on('pointerdown', async () => {
      this.save.tilt = !this.save.tilt && (await InputController.requestTilt());
      writeSave(this.save); showTilt();
    });

    const play = label(this, W / 2, 178, '▶ SKATE', 20, PAL.green).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: play, scale: 1.08, yoyo: true, repeat: -1, duration: 500 });
    const start = () => this.scene.start('game');
    play.on('pointerdown', start);
    this.input.keyboard?.on('keydown-SPACE', start);

    this.add.rectangle(0, 204, W, 44, PAL.ink, 0.8).setOrigin(0);
    label(this, W / 2, 210,
      'LEFT THUMB: jump (hold = higher) · on rails drag to balance, tap to hop off\n' +
      'RIGHT THUMB: swipe for tricks · on rails swipe to switch up\n' +
      'KEYS: SPACE jump · WASD tricks · ← → balance', 7, PAL.white).setOrigin(0.5, 0).setAlign('center');
  }
}
