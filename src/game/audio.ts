import type { Mode, SimEvent } from '../core/sim';

/**
 * Sound effects, synthesised with WebAudio — no audio files. Driven only by SimEvents and
 * a little per-frame state, so it can't affect gameplay.
 *
 * Rules:
 *  - The AudioContext is created on the first tap/key (browsers block audio before a gesture).
 *  - One-shots build a few short-lived nodes per event; the two loops (roll, grind) are built once
 *    and only have their gain/filter nudged. Nothing here allocates per frame.
 *  - To add a sound: write a recipe in `ONE_SHOTS`, then trigger it from `event()` or `play()`.
 */
type Ctx = BaseAudioContext;
type Recipe = (c: Ctx, out: AudioNode, t: number, v: number) => void;

let noiseBuf: AudioBuffer | null = null;
const noise = (c: Ctx): AudioBufferSourceNode => {
  if (!noiseBuf || noiseBuf.sampleRate !== c.sampleRate) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let s = 22222;                                    // deterministic white noise
    for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = (s / 2147483647) * 2 - 1; }
  }
  const n = c.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  return n;
};
/** Gain node with a fast attack and exponential decay — the envelope for every one-shot. */
const env = (c: Ctx, out: AudioNode, t: number, peak: number, dur: number, attack = 0.004): GainNode => {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  return g;
};
const tone = (c: Ctx, out: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number) => {
  const o = c.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  o.connect(env(c, out, t, peak, dur)); o.start(t); o.stop(t + dur + 0.02);
};
const hiss = (c: Ctx, out: AudioNode, t: number, type: BiquadFilterType, f0: number, f1: number, q: number, dur: number, peak: number) => {
  const n = noise(c), f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  n.connect(f); f.connect(env(c, out, t, peak, dur)); n.start(t, (t * 7.3) % 1.5); n.stop(t + dur + 0.02);
};

/** Every one-shot sound. `v` is an optional intensity (e.g. combo size). */
export const ONE_SHOTS = {
  jump: (c, o, t) => { hiss(c, o, t, 'highpass', 1800, 4000, 0.7, 0.07, 0.22); tone(c, o, t, 'triangle', 190, 430, 0.09, 0.28); },
  launch: (c, o, t) => { hiss(c, o, t, 'bandpass', 350, 2400, 1.2, 0.32, 0.8); tone(c, o, t, 'triangle', 140, 520, 0.2, 0.22); },
  push: (c, o, t) => { hiss(c, o, t, 'bandpass', 500, 1400, 1.2, 0.2, 0.7); tone(c, o, t, 'sine', 120, 70, 0.1, 0.35); },
  turn: (c, o, t) => { hiss(c, o, t, 'bandpass', 1800, 900, 2, 0.14, 0.7); },
  land: (c, o, t) => { tone(c, o, t, 'sine', 150, 52, 0.14, 0.7); hiss(c, o, t, 'lowpass', 1400, 300, 0.7, 0.09, 0.35); },
  grindStart: (c, o, t) => {                          // skate locks onto steel: clank + ring
    hiss(c, o, t, 'bandpass', 3000, 2200, 3, 0.06, 0.5);
    tone(c, o, t, 'square', 1870, 1840, 0.16, 0.1); tone(c, o, t, 'square', 2790, 2760, 0.12, 0.07); tone(c, o, t, 'sine', 180, 90, 0.08, 0.4);
  },
  switchUp: (c, o, t) => { hiss(c, o, t, 'bandpass', 2400, 4200, 4, 0.08, 0.9); tone(c, o, t, 'square', 1500, 2300, 0.07, 0.12); },
  airTrick: (c, o, t) => { hiss(c, o, t, 'bandpass', 700, 2600, 1.5, 0.16, 0.8); },
  trickDone: (c, o, t) => { tone(c, o, t, 'triangle', 660, 990, 0.09, 0.22); tone(c, o, t + 0.05, 'triangle', 990, 1320, 0.09, 0.18); },
  bank: (c, o, t, v) => {                             // combo banked: rising stabs, more notes for bigger combos
    const notes = [523, 659, 784, 1047, 1319, 1568], n = Math.min(notes.length, 2 + Math.floor(v));
    for (let i = 0; i < n; i++) { tone(c, o, t + i * 0.055, 'square', notes[i], notes[i], 0.11, 0.11); tone(c, o, t + i * 0.055, 'triangle', notes[i] / 2, notes[i] / 2, 0.11, 0.16); }
  },
  bail: (c, o, t) => { hiss(c, o, t, 'lowpass', 2600, 180, 0.8, 0.38, 0.75); tone(c, o, t, 'sawtooth', 210, 48, 0.3, 0.3); tone(c, o, t + 0.09, 'sine', 110, 40, 0.2, 0.5); },
  over: (c, o, t) => { [392, 330, 262, 196].forEach((f, i) => tone(c, o, t + i * 0.13, 'triangle', f, f * 0.97, 0.22, 0.24)); },
  tap: (c, o, t) => { tone(c, o, t, 'square', 880, 660, 0.05, 0.16); },
  go: (c, o, t) => { tone(c, o, t, 'square', 440, 440, 0.07, 0.12); tone(c, o, t + 0.07, 'square', 660, 660, 0.07, 0.12); tone(c, o, t + 0.14, 'square', 880, 880, 0.14, 0.14); },
} satisfies Record<string, Recipe>;
export type SoundName = keyof typeof ONE_SHOTS;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private roll: { g: GainNode; f: BiquadFilterNode } | null = null;
  private grind: { g: GainNode; f: BiquadFilterNode; ring: GainNode } | null = null;
  private muted = false;
  private state = '';
  private tick = 0;

  /** Call once at startup. Audio starts on the first gesture after this. */
  init(muted: boolean): void {
    this.muted = muted;
    const unlock = () => { this.ensure(); void this.ctx?.resume(); };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    document.addEventListener('visibilitychange', () => { if (document.hidden) void this.ctx?.suspend(); else if (this.ctx) void this.ctx.resume(); });
  }
  private ensure(): void {
    if (this.ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC({ latencyHint: 'interactive' });
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6; comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.8; this.master.connect(comp);
    // roll loop: wheels on pavement = band-passed noise, pitch follows speed
    const rn = noise(c), rf = c.createBiquadFilter(), rg = c.createGain(); rf.type = 'bandpass'; rf.Q.value = 0.8; rf.frequency.value = 500; rg.gain.value = 0;
    rn.connect(rf); rf.connect(rg); rg.connect(this.master); rn.start();
    this.roll = { g: rg, f: rf };
    // grind loop: scrape (resonant noise) + a faint metallic ring
    const gn = noise(c), gf = c.createBiquadFilter(), gg = c.createGain(); gf.type = 'bandpass'; gf.Q.value = 5; gf.frequency.value = 3000; gg.gain.value = 0;
    gn.connect(gf); gf.connect(gg); gg.connect(this.master); gn.start(0, 0.7);
    const ring = c.createGain(); ring.gain.value = 0; ring.connect(gg);
    for (const [f, type] of [[2140, 'square'], [3210, 'square'], [1070, 'sawtooth']] as const) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.connect(ring); o.start(); }
    this.grind = { g: gg, f: gf, ring };
  }

  get isMuted(): boolean { return this.muted; }
  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx && this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.02);
  }

  play(name: SoundName, v = 0): void {
    if (!this.ctx || !this.master || this.muted || this.ctx.state !== 'running') return;
    ONE_SHOTS[name](this.ctx, this.master, this.ctx.currentTime + 0.005, v);
  }

  /** Map a simulation event to its sound. */
  event(e: SimEvent): void {
    switch (e.type) {
      case 'jump': this.play('jump'); break;
      case 'launch': this.play('launch'); break;
      case 'land': this.play('land'); break;
      case 'push': this.play('push'); break;
      case 'turn': this.play('turn'); break;
      case 'grindStart': this.play('grindStart'); break;
      case 'switchUp': this.play('switchUp'); break;
      case 'airTrickStart': this.play('airTrick'); break;
      case 'airTrickDone': this.play('trickDone'); break;
      case 'bank': this.play('bank', e.count); break;
      case 'bail': this.play('bail'); break;
      case 'over': this.play('over'); break;
    }
  }

  /**
   * Keep the loops in step with the game. Called every frame but only touches the audio
   * graph when the state changes or a few times a second for the speed-linked pitch.
   */
  frame(mode: Mode, speed: number, surface: 'rail' | 'ledge' | null, balance: number): void {
    const c = this.ctx; if (!c || !this.roll || !this.grind) return;
    const state = mode === 'grind' ? `g${surface}` : mode;
    const changed = state !== this.state;
    if (!changed && ++this.tick % 6) return;
    this.state = state;
    const t = c.currentTime;
    this.roll.g.gain.setTargetAtTime(mode === 'ground' ? 0.05 + Math.min(0.09, speed / 3200) : 0, t, changed ? 0.015 : 0.08);
    this.roll.f.frequency.setTargetAtTime(260 + speed * 2.6, t, 0.1);
    const on = mode === 'grind';
    this.grind.g.gain.setTargetAtTime(on ? 0.16 : 0, t, 0.02);
    if (on) {
      // concrete is duller and grittier than steel; wobble pushes the pitch around
      this.grind.f.frequency.setTargetAtTime((surface === 'ledge' ? 1500 : 3000) * (1 + Math.abs(balance) * 0.35) + speed, t, 0.05);
      this.grind.f.Q.setTargetAtTime(surface === 'ledge' ? 1.6 : 5, t, 0.05);
      this.grind.ring.gain.setTargetAtTime(surface === 'ledge' ? 0.004 : 0.02, t, 0.05);
    }
  }
  /** Silence the loops (scene change, run over). */
  hush(): void { this.frame('over', 0, null, 0); }

  /**
   * Renders every one-shot offline and reports loudness, so tools can confirm each sound
   * actually produces signal and none clips. (Nothing can check how it *sounds* — that's a human job.)
   */
  async selfTest(): Promise<Record<string, { peak: number; rms: number }>> {
    const out: Record<string, { peak: number; rms: number }> = {};
    for (const name of Object.keys(ONE_SHOTS) as SoundName[]) {
      const oc = new OfflineAudioContext(1, 44100, 44100);
      ONE_SHOTS[name](oc, oc.destination, 0.01, 3);
      const d = (await oc.startRendering()).getChannelData(0);
      let peak = 0, sum = 0;
      for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
      out[name] = { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4) };
    }
    return out;
  }
}

export const sfx = new Sfx();
