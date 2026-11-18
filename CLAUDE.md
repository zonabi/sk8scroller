# Agent guide — SK8SCROLLER

Read this first. Then read the task card you were given in `docs/BACKLOG.md`.
Only open `docs/GDD.md` / `docs/TECH.md` when the task touches design or architecture.

## What this is

Mobile-first side-scrolling inline skating game. TypeScript + Phaser 4 + Vite. Web build, wrapped with Capacitor for iOS later.

## Commands

- `npm run check` — typecheck + vitest + bot fairness sim. Must pass before you say a task is done.
- `npm run shots` — builds and writes screenshots to `shots/`. Look at them after any visual change. Fails on browser console errors.
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
| Visuals, HUD | `src/game/` — palette is `PAL` in `view.ts`, stay inside it |
| Controls | `src/game/input.ts` (must keep producing the core `Input` shape) |

## Definition of done

1. `npm run check` passes. New rules have a test. If the bot's median distance drops, you made the game unfair — fix it or justify it in the PR.
2. Visual change → ran `npm run shots` and looked at the images.
3. Touch and keyboard both still work (every action needs both).
4. Docs updated: tick the card in `docs/BACKLOG.md`; if you made a non-obvious choice, add 2–3 lines to `docs/DECISIONS.md`.
5. One task = one branch = one focused commit series. Don't refactor outside the task.

## Conventions

- Internal resolution 480×270, landscape. World units are pixels; core uses y-up (height above street), `game/` converts to screen.
- All randomness through `core/rng.ts`. Same seed + same inputs must give the same run (there is a test).
- Placeholder art is generated in `game/textures.ts`. Real assets go in `public/assets/` and keep the same texture keys.
- Original characters only. No real skater names, brands, or copyrighted music/art.
- Things only a human can judge (game feel on a real phone, tilt, audio latency) — don't guess. Leave a note under "Needs human playtest" in `docs/BACKLOG.md`.
