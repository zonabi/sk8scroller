# Backlog

One card = one agent session = one branch. Pick the top unticked card unless told otherwise.
Every card's last step is `npm run check` (and `npm run shots` if anything visual changed).
`[H]` = needs a human (device, taste, money). Agents prepare; a human decides.

## Needs human playtest (agents append observations here)

- Balance tuning in `config.ts` was set by simulation (idle player falls in ~2s, a laggy player holds ~7s). Not yet felt on a phone.
- Tilt axis/sign in `game/input.ts` is untested on a real device.
- Trick descriptions in TRICKS.md should be checked by someone who skates.

## M1 — Feel

- [ ] **T-01 [H] Device playtest + tuning pass.** Play 20 runs on a phone. Adjust only `config.ts`. Record before/after values and why in DECISIONS.md.
- [ ] **T-02 Sound effects.** `game/audio.ts` using WebAudio synthesis (no asset files yet): roll loop pitched by speed, grind scrape, jump, land, bail, bank sting. Driven only by SimEvents. Mute toggle saved in storage. Accept: no audio before first user gesture; no console errors in `shots`.
- [ ] **T-03 Manuals.** New `manual` mode in sim: swipe down on landing within 0.15s to enter; own balance meter (forward/back); counts as a combo entry and keeps the combo alive; ends on jump or balance loss. Tests + bot unaffected. Touch + keys.
- [ ] **T-04 First-run tutorial.** Scripted opening stretch (fixed features) with contextual prompts: jump → grind → balance → switch-up → air trick. Skippable; flag in save.
- [ ] **T-05 Pause + settings.** Pause on blur and via a corner button; settings for tilt, sound, left-handed (mirror thumbs).
- [ ] **T-06 Landing quality.** Releasing/pressing near touchdown gives "clean" (bonus multiplier) vs "sloppy" (speed loss). Adds skill to every landing.

## M2 — Look

- [ ] **T-07 [H] Art bible + one hero sprite.** Decide final skater size and animation list (roll, push, crouch, jump, fall, land, 4 grind stances, 3 grabs, spin, flip, bail). Produce one skater sheet in Aseprite as the reference.
- [ ] **T-08 Sprite pipeline.** Load atlases from `public/assets/`, keep texture keys, fall back to generated placeholders when a file is missing. Animation state chosen from sim state in one function.
- [ ] **T-09 Bitmap font + HUD pass.** Replace monospace text. Combo readout that grows with multiplier.
- [ ] **T-10 Environment sprites.** Rails, ledges, kickers, obstacles, ground tiles, 3 parallax layers; replace per-frame Graphics drawing.

## M3 — On the phone

- [ ] **T-11 [H] Capacitor iOS shell.** Follow TECH.md. Landscape lock, status bar hidden, safe areas.
- [ ] **T-12 Haptics.** `@capacitor/haptics` on land / bank / bail, behind a no-op wrapper on web.
- [ ] **T-13 [H] Tilt verification + calibration.** Confirm axis in both landscape orientations; add "hold level and tap" calibration.

## M4 — Depth

- [ ] **T-14 Special meter.** Fills on banked combos; spend for signature trick or boost.
- [ ] **T-15 Loadout screen.** Choose the trick per slot from unlocked ones.
- [ ] **T-16 Terrain.** Variable ground height: stairs, drops, gaps (fall = bail), upper/lower routes. Needs level + sim + bot changes; do as 2–3 cards.
- [ ] **T-17 Tagging + letter collectibles.**
- [ ] **T-18 Districts.** Pattern pools + palettes per district; transition every N metres.

## M5 — Retention

- [ ] **T-19 Daily seed + input replay recording.**
- [ ] **T-20 Leaderboard backend (re-simulate replays to validate).**
- [ ] **T-21 Missions + cosmetics.**
- [ ] **T-22 [H] Music licensing / commission.**

## Card template

```
- [ ] **T-NN Title.** What and why in two sentences. Files likely touched.
  Accept: observable outcome; tests to add; anything explicitly out of scope.
```
