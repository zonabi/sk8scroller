# SK8SCROLLER (working title)

A fast, auto-scrolling, side-view aggressive inline skating game. Mobile first, pixel art,
graffiti grit. Sonic's speed, an endless runner's one-more-go loop, THPS's combo scoring.

**Status: v0.3 — playable prototype, 16-bit style art, graffiti UI, synthesised sound effects (no music).**

## Run it

```bash
npm install
npm run dev        # prints a Local and a Network URL
```

Open the Network URL on your phone (same Wi-Fi) and rotate to landscape. The corner button on the menu goes full screen
(Android, iPad, desktop). iPhone Safari has no full-screen API: use Share → Add to Home Screen and launch it from there.
Tilt control needs HTTPS on iOS Safari, so over plain Wi-Fi use touch; tilt works once wrapped with Capacitor.

## Controls

| | Touch | Keyboard |
|---|---|---|
| Jump (hold = higher) | left thumb press | Space |
| Air tricks | right thumb swipe ↑ ↓ ← → (tap = ↑) | W A S D |
| Grind | land on a rail or ledge | same |
| Balance on a grind | left thumb hold + drag sideways, or tilt | ← → |
| Switch-up (change grind) | right thumb swipe | W A S D |
| Hop off a grind | left thumb quick tap | Space |
| Mute | "sound" toggle on the menu | M |

Land with a trick unfinished and you bail. Combos bank ~1s after you touch down; three bails ends the run.
Score becomes XP, levels unlock tricks.

Debug URLs: `?seed=7` fixes the level, `?bot` lets the bot play, `?fps` shows fps / frame ms / boot time, `?z=2` forces a lower render zoom, `?hold` freezes on the loading screen, `?rail` adds one very long rail about 10 seconds in (grind practice / sound testing).

## Playtest recording

While `npm run dev` is running, every run you play (phone included) is saved to `runs/`. Tap the flag at the top of the
screen (or press F) when something feels wrong; it marks that moment. `npm run replay` turns a run into a report, and
`?replay=latest` plays it back.

## Tuning panel

Menu → *tuning*: switch individual playtest changes on or off and adjust feel values, on the device you're playing on.
Settings are saved on that device and written into each recording. See [docs/PLAYTEST.md](docs/PLAYTEST.md).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run check` | typecheck + unit tests + bot fairness sim — **run before every commit** |
| `npm run perf` | load time, CPU per frame, text budget — fails if over |
| `npm run replay` | playtest report from the newest recorded run (`-- --all` for every run, `-- --verify` to prove old runs still replay) |
| `npm run sprites` | skater pose contact sheet → `shots/sprites.png` |
| `npm run shots` | build, then headless screenshots into `shots/` (needs Chrome) |
| `npm run build` | production build in `dist/` |

## Where things are

- [docs/GDD.md](docs/GDD.md) — the game design
- [docs/TECH.md](docs/TECH.md) — stack choice, architecture, path to iOS
- [docs/TRICKS.md](docs/TRICKS.md) — researched trick vocabulary and what's implemented
- [docs/ROADMAP.md](docs/ROADMAP.md) — milestones
- [docs/BACKLOG.md](docs/BACKLOG.md) — task cards sized for one agent session
- [docs/DECISIONS.md](docs/DECISIONS.md) — decision log
- [CLAUDE.md](CLAUDE.md) — rules for AI agents working in this repo
