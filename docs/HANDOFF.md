# Handoff — where the project stands

Updated 2026-11-21, version 0.9.4. Read after `CLAUDE.md`. Keep this file current: rewrite it at the end of any session that changes the state below.

## State in one paragraph

A playable browser build of the whole core loop: run, jump, grind with balance, switch-ups, air tricks, combos, bails, XP, four skaters, push, and fakie (rolling backwards, with its own sprite set). 16-bit art generated in code, graffiti UI, synthesised sound, full-screen button. Every human run is recorded and can be replayed and analysed. On the user's Mac it holds 60 fps at zoom Z4 and boots in about 0.5 s. **First phone session played 2026-11-20 (S5, iPhone):** it runs, and the user's verdict was that touch should work like the keyboard. Touch now defaults to two on-screen button pads (P-13, on trial).

## What the user has approved

- Art style (Genesis/SNES, "think Sonic") and graffiti lettering.
- Performance on Mac ("still feels really good and buttery").
- Feel after P-01…P-04 ("It feels much better now!").
- Push (P-05): "I can notice it and it feels good to boost the player."
- Sound: "good enough for the feel" — no further sound work wanted for now.
- Rail difficulty after P-15, P-15a and P-16 (2026-11-21, on the phone): "The new rail system feels real good!" Leave the balance numbers alone unless he raises them.
- Dropping off a rail with ↓ (P-17, 2026-11-21): "jumping 'down' on a rail also feels good."
- Turn round mid-jump (P-12) and push at 22% (P-05a), 2026-11-21: "feels good"; "stronger push feels right now".
- Fakie mechanic and all fakie sprites (P-06, P-06a…h): "approved here on that fakie addition".

## On trial (shipped, no verdict yet)

- **P-11 progression pacing** — his target: 1–2 runs of 3–5 min per level. Built as about five minutes of play per level (XP = seconds + points/1000). His runs are far shorter than 3–5 min (median 35 s), so check with him whether levels feel right from a reset save.
- **Pause and settings** (T-05) — pause button / P / ESC / auto on app switch; settings sheet with sound, left-handed pads, tilt, reset progress. All HTML sheets share `game/panels.ts`. Unseen by him.
- **P-18 the lean follows you** — his idea: hopping off a rail and back on no longer resets the balance meter (lean, tipping speed and fatigue carry over for up to 3 s). Closes the last rail exploit he found. His own style hops a lot (162 same-rail re-locks in the recordings), so ask whether normal play now feels punishing.
- **Playable tutorial** (T-04) — eight lessons, repeat-until-done, offered on first launch and from the how-to card. Rules live in `core/tutorial.ts`; the course is `course: 'tutorial'` on the Sim. Unplayed by a person.
- **Depth on stacks** (T-16b) — his rule: the higher deck is always further back. Draw order and tint are set in `GameScene.decksInFront`; fence and awning looks are `skin` on a rail (`core/level.ts`, art in `art/world.ts`); an awning is always drawn with its shopfront (`shopfront()`), because he said a bare awning looked out of place. Looks never use the level's dice, so layouts and recordings are unchanged.
- **Stacks course** (T-16a) — his request for a level with multi-level rails. `course: 'stacks'` on the Sim, own pattern pool in `core/level.ts`, picked on the menu and saved. Recordings carry the course. Unplayed by a person.
- **How-to-play card** (T-04a) — his request: a controls screen on first start and from the menu. Not yet seen by him on the phone. Keep `game/howto.ts` in step with any control change.
- **P-13b pads on tablets** — he found the upper corners wrong on an iPad; tablets now have their own position, size and edge gap (lower corners). If he wants them lower still, the next step is making the letterbox band under the picture take touches.
- **P-13 touch button pads** — left pad is the arrow keys (jump, turn/fakie, push), right pad is W A S D (tricks); faint, set above centre. Built from his spec after S5. First play: "pretty good", then enlarged and moved in at his request (P-13a: "that feels much better"). He wants to iterate on variations: position, size and faintness are sliders under *tuning → P-13*, and `touchLayout` 0 brings back zones and swipes. New variations go in as layout 2, 3…
- **P-14 one thumb, two trick buttons** — touching between two buttons on the right pad presses both; rolling onto another presses it. Watch the next phone recordings for accidental doubles (`padChordDeg` narrows or disables it).
- **P-15 rushed switch-ups** — his idea, to stop a points hack: trick buttons jammed under 200 ms apart on a rail shove your balance, harder under 100 ms. It also taxes his own habit of pressing two trick buttons together (P-14); ask how a quick pair feels.
- **P-15a / P-16 harder rails** — he found rails still too easy after P-15 ("both in regular simple grinding and in button-mashing"). P-16 raises general sensitivity (hands-off grinding now falls; it used to be safe on 3 rails in 4); P-15a makes rushed switch-ups escalate. All tuned on a modelled player. P-01 was the opposite complaint (too hard to save), so compare falls per grind with S1 (17 of 153) and S2–S5 (3 of 316) after the next session.
- **P-17 drop off a rail** — ↓ (keyboard or left pad) while grinding steps down to whatever is below. On this level that is always the street; it will matter more once T-16 adds stacked routes.
- P-07 pre-jump trick buffer.
- P-12's touch question is moot on the pads (the tap gesture only exists in touch layout 0). He never said what he was seeing when he asked to jump while grinding; the recordings showed it already worked.

## Parked by the user

- **P-08 real blading trick names.** Proposal in `TRICKS.md` ("Naming model"). He is thinking it over. Don't build it until he brings it back.

## Suggested next steps, in order

1. **Second phone session on the P-13 pads (needs the user).** Then compare with S5 in `PLAYTEST.md`: bails per minute (was 6.4), mid-trick slams (4.8), jump presses that did nothing (5.0). Still wanted from the phone: the `?fps` readout, and whether audio starts.
2. **P-09 mid-trick slams** — the one number that got worse in the last session (see `PLAYTEST.md`, "Open after S3"). Investigate in the recordings before changing anything.
4. **T-03 manuals, T-06 landing quality** — he said wait on these (2026-11-21).
5. **T-11 Capacitor iOS shell** once the phone playtest says the web build is worth wrapping.

## How to work with this user

- He skates; trust his eye on poses and trick names over yours, and ask rather than guess on blading specifics.
- He gives feedback in short batches after playing. Work through it with the method in `PLAYTEST.md`: evidence from recordings, one ID and one commit per change, each behind a switch. Art-only changes need no switch but still get an ID and a row.
- For sprite feedback, send a still sheet (`npm run fakie`, `npm run sprites`) with each attempt; he judges from those faster than from play.
- Performance is a standing requirement ("it needs to feel buttery"): `npm run perf` after any change under `src/game/`.
- Say what was checked and how. Stills are not the same as seeing it in motion.

## Repo and delivery

- The working copy is on the user's Mac at `~/Documents/projects/zemog-gamez/sk8scroller`. `origin` is `https://github.com/zonabi/sk8scroller.git` (public). Cloud sessions can push to it (Claude GitHub App installed 2026-11-20) but cannot delete branches. **Push after each set of changes** — his standing instruction, repeated in chat 2026-11-21 ("push to github after every change so testers can see the latest"). A new session needs him to say so in the conversation before pushing to `main`; this file alone is not enough.
- **Testers' build:** every push to `main` deploys to https://zonabi.github.io/sk8scroller/ via `.github/workflows/pages.yml` (runs `npm run check` first; a failing check blocks the deploy). `vite.config.ts` uses `base: './'` so the build works from a subfolder — keep asset paths relative. Runs played there are not collected (no dev server); only local/Wi-Fi play lands in `runs/`. `package-lock.json` shows as modified locally; that's from his `npm install`, leave it.
- `runs/` is git-ignored and holds his raw recordings. Sessions worth keeping are copied into `tests/golden-runs/` (57 runs: S1–S5) and must keep replaying exactly (`npm run check`).
- The dev server picks up changes on reload; no restart needed unless `vite.config.ts` changes.

## Known gaps

- Phone: fps readout, tilt axis, audio unlock, full-screen on Android/iPad — still unreported. Touch pads unfelt.
- Touches in the black bars beside the game on a wide phone do nothing (Phaser only hears the canvas); the pads sit inside the picture.
- Flips still rotate the side-view sprite (spins have a proper 8-frame turnaround).
- Trick descriptions in `TRICKS.md` not yet checked by the user.
- 56 trick swipes did nothing in the last session (P-10), not yet classified.
