import '@fontsource/sedgwick-ave-display';
import '@fontsource/permanent-marker';
import '@fontsource/rubik-spray-paint';
import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { MenuScene } from './MenuScene';
import { AH, AW, FONT, PAL, Z } from './view';

// Fonts must be ready before any text or wall graffiti is rasterised.
await Promise.all(Object.values(FONT).map(f => document.fonts.load(`32px ${f}`, 'SK8 scroller 0123')));

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: AW * Z,
  height: AH * Z,
  backgroundColor: PAL.ink,
  // Not `pixelArt: true`: sprites get nearest filtering per texture (see textures.ts) while text stays smooth.
  antialias: true,
  // One texture per batch: multi-texture batching drew Text quads with the wrong texture (seen in Phaser 4.2.1).
  maxTextures: 1,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [MenuScene, GameScene],
});
// handy for debugging and for agents driving the game from a browser console
(window as unknown as { __sk8: unknown }).__sk8 = game;
