# Agent guide — SK8SCROLLER

Read this first. Then read the task card you were given in `docs/BACKLOG.md`.
Only open `docs/GDD.md` / `docs/TECH.md` when the task touches design or architecture.

## What this is

Mobile-first side-scrolling inline skating game. TypeScript + Phaser 4 + Vite. Web build, wrapped with Capacitor for iOS later.

## Commands

- `npm run check` — typecheck + vitest + bot fairness sim. Must pass before you say a task is done.
- `npm run shots` — builds and writes screenshots to `shots/`. Look at them after any visual change. Fails on browser console errors.
- `npm run perf` — builds, bot-plays in headless Chrome, prints load time, CPU ms per frame and how many text textures were drawn mid-run. Fails if the budget is blown. **Run it after any change under `src/game/`.**
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
| Run recording / analysis | `src/core/replay.ts` (pure), `src/game/recording.ts`, collector in `vite.config.ts`, CLI in `tools/replay.ts` |
| Sounds | `src/game/audio.ts` — add a recipe to `ONE_SHOTS`, trigger it from `event()`. Synthesised only, no audio files yet |
| Controls | `src/game/input.ts` (must keep producing the core `Input` shape) |

## Playtest recordings — investigate feedback, don't guess

Every human run is recorded (inputs per step; the sim is deterministic) and, while the dev server is running, saved to `runs/` on the dev machine — phone runs over Wi-Fi included. `runs/` is git-ignored.

- `npm run replay` — report for the newest run: bails with their cause, **jump presses and trick swipes that did nothing** (and whether a jump buffer or coyote time would have caught them), every grind, and the moments the player flagged.
- `npm run replay -- --all` — one line per run plus totals. Start here when handed a batch of feedback.
- `?replay=latest` (or a file name) plays a run back in the game; add `&at=12.5` to jump to that second and hold the frame. Use with a screenshot to *see* a moment.
- The player can flag "that felt wrong" mid-run (flag button top centre, or F). Flags appear in the report with the 3 seconds before them.

When working through playtest feedback: find the note in the recordings first, state it as something countable ("7 of 31 jump presses ignored within 150 ms of landing"), change one thing, and re-run the same recordings' numbers where possible. A recording only replays exactly on the code and tuning that made it — the report says when it no longer matches.

## Performance — the game has to feel buttery

Target: locked 60 fps on a mid-range phone. Treat a perf regression like a failing test.

Budgets (checked by `npm run perf`): JS under 3 ms per frame; no text drawn during steady gameplay.

Rules that came out of a real incident (v0.2 shipped at <10 fps and a 10 s load):
- **No Phaser `Text`, ever.** Use `graf()` for fixed strings (drawn once, cached) and `num()` for anything that changes per frame (pre-drawn glyph sprites). `Rubik Spray Paint` is ~10× slower to draw than the other fonts — only via `num()` or cached `graf()`.
- **Never `strokeText`.** Fat outlines on these fonts took 5 s on macOS. `stamp()` in `ui.ts` builds outlines by smearing a fill-only glyph mask; keep it that way.
- **World art goes through `World.add()`** (`backdrop.ts`). The world is drawn at 640×360 and upscaled once; only UI is drawn at full canvas resolution. Don't put full-screen layers on the scene directly.
- **Nothing is generated mid-run that could be generated up front.** Warm textures in `create()` (see `warmSkater`, `warm`).
- **No per-frame allocations in `update`/`draw`** (no `new Set`, array spreads, closures, template strings that feed textures).
- Boot work goes in `textureSteps()` (one step per frame, drives the loading bar). The loading screen itself is plain HTML/CSS in `index.html` and may only animate `transform`/`opacity`.
- No full-screen flashes, ever (photosensitivity, and it reads as a glitch).
- No MSAA (`antialiasGL: false`), no full-screen filters/shaders without measuring first.
- `?fps` on the URL shows live fps and frame ms during a run, and on the menu a boot timeline (`code · fonts · engine · sky · … · menu · first-draw · lettering`).

How to chase a performance problem (learned the hard way):
1. **Measure on the human's device before changing anything.** Ask for the `?fps` line. Headless Chrome renders in software, so its frame *pacing* means nothing — only its CPU numbers do.
2. **Your machine is not their machine.** The same menu build took 0.2 s here and 5.1 s on the user's Mac (one canvas call, `strokeText`). If your numbers look fine and theirs don't, add finer timing marks (`bootMark`) and ask again rather than guessing.
3. **Fix the biggest number, then re-measure.** Record before/after in DECISIONS.md.
4. If a step can't be made fast, hide it behind the loading screen (`textureSteps`) — never let it land mid-run.

Reference numbers (user's Mac, Chrome, zoom Z4, 2026-11-18): 60 fps / 16.7 ms per frame; boot 551 ms. Phone numbers: not yet measured.

## Definition of done

1. `npm run check` passes. New rules have a test. If the bot's median distance drops, you made the game unfair — fix it or justify it in the PR.
2. Anything under `src/game/` → `npm run perf` passes. Visual change → ran `npm run shots` and looked at the images.
3. Touch and keyboard both still work (every action needs both).
4. Docs updated: tick the card in `docs/BACKLOG.md`; if you made a non-obvious choice, add 2–3 lines to `docs/DECISIONS.md`.
5. One task = one branch = one focused commit series. Don't refactor outside the task.

## Conventions

- Two resolutions. Pixel art lives on a 640×360 grid (`AW`×`AH`), shown with nearest-neighbour filtering. The canvas is that × `Z` (2–4) so text and UI shapes are sharp, not pixelated. Scenes work in 640×360 units; `setupCamera()` applies the zoom.
- Core world units → art pixels is `K` (4/3). Core uses y-up (height above street); `game/` converts.
- Art style is 16-bit console (Genesis/SNES): 3-tone hue-shifted ramps, light from upper left, ink outline per body part, ordered dithering for gradients. Use the helpers in `art/pixel.ts`; no flat unshaded rectangles.
- UI style is street art: graffiti lettering with fat outlines, colour fades, block shadows, slight tilt; stickers and tape for panels.
- Keep `maxTextures: 1` in `main.ts` (works around a Phaser 4 batching glitch, see DECISIONS).
- All randomness through `core/rng.ts`. Same seed + same inputs must give the same run (there is a test).
- All art is generated in code at boot (`game/art/` → `game/textures.ts`). Hand-drawn sheets can replace it later under `public/assets/` using the same texture keys.
- Original characters only. No real skater names, brands, or copyrighted music/art.
- Things only a human can judge (game feel on a real phone, tilt, audio latency) — don't guess. Leave a note under "Needs human playtest" in `docs/BACKLOG.md`.
