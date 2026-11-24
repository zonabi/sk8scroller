# Backlog

One card = one agent session = one branch. Pick the top unticked card unless told otherwise.
Every card's last step is `npm run check` (and `npm run shots` if anything visual changed).
`[H]` = needs a human (device, taste, money). Agents prepare; a human decides.

## Needs human playtest (agents append observations here)

- Balance tuning: approved on Mac keyboard after P-01 (S2, S3). Not yet felt on a phone.
- Tilt axis/sign in `game/input.ts` is untested on a real device.
- Trick descriptions in TRICKS.md should be checked by someone who skates.
- Grind stances in `art/skater.ts` are side-view approximations; check each reads as the right trick.
- Art style approved by the user on a Mac retina display (2026-11-18). Not yet judged on a phone.
- Performance verified on the user's Mac only: 60 fps at zoom Z4, boot 551 ms. **Phone `?fps` readout still needed** (fps, frame ms, zoom, boot timeline) — that is the device that matters.
- **Sound accepted on Mac** (2026-11-20: "good enough for the feel"). Still unheard on a phone. Levels were balanced by measured loudness only. Needs a listen on phone speaker and headphones: is anything harsh, too loud, too quiet, or annoying on repeat (roll loop, grind scrape)? Does audio start on iPhone after the first tap?
- Full-screen button untested on Android/iPad; iPhone route is Add to Home Screen.
- Spin turnaround approved in play; flips still rotate the side-view sprite.
- Fakie sprites (roll, jump, fall, landing, grinds, air tricks) approved 2026-11-19 from stills and play on Mac.
- P-12: touch tap in the air now turns you round instead of doing the up trick — needs judging on a phone.
- **P-13 touch button pads** (left = arrow keys, right = W A S D) are the default on touch from 0.8.0. Never touched by a real thumb: check reach from a natural grip and whether the pads cover anything (size and position were adjusted once in P-13a and approved). Position, size and faintness are sliders in the tuning panel.
- **Rail difficulty (P-15, P-15a, P-16)** was tuned on a modelled player, twice in one morning. Needs a phone session: does plain grinding now ask for steering without feeling unfair, and what does a quick pair of trick buttons cost?
- **P-17 drop off a rail** (↓): never felt. Does the fall read as a deliberate step-down?
- **Pause and settings** (T-05): check on the phone that the ❙❙ button is reachable but not hit by accident, that the game pauses when you switch apps, and that left-handed pads feel right.
- **Tutorial** (T-04): only ever completed by a script. Does a real first-timer get through each lesson? Is three seconds enough to read a prompt? Is the balance lesson (stay on 1.5 s) fair with the new rail sensitivity?
- **Upper decks drawn further back** (T-16b, his note: "higher level rails should always be further back… could be a fence, a wall, a canopy from a pizza joint"): higher overlapping rails now draw behind lower ones and a shade darker; some are dressed as a chain-link fence or a shop awning. After his note that a bare awning looked out of place ("we need a pizza joint or some business that makes the awning make sense"), every awning now comes with its shop: painted front, lit windows, door and a sign (PIZZA, TACOS, DELI, NOODLES, SLICE). Shops only exist on the STACKS course. They were rare at first (none in the first 40 s of 117 of 200 levels — he played and saw none); from 0.9.3 every ledge-under-rail is a shop. 0.9.5, after his screenshot ("the storefront looks and feels too small — the store's top should be at the same level as the wall in the back"; "it looks like the storefront is up on the sidewalk, it should be at the same depth as the main wall"): a shop is now exactly as tall as the wall, stands at the wall's foot, is dimmed like the wall and drawn behind every deck; only the awning stays bright. The triple-decker's top rail is no longer an awning (too high for a wall-height shop). His eye needed on both looks, and on what else an upper deck could be (wall top, sign, scaffold).
- **Stacks course** (T-16a): only the bot has skated it. Can a person reach the upper rails on purpose? Is it readable which rail you will land on? Should riding high pay more?
- **Pads on iPad** (P-13b): lower-corner position built from his description, on an emulated iPad. Needs his hands on a real one: reach, size, and whether he wants them below the picture in the black band.
- Push approved; strength raised to 22% (P-05a) and awaiting a play. The pre-jump trick buffer (P-07) is on trial with no direct comment yet.

## Tooling done

- [x] **Run recording + replay analysis** (2026-11-19). `npm run replay`, `?replay=`, flag button.
- [x] **Live tuning panel + change switches** (2026-11-19, P-00). See PLAYTEST.md.
- [x] **Playtest triage skill** (2026-11-19). Proposed to the user as `playtest-feedback-triage`; the method itself is in PLAYTEST.md.
- [x] **Fakie sprite sheet** (2026-11-19). `npm run fakie` → `shots/fakie.png`.

## M1 — Feel

- [ ] **P-09 Mid-trick slams after fakie (investigate first).** S3: 23 slams in 9.8 min, 26 of 143 air tricks unfinished at touchdown. Break down by trick, air time left and whether a second trick was queued; propose one change. Follow PLAYTEST.md.
- [ ] **P-10 Ignored trick swipes.** S3: 56. Classify them with `npm run replay -- --all tests/golden-runs`, then decide whether anything needs fixing.
- [x] **P-11 Progression pacing.** Done 2026-11-21: about five minutes of play per level (see PLAYTEST.md). Needs his verdict after a few sessions from a reset save.
- [ ] **P-08 [H] Real blading names — PARKED by the user.** Proposal is in TRICKS.md ("Naming model"). Waiting on his answers: spin direction for truespin, natural side for switch, groove-trick names, corrections to the table. Do not build until he picks it up.

- [ ] **T-01 [H] Device playtest + tuning pass.** Play 20 runs on a phone. Adjust only `config.ts`. Record before/after values and why in DECISIONS.md.
- [x] **T-02 Sound effects.** Done 2026-11-18 (`audio.ts`): roll and grind loops, 12 one-shots, mute (menu toggle / M). Tuned blind — see playtest notes. Original card:  `game/audio.ts` using WebAudio synthesis (no asset files yet): roll loop pitched by speed, grind scrape, jump, land, bail, bank sting. Driven only by SimEvents. Mute toggle saved in storage. Accept: no audio before first user gesture; no console errors in `shots`.
- [ ] **T-03 Manuals.** New `manual` mode in sim: swipe down on landing within 0.15s to enter; own balance meter (forward/back); counts as a combo entry and keeps the combo alive; ends on jump or balance loss. Tests + bot unaffected. Touch + keys.
- [x] **T-04a How-to-play card.** Done 2026-11-21 (`game/howto.ts`, styles in `index.html`). Shows once before the first run, and from the menu (HOW TO PLAY, or H). Draws the controls for the device in hand: touch pads, keyboard, or thumb zones. Replaced the menu's tape strips, which still described the old swipe controls.
- [x] **T-04 Playable tutorial.** Done 2026-11-21 (`core/tutorial.ts` rules + test, prompts in `game/tutorialText.ts`, wiring in `GameScene`). Eight lessons on an empty course: jump a cone, grind, balance, switch up, air trick, drop off, push, fakie. A missed lesson repeats; nothing costs a life; no XP, no recording. Offered on first launch from the how-to card, and from the menu card any time. Prompts are worded for pads, keyboard or thumb zones (zones skip the drop lesson), and the pad button to press pulses green.
- [x] **T-05 Pause + settings.** Done 2026-11-21 (`game/pause.ts`, `game/panels.ts`). Pause: ❙❙ button top centre, P or ESC, and automatically when the page is hidden; sheet has resume, restart, how to play, settings, quit. Settings (menu and pause): sound, left-handed pads, tilt, and on the menu a two-tap progress reset. ESC no longer quits straight to the menu.
- [ ] **T-06 Landing quality.** Releasing/pressing near touchdown gives "clean" (bonus multiplier) vs "sloppy" (speed loss). Adds skill to every landing.

## M2 — Look

- [ ] **T-07 [H] Art bible + one hero sprite.** Decide final skater size and animation list (roll, push, crouch, jump, fall, land, 4 grind stances, 3 grabs, spin, flip, bail). Produce one skater sheet in Aseprite as the reference.
- [ ] **T-08 Sprite pipeline.** Load atlases from `public/assets/`, keep texture keys, fall back to generated placeholders when a file is missing. Animation state chosen from sim state in one function.
- [x] **T-09 Graffiti lettering + HUD pass.** Done 2026-11-18 (`ui.ts`).
- [x] **T-10 Environment sprites.** Done 2026-11-18 (`art/world.ts`). Follow-ups: more wall/obstacle variety, a foreground layer.
- [ ] **T-10b Animation depth.** In-between frames: push cycle to 6–8 frames, take-off and landing frames, per-trick grab-in/out. (Spins already use an 8-frame turnaround, `drawSpin`.) Next candidate: give flips and Misty the same 3D treatment.

## M3 — On the phone

- [ ] **T-11 [H] Capacitor iOS shell.** Follow TECH.md. Landscape lock, status bar hidden, safe areas.
- [ ] **T-12 Haptics.** `@capacitor/haptics` on land / bank / bail, behind a no-op wrapper on web.
- [ ] **T-13 [H] Tilt verification + calibration.** Confirm axis in both landscape orientations; add "hold level and tap" calibration.

## M4 — Depth

- [ ] **T-14 Special meter.** Fills on banked combos; spend for signature trick or boost.
- [ ] **T-15 Loadout screen.** Choose the trick per slot from unlocked ones.
- [x] **T-16a Stacks course.** Done 2026-11-21: a second course, STACKS, with rails over rails and ledges (double-decker, steps up, steps down, triple-decker, high rail over cones). Chosen on the menu (sticker beside SKATE, or C). Climb by jumping rail to rail, come down with ↓. Bot clears it 200/200 for every skater; `npm run sim` now reports both courses. No bonus for riding high yet.
- [ ] **T-16 Terrain.** *(stacked rails are done as T-16a; what is left is the ground itself changing height)* Variable ground height: stairs, drops, gaps (fall = bail), upper/lower routes. Needs level + sim + bot changes; do as 2–3 cards.
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
