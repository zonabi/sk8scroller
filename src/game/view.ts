/**
 * Two resolutions on purpose:
 *  - ART: pixel art is authored on a 640×360 grid (16-bit console territory) and shown with crisp pixels.
 *  - The canvas itself is ART × Z device pixels, so text and UI shapes render at full sharpness
 *    instead of being pixelated along with the sprites.
 * Scenes work in ART units; the camera zooms by Z.
 */
export const AW = 640;
export const AH = 360;
/** Integer zoom picked once at boot from the device's real pixel size. */
export const Z = (() => {
  const dpr = window.devicePixelRatio || 1;
  const long = Math.max(window.innerWidth, window.innerHeight) * dpr, short = Math.min(window.innerWidth, window.innerHeight) * dpr;
  return Math.max(2, Math.min(4, Math.floor(Math.min(long / AW, short / AH) + 0.15)));
})();
/** World units (core) → art pixels. Must match K in art/world.ts. */
export const K = 4 / 3;
/** Art y of the line the skates roll on (a few px into the pavement, so it reads as depth). */
export const GROUND = 304;
/** Art y where the pavement tile starts. */
export const STREET_TOP = 297;
/** Art x where the skater sits. */
export const PLAYER_X = 150;

/** Spray-can palette for UI and accents. */
export const PAL = {
  ink: 0x1a1026, night: 0x26134c, plum: 0x54206e, magenta: 0xc2255c, orange: 0xff7b00,
  yellow: 0xffd23f, pink: 0xff3d6e, cyan: 0x00d9ff, green: 0x3dff8f, white: 0xf5f5f5,
  paper: 0xf2ead8, steel: 0xb8c2d8,
} as const;
export const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

export const FONT = {
  /** Big graffiti lettering: titles, score, callouts. */
  piece: '"Sedgwick Ave Display"',
  /** Marker handstyle: labels and body text. */
  marker: '"Permanent Marker"',
  /** Stencil-spray capitals: buttons and wall pieces. */
  spray: '"Rubik Spray Paint"',
} as const;
