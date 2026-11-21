# Handoff — where the project stands

Updated 2026-11-20 (evening), version 0.8.0. Read after `CLAUDE.md`. Keep this file current: rewrite it at the end of any session that changes the state below.

## State in one paragraph

A playable browser build of the whole core loop: run, jump, grind with balance, switch-ups, air tricks, combos, bails, XP, four skaters, push, and fakie (rolling backwards, with its own sprite set). 16-bit art generated in code, graffiti UI, synthesised sound, full-screen button. Every human run is recorded and can be replayed and analysed. On the user's Mac it holds 60 fps at zoom Z4 and boots in about 0.5 s. **First phone session played 2026-11-20 (S5, iPhone):** it runs, and the user's verdict was that touch should work like the keyboard. Touch now defaults to two on-screen button pads (P-13, on trial).

## What the user has approved

- Art style (Genesis/SNES, "think Sonic") and graffiti lettering.
- Performance on Mac ("still feels really good and buttery").
- Feel after P-01…P-04 ("It feels much better now!").
- Push (P-05): "I can notice it and it feels good to boost the player."
- Sound: "good enough for the feel" — no further sound work wanted for now.
- Fakie mechanic and all fakie sprites (P-06, P-06a…h): "approved here on that fakie addition".

## On trial (shipped, no verdict yet)

- P-05a push strength raised 18% → 22% at his request ("slightly more push"). Not yet played.
- **P-13 touch button pads** — left pad is the arrow keys (jump, turn/fakie, push), right pad is W A S D (tricks); faint, set above centre. Built from his spec after S5. First play: "pretty good", then enlarged and moved in at his request (P-13a, awaiting a play). He wants to iterate on variations: position, size and faintness are sliders under *tuning → P-13*, and `touchLayout` 0 brings back zones and swipes. New variations go in as layout 2, 3…
- **P-14 one thumb, two trick buttons** — touching between two buttons on the right pad presses both; rolling onto another presses it. Watch the next phone recordings for accidental doubles (`padChordDeg` narrows or disables it).
- **P-15a / P-16 harder rails** — he found rails still too easy after P-15 ("both in regular simple grinding and in button-mashing"). P-16 raises general sensitivity (hands-off grinding now falls; it used to be safe on 3 rails in 4); P-15a makes rushed switch-ups escalate. All tuned on a modelled player. P-01 was the opposite complaint (too hard to save), so compare falls per grind with S1 (17 of 153) and S2–S5 (3 of 316) after the next session.
- **P-17 drop off a rail** — ↓ (keyboard or left pad) while grinding steps down to whatever is below. On this level that is always the street; it will matter more once T-16 adds stacked routes.
- P-07 pre-jump trick buffer.
- P-12 turn round mid-jump (← / right-thumb tap = a 180 at any level) and the rail-end jump fix. Not yet played. **Open question for the user:** he also asked to be able to jump while grinding, but the recordings show that already works (175 of 177 presses); find out what he was seeing. On touch, a tap in the air used to be the up trick and is now the turn — untested, his to veto.

## Parked by the user

- **P-08 real blading trick names.** Proposal in `TRICKS.md` ("Naming model"). He is thinking it over. Don't build it until he brings it back.

## Suggested next steps, in order

1. **Second phone session on the P-13 pads (needs the user).** Then compare with S5 in `PLAYTEST.md`: bails per minute (was 6.4), mid-trick slams (4.8), jump presses that did nothing (5.0). Still wanted from the phone: the `?fps` readout, and whether audio starts.
2. **P-09 mid-trick slams** — the one number that got worse in the last session (see `PLAYTEST.md`, "Open after S3"). Investigate in the recordings before changing anything.
3. **P-11 progression pacing** — needs a decision from the user on how long unlocking should take.
4. **T-03 manuals, T-04 tutorial, T-05 pause/settings** — the remaining M1 cards that don't need a device.
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
