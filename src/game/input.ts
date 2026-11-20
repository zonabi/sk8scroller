import Phaser from 'phaser';
import type { Dir, Input, Mode } from '../core/sim';
import { AW } from './view';

const clamp = (v: number) => Math.max(-1, Math.min(1, v));
const SWIPE_PX = 16, TAP_MS = 220, BALANCE_PX = 38; // art units (640 wide)

/**
 * Turns touch / keyboard / tilt into core `Input`.
 *   Left thumb  = body:   press to jump (hold = higher). While grinding: hold + drag sideways
 *                         to balance, quick tap to jump off.
 *   Right thumb = tricks: swipe a direction (tap = up). On the ground a tap is a push and a left swipe turns you round (fakie).
 *   Keyboard: SPACE jump, WASD tricks, ←/→ balance; on the ground → pushes and ← turns you round.
 */
export class InputController {
  private jumpQueued = false;
  private jumpHeld = false;
  private trickQueued: Dir | null = null;
  private pushQueued = false;
  private turnQueued = false;
  private touchBalance = 0;
  private tilt = 0;
  private left: { id: number; x: number; t: number; moved: boolean } | null = null;
  private right: { id: number; x: number; y: number; fired: boolean } | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private onOrient = (e: DeviceOrientationEvent) => {
    const angle = (screen.orientation?.angle ?? (window as { orientation?: number }).orientation ?? 0) as number;
    const v = angle === 90 ? e.beta : angle === 270 || angle === -90 ? -(e.beta ?? 0) : e.gamma;
    this.tilt = clamp((v ?? 0) / 18);
  };

  constructor(private scene: Phaser.Scene, private getMode: () => Mode, tilt: boolean) {
    scene.input.addPointer(2);
    scene.input.on('pointerdown', this.down, this);
    scene.input.on('pointermove', this.move, this);
    scene.input.on('pointerup', this.up, this);
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('SPACE,W,A,S,D,LEFT,RIGHT,UP') as Record<string, Phaser.Input.Keyboard.Key>;
      const trick = (k: string, d: Dir) => this.keys[k].on('down', () => { this.trickQueued = d; });
      trick('W', 'up'); trick('A', 'left'); trick('S', 'down'); trick('D', 'right');
      const jump = () => { this.jumpQueued = true; };
      // arrows steer balance on a rail; on the ground → is a push
      this.keys.RIGHT.on('down', () => { if (this.getMode() === 'ground') this.pushQueued = true; });
      this.keys.LEFT.on('down', () => { if (this.getMode() === 'ground') this.turnQueued = true; });
      this.keys.SPACE.on('down', jump); this.keys.UP.on('down', jump);
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

  private down(p: Phaser.Input.Pointer): void {
    if (p.worldX < AW / 2) {
      this.left = { id: p.id, x: p.worldX, t: this.scene.time.now, moved: false };
      this.jumpHeld = true;
      if (this.getMode() !== 'grind') this.jumpQueued = true;
    } else {
      this.right = { id: p.id, x: p.worldX, y: p.worldY, fired: false };
    }
  }
  private move(p: Phaser.Input.Pointer): void {
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
    if (this.left?.id === p.id) {
      if (this.getMode() === 'grind' && !this.left.moved && this.scene.time.now - this.left.t < TAP_MS) this.jumpQueued = true;
      this.left = null; this.jumpHeld = false; this.touchBalance = 0;
    } else if (this.right?.id === p.id) {
      // a tap: on the ground it is a push (and still counts as an 'up' swipe if a jump follows straight away); in the air it is the up trick
      if (!this.right.fired) { this.trickQueued = 'up'; if (this.getMode() === 'ground') this.pushQueued = true; }
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
      balance: clamp(kb + this.touchBalance + this.tilt),
      push: this.pushQueued,
      turn: this.turnQueued,
    };
    this.jumpQueued = false; this.trickQueued = null; this.pushQueued = false; this.turnQueued = false;
    return input;
  }
}
