# Trick vocabulary

Research notes for aggressive inline. ✅ = in the game (`src/core/tricks.ts` is the source of truth for values).
Descriptions are short paraphrases for design use — **have a skater sanity-check them before they become in-game text.**

Skate anatomy that the names depend on: the **soul plate** (flat sole edge of the boot), the **h-block / groove**
(the gap in the frame between the middle wheels), and the **backslide groove/plate** on the inner sole.

## Grinds

### Fundamentals
| | Trick | Stance |
|---|---|---|
| ✅ | Frontside | Both skates across the rail on the h-block, chest facing it. The default lock-in. |
| | Backside | Same, with your back to the obstacle. |
| ✅ | Soul | Back foot on its soul plate along the rail, front foot across on the h-block. |
| ✅ | Makio | One-foot soul grind; the free foot is lifted and often grabbed. |
| ✅ | Mizou | Soul-family: soul foot plus the other foot turned inward on the frame. |
| | Acid | Soul-family: the frame foot turned outward instead. |
| ✅ | Royale | Frontside variation with the back foot tipped onto its edge. |
| | Sidewalk | One-foot relative of the mizou. |

### Intermediate / advanced
| | Trick | Notes |
|---|---|---|
| ✅ | Top Soul | "Topside": the soul foot leans over to grind on its top/inside edge. |
| ✅ | Backslide | Like a royale but only the back skate grinds; front foot usually grabbed. |
| ✅ | Fishbrain | Topside makio. |
| ✅ | Unity | Legs crossed, both skates on their outer edges. |
| | Torque / Full Torque | Backslide-foot grinds combined with a frame foot. |
| | Soyale | Soul + royale hybrid, done alley-oop. |
| | Fahrvergnügen, Savannah, Pornstar (P-Star), Sweatstance, Kind Grind, Top Acid, X-Grind, Cab Driver, Fishbone | Further stance families to mine for unlocks. |

### Modifiers (multiply any grind — ideal for a deep unlock tree)
- **Alley-oop** — entering turned the other way so you grind facing backwards.
- **Truespin** — spinning onto the grind toward your blind side.
- **Topside / Negative** — which edge of the soul foot is on the rail.
- **Fakie / Switch** — riding in backwards / on your off side.
- **Spin in / out** — 270 on, 360 out; **rewind** = spinning out against the way you came in.
- **Switch-up** — changing stance mid-grind (✅ implemented as the swipe during a grind).
- **Grabbed** — holding the free foot (rocket makio, fishbone…).

## Air
| | Trick | Notes |
|---|---|---|
| ✅ | Mute Grab | Cross-body grab of the skate. |
| ✅ | Stale Grab | Back hand to the back skate, behind you. |
| ✅ | Safety Grab | Same-side hand to the outside of the skate. |
| ✅ | Rocket Air | Legs straight out in front, grabbing the toes. |
| ✅ | Liu Kang | One leg kicked straight out, the other tucked and grabbed. |
| | Stale, Japan, Parallel | More grabs. |
| ✅ | 180 / 360 / 540 | Spins. 720, 900, 1080 to add. |
| ✅ | Backflip | |
| ✅ | Misty Flip | Off-axis front-flipping 540. |
| | Frontflip, Flatspin, Bio 540/720, Brainless, McTwist, Fakie 720, Zero Spin | Flips and corked spins for late unlocks and specials. |

## Ground and transition (future mechanics)
- **Manuals** — toe roll / heel roll on one or two wheels. Combo glue (BACKLOG T-03).
- **Cess slide / powerslide** — sideways slides on flat; could be the "brake" or a combo extender.
- **Stalls** — pausing on coping or a ledge (soul stall, royale stall, backslide stall). Needs quarter pipes.
- **Wallride**, **gap** (clearing a named distance), **disaster** (jumping a gap onto the grind), **stair bash**.

## Fakie (✅ P-06)
Rolling backwards while still travelling the same way. In the game every trick has a fakie version: turn round on the ground, or land a 180/540. Real-world naming is richer than a prefix (fakie approach vs. landing fakie, switch, alley-oop and truespin entries); those are the next layer if the simple version earns its place.

## Naming model (proposed for P-08 — awaiting the player's decisions)

What the sources agree on:
- **Fakie** — approaching (or rolling) backwards. Often you spin 180 into the grind from fakie.
- **Half cab** — a fakie 180. *Half cab soul* = fakie, 180 onto a soul. **Full cab** = fakie 360.
- **Zerospin** — approach fakie, do the grind, land fakie, without spinning.
- **Alley-oop** — a spin into a backwards grind where you can see the obstacle the whole way round. **Truespin** — the same but spinning the blind way; harder.
- **Rewind** — spinning out the opposite way to the way you spun in.
- **Switch** / **unnatural** — a trick done on your non-natural side. It is *not* a word for rolling backwards.

What they disagree on (One Blade Mag has run several pieces on it): whether alley-oop/truespin name the *spin direction* or the *backwards grind*; whether they apply to groove tricks (frontside, royale, unity) at all; and what inspin/outspin mean.

Proposed mapping to what the game can actually tell apart — how you left the ground and what you spun before the rail:

| Took off | Spin before the rail | Called | Grinding |
|---|---|---|---|
| forward | none | Soul | forwards |
| forward | 180 | Alley-oop Soul | backwards |
| forward | 360 | 360 Soul | forwards |
| forward | 540 | Alley-oop 540 Soul | backwards |
| fakie | none | Zerospin Soul | backwards |
| fakie | 180 | Half Cab Soul | forwards |
| fakie | 360 | Full Cab Soul | backwards |
| fakie | 540 | Fakie 540 Soul | forwards |

Air: from fakie a 180 is a **Half Cab**, a 360 a **Full Cab**, a 540 a **Fakie 540**; grabs and flips keep the **Fakie** prefix. The spin-in would be folded into the grind's name and score, not listed as a separate "180".

Open decisions: (1) truespin needs a spin *direction*, which the game doesn't have yet; (2) switch needs a *natural side* per skater; (3) whether groove tricks take the alley-oop naming or stay "Fakie Royale" etc.

Sources: toxboe.net grind variations and 1997 dictionary; Grindhouse trick guide basics; One Blade Mag — "The Truespin On 'Alley-Oop' History" and related blogs.

## Slot design
Each swipe direction is a slot, separately for air and grind. Today the best unlocked trick fills the slot:

| Slot | Grind ladder | Air ladder |
|---|---|---|
| (lock-in) | Frontside | — |
| ↑ | Soul → Top Soul | Mute → Rocket |
| ↓ | Makio → Fishbrain | Safety → Liu Kang |
| ← | Royale → Backslide | 180 → 360 → 540 |
| → | Mizou → Unity | Backflip → Misty |

## Sources
- toxboe.net trick dictionary and trick pages — https://toxboe.net/tricks
- SkaMiDan aggressive inline trick lists (grinds; airs, grabs & spins; manuals & slides; lips & stalls) — https://www.skamidan.com/en/blogs/aggressive-inline-skating-tutorials-and-learning/trick-lists-of-aggressive-inline-skating-disciplines-know-how-and-tricks-rollerblading-stunts-stunt-skating-flips-grinds-spins-airs-manuals-lips-stalls
- "The Rule of Soul Plate" learning progressions — https://skatebasic.netlify.app
