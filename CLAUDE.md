# Agent guide — SK8SCROLLER

Read this first. Then read the task card you were given in `docs/BACKLOG.md`.
Only open `docs/GDD.md` / `docs/TECH.md` when the task touches design or architecture.

## What this is

Mobile-first side-scrolling inline skating game. TypeScript + Phaser 4 + Vite. Web build, wrapped with Capacitor for iOS later.

## Commands

- `npm run check` — typecheck + vitest + bot fairness sim. Must pass before you say a task is done.
- `npm run shots` — builds and writes screenshots to `shots/`. Look at them after any visual change. Fails on browser console errors.
- `npm run sprites` — dumps every skater pose to `shots/sprites.png`. Look at it after touching `src/game/art/`.
- `npm run dev` — dev server. `?seed=N` fixes the level, `?bot` autoplays.

## Architecture — the one rule

```
src/core/   Game rules. Pure TypeScript. NO Phaser, NO DOM, NO Math.random, NO Date.
src/game/   Phaser scenes, input, textures, storage. NO game rules.
tests/      vitest, against core only.
tools/      sim.ts (bot fairness report), shot.mjs (screenshots).
```

`core/sim.ts` is the entire game as a deterministic fixed-step simulation: `sim.step(input) -> events`.
`game/GameScene.ts` feeds it input, draws `sim.s`, and reacts to events. If you are writing an `if`
about scoring, physics, bails or unlocks inside `src/game/`, it belongs in `src/core/`.

Why: core can be tested and bot-played in milliseconds with no browser. That is how you verify your work.

## Where to change what

| To change… | Edit |
|---|---|
| Feel / tuning numbers | `src/core/config.ts` (never inline magic numbers) |
| Add a trick | `src/core/tricks.ts` (+ row in `docs/TRICKS.md`) |
| Add a skater | `src/core/skaters.ts` |
| Add a level pattern | `PATTERNS` in `src/core/level.ts` |
| New mechanic | `src/core/sim.ts` + a test in `tests/` + bot support in `src/core/bot.ts` if the bot must handle it |
| Skater look / poses | `src/game/art/skater.ts` — poses are data (hip, feet, hands; IK does the rest) |
| Scenery, rails, obstacles | `src/game/art/world.ts` |
| Any text or UI | `graf()` in `src/game/ui.ts` — never raw `scene.add.text` with a system font |
| HUD, layout | `src/game/` scenes — palette is `PAL` in `view.ts`, stay inside it |
| Controls | `src/game/input.ts` (must keep producing the core `Input` shape) |

## Definition of done

1. `npm run check` passes. New rules have a test. If the bot's median distance drops, you made the game unfair — fix it or justify it in the PR.
2. Visual change → ran `npm run shots` and looked at the images.
3. Touch and keyboard both still work (every action needs both).
4. Docs updated: tick the card in `docs/BACKLOG.md`; if you made a non-obvious choice, add 2–3 lines to `docs/DECISIONS.md`.
5. One task = one branch = one focused commit series. Don't refactor outside the task.

## Conventions

- Two resolutions. Pixel art lives on a 640×360 grid (`AW`×`AH`), shown with nearest-neighbour filtering. The canvas is that × `Z` (2–4) so text and UI shapes are sharp, not pixelated. Scenes work in 640×360 units; `setupCamera()` applies the zoom.
- Core world units → art pixels is `K` (4/3). Core uses y-up (height above street); `game/` converts.
- Art style is 16-bit console (Genesis/SNES): 3-tone hue-shifted ramps, light from upper left, ink outline per body part, ordered dithering for gradients. Use the helpers in `art/pixel.ts`; no flat unshaded rectangles.
- UI style is street art: graffiti lettering with fat outlines, colour fades, block shadows, slight tilt; stickers and tape for panels.
- Keep `maxTextures: 1` in `main.ts` and don't put `Graf` text in nested containers — both work around Phaser 4 text-rendering glitches (see DECISIONS).
- All randomness through `core/rng.ts`. Same seed + same inputs must give the same run (there is a test).
- All art is generated in code at boot (`game/art/` → `game/textures.ts`). Hand-drawn sheets can replace it later under `public/assets/` using the same texture keys.
- Original characters only. No real skater names, brands, or copyrighted music/art.
- Things only a human can judge (game feel on a real phone, tilt, audio latency) — don't guess. Leave a note under "Needs human playtest" in `docs/BACKLOG.md`.
