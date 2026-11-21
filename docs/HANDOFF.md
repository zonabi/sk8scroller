# Handoff — where the project stands

Updated 2026-11-20, version 0.7.2. Read after `CLAUDE.md`. Keep this file current: rewrite it at the end of any session that changes the state below.

## State in one paragraph

A playable browser build of the whole core loop: run, jump, grind with balance, switch-ups, air tricks, combos, bails, XP, four skaters, push, and fakie (rolling backwards, with its own sprite set). 16-bit art generated in code, graffiti UI, synthesised sound, full-screen button. Every human run is recorded and can be replayed and analysed. On the user's Mac it holds 60 fps at zoom Z4 and boots in about 0.5 s. **It has not yet been judged on a phone**, which is the target device.

## What the user has approved

- Art style (Genesis/SNES, "think Sonic") and graffiti lettering.
- Performance on Mac ("still feels really good and buttery").
- Feel after P-01…P-04 ("It feels much better now!").
- Push (P-05): "I can notice it and it feels good to boost the player."
- Sound: "good enough for the feel" — no further sound work wanted for now.
- Fakie mechanic and all fakie sprites (P-06, P-06a…h): "approved here on that fakie addition".

## On trial (shipped, no verdict yet)

- P-05a push strength raised 18% → 22% at his request ("slightly more push"). Not yet played.
- P-07 pre-jump trick buffer.
- P-12 turn round mid-jump (← / right-thumb tap = a 180 at any level) and the rail-end jump fix. Not yet played. **Open question for the user:** he also asked to be able to jump while grinding, but the recordings show that already works (175 of 177 presses); find out what he was seeing. On touch, a tap in the air used to be the up trick and is now the turn — untested, his to veto.

## Parked by the user

- **P-08 real blading trick names.** Proposal in `TRICKS.md` ("Naming model"). He is thinking it over. Don't build it until he brings it back.

## Suggested next steps, in order

1. **Phone playtest (needs the user).** `npm run dev`, open the network URL on the phone with `?fps`, play, send the readout and impressions. Recordings land in `runs/` automatically. Everything about touch controls, tilt, audio start on iPhone and frame rate is unverified until this happens.
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

- The working copy is on the user's Mac at `~/Documents/projects/zemog-gamez/sk8scroller`. `origin` is `https://github.com/zonabi/sk8scroller.git` (public). Cloud sessions can push to it (Claude GitHub App installed 2026-11-20) but cannot delete branches. **Push after each set of changes** — his standing instruction.
- **Testers' build:** every push to `main` deploys to https://zonabi.github.io/sk8scroller/ via `.github/workflows/pages.yml` (runs `npm run check` first; a failing check blocks the deploy). `vite.config.ts` uses `base: './'` so the build works from a subfolder — keep asset paths relative. Runs played there are not collected (no dev server); only local/Wi-Fi play lands in `runs/`. `package-lock.json` shows as modified locally; that's from his `npm install`, leave it.
- `runs/` is git-ignored and holds his raw recordings. Sessions worth keeping are copied into `tests/golden-runs/` (43 runs: S1–S4) and must keep replaying exactly (`npm run check`).
- The dev server picks up changes on reload; no restart needed unless `vite.config.ts` changes.

## Known gaps

- Phone: fps, touch feel, tilt axis, audio unlock, full-screen on Android/iPad — all untested.
- Flips still rotate the side-view sprite (spins have a proper 8-frame turnaround).
- Trick descriptions in `TRICKS.md` not yet checked by the user.
- 56 trick swipes did nothing in the last session (P-10), not yet classified.
