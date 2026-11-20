# Playtest change log

How feel changes are made on this project, and the record of each one.

## The method

1. **Evidence first.** Find the note in recorded runs (`npm run replay -- --all`) and state it as a number.
2. **One change, one ID, one commit.** Commit subject starts with the ID (`P-03: …`), so `git revert` or `git log --grep P-03` isolates it.
3. **Every change sits behind a switch** in `src/core/config.ts`: a key in `DEFAULTS` (the new behaviour), the pre-change value in `LEGACY`, and a `KNOBS` entry so it appears in the tuning panel.
4. **Old runs must still replay exactly.** `npm run replay -- --verify` (part of `npm run check`) replays the committed sessions in `tests/golden-runs/` under their own settings. A mismatch means a change leaked outside its switch.
5. **Predict, then confirm.** Where possible, count how many recorded incidents the change would have prevented before shipping; after the next session, compare.
6. **The player decides.** Status moves `trial → kept / tuned / reverted` only on the player's word. A reverted change keeps its switch (default off) until it is clear it won't come back, then the code is removed.

## Rolling back

| To… | Do |
|---|---|
| Try the game without one change | Menu → *tuning* → flip its switch. Applies to the next run, on that device only. |
| Compare against the game before all changes | Tuning → *everything as before*. |
| Make a rollback permanent | Set the key's `DEFAULTS` value to its `LEGACY` value, note it here. |
| Remove a change entirely | `git revert` the `P-xx` commit. |
| See what a run was played with | `npm run replay -- <file>` lists settings that differ from the current game. |

## Sessions

| Session | Runs | Build | Where |
|---|---|---|---|
| S1 — 2026-11-19, Mac Safari, keyboard | 14 runs, 8.8 min | 0.4.0 (before P-01) | `tests/golden-runs/` (files 03-…) |
| S2 — 2026-11-19, Mac Safari, keyboard | 4 runs, 3.6 min | 0.5.0 (P-01 to P-04 on) | `tests/golden-runs/` (files 04-…) |

**S1 → S2, per minute of play:** balance falls 1.9 → 0.3 (17 of 153 grinds → 1 of 46); mid-trick slams 2.5 → 1.4; longest run 73 s → 97 s. 26 of 46 grinds locked in with a chosen stance (P-02 in use). Player: "It feels much better now!"

## Changes

| ID | Status | Player's note | Evidence (session) | Change | Switches |
|---|---|---|---|---|---|
| P-00 | kept | — | — | Tuning panel, switches, this log, golden-run verification | — |
| P-01 | kept (S2) | "Rail balance seems hard to counter the failing tilt" | S1: 17 balance falls in 153 grinds. 11 with no correcting input at all (fall took ~1 s); 5 of the 6 corrected ones were already past the point the controls could recover. Hard stances (Unity, Backslide) tipped in under a second after a switch-up. | Steering strength scales with the stance; a new stance is calm for 0.4 s; only 40% of a stance's difficulty speeds up the lean; more damping; softer switch-up shove. Modelled player (250 ms reactions) in Unity: 1.5 s → 5.2 s; doing nothing: 1.0 s → 1.9 s. Frontside: 5.3 s → 9.2 s. | `balanceControlScale` `balanceSettleMs` `stanceHardness` `switchUpKick` `balanceDamp` |
| P-02 | kept (S2) | "About to land on a rail, you should be able to pre-emptively hit the trick button and land-then-grind" — decided: a completed air trick picks the grind, or a press within 100 ms of the rail; otherwise a rail can still slam you | S1: landing mid-trick was the top cause of bails (22 of 42); 11 were onto a rail. 3 of those were swipes 17–67 ms before touchdown. | A swipe ≤100 ms before a rail picks the stance and drops the air trick it started. A finished air trick's direction picks the stance. Unfinished older tricks still slam. Predicted on S1: 3 of the 11 rail slams avoided by this rule alone. | `railIntentMs` `railTrickPicksGrind` |
| P-03 | kept (S2) | (found in recordings, not reported) | S1: of the 22 mid-trick slams, 8 had the trick within 100 ms of finishing (5 on the ground, 3 on rails). | A trick ≤100 ms from finished at touchdown counts as landed. With P-02, predicted on S1: 22 slams → 11. | `landGraceMs` |
| P-04 | kept (S2) | (found in recordings, not reported) | S1: 31 swipes ignored because another trick was still going; 21 swipes into a direction with no trick at level 1–2; 8 jump presses just after a rail ran out. | Swipes queue for up to 150 ms behind a finishing trick. Every direction has a trick from level 1 (new: Stale Grab; Safety, Royale, Mizou moved to level 1; 360 to 2, Rocket to 3). A jump still works for 110 ms after a rail ends. | `trickBufferMs` `allSlotsFromStart` `coyoteMs` |
| P-07 | trial | (found in recordings, not reported) | S1+S2: 28 trick swipes made on the ground did nothing; 11 of them were within 134 ms before a take-off — a trick pressed a hair early. | A trick swipe on the ground ≤140 ms before leaving it fires as the jump leaves. | `preJumpMs` |
| P-05 | trial | "You should be able to tap forward to kind of speed up or push a bit harder for about 1–2 seconds… just a tiny boost" | S1+S2: 9 right-direction presses on the ground with no jump near — already reaching for it. | Push: +18% speed for 1.5 s, reached quickly, fading at the normal rate; 2.2 s between pushes. Right-thumb tap on the ground, or → on keyboard. Speed carries into a jump. | `pushBoost` `pushSecs` `pushCooldown` |
| P-06 | trial | "You should be able to switch between skating forward and skating backwards (same direction)… tricks also become different, 'fakie'" — decided: reward it | — (new mechanic) | Turn round on the ground: left swipe, or ← on keyboard. A 180 or 540 leaves you facing the other way; a 360 doesn't. Anything done fakie is named "Fakie …", scores +25%, and counts as a different trick for combo variety. Grinding fakie tips 15% faster. A bail resets you to forward. If a left swipe turns you and you jump within 140 ms, it is treated as a trick and the turn is undone. | `fakieEnabled` `fakieBonus` `fakieBalance` |
| P-06a | kept | "The jump switch animation feels and looks great"; "a simple mirror of the sprites won't work [for rolling fakie]… you crouch down your knees more, stick out butt a bit, and turn your head to face backwards a bit" | Skating references agree: knees bent, look over one shoulder, upper body rotated slightly, hands in front. | Rolling fakie has its own 4 frames: hips facing back, deeper seated crouch with hips pushed toward travel, shoulders opened to the camera, head turned over the shoulder, hands low in front. Built on a general 3D pose (hips / shoulders / head each with their own turn). Fakie air tricks and grinds are still mirrored forward sprites. | art only, no switch |
| P-06b | kept | "When grinding fakie, that's also going to need its own sprites… really the only change is the skater turning their head to face the way they're moving. Maybe they hold their body slightly differently but not by much." | — | Each of the 9 grind stances has a fakie version: same stance mirrored, head turned three-quarters to look toward travel, torso 5° more upright. The head is now drawn by one any-angle routine shared with spins and the fakie roll. | art only, no switch |
| P-06c | kept | "Yes, head turn so facing forward on those as well" (fakie air tricks and landing) | — | Every pose except rolling and bails now has a fakie version with the head turned toward travel: jump, fall, landing crouch and all grabs, as well as the grinds. | art only, no switch |
| P-06d | superseded by P-06e | "When skating backwards and jumping, their left arm looks weird… shoulder all low, arm in an unnatural direction. Have the arm go out the other direction (away from the body) and up to the right a tad — match where the arm was in the frame before jumping" | The forward jump tucks both hands up by the head; mirrored with the head turned, the near arm folded against the face. | Fakie jump has its own arm targets: near arm reaching out and slightly up (continuing from the fakie roll), far arm out the other way. Fakie-only pose overrides live in `FAKIE_TWEAKS`. | art only, no switch |
| P-06e | trial | "Not really fixed… when rolling fakie, one shoulder is aimed the way they're rolling (the character's left) — that arm should be going outward to the front for balance, not backwards. Their right arm would be going backwards. Switched." | P-06d moved the wrong arm: the mirrored forward poses put the camera-side arm trailing, but fakie the camera-side shoulder is the leading one. | Rule for every fakie sprite: the leading arm (camera side, the shoulder being looked over) reaches toward travel; the other trails. Hand targets are swapped for all mirrored fakie poses except grabs, and the fakie roll's arms are re-aimed the same way. | art only, no switch |
| P-08 | parked by the player (thinking over the naming) | "Let's use the true real blading naming conventions for fakie, switch, alley-oop etc" | See TRICKS.md → *Naming model (proposed)*. Community sources disagree on some points, so three decisions are the player's. | Not built yet. | — |
