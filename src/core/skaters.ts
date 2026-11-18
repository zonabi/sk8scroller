export interface SkaterDef {
  id: string; name: string; blurb: string;
  /** Stat multipliers, 1 = baseline. */
  speed: number; air: number; balance: number;
  /** 0xRRGGBB. `hair` doubles as beanie/cap colour. */
  colors: { skin: number; hair: number; top: number; pants: number; skate: number; wheel: number };
  look: { head: 'beanie' | 'mohawk' | 'puffs' | 'cap'; sleeves: 'long' | 'short'; legs: 'baggy' | 'shorts' };
}

/** Original characters. Add a skater by appending here; sprites are generated from `colors` + `look`. */
export const SKATERS: SkaterDef[] = [
  { id: 'rio', name: 'RIO', blurb: 'All-rounder', speed: 1.0, air: 1.0, balance: 1.0,
    colors: { skin: 0xc68642, hair: 0xff3d6e, top: 0xf5f5f5, pants: 0x3b4a8c, skate: 0x2b2d42, wheel: 0xffd23f },
    look: { head: 'beanie', sleeves: 'short', legs: 'baggy' } },
  { id: 'dex', name: 'DEX', blurb: 'Fast, sketchy on rails', speed: 1.12, air: 0.97, balance: 0.85,
    colors: { skin: 0xf1c27d, hair: 0x3dff8f, top: 0x33333f, pants: 0x8a8fa3, skate: 0xffd23f, wheel: 0xf5f5f5 },
    look: { head: 'mohawk', sleeves: 'long', legs: 'shorts' } },
  { id: 'nova', name: 'NOVA', blurb: 'Big air', speed: 0.97, air: 1.1, balance: 0.95,
    colors: { skin: 0x8d5524, hair: 0x2a1a3a, top: 0x00c2ee, pants: 0x7b2ff7, skate: 0xff3d6e, wheel: 0x3dff8f },
    look: { head: 'puffs', sleeves: 'short', legs: 'baggy' } },
  { id: 'tank', name: 'TANK', blurb: 'Locked-in grinds', speed: 0.95, air: 0.96, balance: 1.3,
    colors: { skin: 0xe0ac69, hair: 0xc2255c, top: 0xffb000, pants: 0x1f2a44, skate: 0xf5f5f5, wheel: 0xff7b00 },
    look: { head: 'cap', sleeves: 'long', legs: 'baggy' } },
];
export const skaterById = (id: string): SkaterDef => SKATERS.find(s => s.id === id) ?? SKATERS[0];
