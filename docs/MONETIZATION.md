# Monetisation ideas — parked

Status: **ideas only, nothing decided, nothing to build yet.** Captured 2026-11-23 so they are not lost.
Revisit once the feel work is ironed out (GDD says: decide before M5). Market figures below were looked up
on 2026-11-23 and will go stale — re-check before deciding.

## Ground rules already in the GDD

- Leaning premium, or free with cosmetic-only purchases.
- No stamina timers, no pay-to-continue: they would wreck the one-more-run loop.
- Original characters only; no real brands (a paid sponsorship would be a deliberate exception).

A rule worth adding when this is decided: **nothing sold changes the score.** The game is a skill game with
recordings and a fairness bot; anything that buys speed, air or balance breaks both.

## Decided: kids are part of the audience (user, 2026-11-23)

"We most certainly want kids to play this game." That narrows the list more than any other single choice:

- **US privacy law (COPPA) applies** once a game is directed at under-13s, even as part of a mixed audience.
  The amended rule has been in force since April 22, 2026: no personal data from a child without verified
  parental consent, and targeted advertising needs its own separate parental opt-in. A mixed-audience game
  has to find out a player's age before collecting anything.
- **Simplest way to comply: collect nothing.** No accounts, no ad or analytics SDKs that phone home, progress
  saved on the device. That is how the game works today — keep it that way and most of this goes away.
- **Apple's Kids Category is optional, and strict:** no third-party ads or analytics (narrow exceptions), and
  purchases and links out of the app must sit behind a parental gate. A game can welcome kids without being
  listed there, but the privacy law above applies either way.
- **What this does to the ideas below:**
  - Favoured: one-time purchases (4-6), cosmetics (1, 2a, 8-13), cities (3), merch (20). Parent buys once, done.
  - Ads (16, 17): targeted ads are effectively out. Only contextual, kid-safe ad providers are possible, and
    they pay less. Easiest answer is no ads in the app.
  - Soft currency for sale and season passes (14, 15): legal, but repeated spending prompts aimed at kids draw
    regulator and parent anger. If used, keep them earnable and gentle. Loot boxes stay out.
  - Skin sharing (2b, 2c): fixed parts and share codes are safe. Free-drawn or named content shared between
    kids needs moderation before anyone else sees it.
  - Sponsors (21): ads to children have their own rules; only brands a parent would be fine with.
  - Leaderboards (23): initials or generated names only — no free-text names, no chat.
  - Web portals (18): they run their own ads; ask how they handle under-13 players before signing.
- Every buy button should assume a parent is the one deciding: clear price, says what you get, no countdowns.
- This is a summary, not legal advice. Before launch with any data collection or ads, get it checked.

## The three starting ideas

### 1. Custom skater skins
- Cheapest idea on the list: a skater is already data (`colors` + `look` in `core/skaters.ts`) and the sprites
  are generated from it, so a skin is one row, not an art job.
- Catch: today's four skaters also carry stats (speed / air / balance). Sell *looks*, keep *stats* earnable,
  or split the two (pick a body, then pick an outfit) so a paid skin never plays differently.
- Beyond recolours: new `look` parts (helmets, hoodies, masks, backpacks), skate/frame/wheel sets.

### 2. Create your own skin
Three sizes, very different costs:
- **a. Mix-and-match editor** — pick colours and parts from a fixed set. No server, no moderation (nothing
  free-drawn), fits the generated-art pipeline. Could be the paid unlock itself, or free with part packs sold.
- **b. Share codes** — a skin is a short string; players paste each other's. Free word of mouth, still no server.
- **c. Player marketplace with payouts** — the big version. Needs accounts, hosting, moderation before sale,
  IP rules, payouts. For scale: Roblox passes roughly 25–35% to creators. A later-stage idea, if ever.
- A free-draw pixel editor sits between a and c: more expressive, but needs moderation the moment skins are shared.

### 3. Unlock new cities
- A city = backdrop, palette, obstacle patterns, shopfronts, signs, music mood. STREET and STACKS are the
  first two "courses"; a city could bundle one of each.
- Ways to gate: earn with XP (free), buy early (paid shortcut), or paid-only packs. Earn-or-buy is the gentlest.
- Keep every city reachable by daily/seeded challenges so paying never splits who can compete.
- Cost: this is the most art- and pattern-heavy idea here. Each city also needs a bot fairness pass.

## More options

### One-time purchases (fits the GDD best)
4. **Full-game unlock** — free download with the first city; one purchase opens everything, for good.
   Simple, honest, no economy to balance.
5. **Paid app** — a few dollars up front, no shop at all. Cleanest, but hardest to get discovered.
6. **Supporter pack / tip jar** — pay what you like for a founder skin or badge. Works from the web beta onward.
7. **Remove ads** — only relevant if ads go in (below).

### Cosmetics beyond the skater
8. **Your own tag** — a graffiti tag you pick or build that gets sprayed in the world (walls, shop shutters).
   Very on-theme (Jet Set Radio).
9. **Grind sparks and trails**, wheel glow, landing dust.
10. **Bail and celebration animations.**
11. **UI sticker themes** — menu stickers, tape, name-tag styles.
12. **Soundtrack packs** — once there is real music; alternate synth kits before that.
13. **Trick style variants** — same trick and score, different flair. (New scoring tricks stay earnable.)

### Recurring
14. **Season pass** — a themed cosmetic track every month or two. Subway Surfers City launched in 2026 with a
    $4.99 seasonal pass and cosmetic-driven progression. Earns well, but commits us to a content treadmill.
15. **Soft currency** (spray cans? stickers?) earned by playing, spent in a rotating cosmetic shop; optionally
    buyable. No loot boxes — odds-based purchases bring regulation and a younger audience makes it worse.

### Ads (only opt-in ones)
16. **Rewarded video, player's choice** — double XP after a run, a free daily cosmetic, shop refresh.
    Never forced, never mid-run.
17. **Second-chance revive for an ad** — the genre standard (Subway Surfers does it), but it *is*
    pay-to-continue, which the GDD rules out. Open question, not a default.
- Context: in the US, ads were about 22% of mobile game revenue in early 2026 (far higher in India, Brazil).
  Hybrid ads-plus-purchases is where the growth is; purchase-led hybrid titles out-earn ad-led ones.
- With kids in the audience, see the section at the top: no targeted ads; contextual kid-safe ads only, if any.

### Web — the build we already have
18. **Web game portals** (Poki, CrazyGames): they host the game and share ad revenue. Reported developer
    shares: Poki about 50%, CrazyGames about 60% of ads / 70% of purchases; revenue from our own traffic stays
    ours. Poki's standard deal is reported as web-exclusive for 5 years — read the terms before signing.
    Needs their SDK and ads between runs. Also a cheap way to get thousands of real players on the game early.
19. **Sell direct on our own site** — web purchases have no app-store cut. Could be the supporter pack.

### Outside the game
20. **Merch** — the graffiti lettering and skaters as stickers, tees, a zine. No platform cut, builds the brand.
21. **Sponsored spots** — a real skate shop or brand on a shopfront sign or billboard (the STACKS shops are
    ready-made ad space). Breaks "no real brands" on purpose, so each one is a decision.
22. **Platform deals** — subscription catalogues (Apple Arcade, Netflix Games) or a publisher. Pitch-based and
    a long shot; not researched yet.

### Not money, but makes everything above work
23. **Daily seeded run** — everyone gets the same seed (the sim is deterministic, so this is nearly free),
    with a leaderboard and a small cosmetic reward. Gives people a reason to come back, which is what any of
    the above needs.

## Store fees to remember (iOS)

- Apple's Small Business Program: 15% commission for developers earning under $1M a year.
- US apps may currently link out to web checkout with no Apple commission; in August 2026 Apple asked the
  court to allow 15% (5% for Small Business Program apps). Unsettled — check again at decision time.

## Cheap things to keep in mind while building (no work now)

- Keep a skater's **look** separable from their **stats**.
- Keep cosmetics as data with stable ids; ownership is just a list of ids in storage.
- Cosmetics live in `src/game/` (drawing). `src/core/` never asks what the player owns.
- New looks must be warmed at boot like the current ones (perf rules).

## A possible order (a lean, not a decision)

1. **Web beta:** nothing, or a tip jar / supporter skin. Maybe a portal trial for reach.
2. **iOS launch:** free with a one-time full-game unlock, plus a small cosmetic shop (skins, tags, trails)
   and the mix-and-match editor.
3. **If it finds an audience:** new cities, seasons, share codes; marketplace only if players ask for it.

## Open questions for later

- ~~Who is the audience — do we expect kids?~~ Yes, decided 2026-11-23 (see top).
- List in Apple's Kids Category, or a general listing with a low age rating?
- Premium, free-with-unlock, or free-with-shop?
- Is an opt-in ad ever acceptable in this game? Is a revive?
- Are cities earned, bought, or both?
- Does a real-brand sponsorship fit the game's attitude?

## Sources (2026-11-23)

- Sensor Tower ad monetisation report, via GameDev Reports: https://gamedevreports.substack.com/p/sensor-tower-mobile-game-ad-monetization
- Sensor Tower, hybrid-casual ads vs purchases: https://sensortower.com/blog/gaming-deep-dive-ad-monetization-report
- US vs India ad share: https://gameworldobserver.com/?p=29151
- Subway Surfers City pass: https://finalboss.io/subway-surfers-city-what-the-february-26-mobile
- Subway Surfers rewarded-ad placements: https://blog.udonis.co/mobile-marketing/mobile-games/rewarded-video-ad-placements
- Creator revenue shares: https://gamesbeat.com/the-infrastructure-buildout-behind-user-generated-content-with-overwolf-gamesbeat-summit-recap/
- UGC legal/moderation notes: https://www.mofo.com/resources/insights/250409-all-your-sale-are-belong-to-us-mitigating-ip
- Web portal shares: https://app.cinevva.com/guides/web-game-monetization and https://playgama.com/blog/business-faqs/poki-vs-crazygames-vs-gamedistribution-revenue-share/
- Apple link-out fee proposal: https://www.macrumors.com/2026/08/13/app-store-fees-apple-link-outs/
- Amended COPPA rule: https://foleyhoag.com/news-and-insights/blogs/security-privacy-and-the-law/2026/july/the-amended-children-s-online-privacy-protection-act-(coppa)-regulations-what-your-business-needs/
  and https://gamesbeat.com/understanding-the-updated-coppa-rules-and-their-impact-on-child-safety/
- Apple on kids' apps and parental gates: https://developer.apple.com/news/?id=01212020b
