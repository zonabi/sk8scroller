import Phaser from 'phaser';
import { MAX_LEVEL, levelForXp, xpForLevel } from '../core/progression';
import { SKATERS } from '../core/skaters';
import { sfx } from './audio';
import { World, setupCamera } from './backdrop';
import { showFullscreenButton } from './fullscreen';
import { InputController } from './input';
import { bootMark, bootSummary, loading } from './loading';
import { loadSave, writeSave, type Save } from './storage';
import { SPRITE, skaterTex } from './textures';
import { openTuningPanel, tuningCount } from './tuning';
import { drips, graf, uiPerf } from './ui';
import { AH, AW, PAL } from './view';

export class MenuScene extends Phaser.Scene {
  private save!: Save;
  private bg!: World;
  private frames = 0;
  constructor() { super('menu'); }

  create(): void {
    setupCamera(this);
    showFullscreenButton(true);
    // if the player starts before the menu's second frame, the loading screen must still go away
    this.events.once('shutdown', () => { showFullscreenButton(false); loading.done(); });
    this.save = loadSave();
    this.frames = 0;
    this.bg = new World(this);
    bootMark('world');
    this.add.rectangle(0, 0, AW, AH, PAL.ink, 0.45).setOrigin(0);

    // the piece
    drips(this, AW / 2 - 150, 70, 300, PAL.pink, 4);
    graf(this, AW / 2, 44, 'SK8SCROLLER', { font: 'piece', size: 54, fill: [PAL.yellow, PAL.pink], block: PAL.cyan, angle: -3, outlineWidth: 9 }).setOrigin(0.5);
    graf(this, AW / 2 + 120, 80, 'grind the city', { size: 13, fill: PAL.white, angle: -6 }).setOrigin(0.5);

    const lvl = levelForXp(this.save.xp);
    const next = lvl < MAX_LEVEL ? `${this.save.xp}/${xpForLevel(lvl + 1)} xp` : 'max';
    graf(this, 10, 6, `LVL ${lvl}`, { font: 'spray', size: 15, fill: [PAL.green, PAL.cyan] });
    graf(this, 12, 28, next, { size: 9 });
    graf(this, AW - 10, 6, `BEST ${this.save.best}`, { font: 'spray', size: 15, fill: [PAL.yellow, PAL.orange] }).setOrigin(1, 0);

    // skaters as name-tag stickers
    const cards: Phaser.GameObjects.Container[] = [];
    const select = (id: string) => {
      if (id !== this.save.skaterId) sfx.play('tap');
      this.save.skaterId = id; writeSave(this.save);
      cards.forEach((c, i) => {
        const on = SKATERS[i].id === id;
        this.tweens.add({ targets: c, scale: on ? 1.12 : 0.94, angle: on ? 0 : [-4, 3, -2, 4][i], y: on ? 162 : 170, duration: 140, ease: 'Back.easeOut' });
        c.setDepth(on ? 60 : 50);
      });
    };
    SKATERS.forEach((sk, i) => {
      const c = this.add.container(98 + i * 148, 170), w = 122, h = 132;
      const g = this.add.graphics();
      g.fillStyle(PAL.ink, 0.5).fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 7);
      g.fillStyle(PAL.paper, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 7);
      g.fillStyle(0xd62839, 1).fillRoundedRect(-w / 2, -h / 2, w, 30, { tl: 7, tr: 7, bl: 0, br: 0 });
      g.fillStyle(0xd62839, 1).fillRoundedRect(-w / 2, h / 2 - 9, w, 9, { tl: 0, tr: 0, bl: 7, br: 7 });
      g.lineStyle(1.5, PAL.ink, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 7);
      const hello = graf(this, 0, -h / 2 + 1, 'HELLO', { font: 'plain', size: 13, outlineWidth: 0 }).setOrigin(0.5, 0);
      const my = graf(this, 0, -h / 2 + 15, 'my name is', { font: 'plain', size: 6, outlineWidth: 0 }).setOrigin(0.5, 0);
      const name = graf(this, -w / 2 + 8, -h / 2 + 30, sk.name, { font: 'marker', size: 21, fill: PAL.ink, outlineWidth: 0, angle: -4 });
      const spr = this.add.image(34, 50, skaterTex(this, sk.id, 'roll0')).setOrigin(SPRITE.ox / SPRITE.frame, (SPRITE.gy + 1) / SPRITE.frame);
      const blurb = graf(this, -w / 2 + 8, -h / 2 + 62, sk.blurb.replace(', ', ',\n'), { size: 8, fill: 0x3a3a52, outlineWidth: 0 });
      c.add([g, ...hello.parts, ...my.parts, ...name.parts, ...blurb.parts, spr]);
      ([['spd', sk.speed, PAL.pink], ['air', sk.air, 0x0090c8], ['bal', sk.balance, 0x18a860]] as const).forEach(([lab, v, col], j) => {
        const y = 22 + j * 11;
        c.add(graf(this, -w / 2 + 8, y - 6, lab, { size: 7, fill: PAL.ink, outlineWidth: 0 }).parts);
        const bar = this.add.graphics();
        bar.fillStyle(0xcfc6b0, 1).fillRoundedRect(-w / 2 + 28, y, 44, 4, 2);
        bar.fillStyle(col, 1).fillRoundedRect(-w / 2 + 28, y, Math.max(6, (v - 0.72) * 72), 4, 2);
        c.add(bar);
      });
      c.setSize(w, h).setInteractive({ useHandCursor: true }).on('pointerdown', () => select(sk.id));
      c.setAngle([-4, 3, -2, 4][i]);
      cards.push(c);
    });
    select(this.save.skaterId);

    const play = graf(this, AW / 2, 268, 'SKATE!', { font: 'spray', size: 40, fill: [PAL.green, PAL.cyan], block: PAL.plum, angle: -2 }).setOrigin(0.5);
    this.tweens.add({ targets: play, scale: 1.07, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.easeInOut' });
    const start = () => { sfx.play('go'); this.scene.start('game'); };
    play.button(start);
    this.input.keyboard?.on('keydown-SPACE', start);

    // controls on strips of tape
    const tape = (x: number, y: number, text: string, angle: number) => {
      const t = graf(this, x, y, text, { size: 8, fill: PAL.ink, outlineWidth: 0, angle, align: 'center' }).setOrigin(0.5);
      const g = this.add.graphics().setDepth(99).setPosition(x, y).setAngle(angle);
      g.fillStyle(PAL.ink, 0.35).fillRect(-t.textWidth / 2 + 1, -9, t.textWidth, 20);
      g.fillStyle(0xf6e7a1, 0.95).fillRect(-t.textWidth / 2 - 1, -11, t.textWidth, 20);
    };
    tape(AW / 2 - 150, 318, 'LEFT THUMB  jump · hold = higher\non rails: drag to balance, tap to hop off', -1.5);
    tape(AW / 2 + 150, 318, 'RIGHT THUMB  swipe = tricks · on rails: swipe to switch up\non the ground: tap = push · swipe left = turn fakie', 1.5);
    graf(this, AW / 2, 348, 'keys: SPACE jump · WASD tricks · ← → balance on rails · on the ground → push, ← fakie · M mute', { size: 7, fill: PAL.white, outlineWidth: 2 }).setOrigin(0.5);

    const sound = graf(this, AW - 10, 44, '', { size: 9, fill: PAL.yellow }).setOrigin(1, 0);
    const showSound = () => sound.setText(`sound: ${this.save.mute ? 'off' : 'ON'}`);
    showSound();
    const toggleSound = () => { this.save.mute = !this.save.mute; writeSave(this.save); sfx.setMuted(this.save.mute); showSound(); sfx.play('tap'); };
    sound.button(toggleSound);
    this.input.keyboard?.on('keydown-M', toggleSound);

    const tune = graf(this, AW - 10, 58, '', { size: 9, fill: PAL.green }).setOrigin(1, 0);
    const showTune = () => tune.setText(tuningCount() ? `tuning: ${tuningCount()} changed` : 'tuning');
    showTune();
    tune.button(() => { sfx.play('tap'); this.input.enabled = false; openTuningPanel(() => { this.input.enabled = true; showTune(); }); });

    const tilt = graf(this, AW - 10, 30, '', { size: 9, fill: PAL.cyan }).setOrigin(1, 0);
    const showTilt = () => tilt.setText(`tilt balance: ${this.save.tilt ? 'ON' : 'off'}`);
    showTilt();
    tilt.button(async () => {
      this.save.tilt = !this.save.tilt && (await InputController.requestTilt());
      writeSave(this.save); showTilt();
    });
  }

  update(t: number): void {
    if (this.frames === 0) bootMark('menu');
    this.bg.scroll(t * 0.03);
    this.bg.flush();
    // Hide the loading screen on the SECOND frame, so the first real render (GPU shader compile etc.) happens under it.
    if (++this.frames === 2 && loading.done()) {
      bootMark('first-draw'); uiPerf.bootMs = performance.now();
      const line = `boot ${uiPerf.bootMs.toFixed(0)} ms — ${bootSummary()} · (lettering ${uiPerf.stampMs.toFixed(0)} ms in ${uiPerf.stamps})`;
      console.info('[sk8] ' + line);
      const f = new URLSearchParams(location.search).has('fps') ? document.getElementById('fps') : null;
      if (f) f.textContent = line;
    }
  }
}
