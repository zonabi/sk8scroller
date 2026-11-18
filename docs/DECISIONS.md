# Decision log

Newest first. Keep entries to a few lines: what, why, what would change our mind.

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
