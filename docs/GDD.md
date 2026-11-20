# Game design

## Pitch

You never stop rolling. The city scrolls at you — rails, ledges, kickers, cones — and you turn it into one
long line of grinds, switch-ups and air tricks. Short runs, big combos, loud colours.

## Pillars

1. **Flow over survival.** The fun is linking tricks, not dodging. Obstacles exist to create lines.
2. **Two thumbs, no buttons.** Left thumb is your body (jump, balance). Right thumb is your style (tricks). Playable one-handed-ish on a bus.
3. **Real blading.** Real trick names, real stances, switch-ups. Skaters should nod; everyone else should learn the words.
4. **Loud and gritty.** Chunky pixels, thick ink outlines, flat saturated colour, graffiti everywhere.

## How the references map in

| Reference | What we take | What we leave |
|---|---|---|
| Sonic | speed, momentum, readable side view | level memorisation, enemies |
| Endless runners | auto-run, instant restart, short sessions | pure dodge gameplay, lane swapping |
| THPS | combo = sum × multiplier, bank on landing, bail loses it, balance meter | free roaming, button-combo inputs |
| Jet Set Radio | art attitude, tagging the city, soundtrack as identity | 3D, timers |
| Helskate | run-based progression layered on skating | combat — reviewers found it fought with the skating flow |
| OlliOlli, Alto's Adventure | proof that 2D skate combos and one-touch trick runners work on phones | — |

## Core loop

- **10 seconds:** read the next feature → jump → trick or grind → balance → land clean.
- **1 run (1–3 min):** speed ramps, patterns get denser, three bails and you're done.
- **Session:** score → XP → level → new tricks in your slots → bigger combos next run.

## Rules (as implemented in v0.1)

- Always rolling right. Speed ramps with distance.
- **Jump:** press; hold for full height. Kickers launch you higher automatically.
- **Air tricks:** swipe a direction. Each takes time (0.3–0.55s). Land before it finishes = bail ("sketchy").
- **Grinds:** land on a rail/ledge while falling to lock in (Frontside). Balance drifts like an inverted pendulum
  and gets worse the longer you hold and the harder the trick. Points tick up while you hold.
- **Switch-ups:** swipe during a grind to change stance — new combo entry, plus a wobble.
- **Combo:** every trick is an entry. Value = (sum of points, repeats worth 70% each time) × number of entries.
  Banks ~0.9s after you land, unless you start another trick first. Bail = combo gone.
- **Bails:** hitting a cone/barrier/ledge face, losing balance, or landing mid-trick. 3 lives. Brief invulnerability after.
- **Progression:** XP = score ÷ 20. Ten levels. Each of the 4 swipe directions is a slot (separately for air and grind);
  the best unlocked trick fills it.
- **Push:** tap (or →) on the ground for a short burst of speed, with a cooldown.
- **Fakie:** turn round on the ground (left swipe or ←), or land a 180/540, to roll backwards. Fakie tricks score 25% more and count as different tricks.
- **Skaters:** four originals with speed / air / balance trade-offs.

## Where it should go (ordered by value)

1. **Manuals** (toe/heel roll) to carry a combo across flat ground — the missing link for long lines.
2. **Special meter:** clean landings fill it; spend on a signature trick or a speed burst (Sonic moment).
3. **Tagging:** spray spots you hit mid-line; collect letters. Gives a second goal besides score.
4. **Terrain:** stairs, gaps, drops, multi-level routes (high line = harder, more points), wallrides, quarter pipes that send you back down a lower route.
5. **Districts:** themed tile sets and pattern pools — downtown, schoolyard, skatepark, rooftops, subway.
6. **Loadouts:** choose which unlocked trick sits in each slot; per-skater signature tricks.
7. **Daily seed:** same level for everyone today. Determinism makes replays and score validation cheap.
8. **Missions** per run ("grind 3 ledges in one combo") for XP and cosmetics.

## Controls — design notes

- Tilt-to-balance is **optional**, off by default. It's fun but excludes people lying down, on transit, or with motion sensitivity. Drag-to-balance must always be enough.
- No on-screen buttons. Whole left half / right half, so thumbs never miss.
- Tap on the right = the "up" trick, so a new player who mashes still does something cool.
- Open question for playtest: should grinding need a held input instead of being automatic? Automatic is friendlier; held gives the option of skipping a rail.

## Art direction

**Game world: 16-bit console pixel art (Genesis / SNES era — think Sonic), not chunky 8-bit.**
- 640×360 pixel grid. Skater sprites are 72×72 frames, roughly 58 px tall — about a sixth of the screen.
- Shaded, rounded forms: 3-tone ramps with shadows pushed toward violet and highlights toward warm yellow, light from the upper left, an ink outline around every body part.
- Dithered gradients for sky and soft shadows. Parallax: sky, far skyline, near skyline, graffiti wall, pavement.
- Rails and coping are always bright steel so lines read at speed. The wall behind the play layer is knocked back ~35% toward dark violet so skater and obstacles pop.
- Skaters are posed from data (hips, feet, hands) with IK, one pose per trick, so a new trick stance is a few numbers, not a redraw.

**UI: street art, rendered sharp (not pixelated).**
- Lettering is graffiti: `Sedgwick Ave Display` for pieces and call-outs, `Rubik Spray Paint` for numbers and buttons, `Permanent Marker` for labels. All open-licensed and bundled.
- Fat ink outlines, two-colour spray fades, offset block shadows, a few degrees of tilt, drips.
- Panels are street objects: name-tag stickers for skaters, masking tape for hints. No rounded-rectangle app UI.
- Trick call-outs slap on like stickers; the combo total changes spray colour as the multiplier climbs.

**Rules:** palette is `PAL` plus the ramps in `art/`. Characters, tags and brands are original — JSR and 90s skate mags are the mood board, not the source.

**Known limits of the current art:** it is drawn by code, so it is consistent and cheap to change but stiffer than hand animation. The roll cycle is 4 poses and tricks are single poses. A human pixel artist (or hand-polished sheets) is the upgrade path — see BACKLOG T-07.

## Audio (placeholder effects in, no music)

- Wheel roll loop pitched by speed, grind scrape per surface, landing thump, bail crunch, combo-bank sting.
- Music: boom-bap / punk / breakbeat. Must be licensed or commissioned — budget for it or use CC-BY tracks with credits.

## Monetisation (decide before M5)

Leaning premium or free with cosmetic-only purchases. No stamina timers, no pay-to-continue; they'd wreck the one-more-run loop.
