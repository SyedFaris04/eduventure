# Island World — Design

Date: 16 Nov 2026. Project 2 of 4 in the "3D world, islands, coding, languages" request (project 1, the 3D world, is merged).

## Why

EDUVENTURE will first be promoted to Malaysian players on social media, then grown worldwide and put on the Play Store and App Store. The world has to give people something to film and share, a reason to come back, and something that feels like home to Malaysians without shutting out everyone else.

Today there is one map (Greenhaven, 36 × 36). Monsters ask questions from the subjects a player chose at sign-up, wherever they are.

## What the player gets

- **Greenhaven Kampung, the hub.** The existing village gets a Malaysian makeover and a jetty.
- **A boat ride.** From the jetty you sail to an island in 5 to 8 seconds, across animated sea, with the island growing on the horizon.
- **Two new islands, both open from the start:**
  - **Science Island (Hutan Borneo)**, with a Malaysian theme;
  - **Mathematics Mountains**, with an international theme.
- **Island subjects.** On each island, monsters and the boss ask that island's subjects at the player's level.
- **Docks for the next projects.** Technology City (project 3) and Language Kingdom (project 4) appear on the jetty as "Coming soon".
- **Levels unlock things other than islands:** battle helpers, island bosses, shop tiers, a faster boat and titles.

## Goals

1. **Three places with their own look:** the hub and two islands.
   - Each has its own map, scenery, monsters and music cue. The cue is a hook only; sound itself comes in Phase 8.
   - The islands are wider than Greenhaven, at least 44 × 44 tiles. This answers the earlier "make the map wider" request.
2. **A skippable boat ride** between any two places. Players can skip it after their first ride.
3. **Questions chosen by place, on the server.**
   - Each monster belongs to an island, and the server picks questions from that island's subjects at the player's level.
   - If there are none, it falls back step by step until a battle always starts.
   - Greenhaven keeps today's behaviour: the player's own subjects.
4. **One island boss per new island**, fought from level 5:
   - Science Island: **Raja Rafflesia**;
   - Mathematics Mountains: **Abacus Titan**.
5. **One server-side unlock list** that drives every level reward (table below). The server enforces every gate, not only the screen.
6. **Malaysian identity, done respectfully**, in the hub and on Science Island.
7. **Phone performance like Greenhaven's today.** Only one place is loaded at a time, and the existing Auto/High/Low quality setting still works.

## Non-goals (this project)

- One continuous sea with every island in a single scene.
- The Coding island content (project 3), the Languages island content (project 4) and History Ruins (waits for more questions).
- Seeing other players (Phase 5).
- Pets and the personal island (Phase 4 slices). They appear only as future rows in the unlock list once built.
- Later ideas for reaching Malaysian players:
  - festival events: Hari Raya, Chinese New Year, Deepavali, Merdeka;
  - Malaysian food items;
  - traditional outfits;
  - "SPM practice" labels;
  - school leaderboards.
  These go into `docs/ROADMAP.md` as noted ideas, not into this build.

## Anti-goals: a failure even if it "works"

- **Phones stutter or overheat.**
- **A battle fails to start** because an island has no question at the player's level.
- **Malaysian content that stereotypes or offends.** No real brands or famous branded buildings (for example the Petronas Towers). No religious sites or symbols. No national flags or emblems used as decoration. Culture means everyday kampung life, nature, crafts and place names.
- **Any reward, unlock or gate checked only on the client.**
- **Old progress lost.** Existing players keep their gold, items, XP, missions and Guardian rewards.

## Approaches considered

1. **A separate map per island, with a fade between them.** The simplest and lightest, but the travel isn't worth filming.
2. **One big sea with all the islands; sail freely.** The most impressive, but it needs streaming and culling, is heavy on phones, and rewrites the one-map design everywhere.
3. **A separate map per island, plus a short boat-ride scene.** *Chosen by the user.* It gives the filmable moment of option 2 at close to the cost of option 1, and the ride hides the next island's download.

## Design

### Places and travel

- Each place is a `MapSource` file in `src/game/maps/`, using the same character-grid format as `greenhaven.ts`. The ids are `greenhaven`, `science_island` and `mathematics_mountains`, matching `src/features/landing/regions.ts`.
- **New legend entries:**
  - a `jetty` tile;
  - new prop kinds per theme;
  - a `boatman` NPC on every jetty;
  - a jetty arrival spawn, used when arriving by boat (separate from the first-time spawn).
- **The world loads one map at a time.** `WorldSim` and `World3D` take the current map instead of importing Greenhaven. Today Greenhaven is hard-wired in `World3D.tsx`, `sim.ts`, `Minimap.tsx` and their tests.
- **The jetty panel.** Talking to the boatman opens a normal web panel, like the shop, that lists the destinations:
  - every built place, with a "Sail" button;
  - Technology City and Language Kingdom as disabled "Coming soon" rows.
- **The boat ride** is its own small 3D scene:
  - a code-built perahu (a painted, curved-bow Malaysian fishing boat) with the hero seated;
  - rolling sea, gulls, and the destination's silhouette growing on the horizon;
  - while the ride plays, the destination map and its models load;
  - the ride ends when both the animation and the loading are done (whichever is later), and it never ends on an unloaded island;
  - a Skip button appears from the second ride on;
  - with reduced motion, the ride is replaced by a fade with a "Sailing to …" card.
- **Remembering where you are.** The current place is remembered on the device (localStorage), and a reload puts you back on that place's jetty. Your position isn't worth anything, so the server doesn't need to know it. *(My call.)*
- **An area banner.** When you walk into a named area, a short banner shows its name, for example "Jeti Melaka" or "Air Terjun Langkawi". It looks good in clips and teaches place names.

### Themes

| Place | Theme | Scenery | Monsters (3 each, new) | Boss |
|---|---|---|---|---|
| Greenhaven Kampung (hub) | Malaysian | Kampung houses on stilts, coconut palms, a wau kite drifting above the village, a jetty with a perahu, the shop restyled as a pasar malam stall with lanterns. Area names: Jeti Melaka, Pasar Malam, Kampung Greenhaven | existing three (unchanged) | Guardian (unchanged, no level gate) |
| Science Island (Hutan Borneo) | Malaysian | Rainforest, mangroves with roots, a waterfall and pool, giant ferns, mushrooms. Area names: Hutan Borneo, Air Terjun Langkawi, Paya Bakau (mangrove), Pekan Kuching | hornbill (flyer), tapir calf (walker), pangolin (rolls up) | **Raja Rafflesia**, a giant flower with a glowing core |
| Mathematics Mountains | International | Snowy stone peaks, a winding path, terraces lower down, ancient geometry ruins (pillars, sundials, a giant abacus gate at the summit) | dice-cube (hops), hexagon owl (flyer), π-shaped snake | **Abacus Titan**, a stone golem with abacus beads |

- Scenery comes from **CC0 packs** (KayKit or similar, with the licence checked per pack and credited in `docs/art-credits.md`) or is **built in code**, like the current bushes and monsters.
- The extra models for one place stay **at or under 2 MB**, and the existing budget test is extended per place.
- Monsters are built in code with `buildMonster.ts` and `monsterMotion` (breathe, hop, poof), using the same style as the existing three.
- The display names "Greenhaven Kampung", "Science Island" and "Mathematics Mountains" are translated into all 7 locales. **Malay place names stay in Malay in every language**, because they are proper nouns.

### Questions by place (server)

- **`islands` reference table:** `id`, `subject_ids text[]`, `sort`. The rows are:

  | id | subject_ids |
  |---|---|
  | `greenhaven` | null (means "the player's own subjects") |
  | `science_island` | science, biology, chemistry, physics, environmental_science |
  | `mathematics_mountains` | mathematics, additional_mathematics, calculus, statistics |

- **`monsters.island_id`.** Each monster row gets an island. The existing three are `greenhaven`. Six new monster rows have HP and rewards similar to dinobud: about 100–130 HP, 40–55 XP and 16–22 gold.
- **The client never sends an island.** `start_encounter(p_monster)` stays as it is, and `pick_question` looks up the island through the monster. A player who claims to be somewhere else gains nothing.
- **Fallback order for island monsters:**
  1. the island's subjects at the player's level, not seen recently;
  2. the island's subjects at the player's level, even if seen recently;
  3. the player's own subjects, then any subject, at their level (today's passes).

  A battle therefore always gets a question whenever Greenhaven would.
- **Bosses read their round subjects from the island.**
  - `boss_runs.boss_id` accepts `guardian`, `raja_rafflesia` and `abacus_titan`.
  - For island bosses, rounds 1–3 use the island's subjects at rising difficulty, and round 4 is mixed island plus general.
  - The once-per-local-day reward applies per boss.
- **Existing bug.** While here, fix the Guardian's science round, which lists `environmental_studies`. The questions use `environmental_science`.

### Level unlocks

- **`level_unlocks` reference table:** `level`, `kind`, `key`, with titles in i18n. It is readable by everyone. The client shows "Unlocks at level N" from it and a "New unlock!" card on level-up.
- **The server checks the player's level itself** for every gated action.

| Level | Unlock | Where it is enforced |
|---|---|---|
| 3 | **Second Chance** (automatic): the first wrong answer in each battle or boss run costs no HP or heart, and a "Second Chance used" note shows. You still see the explanation, and the question still counts as wrong for mastery. | `answer_question` / boss answer |
| 4 | Title "Kampung Hero" | display only |
| 5 | Island bosses (Raja Rafflesia, Abacus Titan) | boss start function |
| 5 | Rare shop items can be bought | `buy_item` |
| 7 | Swift perahu: the boat ride is about 4 s instead of about 7 s, with a new sail look | client (cosmetic) |
| 8 | **50/50**: once per battle or boss run, removes two wrong options. Usable only when the question has at least 2 wrong options (so not true/false or non-choice types). That question pays half XP. | new `use_helper(encounter, kind)` |
| 10 | Epic shop items can be bought | `buy_item` |
| 10 | Title "Island Explorer" | display only |
| 15 | Title "Scholar of the Seas" | display only |

- **Already-owned items are kept.** The rarity gate only stops new purchases. The shop shows locked items with a padlock and "Level N".
- **The 50/50 button** sits in both battle panels. Below level 8 it shows "Level 8"; it greys out once used, and is disabled with a reason on questions with fewer than 2 wrong options. Second Chance has no button: a small badge shows whether it is still available this battle.
- **Pet (level 2) and personal island (level 10)** rows are added when those Phase 4 slices are built, not now.
- **Titles** show under the player's name on the HUD and Home. Players pick one from the titles they have unlocked. The pick is a profile column, written through a function that checks the level.

### Unchanged

- Greenhaven monsters, the Guardian, missions (`defeat_monsters` counts monsters on every island), streaks and mastery.
- Gold, XP and item rules. Every reward is still computed inside database functions.

## Constraints

- **The existing stack:** React, three, R3F and drei, Zustand, Supabase. **No new runtime dependencies** unless a model pack needs none of them anyway.
- Every database change is a new migration, with RLS on every new table, and the RLS tests extended for each new gate.
- All 7 locales get every new string, with English as the source and the others marked unreviewed.
- Reduced motion, the no-WebGL message, battle-panel pausing and Auto/High/Low quality all keep working on every place.
- Every visible button works or says "Coming soon".

## Testing

- **Map tests per place:**
  - the shape and the known legend;
  - a jetty and a boatman exist;
  - every monster zone, the boss and the jetty can be reached from the arrival spawn.
- **Sim tests** with a non-Greenhaven map.
- **RLS and SQL tests:**
  - a Science Island monster serves a science-family question when one exists at the level;
  - the fallback still serves a question when none exists;
  - an island boss is refused below level 5;
  - a rare item is refused below level 5;
  - 50/50 is refused below level 8, refused twice per battle, and halves the XP;
  - Second Chance keeps the HP once per battle.
- **End-to-end:** walk to the boatman, sail to Science Island (skipping the ride), fight a monster, and check that the served question's subject is in the science family. Then sail home.
- **Screenshots** of each place and the boat ride on High and Low quality, for a visual check.

## Left to the builder

- The exact map layouts, the area-name placement, the model choices within the theme table, the monster stats within the ranges above, and the boat-ride camera path.
- Whether the hub keeps exactly 36 × 36 or grows. It may grow, to fit the jetty.
- How the jetty panel looks, following the shop panel's style.
