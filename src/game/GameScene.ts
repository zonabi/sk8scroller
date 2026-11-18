import Phaser from 'phaser';
import { botInput } from '../core/bot';
import { CFG } from '../core/config';
import { railY, type Feature } from '../core/level';
import { levelForXp, unlocksAt, xpFromRun } from '../core/progression';
import { Sim, comboValue, type SimEvent } from '../core/sim';
import { skaterById, type SkaterDef } from '../core/skaters';
import { TRICKS } from '../core/tricks';
import { InputController } from './input';
import { loadSave, writeSave } from './storage';
import { makeTextures, type Pose } from './textures';
import { label } from './ui';
import { GROUND, H, PAL, PLAYER_X, W } from './view';

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: number }

/** Thin presentation layer: feeds input to the Sim, draws its state, reacts to its events. No rules here. */
export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private skater!: SkaterDef;
  private ctl!: InputController;
  private bot = false;
  private acc = 0;
  private far!: Phaser.GameObjects.TileSprite;
  private wall!: Phaser.GameObjects.TileSprite;
  private street!: Phaser.GameObjects.TileSprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private lives: Phaser.GameObjects.Image[] = [];
  private sparks: Spark[] = [];
  private airTrickTotal = 0;
  private finished = false;

  constructor() { super('game'); }

  create(): void {
    makeTextures(this);
    const save = loadSave(), q = new URLSearchParams(location.search);
    this.skater = skaterById(save.skaterId);
    this.bot = q.has('bot');
    const seed = q.has('seed') ? Number(q.get('seed')) : (Math.random() * 2 ** 32) >>> 0;
    this.sim = new Sim({ seed, skater: this.skater, playerLevel: levelForXp(save.xp) });
    this.acc = 0; this.sparks = []; this.finished = false; this.lives = [];

    this.add.image(0, 0, 'sky').setOrigin(0);
    this.far = this.add.tileSprite(0, GROUND - 40 - 140, W, 140, 'city-far').setOrigin(0);
    this.wall = this.add.tileSprite(0, GROUND - 70, W, 70, 'wall').setOrigin(0);
    this.street = this.add.tileSprite(0, GROUND, W, H - GROUND, 'street').setOrigin(0);
    this.gfx = this.add.graphics().setDepth(10);
    this.player = this.add.image(PLAYER_X, GROUND, `sk-${this.skater.id}-roll`).setOrigin(0.5, 1).setDepth(20);

    this.scoreText = label(this, 8, 6, '0', 12, PAL.yellow);
    this.comboText = label(this, W / 2, H - 34, '', 9, PAL.white).setOrigin(0.5, 0).setAlign('center');
    for (let i = 0; i < CFG.lives; i++) this.lives.push(this.add.image(W - 12 - i * 10, 12, 'wheel').setDepth(100));

    this.ctl = new InputController(this, () => this.sim.s.mode, save.tilt);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
  }

  update(_t: number, deltaMs: number): void {
    this.acc += Math.min(deltaMs, 100) / 1000;
    while (this.acc >= CFG.dt) {
      this.acc -= CFG.dt;
      const input = this.bot ? botInput(this.sim) : this.ctl.sample();
      for (const e of this.sim.step(input)) this.onEvent(e);
      this.stepSparks();
    }
    this.draw();
  }

  // ---- events → juice -------------------------------------------------------
  private onEvent(e: SimEvent): void {
    const s = this.sim.s;
    switch (e.type) {
      case 'grindStart': case 'switchUp': this.popup(TRICKS[e.trickId].name, PAL.cyan); break;
      case 'airTrickStart': this.airTrickTotal = TRICKS[e.trickId].duration; break;
      case 'airTrickDone': this.popup(TRICKS[e.trickId].name, PAL.green); break;
      case 'bank': this.popup(`+${e.points}`, PAL.yellow, 16); this.cameras.main.flash(80, 255, 210, 63); break;
      case 'land': this.burst(4, PAL.white); break;
      case 'bail':
        this.popup(e.reason === 'balance' ? 'LOST IT!' : e.reason === 'sketchy' ? 'SKETCHY!' : 'BAIL!', PAL.pink, 16);
        this.cameras.main.shake(180, 0.012); this.burst(12, PAL.pink);
        break;
      case 'over': this.finish(); break;
    }
    this.lives.forEach((img, i) => img.setAlpha(i < s.lives ? 1 : 0.2));
  }

  private popup(text: string, color: number, size = 11): void {
    const t = label(this, PLAYER_X + 14, this.player.y - 44, text, size, color).setOrigin(0, 0.5);
    this.tweens.add({ targets: t, y: t.y - 26, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }
  private burst(n: number, color: number): void {
    for (let i = 0; i < n; i++) {
      this.sparks.push({ x: PLAYER_X, y: this.player.y, vx: Phaser.Math.Between(-90, 30), vy: Phaser.Math.Between(-90, -10), life: 0.4, color });
    }
  }
  private stepSparks(): void {
    const s = this.sim.s;
    if (s.mode === 'grind' && Math.random() < 0.7) {
      this.sparks.push({ x: PLAYER_X - 4, y: GROUND - s.y, vx: Phaser.Math.Between(-140, -40), vy: Phaser.Math.Between(-70, 10), life: 0.3, color: Math.random() < 0.5 ? PAL.yellow : PAL.orange });
    }
    for (const p of this.sparks) { p.x += p.vx * CFG.dt; p.y += p.vy * CFG.dt; p.vy += 300 * CFG.dt; p.life -= CFG.dt; }
    this.sparks = this.sparks.filter(p => p.life > 0);
  }

  // ---- drawing --------------------------------------------------------------
  private draw(): void {
    const s = this.sim.s, cam = Math.floor(s.x - PLAYER_X), g = this.gfx;
    this.far.tilePositionX = Math.floor(cam * 0.15);
    this.wall.tilePositionX = Math.floor(cam * 0.6);
    this.street.tilePositionX = cam;

    g.clear();
    for (const f of this.sim.level.features) {
      const x = Math.floor(f.x - cam);
      if (x > W + 10 || x + f.w < -10) continue;
      this.drawFeature(g, f, x);
    }
    for (const p of this.sparks) { g.fillStyle(p.color, 1); g.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2); }

    // player
    let pose: Pose = 'roll';
    if (s.mode === 'air') pose = s.airTrick ? 'grab' : 'air';
    else if (s.mode === 'grind') pose = 'grind';
    else if (s.mode === 'bail' || s.mode === 'over') pose = 'bail';
    const bob = s.mode === 'ground' ? Math.floor(s.t * 8) % 2 : 0;
    this.player.setTexture(`sk-${this.skater.id}-${pose}`).setY(Math.floor(GROUND - s.y) + bob + (s.mode === 'grind' ? -1 : 0));
    this.player.setAlpha(s.invuln > 0 && s.mode !== 'bail' && Math.floor(s.t * 14) % 2 ? 0.35 : 1);
    this.player.setScale(1, 1).setRotation(0);
    if (s.airTrick) {
      const tr = TRICKS[s.airTrick.id], p = 1 - s.airTrick.timeLeft / (this.airTrickTotal || tr.duration);
      if (tr.id.startsWith('spin')) this.player.setScale(Math.cos(p * Math.PI * (Number(tr.id.slice(4)) / 180)), 1);
      else if (tr.id === 'backflip' || tr.id === 'misty') this.player.setRotation(-p * Math.PI * 2);
      else if (tr.id === 'rocket' || tr.id === 'liukang') this.player.setRotation(-0.5);
    } else if (s.mode === 'grind') {
      this.player.setRotation(s.balance * 0.35);
      // balance meter
      const mx = PLAYER_X - 30, my = this.player.y - 42;
      g.fillStyle(PAL.ink, 1); g.fillRect(mx - 1, my - 1, 62, 7);
      g.fillStyle(PAL.pink, 1); g.fillRect(mx, my, 60, 5);
      g.fillStyle(PAL.green, 1); g.fillRect(mx + 15, my, 30, 5);
      g.fillStyle(PAL.white, 1); g.fillRect(Math.floor(mx + 29 + s.balance * 29), my - 2, 3, 9);
    }

    this.scoreText.setText(String(this.sim.totalScore).padStart(6, '0'));
    if (s.combo.length) {
      const names = s.combo.slice(-4).map(c => c.name).join(' + ');
      this.comboText.setText(`${s.combo.length > 4 ? '… + ' : ''}${names}\n${comboValue(s.combo)}  x${s.combo.length}`);
    } else this.comboText.setText('');
  }

  private drawFeature(g: Phaser.GameObjects.Graphics, f: Feature, x: number): void {
    switch (f.kind) {
      case 'rail': {
        const y1 = GROUND - f.h, y2 = GROUND - (f.h2 ?? f.h);
        g.fillStyle(PAL.ink, 1);
        for (let px = 6; px < f.w; px += 48) g.fillRect(x + px, Math.floor(GROUND - railY(f, f.x + px)), 2, Math.ceil(railY(f, f.x + px)));
        g.lineStyle(4, PAL.ink, 1); g.lineBetween(x, y1, x + f.w, y2);
        g.lineStyle(2, PAL.steel, 1); g.lineBetween(x, y1 - 1, x + f.w, y2 - 1);
        break;
      }
      case 'ledge':
        g.fillStyle(PAL.ink, 1); g.fillRect(x - 1, GROUND - f.h - 1, f.w + 2, f.h + 1);
        g.fillStyle(PAL.concrete, 1); g.fillRect(x, GROUND - f.h, f.w, f.h);
        g.fillStyle(PAL.concreteDark, 1); g.fillRect(x, GROUND - f.h + 6, f.w, f.h - 6);
        g.fillStyle(PAL.steel, 1); g.fillRect(x, GROUND - f.h, f.w, 2);
        g.fillStyle(PAL.pink, 1); g.fillRect(x + 10, GROUND - 8, 14, 4);
        break;
      case 'kicker':
        g.fillStyle(PAL.ink, 1); g.fillTriangle(x - 2, GROUND, x + f.w + 1, GROUND, x + f.w + 1, GROUND - f.h - 2);
        g.fillStyle(PAL.orange, 1); g.fillTriangle(x, GROUND, x + f.w, GROUND, x + f.w, GROUND - f.h);
        g.fillStyle(PAL.yellow, 1); g.fillRect(x + f.w - 3, GROUND - f.h, 3, f.h);
        break;
      case 'cone':
        g.fillStyle(PAL.ink, 1); g.fillRect(x - 2, GROUND - 2, f.w + 4, 2);
        g.fillStyle(PAL.orange, 1); g.fillTriangle(x, GROUND - 1, x + f.w, GROUND - 1, x + f.w / 2, GROUND - f.h - 1);
        g.fillStyle(PAL.white, 1); g.fillRect(x + 2, GROUND - 6, f.w - 4, 2);
        break;
      case 'barrier':
        g.fillStyle(PAL.ink, 1); g.fillRect(x - 1, GROUND - f.h - 1, f.w + 2, f.h + 1);
        for (let i = 0; i < f.h; i += 4) { g.fillStyle((i / 4) % 2 ? PAL.ink : PAL.yellow, 1); g.fillRect(x, GROUND - f.h + i, f.w, Math.min(4, f.h - i)); }
        break;
    }
  }

  // ---- end of run -----------------------------------------------------------
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    const save = loadSave(), total = this.sim.totalScore, before = levelForXp(save.xp);
    const gained = this.bot ? 0 : xpFromRun(total);
    save.xp += gained; save.best = Math.max(save.best, this.bot ? 0 : total);
    writeSave(save);
    const after = levelForXp(save.xp);

    this.add.rectangle(0, 0, W, H, PAL.ink, 0.7).setOrigin(0).setDepth(90);
    label(this, W / 2, 40, 'RUN OVER', 24, PAL.pink).setOrigin(0.5, 0);
    const lines = [`SCORE ${total}`, `BEST COMBO ${this.sim.s.bestCombo}`, `DISTANCE ${this.sim.distance}m`, `+${gained} XP`];
    label(this, W / 2, 84, lines.join('\n'), 11, PAL.white).setOrigin(0.5, 0).setAlign('center');
    if (after > before) {
      const names: string[] = [];
      for (let l = before + 1; l <= after; l++) names.push(...unlocksAt(l).map(t => t.name));
      label(this, W / 2, 152, `LEVEL ${after}!` + (names.length ? `  UNLOCKED: ${names.join(', ')}` : ''), 10, PAL.green).setOrigin(0.5, 0);
    }
    this.time.delayedCall(500, () => {
      const again = label(this, W / 2 - 60, 190, '▶ AGAIN', 14, PAL.green).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      const menu = label(this, W / 2 + 70, 190, 'MENU', 14, PAL.cyan).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
      again.on('pointerdown', () => this.scene.restart());
      menu.on('pointerdown', () => this.scene.start('menu'));
      this.input.keyboard?.once('keydown-SPACE', () => this.scene.restart());
    });
  }
}
