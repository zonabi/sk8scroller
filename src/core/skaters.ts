export interface SkaterDef {
  id: string; name: string; blurb: string;
  /** Stat multipliers, 1 = baseline. */
  speed: number; air: number; balance: number;
  colors: { skin: string; hair: string; top: string; pants: string; skate: string };
}

/** Original characters. Add a skater by appending here; textures are generated from `colors`. */
export const SKATERS: SkaterDef[] = [
  { id: 'rio', name: 'RIO', blurb: 'All-rounder', speed: 1.0, air: 1.0, balance: 1.0,
    colors: { skin: '#c68642', hair: '#1b1b1b', top: '#ff3d6e', pants: '#2b2d42', skate: '#f5f5f5' } },
  { id: 'dex', name: 'DEX', blurb: 'Fast, sketchy on rails', speed: 1.12, air: 0.97, balance: 0.85,
    colors: { skin: '#f1c27d', hair: '#3dff8f', top: '#111111', pants: '#5a5a66', skate: '#ffd23f' } },
  { id: 'nova', name: 'NOVA', blurb: 'Big air', speed: 0.97, air: 1.1, balance: 0.95,
    colors: { skin: '#8d5524', hair: '#ff7b00', top: '#00d9ff', pants: '#3a0ca3', skate: '#ff3d6e' } },
  { id: 'tank', name: 'TANK', blurb: 'Locked-in grinds', speed: 0.95, air: 0.96, balance: 1.3,
    colors: { skin: '#e0ac69', hair: '#7a4b2a', top: '#ffd23f', pants: '#14213d', skate: '#3dff8f' } },
];
export const skaterById = (id: string): SkaterDef => SKATERS.find(s => s.id === id) ?? SKATERS[0];
