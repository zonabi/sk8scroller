import Phaser from 'phaser';
import { WALL_H, makeTextures } from './textures';
import { AH, AW, GROUND, STREET_TOP, Z } from './view';

export interface Backdrop { scroll(artX: number): void }

/** Zooms the camera so scenes can work in 640×360 art units. Call first in every scene's create(). */
export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(Z).centerOn(AW / 2, AH / 2);
}

/** Sky + two skyline layers + the graffiti wall + pavement, with parallax. Shared by menu and game. */
export function addBackdrop(scene: Phaser.Scene): Backdrop {
  makeTextures(scene);
  scene.add.image(0, 0, 'sky').setOrigin(0);
  const far = scene.add.tileSprite(0, STREET_TOP - WALL_H - 110, AW, 150, 'city-far').setOrigin(0);
  const mid = scene.add.tileSprite(0, STREET_TOP - WALL_H - 120, AW, 190, 'city-mid').setOrigin(0);
  const wall = scene.add.tileSprite(0, STREET_TOP - WALL_H, AW, WALL_H, 'wall').setOrigin(0);
  const street = scene.add.tileSprite(0, STREET_TOP, AW, AH - STREET_TOP, 'street').setOrigin(0);
  void GROUND;
  return {
    scroll(x: number) {
      far.tilePositionX = Math.floor(x * 0.08); mid.tilePositionX = Math.floor(x * 0.22);
      wall.tilePositionX = Math.floor(x); street.tilePositionX = Math.floor(x);
    },
  };
}
