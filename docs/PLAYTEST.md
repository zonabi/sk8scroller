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
| S1 — 2026-11-19, Mac Safari, keyboard | 14 runs, 8.8 min | 0.4.0 | `tests/golden-runs/` |

## Changes

| ID | Status | Player's note | Evidence (session) | Change | Switches |
|---|---|---|---|---|---|
| P-00 | kept | — | — | Tuning panel, switches, this log, golden-run verification | — |
