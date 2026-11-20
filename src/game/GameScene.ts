import Phaser from 'phaser';
import { botInput } from '../core/bot';
import { CFG, recordedTuning } from '../core/config';
import type { Feature } from '../core/level';
import { levelForXp, unlocksAt, xpFromRun } from '../core/progression';
import { Recorder, inputsOf, simFor } from '../core/replay';
import { Sim, comboValue, type Input, type SimEvent } from '../core/sim';
import { skaterById, type SkaterDef } from '../core/skaters';
import { TRICKS, TRICK_LIST } from '../core/tricks';
import { SPIN_FRAMES, type PoseName } from './art/skater';
import { sfx } from './audio';
import { World, setupCamera } from './backdrop';
import { InputController } from './input';
import { bindFlag, downloadLastRun, playback, saveRun } from './recording';
import { loadSave, writeSave } from './storage';
import { SPRITE, dropFeatureTexture, featureTexture, skaterTex, warmSkater, type SkaterFrame } from './textures';
import { Graf, Num, graf, num, uiPerf, warm, type GrafStyle } from './ui';
import { AH, AW, APP_VERSION, GROUND, K, PAL, PLAYER_X, Z, Z_KEY } from './view';

interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: number; size: number }
const TURN_SECS = 0.22;
const BODY = 28; // art px from feet to the sprite's rotation centre
const ROLL: PoseName[] = ['roll0', 'roll0', 'roll1', 'roll2', 'roll3', 'roll0', 'roll0', 'roll0'];
/** Call-out styles. Fixed set so every trick name can be drawn before the run starts. */
const CALL: Record<'grind' | 'air' | 'bank' | 'bail', GrafStyle> = {
  grind: { font: 'piece', size: 20, fill: [PAL.cyan, PAL.white], block: PAL.ink, outlineWidth: 4.8 },
  air: { font: 'piece', size: 20, fill: [PAL.green, PAL.yellow], block: PAL.ink, outlineWidth: 4.8 },
  bank: { font: 'piece', size: 26, fill: [PAL.yellow, PAL.orange], block: PAL.ink, outlineWidth: 6, ephemeral: true },
  bail: { font: 'piece', size: 28, fill: [PAL.pink, PAL.magenta], block: PAL.ink, outlineWidth: 6.5 },
};
const BAIL_TEXT = { balance: 'LOST IT!', sketchy: 'SKETCHY!', obstacle: 'SLAM!' } as const;
const HYPE = [PAL.white, PAL.white, PAL.cyan, PAL.green, PAL.yellow, PAL.orange, PAL.pink];

/** Thin presentation layer: feeds input to the Sim, draws its state, reacts to its events. No rules here. */
export class GameScene extends Phaser.Scene {
  private sim!: Sim;
  private skater!: SkaterDef;
  private ctl!: InputController;
  private bot = false;
  private acc = 0;
  private bg!: World;
  private fx!: Phaser.GameObjects.Graphics;
  private gfx!: Phaser.GameObjects.Graphics;
  private player!: Phaser.GameObjects.Image;
  private shadow!: Phaser.GameObjects.Image;
  private feats = new Map<number, { f: Feature; img: Phaser.GameObjects.Image; ox: number; oy: number; seen: number }>();
  private frame = 0;
  private frameMs = 16.7;
  private slowMs = 0; private runMs = 0;
  private fpsEl: HTMLElement | null = null;
  private scoreText!: Num;
  private comboNames!: Graf;
  private comboTotal!: Num;
  private lives: Phaser.GameObjects.Image[] = [];
  private sparks: Spark[] = [];
  private airTrickTotal = 0;
  private landT = 0;
  private pushAnim = 0;
  private turnAnim = 0; private turnTo = false;
  private fakieTag!: Graf;
  private lastCombo = 0;
  private finished = false;
  private rec: Recorder | null = null;
  private seed = 0;
  private replayIn: Generator<Input> | null = null;
  private frozen = false;
  private popN = 0;

  constructor() { super('game'); }

  create(): void {
    setupCamera(this);
    const save = loadSave(), q = new URLSearchParams(location.search);
    this.skater = skaterById(save.skaterId);
    this.bot = q.has('bot');
    const seed = q.has('seed') ? Number(q.get('seed')) : (Math.random() * 2 ** 32) >>> 0;
    this.seed = seed; this.frozen = false;
    this.sim = new Sim({ seed, skater: this.skater, playerLevel: levelForXp(save.xp), longRail: q.has('rail') });
    // every human run is recorded (see core/replay.ts); ?replay=<file> plays one back instead
    this.rec = this.bot || playback ? null : new Recorder();
    this.replayIn = null;
    if (playback) {
      // play it back under the settings it was recorded with, then restore ours
      const mine = { ...CFG };
      Object.assign(CFG, recordedTuning(playback.cfg));
      this.events.once('shutdown', () => Object.assign(CFG, mine));
      this.skater = skaterById(playback.skaterId); this.sim = simFor(playback); this.replayIn = inputsOf(playback);
      // ?at=12.5 jumps straight to that second and holds the frame, for looking at one moment
      const at = Number(q.get('at'));
      if (at > 0) { while (this.sim.s.t < at) { const n = this.replayIn.next(); if (n.done) break; this.sim.step(n.value); } this.frozen = true; }
    }
    this.acc = 0; this.sparks = []; this.finished = false; this.lives = []; this.feats = new Map(); this.landT = 0; this.lastCombo = 0;

    this.bg = new World(this);
    this.shadow = this.bg.add(this.add.image(PLAYER_X, GROUND, 'shadow').setAlpha(0.45).setDepth(15));
    warmSkater(this, this.skater.id);
    this.player = this.bg.add(this.add.image(PLAYER_X, GROUND, skaterTex(this, this.skater.id, 'roll0'))
      .setOrigin(SPRITE.ox / SPRITE.frame, (SPRITE.gy + 1 - BODY) / SPRITE.frame).setDepth(20));
    this.fx = this.bg.add(this.add.graphics().setDepth(30));   // pixel sparks: part of the world
    this.gfx = this.add.graphics().setDepth(50);                // balance meter: sharp UI

    graf(this, 12, 5, 'score', { size: 9, fill: PAL.white, angle: -4 });
    this.scoreText = num(this, 12, 34, { font: 'spray', size: 26, fill: [PAL.yellow, PAL.orange], block: PAL.magenta, outlineWidth: 6 }, 0, '0123456789');
    for (let i = 0; i < CFG.lives; i++) this.lives.push(this.add.image(AW - 18 - i * 20, 20, 'wheel').setDepth(100));
    this.comboNames = graf(this, AW / 2, AH - 44, '', { size: 11, fill: PAL.white, align: 'center', ephemeral: true }).setOrigin(0.5, 1);
    this.comboTotal = num(this, AW / 2, AH - 24, { font: 'spray', size: 24, fill: PAL.white, block: PAL.ink, angle: -2, outlineWidth: 6 }, 0.5, '0123456789x');
    this.frame = 0; this.slowMs = 0; this.runMs = 0;
    this.fpsEl = q.has('fps') ? document.getElementById('fps') : null;

    for (const t of TRICK_LIST) { warm(this, t.name.toUpperCase(), CALL[t.type]); warm(this, `FAKIE ${t.name.toUpperCase()}`, CALL[t.type]); }
    this.fakieTag = graf(this, 14, 52, 'FAKIE', { font: 'piece', size: 14, fill: [PAL.cyan, PAL.green], block: PAL.ink, angle: -5 });
    this.fakieTag.img.setVisible(false);
    for (const t of Object.values(BAIL_TEXT)) warm(this, t, CALL.bail);

    this.ctl = new InputController(this, () => this.sim.s.mode, save.tilt);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('menu'));
    this.input.keyboard?.on('keydown-F', () => this.rec?.mark());
    bindFlag(this.rec ? () => this.rec?.mark() : null);
    this.events.once('shutdown', () => { sfx.hush(); bindFlag(null); if (!this.finished && this.rec && this.rec.length > 180) void saveRun(this.snapshot()); for (const { f } of this.feats.values()) dropFeatureTexture(this, f); });
    this.input.keyboard?.on('keydown-M', () => { const sv = loadSave(); sv.mute = !sv.mute; writeSave(sv); sfx.setMuted(sv.mute); });
  }

  update(_t: number, deltaMs: number): void {
    this.frame++;
    // frame pacing stats: drives the ?fps readout and the auto quality step-down
    this.frameMs += (deltaMs - this.frameMs) * 0.05;
    if (!document.hidden && deltaMs < 250 && this.sim.s.mode !== 'over') { this.runMs += deltaMs; if (deltaMs > 22) this.slowMs += deltaMs; }
    if (this.fpsEl && this.frame % 20 === 0) this.fpsEl.textContent = `${(1000 / this.frameMs).toFixed(0)} fps · ${this.frameMs.toFixed(1)} ms · Z${Z} · boot ${uiPerf.bootMs.toFixed(0)} ms`;
    this.acc += Math.min(deltaMs, 100) / 1000;
    while (this.acc >= CFG.dt) {
      this.acc -= CFG.dt;
      if (this.frozen) { this.acc = 0; break; }
      let input: Input;
      if (this.replayIn) { const n = this.replayIn.next(); if (n.done) { this.frozen = true; break; } input = n.value; }
      else input = this.bot ? botInput(this.sim) : this.rec!.push(this.ctl.sample());
      for (const e of this.sim.step(input)) this.onEvent(e);
      this.stepSparks();
      if (this.landT > 0) this.landT -= CFG.dt;
      if (this.pushAnim > 0) this.pushAnim -= CFG.dt;
      if (this.turnAnim > 0) this.turnAnim -= CFG.dt;
    }
    const s = this.sim.s;
    sfx.frame(s.mode, s.speed, s.grind ? (s.grind.kind as 'rail' | 'ledge') : null, s.balance);
    this.draw();
  }

  // ---- events → juice -------------------------------------------------------
  private onEvent(e: SimEvent): void {
    const s = this.sim.s;
    sfx.event(e);
    switch (e.type) {
      case 'grindStart': case 'switchUp': this.popup((e.fakie ? 'Fakie ' : '') + TRICKS[e.trickId].name, 'grind'); break;
      case 'airTrickStart': this.airTrickTotal = TRICKS[e.trickId].duration; break;
      case 'airTrickDone': this.popup((e.fakie ? 'Fakie ' : '') + TRICKS[e.trickId].name, 'air'); break;
      case 'bank': this.popup(`+${e.points}`, 'bank');
        // no full-screen flash (it read as a glitch and is unkind to photosensitive players): pop the score instead
        this.scoreText.setScale(1.35); this.tweens.add({ targets: this.scoreText, scale: 1, duration: 220, ease: 'Back.easeOut' });
        break;
      case 'land': this.landT = 0.12; this.burst(6, 0xd8d8e8, 3); break;
      case 'turn': this.turnAnim = TURN_SECS; this.turnTo = e.fakie; break;
      case 'push': this.pushAnim = 0.36; this.burst(5, 0xd8d8e8, 2); break;
      case 'bail':
        this.popup(BAIL_TEXT[e.reason], 'bail');
        this.cameras.main.shake(200, 0.01); this.burst(14, PAL.pink, 3);
        break;
      case 'over': this.finish(); break;
    }
    this.lives.forEach((img, i) => img.setAlpha(i < s.lives ? 1 : 0.25).setTint(i < s.lives ? 0xffffff : 0x555577));
  }

  /** A trick call-out: slaps in like a sticker, then fades. */
  private popup(text: string, kind: keyof typeof CALL): void {
    const t = graf(this, PLAYER_X + 40, 176 - (this.popN++ % 4) * 30, text.toUpperCase(), CALL[kind]).setOrigin(0, 0.5);
    t.angle = Phaser.Math.Between(-9, 5);
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
  private pose(): SkaterFrame {
    const s = this.sim.s;
    if (s.mode === 'grind') return s.grindTrick as PoseName;
    if (s.mode === 'bail') return s.bailTimer > CFG.bailTime * 0.45 ? 'bail0' : 'bail1';
    if (s.mode === 'over') return 'bail1';
    if (s.mode === 'air') {
      if (s.airTrick) {
        const id = s.airTrick.id;
        if (id.startsWith('spin')) {
          // turnaround frames: the body actually rotates through side → back → side → front (started fakie = start facing left)
          const p = 1 - s.airTrick.timeLeft / (this.airTrickTotal || 1), turns = Number(id.slice(4)) / 360;
          return `spin${(Math.floor(p * turns * SPIN_FRAMES + 0.5) + (s.airTrick.fakie ? SPIN_FRAMES / 2 : 0)) % SPIN_FRAMES}`;
        }
        return (['mute', 'safety', 'stale', 'rocket', 'liukang'] as const).find(n => n === id) ?? 'jump';
      }
      return s.vy > 40 ? 'jump' : 'fall';
    }
    if (this.turnAnim > 0) {
      // pivot through the turnaround frames: half a turn, starting from whichever way we were facing
      const p = 1 - this.turnAnim / TURN_SECS, from = this.turnTo ? 0 : SPIN_FRAMES / 2;
      return `spin${(from + Math.round(p * (SPIN_FRAMES / 2))) % SPIN_FRAMES}`;
    }
    if (this.landT > 0) return 'land';
    if (this.pushAnim > 0) return this.pushAnim > 0.24 ? 'roll1' : this.pushAnim > 0.1 ? 'roll2' : 'roll3';   // a real push stride
    return ROLL[Math.floor(s.t * 9) % ROLL.length];
  }

  private draw(): void {
    const s = this.sim.s, camW = s.x - PLAYER_X / K, g = this.gfx;
    this.bg.scroll(camW * K);

    // level features: one sprite each, created as they scroll in and released behind us
    for (const f of this.sim.level.features) {
      const x = Math.floor((f.x - camW) * K);
      if (x > AW + 20) break;                       // features are sorted by x
      if (x + f.w * K < -40) continue;
      let e = this.feats.get(f.id);
      if (!e) { const t = featureTexture(this, f); e = { f, img: this.bg.add(this.add.image(0, 0, t.key).setOrigin(0).setDepth(10)), ox: t.ox, oy: t.oy, seen: 0 }; this.feats.set(f.id, e); }
      e.seen = this.frame;
      e.img.setPosition(x - e.ox, GROUND - e.oy + 1);
    }
    if (this.frame % 30 === 0) for (const [id, e] of this.feats) if (e.seen < this.frame) { this.bg.remove(e.img); dropFeatureTexture(this, e.f); this.feats.delete(id); }

    // player
    const feetY = Math.floor(GROUND - s.y * K);
    let rot = 0;
    if (s.airTrick) {
      const tr = TRICKS[s.airTrick.id], p = 1 - s.airTrick.timeLeft / (this.airTrickTotal || tr.duration);
      if (tr.id === 'backflip' || tr.id === 'misty') rot = -p * Math.PI * 2;
    } else if (s.mode === 'grind') rot = s.balance * 0.3;
    else if (s.mode === 'air') rot = Phaser.Math.Clamp(-s.vy / 2600, -0.12, 0.16);
    const flip = !!s.airTrick && rot !== 0;
    // lean pivots at the feet; flips pivot at the body centre
    const frame = this.pose();
    // fakie = the same sprites mirrored: facing left while still travelling right. Turnaround frames carry their own facing.
    const backwards = s.mode === 'grind' ? s.grindFakie : s.airTrick ? s.airTrick.fakie : s.fakie;
    this.player.setFlipX(backwards && !frame.startsWith('spin'));
    this.fakieTag.img.setVisible(s.fakie && s.mode !== 'bail' && s.mode !== 'over');
    this.player.setTexture(skaterTex(this, this.skater.id, frame)).setRotation(backwards ? -rot : rot)
      .setPosition(PLAYER_X + (flip ? 0 : Math.sin(rot) * BODY), feetY - (flip ? BODY : Math.cos(rot) * BODY));
    this.player.setAlpha(s.invuln > 0 && s.mode !== 'bail' && Math.floor(s.t * 14) % 2 ? 0.4 : 1);
    const floor = s.mode === 'grind' ? feetY : GROUND - Math.floor(this.sim.level.groundY(s.x) * K);
    this.shadow.setPosition(PLAYER_X, floor + 2).setScale(Phaser.Math.Clamp(1 - (floor - feetY) / 160, 0.4, 1), 1).setVisible(s.mode !== 'grind');

    g.clear(); this.fx.clear();
    for (const p of this.sparks) { this.fx.fillStyle(p.color, 1); this.fx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size); }
    if (s.mode === 'grind') this.drawBalance(g, feetY - 78, s.balance);

    this.bg.flush();

    this.scoreText.setText(String(this.sim.totalScore));
    const n = s.combo.length;
    if (n) {
      this.comboTotal.setVisible(true).setText(`${comboValue(s.combo)} x${n}`);
      if (n !== this.lastCombo) {
        // names only change when a trick is added — never restamp text per frame
        this.comboNames.setText((n > 4 ? '… + ' : '') + s.combo.slice(-4).map(c => c.name).join(' + '));
        this.comboTotal.setScale(1.5);
        this.tweens.add({ targets: this.comboTotal, scale: 1 + Math.min(n, 8) * 0.03, duration: 160, ease: 'Back.easeOut' });
      }
      this.comboTotal.setTint(HYPE[Math.min(n, HYPE.length - 1)]);
    } else if (this.lastCombo) { this.comboNames.setText(''); this.comboTotal.setVisible(false); }
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
  private snapshot() {
    return this.rec!.finish({ app: APP_VERSION, device: `${navigator.userAgent} · ${screen.width}x${screen.height}@${devicePixelRatio} · Z${Z}`, seed: this.seed, skaterId: this.skater.id, playerLevel: levelForXp(loadSave().xp), longRail: new URLSearchParams(location.search).has('rail') }, this.sim);
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    bindFlag(null);
    if (this.rec) {
      // snapshot BEFORE xp is added below, so the recorded level is the one the run was played at
      const rec = this.snapshot();
      void saveRun(rec).then(file => {
        if (!this.scene.isActive()) return;
        const note = graf(this, AW / 2, AH - 14, file ? `run recorded${rec.marks.length ? ` · ${rec.marks.length} flag${rec.marks.length > 1 ? 's' : ''}` : ''}` : 'tap to save this run to a file', { size: 8, fill: PAL.steel, ephemeral: true }).setOrigin(0.5);
        if (!file) note.button(downloadLastRun);
      });
    }
    const save = loadSave(), total = this.sim.totalScore, before = levelForXp(save.xp);
    const real = !this.bot && !playback;
    const gained = real ? xpFromRun(total) : 0;
    save.xp += gained; save.best = Math.max(save.best, real ? total : 0);
    writeSave(save);
    const after = levelForXp(save.xp);
    // couldn't hold 60fps for a good part of a real run → render one zoom step lower from the next launch
    if (!this.bot && this.runMs > 8000 && this.slowMs / this.runMs > 0.3 && Z > 2) localStorage.setItem(Z_KEY, String(Z - 1));

    this.add.rectangle(0, 0, AW, AH, PAL.ink, 0.72).setOrigin(0).setDepth(90);
    graf(this, AW / 2, 62, 'SLAMMED', { font: 'piece', size: 60, fill: [PAL.pink, PAL.orange], block: PAL.cyan, angle: -4, outlineWidth: 10 }).setOrigin(0.5);
    num(this, AW / 2, 128, { font: 'spray', size: 26, fill: [PAL.yellow, PAL.orange], block: PAL.magenta, outlineWidth: 6 }, 0.5, '0123456789').setText(`${total}`).setScale(1.45);
    graf(this, AW / 2, 176, `best combo ${this.sim.s.bestCombo}   ·   ${this.sim.distance} m   ·   +${gained} xp`, { size: 12, ephemeral: true }).setOrigin(0.5);
    if (after > before) {
      const names: string[] = [];
      for (let l = before + 1; l <= after; l++) names.push(...unlocksAt(l).map(t => t.name));
      graf(this, AW / 2, 208, `LEVEL ${after}!` + (names.length ? `  new: ${names.join(', ')}` : ''), { font: 'piece', size: 20, fill: [PAL.green, PAL.cyan], angle: 2, ephemeral: true }).setOrigin(0.5);
    }
    this.time.delayedCall(500, () => {
      graf(this, AW / 2 - 90, 266, 'AGAIN!', { font: 'spray', size: 34, fill: [PAL.green, PAL.cyan], block: PAL.plum, angle: -3 }).setOrigin(0.5).button(() => this.scene.restart());
      graf(this, AW / 2 + 110, 268, 'menu', { font: 'piece', size: 26, fill: PAL.white, angle: 3 }).setOrigin(0.5).button(() => this.scene.start('menu'));
      this.input.keyboard?.once('keydown-SPACE', () => this.scene.restart());
    });
  }
}
