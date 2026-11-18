# Tech

## Decision: web game (Phaser 4 + TypeScript + Vite), wrapped with Capacitor for iOS

| Option | Verdict | Why |
|---|---|---|
| **Phaser 4 + TS + Vite → Capacitor** | **chosen** | Text-only codebase agents can fully build, test and screenshot. Instant phone testing by URL. Same code ships to web, iOS, Android. |
| Native Swift + SpriteKit | no | Best iOS feel, but iOS-only, needs Xcode/simulator in the loop for every check, and agents can't see the result easily. |
| Unity / Godot | not now | Great 2D engines, but scene/asset files are editor-driven and binary-ish; agent iteration is slower and harder to verify. Godot is the fallback if WebView performance ever becomes the blocker. |
| React / React Native | no | UI frameworks. A 60fps game loop wants a canvas/WebGL renderer, not a component tree. |

Phaser 4 (4.2.x, released April 2026) is used rather than 3: it's the maintained line with a new WebGL renderer, and its API is close enough to 3 that existing tutorials mostly apply.

Known costs of the web route, accepted:
- Runs in WKWebView on iOS. Fine for 2D pixel art; watch draw calls and garbage.
- Audio latency and haptics need Capacitor plugins / care.
- Tilt: iOS Safari requires `DeviceOrientationEvent.requestPermission()` from a tap, over HTTPS. Already handled in `game/input.ts`; needs a real-device check inside the Capacitor shell.

## Architecture

```
            Input (touch / keys / tilt / bot)
                        │  core Input {jumpPressed, jumpHeld, trick, balance}
                        ▼
  src/core  ──────────────────────────────────────────────
   sim.ts        fixed 60Hz step, state machine: ground / air / grind / bail / over
   level.ts      seeded endless generator built from a pattern library
   tricks.ts     trick data          skaters.ts   skater data
   config.ts     every tuning number  progression.ts  XP / levels
   bot.ts        autoplayer (fairness oracle)   rng.ts  seeded PRNG
                        │  SimState + SimEvents
                        ▼
  src/game  ──────────────────────────────────────────────
   GameScene     draws state, turns events into popups / shake / sparks
   MenuScene     skater select, progress
   input.ts      device → core Input      textures.ts  placeholder pixel art
   storage.ts    localStorage save        view.ts      resolution + palette
```

- **Deterministic core.** Seed + inputs → identical run. Enables unit tests, the bot, daily seeds, replays, cheat-resistant leaderboards (re-simulate the inputs server-side).
- **Fixed timestep** with an accumulator in `GameScene.update`; rendering reads the latest state.
- **Data-driven content.** Tricks, skaters and level patterns are arrays. Most content tasks are "append an entry".
- **Rendering is deliberately dumb** in v0.1 (one Graphics object redrawn per frame). Replace with sprites/tilemaps during the art pass.

## Verification loop (what makes this agent-friendly)

1. `npm run check` — types, 10 unit tests, then 200 bot runs per skater. Fails if the bot's median distance collapses.
2. `npm run shots` — headless Chrome screenshots of menu + a seeded bot run; fails on console errors.
3. Human playtest on a phone for feel. Agents log what they can't judge.

## Path to iOS (milestone M3)

Needs: a Mac with Xcode, Apple Developer Program membership.

```bash
npm i @capacitor/core @capacitor/ios && npm i -D @capacitor/cli
npx cap init SK8SCROLLER com.zonabi.sk8scroller --web-dir dist
npm run build && npx cap add ios && npx cap sync
npx cap open ios      # run on device from Xcode
```

Then: lock to landscape, hide status bar, safe-area padding for the HUD, `@capacitor/haptics` on land/bail/bank,
app icon + splash, TestFlight. Android is the same flow with `cap add android`.
