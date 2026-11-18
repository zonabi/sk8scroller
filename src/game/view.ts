/** Internal pixel resolution. Everything is drawn at this size and scaled up with nearest-neighbour. */
export const W = 480;
export const H = 270;
/** Screen y of the street surface. */
export const GROUND = 226;
/** Screen x where the skater sits. */
export const PLAYER_X = 110;

/** Palette — gritty dusk + loud street-art accents. Keep new art inside this set. */
export const PAL = {
  ink: 0x0b0714, night: 0x1a1030, plum: 0x3a1a5c, magenta: 0xc2255c, orange: 0xff7b00,
  yellow: 0xffd23f, pink: 0xff3d6e, cyan: 0x00d9ff, green: 0x3dff8f, white: 0xf5f5f5,
  asphalt: 0x2a2a35, asphaltLight: 0x3c3c4a, concrete: 0x8d8d9c, concreteDark: 0x5d5d6b, steel: 0xcfd6e6,
} as const;
export const hex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
