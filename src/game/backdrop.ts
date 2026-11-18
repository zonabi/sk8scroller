import Phaser from 'phaser';
import { WALL_H, makeTextures } from './textures';
import { AH, AW, STREET_TOP, Z } from './view';

/** Zooms the camera so scenes can work in 640×360 art units. Call first in every scene's create(). */
export function setupCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(Z).centerOn(AW / 2, AH / 2);
}

type Drawable = Phaser.GameObjects.GameObject & { depth: number };

/**
 * The pixel-art world is drawn into a 640×360 texture and scaled up once, instead of every
 * layer being drawn at full canvas size. With five overlapping full-screen layers that cuts
 * the pixels the GPU fills each frame by roughly Z² (16× at Z=4). UI is drawn on top at full
 * resolution as usual.
 *
 * Anything that belongs to the world must go through add() — it is then NOT on the scene's
 * display list and only appears via this layer.
 */
export class World {
  private rt: Phaser.GameObjects.RenderTexture;
  private items: Drawable[] = [];
  private dirty = false;
  private far: Phaser.GameObjects.TileSprite;
  private mid: Phaser.GameObjects.TileSprite;
  private wall: Phaser.GameObjects.TileSprite;
  private street: Phaser.GameObjects.TileSprite;

  constructor(private scene: Phaser.Scene) {
    makeTextures(scene);
    this.rt = scene.add.renderTexture(0, 0, AW, AH).setOrigin(0).setDepth(0);
    this.rt.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add(scene.add.image(0, 0, 'sky').setOrigin(0).setDepth(-5));
    this.far = this.add(scene.add.tileSprite(0, STREET_TOP - WALL_H - 110, AW, 150, 'city-far').setOrigin(0).setDepth(-4));
    this.mid = this.add(scene.add.tileSprite(0, STREET_TOP - WALL_H - 120, AW, 190, 'city-mid').setOrigin(0).setDepth(-3));
    this.wall = this.add(scene.add.tileSprite(0, STREET_TOP - WALL_H, AW, WALL_H, 'wall').setOrigin(0).setDepth(-2));
    this.street = this.add(scene.add.tileSprite(0, STREET_TOP, AW, AH - STREET_TOP, 'street').setOrigin(0).setDepth(-1));
  }
  /** Move an object from the scene into the world layer. Draw order follows its depth. */
  add<T extends Drawable>(o: T): T {
    this.scene.children.remove(o);
    this.items.push(o); this.dirty = true;
    return o;
  }
  remove(o: Drawable): void { const i = this.items.indexOf(o); if (i >= 0) this.items.splice(i, 1); o.destroy(); }
  scroll(artX: number): void {
    this.far.tilePositionX = Math.floor(artX * 0.08); this.mid.tilePositionX = Math.floor(artX * 0.22);
    this.wall.tilePositionX = Math.floor(artX); this.street.tilePositionX = Math.floor(artX);
  }
  /** Redraw the world texture. Call once per frame after positioning everything. */
  flush(): void {
    if (this.dirty) { this.items.sort((a, b) => a.depth - b.depth); this.dirty = false; }
    this.rt.clear().draw(this.items).render();
  }
}
