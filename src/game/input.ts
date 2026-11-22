import Phaser from 'phaser';
import type { Dir, Input, Mode } from '../core/sim';
import { AW } from './view';
import { CFG } from '../core/config';
import { PAD_DOWN, PAD_LEFT, PAD_RIGHT, PAD_UP, PadView, padChord, padHit, padsActive, setPadsLefty } from './pads';

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const SWIPE_PX = 16, TAP_MS = 220, BALANCE_PX = 38; // art units (640 wide)
const PAD_TRICK: Dir[] = ['up', 'right', 'down', 'left'];

/**
 * Turns touch / keyboard / tilt into core `Input`.
 *
 * Touch has two layouts, chosen by CFG.touchLayout (P-13, see pads.ts):
 *   1 = button pads that mirror the keyboard. Left pad is the arrow keys (↑ jump, ← turn / lean left,
 *       → push / lean right, ↓ drop off a rail), right pad is W A S D (tricks). Each button means exactly what its key means.
 *   0 = thumb zones and swipes, as before:
 *   Left thumb  = body:   press to jump (hold = higher). While grinding: hold + drag sideways
 *                         to balance, quick tap to jump off.
 *   Right thumb = tricks: swipe a direction (tap = up). On the ground a tap is a push and a left swipe turns you round (fakie).
 *   Keyboard: SPACE jump, WASD tricks, ←/→ balance; on the ground → pushes and ← turns you round; in the air ← (or a right-thumb tap) is a 180; ↓ on a rail drops you off it.
 */
export class InputController {
  private jumpQueued = false;
  private jumpHeld = false;
  private trickQueued: Dir | null = null;
  private trickNext: Dir | null = null;   // P-14: a second trick button pressed in the same instant goes out on the next step
  private pushQueued = false;
  private turnQueued = false;
  private dropQueued = false;
  private touchBalance = 0;
  private tilt = 0;
  private left: { id: number; x: number; t: number; moved: boolean } | null = null;
  private right: { id: number; x: number; y: number; fired: boolean } | null = null;
  private pads: PadView | null = null;
  private padL = { id: -1, btn: -1 };
  private padR = { id: -1, fired: 0 };   // fired: bitmask of the trick buttons this touch has pressed
  private padBalance = 0;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private onOrient = (e: DeviceOrientationEvent) => {
    const angle = (screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0) as number;
    const v = angle === 90 ? e.beta : angle === 270 || angle === -90 ? -(e.beta ?? 0) : e.gamma;
    this.tilt = clamp((v ?? 0) / 18);
  };

  constructor(private scene: Phaser.Scene, private getMode: () => Mode, tilt: boolean, lefty = false) {
    scene.input.addPointer(2);
    setPadsLefty(lefty);
    if (padsActive()) this.pads = new PadView(scene);
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('SPACE,W,A,S,D,LEFT,RIGHT,UP,DOWN') as Record<string, Phaser.Input.Keyboard.Key>;
      const trick = (k: string, d: Dir) => this.keys[k].on('down', () => { this.trickQueued = d; });
      trick('W', 'up'); trick('A', 'left'); trick('S', 'down'); trick('D', 'right');
      const jump = () => { this.jumpQueued = true; };
      // arrows steer balance on a rail; on the ground → is a push
      this.keys.RIGHT.on('down', () => { if (this.getMode() === 'ground') this.pushQueued = true; });
      this.keys.LEFT.on('down', () => { const m = this.getMode(); if (m === 'ground' || (m === 'air' && CFG.airTurn)) this.turnQueued = true; });
      this.keys.SPACE.on('down', jump); this.keys.UP.on('down', jump);
      this.keys.DOWN.on('down', () => { this.dropQueued = true; });   // P-17: step down off a rail
    }
    if (tilt) window.addEventListener('deviceorientation', this.onOrient);
    scene.events.once('shutdown', () => window.removeEventListener('deviceorientation', this.onOrient));
  }

  /** iOS Safari needs this called from a tap. Resolves true when tilt can be used. */
  static async requestTilt(): Promise<boolean> {
    const D = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (!D) return false;
    if (typeof D.requestPermission !== 'function') return true;
    try { return (await D.requestPermission()) === 'granted'; } catch { return false; }
  }

  /** After a pause: forget anything held or queued, since the release may have happened while the game wasn't listening. */
  reset(): void {
    if (this.pads) { this.dropLeft(); this.dropRight(); this.padL.id = -1; this.padR.id = -1; }
    this.left = null; this.right = null; this.touchBalance = 0; this.jumpHeld = false;
    this.jumpQueued = false; this.trickQueued = null; this.trickNext = null; this.pushQueued = false; this.turnQueued = false; this.dropQueued = false;
    for (const k of Object.values(this.keys)) k.reset();
  }
  /** The run is over: take the pads off the results screen. */
  hidePads(): void { this.pads?.hide(); }

  // ---- layout 1: button pads. Each handler does what the matching key's handler does. ----
  private holdLeft(btn: number): void {
    this.padL.btn = btn; this.pads!.press(btn, true);
    const m = this.getMode();
    if (btn === PAD_UP) { this.jumpHeld = true; this.jumpQueued = true; }
    else if (btn === PAD_RIGHT) { this.padBalance = 1; if (m === 'ground') this.pushQueued = true; }
    else if (btn === PAD_DOWN) this.dropQueued = true;
    else if (btn === PAD_LEFT) { this.padBalance = -1; if (m === 'ground' || (m === 'air' && CFG.airTurn)) this.turnQueued = true; }
  }
  private dropLeft(): void {
    if (this.padL.btn >= 0) this.pads!.press(this.padL.btn, false);
    this.padL.btn = -1; this.jumpHeld = false; this.padBalance = 0;
  }
  /** Press a trick button for the right-pad touch. One touch presses each button at most once, so a thumb wobbling on a border can't machine-gun. */
  private fireTrick(btn: number): void {
    const bit = 1 << (btn - 4);
    if (this.padR.fired & bit) return;
    this.padR.fired |= bit; this.pads!.press(btn, true);
    if (this.trickQueued === null) this.trickQueued = PAD_TRICK[btn - 4]; else this.trickNext = PAD_TRICK[btn - 4];
  }
  private dropRight(): void {
    for (let b = 4; b < 8; b++) if (this.padR.fired & (1 << (b - 4))) this.pads!.press(b, false);
    this.padR.fired = 0;
  }
  private padDown(p: Phaser.Input.Pointer): void {
    const b = padHit(p.worldX, p.worldY);
    if (b < 0) return;
    if (b < 4) { this.dropLeft(); this.padL.id = p.id; this.holdLeft(b); }
    else {
      // a second finger is a new press: it may hit any button again
      this.dropRight(); this.padR.id = p.id;
      this.fireTrick(b);
      const c = padChord(p.worldX, p.worldY); if (c >= 4) this.fireTrick(c);     // P-14: between two buttons = both, nearest first
    }
  }
  /**
   * Sliding the left thumb onto another button is letting go of one key and pressing the next (how you rock ← → on a rail).
   * P-14: rolling the right thumb onto another trick button presses that one too.
   */
  private padMove(p: Phaser.Input.Pointer): void {
    if (p.id === this.padL.id && this.padL.btn >= 0) {
      const b = padHit(p.worldX, p.worldY);
      if (b >= 0 && b < 4 && b !== this.padL.btn) { this.dropLeft(); this.holdLeft(b); }
    } else if (p.id === this.padR.id && CFG.padChordDeg > 0) {
      const b = padHit(p.worldX, p.worldY);
      if (b < 4) return;
      this.fireTrick(b);
      const c = padChord(p.worldX, p.worldY); if (c >= 4) this.fireTrick(c);
    }
  }
  private padUp(p: Phaser.Input.Pointer): void {
    if (p.id === this.padL.id) { this.dropLeft(); this.padL.id = -1; }
    else if (p.id === this.padR.id) { this.dropRight(); this.padR.id = -1; }
  }

  // ---- layout 0: thumb zones and swipes ----
  private down(p: Phaser.Input.Pointer): void {
    if (this.pads) { this.padDown(p); return; }
    if (p.worldX < AW / 2) {
      this.left = { id: p.id, x: p.worldX, t: this.scene.time.now, moved: false };
      this.jumpHeld = true;
      if (this.getMode() !== 'grind') this.jumpQueued = true;
    } else {
      this.right = { id: p.id, x: p.worldX, y: p.worldY, fired: false };
    }
  }
  private move(p: Phaser.Input.Pointer): void {
    if (this.pads) { this.padMove(p); return; }
    if (this.left?.id === p.id) {
      const dx = p.worldX - this.left.x;
      if (Math.abs(dx) > 6) this.left.moved = true;
      this.touchBalance = clamp(dx / BALANCE_PX);
    } else if (this.right?.id === p.id && !this.right.fired) {
      const dx = p.worldX - this.right.x, dy = p.worldY - this.right.y;
      if (Math.hypot(dx, dy) > SWIPE_PX) {
        this.trickQueued = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        // on the ground a left swipe turns you round (the sim undoes it if a jump follows at once: then it was a trick)
        if (this.trickQueued === 'left' && this.getMode() === 'ground') this.turnQueued = true;
        this.right.fired = true;
      }
    }
  }
  private up(p: Phaser.Input.Pointer): void {
    if (this.pads) { this.padUp(p); return; }
    if (this.left?.id === p.id) {
      if (this.getMode() === 'grind' && !this.left.moved && this.scene.time.now - this.left.t < TAP_MS) this.jumpQueued = true;
      this.left = null; this.jumpHeld = false; this.touchBalance = 0;
    } else if (this.right?.id === p.id) {
      // a tap: on the ground it is a push (and still counts as an 'up' swipe if a jump follows straight away);
      // in the air it turns you round (P-12; the up trick if that is switched off); on a grind it is the up switch-up
      if (!this.right.fired) {
        const m = this.getMode();
        if (m === 'air' && CFG.airTurn) this.turnQueued = true; else this.trickQueued = 'up';
        if (m === 'ground') this.pushQueued = true;
      }
      this.right = null;
    }
  }

  /** Call once per sim step; edge-triggered inputs are consumed. */
  sample(): Input {
    const k = this.keys;
    const kb = (k.RIGHT?.isDown ? 1 : 0) - (k.LEFT?.isDown ? 1 : 0);
    const input: Input = {
      jumpPressed: this.jumpQueued,
      jumpHeld: this.jumpHeld || !!k.SPACE?.isDown || !!k.UP?.isDown,
      trick: this.trickQueued,
      balance: clamp(kb + this.touchBalance + this.padBalance + this.tilt),
      push: this.pushQueued,
      turn: this.turnQueued,
      drop: this.dropQueued,
    };
    this.jumpQueued = false; this.trickQueued = this.trickNext; this.trickNext = null; this.pushQueued = false; this.turnQueued = false; this.dropQueued = false;
    return input;
  }
}
