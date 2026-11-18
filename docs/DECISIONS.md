# Decision log

Newest first. Keep entries to a few lines: what, why, what would change our mind.

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
