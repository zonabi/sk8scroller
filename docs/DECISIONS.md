# Decision log

Newest first. Keep entries to a few lines: what, why, what would change our mind.

## 2026-11-20 — Touch gets on-screen buttons that mirror the keyboard (trial, P-13)
The GDD said "no on-screen buttons": whole screen halves so thumbs never miss. The first phone session reversed the
evidence — touch bailed 6.4 times a minute against 3.8 on keyboard, and over half the bails were one overloaded gesture
(a right-thumb tap). The user asked for the same controls on both devices. Pads are a numbered layout (`touchLayout`)
with position, size and opacity as knobs, so further variations are added as layout 2, 3… beside the old one, not over it.
The pad settings live in `core/config.ts` only because that is where switches, the tuning panel and recordings read
from; the sim never looks at them. Would change our mind: small buttons being missed on a real phone (count presses
that land outside the pads).

## 2026-11-19 — Record every run; analyse feedback from replays
Feel feedback ("jumps don't register") can't be acted on from a description. Since the sim is deterministic, inputs
alone reproduce a run exactly, so each run is recorded and the dev server collects them into `runs/`. The analyser
lists ignored inputs and bail causes. Recordings break when tuning changes; that is accepted — they are evidence for
the build they were played on, and the report says when they no longer match.

## 2026-11-18 — Lettering outlines are built from blits, not strokeText
The user's Mac spent 5.1 s of a 5.3 s boot building the menu; the boot timeline (`?fps`) pinned it there. Headless
Linux did the same work in ~0.2 s, so the suspect was canvas `strokeText` with a very wide round-joined stroke on
complex glyphs. Outlines are now made by stamping the fill-only glyph mask around a circle.
**Confirmed on the user's Mac:** boot 5,304 ms → 551 ms, menu build 5,112 ms → 180 ms, 60 fps in play.
Lesson: a single platform-specific canvas call can dominate; the boot timeline found it in one round trip.

## 2026-11-18 — Spins are sprite turnarounds; no full-screen flashes
Spins used to squash the side-view sprite horizontally, which read as a paper cut-out flipping. `drawSpin` now poses a
tucked skater in 3D and renders 8 yaw frames (side, back, side, front and the in-betweens). The white flash on combo
bank is gone for good: it looked like a rendering glitch and full-screen flashes are a photosensitivity risk. Use
local feedback (score pop, call-outs, shake) instead.

## 2026-11-18 — Performance pass after v0.2 ran at <10 fps with a 10 s load
Causes found by profiling: (1) HUD text was Phaser `Text` in a spray font whose glyphs take ~10× longer to stroke,
re-rasterised ~20×/s as the score ticked; (2) five full-screen layers were drawn at canvas resolution (up to 2560×1440)
with MSAA on. Fixes: all lettering is pre-drawn to textures (`graf`/`num`), the world renders to a 640×360 texture
and is upscaled once, MSAA off, skater sprites generated lazily, a loading screen, and an automatic zoom step-down
if a device can't hold 60 fps. `npm run perf` now enforces CPU and text budgets. Real-device fps still needs a human.

## 2026-11-18 — Art direction: 16-bit pixel art world, sharp graffiti UI
First pass was too blocky (flat rectangles at 480×270) and its text was a system font scaled up with the pixels.
Now: pixel art on a 640×360 grid with shading/outlines/dither, and the canvas runs at 2–4× that so lettering and
UI shapes are drawn at device resolution. `pixelArt: true` is off; sprite textures set NEAREST individually.

## 2026-11-18 — Art is generated in code, skaters are posed by IK
Keeps the repo text-only and lets agents add a trick stance or a skater by editing data, then check `npm run sprites`.
Trade-off: stiffer than hand animation. Would switch to authored sprite sheets once the look is approved.

## 2026-11-18 — Phaser 4 workarounds: `maxTextures: 1`, no Text in nested containers
With multi-texture batching, Text quads were drawn with the wrong texture (letters replaced by blobs) in headless Chrome.
One texture per batch fixes it at a negligible draw-call cost. Re-test on a Phaser upgrade before removing.

## 2026-11-17 — Grinds lock in automatically on landing
Friendlier on touch than a held grind button. Revisit after playtest if players want to skip rails on purpose.

## 2026-11-17 — Tilt balance is optional and off by default
Drag-to-balance must be sufficient. Tilt needs a permission prompt on iOS and excludes some play situations.

## 2026-11-17 — Lives (3 bails), not one-hit death
Trick games need room to attempt risky lines. Combo loss is the main punishment.

## 2026-11-17 — Endless generated runs first, authored levels later
Fastest path to a testable loop, and the bot can verify fairness. Authored districts come in M4.

## 2026-11-17 — Deterministic core separated from Phaser
Lets agents test and bot-play without a browser; unlocks daily seeds and replays. Cost: a little duplication between state and sprites.

## 2026-11-17 — Phaser 4 + TypeScript + Vite, Capacitor for iOS
See docs/TECH.md. Would reconsider (Godot) only if WKWebView performance blocks 60fps on mid-range phones.
