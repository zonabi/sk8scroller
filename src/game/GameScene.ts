import Phaser from 'phaser';
import { botInput } from '../core/bot';
import { CFG } from '../core/config';
import type { Feature } from '../core/level';
import { levelForXp, unlocksAt, xpFromRun } from '../core/progression';
import { Sim, comboValue, type SimEvent } from '../core/sim';
import { skaterById, type SkaterDef } from '../core/skaters';
import { TRICKS } from '../core/tricks';
import type { PoseName } from './art/skater';
import { addBackdrop, setupCamera, type Backdrop } from './backdrop';
import { InputController } from './input';
import { loadSave, writeSave } from './storage';
import { SPRITE, dropFeatureTexture, featureTexture } from './textures';
import { Graf, graf } from './ui';
import { AH, AW, GROUND, K, PAL, PLAYER_X } from './view';

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: number; size: number }
const BODY = 28; // art px from feet to the sprite's rotation centre
const ROLL: PoseName[] = ['roll0', 'roll0', 'roll1', 'roll2', 'roll3', 'roll0', 'roll0', 'roll0'];
const HYPE = [PAL.white, PAL.white, PAL.cyan, PAL.green, PAL.yellow, PAL.orange, PAL.pink];

/** Thin presentation layer: feeds input to the Sim, draws its state, reacts to its events. No rules here. */
export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private skater!: SkaterDef;
  private ctl!: InputController;
  private bot = false;
  private acc = 0;
  private bg!: Backdrop;
  private gfx!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private feats = new Map<number, { f: Feature; img: Phaser.GameObjects.Image }>();
  private scoreText!: Graf;
  private comboNames!: Graf;
  private comboTotal!: Graf;
  private lives: Phaser.GameObjects.Image[] = [];
  private sparks: Spark[] = [];
  private airTrickTotal = 0;
  private landT = 0;
  private lastCombo = 0;
  private finished = false;
  private popN = 0;

  constructor() { super('game'); }

  create(): void {
    setupCamera(this);
    const save = loadSave(), q = new URLSearchParams(location.search);
    this.skater = skaterById(save.skaterId);
    this.bot = q.has('bot');
    const seed = q.has('seed') ? Number(q.get('seed')) : (Math.random() * 2 ** 32) >>> 0;
    this.sim = new Sim({ seed, skater: this.skater, playerLevel: levelForXp(save.xp) });
    this.acc = 0; this.sparks = []; this.finished = false; this.lives = []; this.feats = new Map(); this.landT = 0; this.lastCombo = 0;

    this.bg = addBackdrop(this);
    this.shadow = this.add.image(PLAYER_X, GROUND, 'shadow').setAlpha(0.45).setDepth(15);
    this.player = this.add.image(PLAYER_X, GROUND, `sk-${this.skater.id}-roll0`)
      .setOrigin(SPRITE.ox / SPRITE.frame, (SPRITE.gy + 1 - BODY) / SPRITE.frame).setDepth(20);
    this.gfx = this.add.graphics().setDepth(30);

    graf(this, 12, 5, 'score', { size: 9, fill: PAL.white, angle: -4 });
    this.scoreText = graf(this, 10, 14, '0', { font: 'spray', size: 26, fill: [PAL.yellow, PAL.orange], block: PAL.magenta, outlineWidth: 6 });
    for (let i = 0; i < CFG.lives; i++) this.lives.push(this.add.image(AW - 18 - i * 20, 20, 'wheel').setDepth(100));
    this.comboNames = graf(this, AW / 2, AH - 48, '', { size: 11, fill: PAL.white, align: 'center' }).setOrigin(0.5, 1);
    this.comboTotal = graf(this, AW / 2, AH - 26, '', { font: 'spray', size: 24, fill: PAL.white, block: PAL.ink, angle: -2, outlineWidth: 6 }).setOrigin(0.5);

    this.ctl = new InputController(this, () => this.sim.s.mode, save.tilt);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    this.events.once('shutdown', () => { for (const { f } of this.feats.values()) dropFeatureTexture(this, f); });
  }

  update(_t: number, deltaMs: number): void {
    this.acc += Math.min(deltaMs, 100) / 1000;
    while (this.acc >= CFG.dt) {
      this.acc -= CFG.dt;
      const input = this.bot ? botInput(this.sim) : this.ctl.sample();
      for (const e of this.sim.step(input)) this.onEvent(e);
      this.stepSparks();
      if (this.landT > 0) this.landT -= CFG.dt;
    }
    this.draw();
  }

  // ---- events → juice -------------------------------------------------------
  private onEvent(e: SimEvent): void {
    const s = this.sim.s;
    switch (e.type) {
      case 'grindStart': case 'switchUp': this.popup(TRICKS[e.trickId].name, [PAL.cyan, PAL.white]); break;
      case 'airTrickStart': this.airTrickTotal = TRICKS[e.trickId].duration; break;
      case 'airTrickDone': this.popup(TRICKS[e.trickId].name, [PAL.green, PAL.yellow]); break;
      case 'bank': this.popup(`+${e.points}`, [PAL.yellow, PAL.orange], 26); this.cameras.main.flash(90, 255, 230, 120); break;
      case 'land': this.landT = 0.12; this.burst(6, 0xd8d8e8, 3); break;
      case 'bail':
        this.popup(e.reason === 'balance' ? 'LOST IT!' : e.reason === 'sketchy' ? 'SKETCHY!' : 'SLAM!', [PAL.pink, PAL.magenta], 28);
        this.cameras.main.shake(200, 0.01); this.burst(14, PAL.pink, 3);
        break;
      case 'over': this.finish(); break;
    }
    this.lives.forEach((img, i) => img.setAlpha(i < s.lives ? 1 : 0.25).setTint(i < s.lives ? 0xffffff : 0x555577));
  }

  /** A trick call-out: slaps in like a sticker, then fades. */
  private popup(text: string, fill: [number, number], size = 20): void {
    const t = graf(this, PLAYER_X + 34, this.player.y - 40 - (this.popN++ % 3) * 24, text.toUpperCase(), { font: 'piece', size, fill, block: PAL.ink, angle: Phaser.Math.Between(-9, 5), outlineWidth: size * 0.24 }).setOrigin(0, 0.5);
    t.setScale(1.7);
    this.tweens.add({ targets: t, scale: 1, duration: 130, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: t.y - 22, alpha: 0, delay: 520, duration: 380, onComplete: () => t.destroy() });
  }
  private burst(n: number, color: number, size: number): void {
    for (let i = 0; i < n; i++) this.sparks.push({ x: PLAYER_X, y: this.player.y + BODY, vx: Phaser.Math.Between(-120, 40), vy: Phaser.Math.Between(-110, -10), life: 0.4, color, size });
  }
  private stepSparks(): void {
    const s = this.sim.s;
    if (s.mode === 'grind') for (let i = 0; i < 2; i++) {
      this.sparks.push({ x: PLAYER_X - 6 + Math.random() * 10, y: GROUND - s.y * K, vx: Phaser.Math.Between(-190, -50), vy: Phaser.Math.Between(-110, 10), life: 0.25 + Math.random() * 0.2, color: [0xffffff, PAL.yellow, PAL.orange][i + (Math.random() < 0.5 ? 0 : 1)], size: 2 });
    }
    for (const p of this.sparks) { p.x += p.vx * CFG.dt; p.y += p.vy * CFG.dt; p.vy += 420 * CFG.dt; p.life -= CFG.dt; }
    this.sparks = this.sparks.filter(p => p.life > 0);
  }

  // ---- drawing --------------------------------------------------------------
  private pose(): PoseName {
    const s = this.sim.s;
    if (s.mode === 'grind') return s.grindTrick as PoseName;
    if (s.mode === 'bail') return s.bailTimer > CFG.bailTime * 0.45 ? 'bail0' : 'bail1';
    if (s.mode === 'over') return 'bail1';
    if (s.mode === 'air') {
      if (s.airTrick) return (['mute', 'safety', 'rocket', 'liukang'] as const).find(n => n === s.airTrick!.id) ?? 'jump';
      return s.vy > 40 ? 'jump' : 'fall';
    }
    if (this.landT > 0) return 'land';
    return ROLL[Math.floor(s.t * 9) % ROLL.length];
  }

  private draw(): void {
    const s = this.sim.s, camW = s.x - PLAYER_X / K, g = this.gfx;
    this.bg.scroll(camW * K);

    // level features: one sprite each, created as they scroll in and released behind us
    const live = new Set<number>();
    for (const f of this.sim.level.features) {
      const x = Math.floor((f.x - camW) * K);
      if (x > AW + 20 || x + f.w * K < -40) continue;
      live.add(f.id);
      let e = this.feats.get(f.id);
      if (!e) { const t = featureTexture(this, f); e = { f, img: this.add.image(0, 0, t.key).setOrigin(0).setDepth(10).setData('a', t) }; this.feats.set(f.id, e); }
      const a = e.img.getData('a') as { ox: number; oy: number };
      e.img.setPosition(x - a.ox, GROUND - a.oy + 1);
    }
    for (const [id, e] of this.feats) if (!live.has(id)) { e.img.destroy(); dropFeatureTexture(this, e.f); this.feats.delete(id); }

    // player
    const feetY = Math.floor(GROUND - s.y * K);
    let rot = 0, sx = 1;
    if (s.airTrick) {
      const tr = TRICKS[s.airTrick.id], p = 1 - s.airTrick.timeLeft / (this.airTrickTotal || tr.duration);
      if (tr.id.startsWith('spin')) sx = Math.cos(p * Math.PI * (Number(tr.id.slice(4)) / 180));
      else if (tr.id === 'backflip' || tr.id === 'misty') rot = -p * Math.PI * 2;
    } else if (s.mode === 'grind') rot = s.balance * 0.3;
    else if (s.mode === 'air') rot = Phaser.Math.Clamp(-s.vy / 2600, -0.12, 0.16);
    const flip = !!s.airTrick && rot !== 0;
    // lean pivots at the feet; flips pivot at the body centre
    this.player.setTexture(`sk-${this.skater.id}-${this.pose()}`).setRotation(rot).setScale(sx, 1)
      .setPosition(PLAYER_X + (flip ? 0 : Math.sin(rot) * BODY), feetY - (flip ? BODY : Math.cos(rot) * BODY));
    this.player.setAlpha(s.invuln > 0 && s.mode !== 'bail' && Math.floor(s.t * 14) % 2 ? 0.4 : 1);
    const floor = s.mode === 'grind' ? feetY : GROUND - Math.floor(this.sim.level.groundY(s.x) * K);
    this.shadow.setPosition(PLAYER_X, floor + 2).setScale(Phaser.Math.Clamp(1 - (floor - feetY) / 160, 0.4, 1), 1).setVisible(s.mode !== 'grind');

    g.clear();
    for (const p of this.sparks) { g.fillStyle(p.color, 1); g.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size); }
    if (s.mode === 'grind') this.drawBalance(g, feetY - 78, s.balance);

    this.scoreText.setText(String(this.sim.totalScore));
    const n = s.combo.length;
    if (n) {
      this.comboNames.setText((n > 4 ? '… + ' : '') + s.combo.slice(-4).map(c => c.name).join(' + '));
      this.comboTotal.setText(`${comboValue(s.combo)} x${n}`, n !== this.lastCombo ? HYPE[Math.min(n, HYPE.length - 1)] : undefined);
      if (n !== this.lastCombo) { this.comboTotal.setScale(1.5); this.tweens.add({ targets: this.comboTotal, scale: 1 + Math.min(n, 8) * 0.03, duration: 160, ease: 'Back.easeOut' }); }
    } else { this.comboNames.setText(''); this.comboTotal.setText(''); }
    this.lastCombo = n;
  }

  /** Balance meter: a spray-painted bar with a safe zone and a paint-marker needle. */
  private drawBalance(g: Phaser.GameObjects.Graphics, y: number, b: number): void {
    const w = 84, x = PLAYER_X - w / 2, danger = Math.abs(b) > 0.6;
    g.fillStyle(PAL.ink, 1).fillRoundedRect(x - 3, y - 3, w + 6, 13, 6.5);
    g.fillStyle(PAL.pink, 1).fillRoundedRect(x, y, w, 7, 3.5);
    g.fillStyle(PAL.yellow, 1).fillRect(x + w * 0.2, y, w * 0.6, 7);
    g.fillStyle(PAL.green, 1).fillRect(x + w * 0.35, y, w * 0.3, 7);
    const nx = PLAYER_X + b * (w / 2 - 2);
    g.fillStyle(PAL.ink, 1).fillTriangle(nx - 7, y - 9, nx + 7, y - 9, nx, y + 6);
    g.fillStyle(danger ? PAL.pink : PAL.white, 1).fillTriangle(nx - 4.5, y - 7.5, nx + 4.5, y - 7.5, nx, y + 3);
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

    this.add.rectangle(0, 0, AW, AH, PAL.ink, 0.72).setOrigin(0).setDepth(90);
    graf(this, AW / 2, 62, 'SLAMMED', { font: 'piece', size: 60, fill: [PAL.pink, PAL.orange], block: PAL.cyan, angle: -4, outlineWidth: 10 }).setOrigin(0.5);
    graf(this, AW / 2, 128, `${total}`, { font: 'spray', size: 38, fill: [PAL.yellow, PAL.orange], block: PAL.magenta }).setOrigin(0.5);
    graf(this, AW / 2, 176, `best combo ${this.sim.s.bestCombo}   ·   ${this.sim.distance} m   ·   +${gained} xp`, { size: 12 }).setOrigin(0.5);
    if (after > before) {
      const names: string[] = [];
      for (let l = before + 1; l <= after; l++) names.push(...unlocksAt(l).map(t => t.name));
      graf(this, AW / 2, 208, `LEVEL ${after}!` + (names.length ? `  new: ${names.join(', ')}` : ''), { font: 'piece', size: 20, fill: [PAL.green, PAL.cyan], angle: 2 }).setOrigin(0.5);
    }
    this.time.delayedCall(500, () => {
      graf(this, AW / 2 - 90, 266, 'AGAIN!', { font: 'spray', size: 34, fill: [PAL.green, PAL.cyan], block: PAL.plum, angle: -3 }).setOrigin(0.5).button(() => this.scene.restart());
      graf(this, AW / 2 + 110, 268, 'menu', { font: 'piece', size: 26, fill: PAL.white, angle: 3 }).setOrigin(0.5).button(() => this.scene.start('menu'));
      this.input.keyboard?.once('keydown-SPACE', () => this.scene.restart());
    });
  }
}
