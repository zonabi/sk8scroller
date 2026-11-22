import '@fontsource/sedgwick-ave-display';
import '@fontsource/permanent-marker';
import '@fontsource/rubik-spray-paint';
import Phaser from 'phaser';
import { sfx } from './audio';
import { BootScene } from './BootScene';
import { initFullscreen } from './fullscreen';
import { GameScene } from './GameScene';
import { bootMark, loading } from './loading';
import { MenuScene } from './MenuScene';
import { initPause } from './pause';
import { initFlag, loadPlayback } from './recording';
import { loadSave } from './storage';
import { loadTuning } from './tuning';
import { uiPerf } from './ui';
import { AH, AW, FONT, PAL, Z } from './view';

bootMark('code');   // page load → scripts downloaded, parsed and running
// Fonts must be ready before any text or wall graffiti is rasterised.
await Promise.all([FONT.piece, FONT.marker, FONT.spray].map(f => document.fonts.load(`32px ${f}`, 'SK8 scroller 0123')));

loadTuning();
await loadPlayback();
bootMark('fonts');
initFlag();
initPause();
initFullscreen();
sfx.init(loadSave().mute);
(window as unknown as { __sk8audio: unknown }).__sk8audio = sfx;
loading.fontsReady();
loading.stage('shaking the cans', 0.15);

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: AW * Z,
  height: AH * Z,
  backgroundColor: PAL.ink,
  // Not `pixelArt: true`: sprites get nearest filtering per texture (see textures.ts) while text stays smooth.
  antialias: true,
  // No MSAA on the backbuffer: at up to 2560x1440 it is a large fill-rate cost and sprites don't need it.
  antialiasGL: false,
  // One texture per batch: multi-texture batching drew Text quads with the wrong texture (seen in Phaser 4.2.1).
  maxTextures: 1,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [BootScene, MenuScene, GameScene],
});
// handy for debugging and for agents driving the game from a browser console
(window as unknown as { __sk8: unknown }).__sk8 = game;
// CPU time per frame (step + render submission), read by tools/perf.mjs
let t0 = 0;
game.events.on('prestep', () => { t0 = performance.now(); });
game.events.on('postrender', () => { uiPerf.cpuMs += performance.now() - t0; uiPerf.frames++; });
(window as unknown as { __sk8perf: unknown }).__sk8perf = uiPerf;
