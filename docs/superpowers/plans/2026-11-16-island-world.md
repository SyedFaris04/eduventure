# Island World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Greenhaven becomes a kampung hub with a jetty. A skippable boat ride goes to two new open islands, Science Island (Hutan Borneo) and Mathematics Mountains, which have island-specific questions, monsters and level-5 bosses. A server-enforced list of level unlocks adds Second Chance, 50/50, shop tiers, a faster boat and titles.

**Architecture:**
- **Places.** Each place is a `MapSource` with a theme. A places registry plus a place store (in localStorage) chooses which map `World3D` loads. The boat ride is a separate lazy 3D scene, shown while the next place loads.
- **Server.** The server derives a battle's island from the monster row, so the client never sends an island. Two migrations:
  - islands, monsters and bosses;
  - unlocks, helpers and titles.
- **Client unlocks.** `src/game/unlocks.ts` mirrors the server's unlock list, and an RLS test keeps the two in step, the same way the shop catalogue is checked today.

**Tech Stack:**
- React 19, three 0.187, @react-three/fiber 9, @react-three/drei 10, Zustand, i18next;
- Supabase (Postgres functions, migrations pushed with `npx supabase db push`);
- Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-16-island-world-design.md`

## Global Constraints

- **Every reward, unlock and gate** is computed or checked inside `security definer` database functions. The client never writes XP, gold, items, unlocks or titles.
- **No new runtime dependencies.**
- **New scenery** is built in code or comes from CC0 packs whose licence has been checked. Extra models for one place are at most 2 MB.
- **Malaysian content:**
  - no real brands or branded buildings (no Petronas Towers);
  - no religious sites or symbols;
  - no flags or emblems as decoration.
- **Strings:** every new string is in all 7 locales (`en` is the source). Malay place names stay in Malay in every locale.
- **Must keep working on every place:**
  - reduced motion;
  - the no-WebGL notice;
  - `frameloop='never'` while a panel covers the world;
  - Auto, High and Low quality.
- **Buttons:** every visible button works or says "Coming soon".
- **Database changes** are new migration files, timestamped after `20261116080000`, with RLS on every new table.
- **Existing players lose nothing:** gold, items, XP, missions and Guardian rewards all carry over. The Guardian keeps having no level gate.
- **The "always gets a question" promise holds:** an island monster gets a question whenever a Greenhaven monster would.

## Review Focus

1. **A player with an empty or partial academic profile, or a level with no island-subject questions, fights an island monster.** The battle must still start, by falling back. *Test: Task 3, `island fallback`.*
2. **A reload in the middle of a boat ride, or a remembered place that no longer exists** (for example a stale localStorage value or `technology_city`). The game must land on a built place's jetty, or on Greenhaven. *Test: Task 1, `place store falls back`.*
3. **A slow network during the ride.** The ride must not end before the destination has loaded, and a failed load must show the existing Retry instead of a blank island. *Test: Task 7, `ride waits for load`.*
4. **Calling 50/50 twice, on a true/false question, or on another player's battle.** Each must be refused, and the hidden options must never include the right answer. *Test: Task 4, `fifty rules`.*
5. **An existing level-1 player who already owns a rare item.** They keep it, can still equip it, and the shop shows it as owned, not padlocked. *Test: Task 4, `owned rare item stays`.*

---

### Task 1: Places, map format and the kampung hub

**Files:**
- Modify: `src/game/map.ts`, `src/game/maps/greenhaven.ts`, `src/game/sim.ts`, `src/game/npcs.ts`, `src/game/store.ts`
- Create: `src/game/places.ts`, `src/game/placeStore.ts`, `src/game/places.test.ts`
- Modify tests: `src/game/world.test.ts`, `src/game/sim.test.ts`, `src/game/walk.test.ts`

**Interfaces:**
- Produces, in `map.ts`:
  - `TileKind` adds `'jetty' | 'snow' | 'stone' | 'mud'`.
  - `PropKind` adds `'palm' | 'kampung_house' | 'stall' | 'fern' | 'mangrove' | 'mushroom' | 'pine_snow' | 'pillar' | 'sundial' | 'abacus_gate'`.
  - `MonsterKind` adds `'hornbill' | 'tapir' | 'pangolin' | 'cubelet' | 'hexowl' | 'pisnake'`.
  - `NpcId` adds `'boatman'`.
  - `BossId` becomes `'guardian' | 'raja_rafflesia' | 'abacus_titan'`.
  - `Cell` adds `arrival?: true`.
  - `MapSource` adds `theme: Theme`, `monsters: Partial<Record<MonsterKind, number>>` and `areas: Area[]`.
  - `Theme = 'kampung' | 'rainforest' | 'alpine'`.
  - `Area = { name: string; x0: number; y0: number; x1: number; y1: number }`, an inclusive tile rectangle.
  - `GameMap` adds `theme`, `arrival: Point` (falls back to `spawn` when no arrival cell exists), `monsterCounts`, `areas`, and `monsterZones: Partial<Record<MonsterKind, Point[]>>`.
  - `areaAt(map: GameMap, p: Point): string | null`.
- Produces, in `places.ts`:
  - `PlaceId = 'greenhaven' | 'science_island' | 'mathematics_mountains' | 'technology_city' | 'language_kingdom'`;
  - `PLACES: Record<PlaceId, { built: boolean; load?: () => Promise<MapSource> }>`, where the load is a dynamic `import()` of the map file;
  - `BUILT_PLACES: PlaceId[]`.
- Produces, in `placeStore.ts`:
  - `usePlace`, a zustand store `{ place: PlaceId; arriving: boolean }`;
  - `loadPlace(): PlaceId` reads `eduventure.place` and returns `'greenhaven'` for anything unknown or not built;
  - `setPlace(id: PlaceId)` saves the place and sets `arriving: true`.
- Produces, in `store.ts`: `GameState` adds `jetty: boolean`, `travel: { to: PlaceId } | null` and `area: string | null`. `worldPaused` also covers `jetty`.
- `WorldSim`:
  - takes monster counts from `map.monsterCounts`; `MONSTER_COUNT` is removed and Greenhaven's counts (4/3/3) move into its source;
  - takes an `opts?: { atArrival?: boolean }` third constructor parameter (after `rng`), so the hero starts at `map.arrival` when arriving.

- [ ] **Step 1: Write the failing tests.**
  - `places.test.ts`:
    - `place store falls back`: localStorage `eduventure.place` set to each of `'atlantis'`, `'technology_city'` and `''` gives `loadPlace() === 'greenhaven'`, and `'science_island'` gives `'science_island'`.
    - `every built place loads and parses`: for each id in `BUILT_PLACES`, `parseMap(await PLACES[id].load!())` has a boatman NPC, at least one `jetty` tile, and an arrival point within `INTERACT_RANGE + 1` tiles of the boatman.
    - `areaAt`: a point inside a rectangle returns its name, and a point outside every rectangle returns null.
  - `world.test.ts`: Greenhaven still parses, has the theme `kampung`, has the areas `'Jeti Melaka'`, `'Pasar Malam'` and `'Kampung Greenhaven'`, has at least 6 `palm` props and at least 2 `kampung_house` props, and the boatman can be reached from `spawn` (reuse the existing reachability helper in that file).
  - `sim.test.ts`: `new WorldSim(map, rng, { atArrival: true })` puts the hero on `map.arrival`, and the monster count equals the sum of `map.monsterCounts`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/game`
  - Expected: FAIL (missing modules and fields).
- [ ] **Step 3: Implement the map format, places, the place store, and the sim change.**
  - In Greenhaven, keep the existing layout and spawn so the e2e coordinates stay valid.
  - Add a jetty of `jetty` tiles reaching into the water, within 8 tiles of `P`, with the boatman `B` and an arrival `A` cell beside it.
  - Swap some trees for `palm`. Change the `H` legend prop to `kampung_house`, which keeps the 2 × 2 footprint. Put a `stall` next to the shopkeeper.
  - Add the three areas. Add the boatman to `NPCS`, wearing a batik-like top from the existing parts, with `pages: 2`.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npx vitest run src/game`
  - Expected: PASS.
  - Then run `npx tsc --noEmit`. Expected: errors only in `src/world3d`, `src/features` and `Minimap`, which later tasks fix. Fix any error inside `src/game` now.
- [ ] **Step 5: Commit** with the message `feat(world): places, map themes, kampung hub with jetty`.

### Task 2: Science Island and Mathematics Mountains maps

**Files:**
- Create: `src/game/maps/science_island.ts`, `src/game/maps/mathematics_mountains.ts`
- Modify: `src/game/places.ts` (point the loaders at the new files), `src/game/places.test.ts`

**Interfaces:**
- Consumes: the Task 1 map format.
- Produces: the two `MapSource` exports `SCIENCE_ISLAND` and `MATHEMATICS_MOUNTAINS`.

- [ ] **Step 1: Write the failing test** in `places.test.ts`, `islands are wide and complete`. For each island:
  - the map is at least 44 × 44, with the theme `rainforest` or `alpine` respectively;
  - it has 3 monster zone kinds with counts above 0:
    - Science Island: hornbill, tapir, pangolin;
    - Mathematics Mountains: cubelet, hexowl, pisnake;
  - it has one boss (`raja_rafflesia` or `abacus_titan`);
  - every monster zone tile, the boss and the boatman can be reached from `arrival`;
  - its areas are:
    - Science Island: `['Hutan Borneo', 'Air Terjun Langkawi', 'Paya Bakau', 'Pekan Kuching']`;
    - Mathematics Mountains: English names, at least 3, for example `'Summit Gate'`, `'Sundial Terraces'` and `'Pillar Pass'`.
- [ ] **Step 2: Run the test and confirm it fails.**
  - Run: `npx vitest run src/game/places.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Write both maps.**
  - **Science Island:**
    - `mud` paths through dark grass;
    - `mangrove` along the shore, `fern` and `mushroom` under trees;
    - a pond under a cliff, where the waterfall is drawn in Task 5;
    - the boss in a clearing at the far end.
  - **Mathematics Mountains:**
    - `snow` on the high ground, `stone` paths, terraces of grass lower down;
    - `pine_snow`, `pillar` and `sundial` props;
    - `abacus_gate` in front of the boss at the summit.
  - Each island has a jetty with the boatman and an arrival cell.
- [ ] **Step 4: Run the test and confirm it passes.**
  - Run: `npx vitest run src/game`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(world): Science Island and Mathematics Mountains maps`.

### Task 3: Server — islands, island questions and island bosses

**Files:**
- Create: `supabase/migrations/20261116090000_islands.sql`, `tests/rls/islands.test.ts`
- Modify: `src/features/battle/battleApi.ts` (`startBoss(boss: BossId)`)

**Interfaces:**
- Produces, in SQL:
  - **The `islands` table:** `id text pk`, `subject_ids text[]` (null means the player's own subjects), `sort int`. Readable by `authenticated`. The rows are exactly the spec's:
    - `greenhaven`: null;
    - `science_island`: science, biology, chemistry, physics, environmental_science;
    - `mathematics_mountains`: mathematics, additional_mathematics, calculus, statistics.
  - **Monsters:** `monsters.island_id text not null default 'greenhaven' references islands`. New rows:

    | id | HP | XP | gold | island |
    |---|---|---|---|---|
    | hornbill | 100 | 40 | 16 | science_island |
    | tapir | 120 | 48 | 19 | science_island |
    | pangolin | 130 | 55 | 22 | science_island |
    | cubelet | 100 | 40 | 16 | mathematics_mountains |
    | hexowl | 120 | 48 | 19 | mathematics_mountains |
    | pisnake | 130 | 55 | 22 | mathematics_mountains |

  - **`pick_question(p_user uuid, p_monster text default null) returns text`.**
    - First `drop function public.pick_question(uuid)`, so that existing one-argument calls resolve to the new default-argument version.
    - Passes 1 and 2 run only when the monster's island has `subject_ids`: pass 1 is the island's subjects excluding recent questions; pass 2 is the island's subjects including recent ones.
    - Then today's three passes, unchanged, with the mastery weighting.
  - **`start_encounter`** is redefined from `20261116012400` and passes `p_monster`. **`answer_question`** is redefined from `20261116012700` and passes `v_enc.monster_id`.
  - **Bosses:**
    - The `boss_runs.boss_id` check becomes `in ('guardian','raja_rafflesia','abacus_titan')`.
    - A new `boss_island(p_boss text) returns text`.
    - Drop `start_boss()` and create `start_boss(p_boss text default 'guardian')`.
      - It raises `'Reach level 5 to challenge this boss'` (errcode `P0001`) when an island boss is requested and `player_xp.level < 5`. This check moves to `unlocked()` in Task 4.
      - An already-active run of any boss is resumed, as today.
    - `pick_boss_question(p_user, p_round, p_boss text default 'guardian')`: for island bosses, rounds 1–3 use the island's subjects, with pass 1 also requiring `difficulty >= p_round`. Round 4 is the island plus `general_knowledge`. The existing fallbacks follow.
    - `answer_boss` passes `v_run.boss_id` to the picker.
  - **Guardian fix:** `boss_round_subjects(2)` uses `environmental_science` instead of `environmental_studies`.

- [ ] **Step 1: Write the failing tests** in `tests/rls/islands.test.ts`. Use the same live-project `player()` helper as `boss.test.ts`, with `subject_ids: ['mathematics']` and level `primary`.
  - `island monsters ask island subjects`: `start_encounter('hornbill')` serves a question whose subject is in the science family, even though the player picked mathematics.
  - `island fallback`: a player with `level_id` `'university'` and `subject_ids: []` still gets a question from `start_encounter('pangolin')`, with no error.
  - `greenhaven unchanged`: `start_encounter('sproutling')` serves `mathematics` or another subject.
  - `island boss gate`: `start_boss({ p_boss: 'raja_rafflesia' })` errors with `/level 5/i` for a level-1 player, while `start_boss({})` still starts the Guardian.
  - `islands readable`: `from('islands').select()` returns the three rows with the spec's subject lists.
  - `monsters belong to islands`: `from('monsters').select('id, island_id')` matches the island table above.

  Flee each encounter or run at the end of its test.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npm run test:rls -- tests/rls/islands.test.ts`
  - Expected: FAIL (unknown monster, no table).
- [ ] **Step 3: Write the migration and push it.**
  - Run: `npx supabase db push`. Expected: `Applying migration 20261116090000_islands.sql... Finished`.
  - If the push asks for confirmation in agent mode, stop and ask the owner. It's a hosted change.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npm run test:rls`
  - Expected: everything passes, including the old boss, battle, mission and shop suites.
- [ ] **Step 5: Run the advisors.**
  - Run: `npx supabase db advisors --linked`
  - Expected: 0 errors.
- [ ] **Step 6: Commit** with the message `feat(db): islands, island questions and island bosses`.

### Task 4: Server and client — level unlocks, helpers and titles

**Files:**
- Create: `supabase/migrations/20261116090100_unlocks.sql`, `src/game/unlocks.ts`, `src/game/unlocks.test.ts`, `tests/rls/unlocks.test.ts`
- Modify:
  - `src/features/battle/battleApi.ts`, `BattlePanel.tsx`, `BossPanel.tsx`, `QuestionCard.tsx` (hide options);
  - `src/features/shop/ShopPage.tsx`;
  - `src/features/world/Hud.tsx`, `src/features/home/HomePage.tsx`;
  - all 7 locale files.

**Interfaces:**
- **SQL:**
  - The `level_unlocks` table: `level int`, `kind text check in ('helper','boss','shop_tier','boat','title')`, `key text`, with primary key `(kind, key)`. It is readable by `authenticated`. The rows are exactly:

    | level | kind | key |
    |---|---|---|
    | 3 | helper | second_chance |
    | 4 | title | kampung_hero |
    | 5 | boss | island_bosses |
    | 5 | shop_tier | rare |
    | 7 | boat | swift_perahu |
    | 8 | helper | fifty |
    | 10 | shop_tier | epic |
    | 10 | title | island_explorer |
    | 15 | title | scholar_of_the_seas |

  - `unlocked(p_level int, p_kind text, p_key text) returns boolean`: a pure lookup, granted to `authenticated`. An unknown key returns false. A `shop_tier` of `common` always returns true.
  - `player_level(p_user uuid) returns int`: internal, not granted.
  - **The boss gate:** `start_boss` uses `unlocked(level,'boss','island_bosses')`.
  - **The shop gate:** `buy_item` refuses with `'Reach level N to buy this item'` when `not unlocked(level,'shop_tier',rarity)`. Ownership checks for wearing items are unchanged.
  - **Helper columns** on `encounters` and `boss_runs`: `second_chance_used bool default false`, `fifty_used bool default false`, `fifty_question_id text`, `hidden_options text[] default '{}'`.
  - **`fifty_hidden(p_type text, p_options jsonb, p_key jsonb) returns text[]`:** pure. It returns two wrong option ids for `mcq`, and for `multi_select` it returns options not in the key. It returns an empty array when fewer than 2 wrong options exist. It is granted to `authenticated`: it only works with a key the caller supplies, so it reveals nothing.
  - **`use_fifty(p_encounter uuid) returns jsonb` and `use_boss_fifty(p_run uuid) returns jsonb`:**
    - They refuse with `'Reach level 8 to use 50/50'`, `'50/50 already used this battle'`, `'50/50 needs at least two wrong options'`, and `'not found'` for another player's battle.
    - They store `hidden_options` and `fifty_question_id`, and return `{ hidden: text[] }`.
  - **`answer_question` and `answer_boss`:**
    - **Second Chance:** when the answer is wrong and `unlocked(level,'helper','second_chance')` and `not second_chance_used`, the player keeps their HP (or heart), `second_chance_used` becomes true, and the result includes `'second_chance': true`.
    - **50/50 XP:** when `fifty_question_id = current question` and the answer is correct, the per-question XP becomes `floor(v_xp / 2)`. In `answer_boss` this only affects `question_attempts`, because boss XP is the final reward.
    - `hidden_options` is cleared when the next question is served.
  - **State payloads:** `encounter_state` and `boss_state` add `helpers: { second_chance_left: boolean, fifty_used: boolean, hidden: text[] }`, where `second_chance_left` is unlocked and not yet used.
  - **Titles:**
    - A `player_titles` table: `user_id pk`, `title_key text`. Readable only by its own player. No client writes.
    - `set_title(p_key text)` requires `unlocked(level,'title',p_key)` or `p_key is null`.
    - `my_title() returns text`.
- **TypeScript**, in `unlocks.ts`:
  - `UNLOCKS: { level: number; kind: UnlockKind; key: string }[]`, a copy of the SQL rows;
  - `isUnlocked(level: number, kind: UnlockKind, key: string): boolean`;
  - `unlockLevel(kind, key): number | null`;
  - `newUnlocks(oldLevel: number, newLevel: number)`, which returns the rows with `oldLevel < level <= newLevel`.
- **battleApi:**
  - `EncounterState` and `BossState` gain `helpers`;
  - `AnswerResult` and `BossResult` gain `second_chance?: boolean`;
  - new `useFifty(encounterId)` and `useBossFifty(runId)` return `{ hidden: string[] }`.

- [ ] **Step 1: Write the failing tests.**
  - `unlocks.test.ts`:
    - `isUnlocked(2,'helper','second_chance')` is false and `isUnlocked(3, …)` is true.
    - `unlockLevel('shop_tier','epic') === 10`.
    - `newUnlocks(4, 8)` lists exactly `island_bosses`, `rare`, `swift_perahu` and `fifty`.
    - `isUnlocked(1,'shop_tier','common')` is true.
  - `tests/rls/unlocks.test.ts`:
    - `unlock list matches the client`: `from('level_unlocks').select()` deep-equals `UNLOCKS`, ignoring order.
    - `unlocked() semantics`: `rpc('unlocked', {p_level: 7, p_kind: 'helper', p_key: 'fifty'})` is false, and at `p_level: 8` it is true.
    - `fifty rules`:
      - `rpc('fifty_hidden', {p_type: 'mcq', p_options: [{id:'a'},{id:'b'},{id:'c'},{id:'d'}], p_key: '"b"'})` returns 2 ids, neither of which is `'b'`;
      - the same call with `p_type: 'true_false'` returns `[]`;
      - `use_fifty` at level 1 errors with `/level 8/`;
      - `use_fifty` on another player's encounter errors with `/not found/`.
    - `rare shop gate`: a level-1 player's `buy_item('wizard_hat')` errors with `/level 5/` (checked before gold, so it holds even with 0 gold).
    - `owned rare item stays`:
      - a level-1 player's encounter state and character update still accept an owned rare item;
      - this can't be bought in a test, so check instead that `check_items_owned` didn't change: `characters.update` with `accessory: 'wizard_hat'` errors with the existing "not owned" message, not a level message.
    - `second chance at level 1 costs HP`: a wrong answer at level 1 lowers `player_hp` by 10, and `state.helpers.second_chance_left` is false.
    - `second chance at level 3`, a slow test with a 180 s timeout:
      - play sproutling battles with right answers until `totals.level >= 3`;
      - in a new battle, the first wrong answer returns `second_chance: true` and keeps `player_hp` the same, and the second wrong answer lowers it.
    - `titles`: a level-1 `set_title({p_key:'kampung_hero'})` errors with `/level/`, while `set_title({p_key: null})` succeeds.
  - Component test in `src/features/battle`, `fifty button`:
    - below level 8 it shows "Level 8" and is disabled;
    - at level 8 on a true/false question it is disabled with a reason;
    - on an mcq question, clicking it calls `useFifty` (mocked) and hides the returned options.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/game/unlocks.test.ts src/features/battle`, then `npm run test:rls -- tests/rls/unlocks.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Write the migration, push it, and implement the client.**
  - **Battle panels:**
    - a Second Chance badge (a shield icon, with a "used" or "available" label);
    - a 50/50 button;
    - on `second_chance: true`, the feedback line says "Second Chance! No HP lost."
  - **Shop:** items above the player's level show a padlock and "Level N", with the Buy button disabled. Owned items show "Owned" whatever their level.
  - **Level-up:** when `leveled_up` and `newUnlocks()` is non-empty, the battle result shows a "New unlock!" card listing them.
  - **Titles:** Home gets a title picker that lists the unlocked titles plus "None", via `set_title`. The HUD shows `my_title()` under the name.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npm test`, then `npm run test:rls`
  - Expected: all pass.
  - Run `npx supabase db advisors --linked`. Expected: 0 errors.
- [ ] **Step 5: Commit** with the message `feat: level unlocks — Second Chance, 50/50, shop tiers, titles`.

### Task 5: Themed 3D places — ground, water, sky and code-built props

**Files:**
- Create:
  - `src/world3d/themes.ts`;
  - `src/world3d/props/codeProps.ts`, which builds each code prop as a merged, shared geometry per material;
  - `src/world3d/Decor.tsx` (the wau kite, the waterfall and lanterns);
  - `src/world3d/themes.test.ts`.
- Modify:
  - `src/world3d/World3D.tsx`, which takes `map: GameMap` and `atArrival: boolean` props instead of importing Greenhaven;
  - `Ground.tsx`, `Water.tsx`, `Props.tsx`, `WorldLab.tsx` (`?place=`), `src/features/world/Minimap.tsx`, `GameCanvas.tsx`, `src/world3d/models.test.ts`.

**Interfaces:**
- Produces:
  - `THEMES: Record<Theme, { sky: string; fog: [near: number, far: number]; water: string; tiles: Partial<Record<TileKind, string>> }>`;
  - `buildCodeProp(kind: CodePropKind): Object3D`, where `CodePropKind` is every new `PropKind` from Task 1. The original kinds stay with KayKit GLBs;
  - `<Decor map />`, which draws the theme's set pieces.
- Consumes: `GameMap.theme`, and `usePlace` from Task 1.

- [ ] **Step 1: Write the failing tests** in `themes.test.ts`.
  - Every `Theme` has a sky, fog and water colour, and every `TileKind` resolves to a colour under every theme.
  - `buildCodeProp(kind)` for every `CodePropKind` returns an object with at least one mesh, a bounding box of at most 2.2 × 3.5 × 2.2 world units (`kampung_house` and `abacus_gate` may be 2 tiles wide), and feet at y = 0 ± 0.05.
  - Calling `buildCodeProp('palm')` twice reuses the same geometry, to save memory.

  In `models.test.ts`, the per-place model budget is at most 2 MB of new files under `public/assets/models/`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/world3d`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `World3D` and `Minimap` read the map they are given.
  - `GameCanvas` loads the current place's map via `PLACES[place].load()`, using `React.use` or a small loader with the existing Boundary and Retry.
  - `Props` instances code props the same way it handles Bushes (wind on palm fronds, ferns and mangrove leaves).
  - **Decor:**
    - a wau kite drifting on a slow figure-8 above Greenhaven, still under reduced motion;
    - waterfall planes with scrolling UVs above Science Island's pond, plus a mist sprite on High quality only;
    - glowing lanterns at the pasar malam stall.
  - With `?place=` on `/dev/world` you can screenshot each place.
- [ ] **Step 4: Run the tests and take screenshots.**
  - Run: `npm test`. Expected: PASS.
  - Take Playwright screenshots of `/dev/world?place=greenhaven|science_island|mathematics_mountains` on High and Low quality into the workspace. Read each one and fix anything that looks wrong: floating props, z-fighting, or a sky that doesn't match the theme.
- [ ] **Step 5: Commit** with the message `feat(world3d): themed places and code-built Malaysian and alpine props`.

### Task 6: Island monsters and bosses in 3D

**Files:**
- Modify:
  - `src/world3d/monsters/buildMonster.ts` (6 monsters and 2 bosses);
  - `src/world3d/monsters/motion.ts` (the pangolin rolls up on its idle beat, owls and hornbills flap);
  - `src/world3d/snapshotKey.ts` (`{ kind: 'boss'; boss: BossId }`);
  - `snapshot.ts`, `Actors.tsx` (bosses by id), `src/features/battle/BossPanel.tsx` (boss id, name, the gate message);
  - the locales: `monster.<kind>.name` and `boss.<id>.name` and their intros.
- Test: `src/world3d/monsters/monsters.test.ts`, which exists from project 1; extend it.

**Interfaces:**
- Produces:
  - `MONSTER_KINDS` covers all 9 kinds;
  - `buildMonster(kind: MonsterKind | BossId)`;
  - `snapshotKey({kind:'boss', boss})` returns `boss:<id>`.
- Consumes: `startBoss(boss)` from Task 3. Talking to a boss prompt opens `BossPanel` with that id.

- [ ] **Step 1: Write the failing tests.**
  - Every kind in `MONSTER_KINDS` and every `BossId` builds, with feet at y ≈ 0 and a height within the existing ranges: monsters 0.6–1.4, bosses 1.8–3.2.
  - `snapshotKey` gives distinct keys for the three bosses.
  - A BossPanel test: a level-4 player at Raja Rafflesia sees "Reach level 5 to challenge this boss", and the Fight button isn't shown.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/world3d src/features/battle`
  - Expected: FAIL.
- [ ] **Step 3: Implement the designs.**
  - **hornbill:** a black body, a white tail band, and a big yellow-orange casque beak.
  - **tapir calf:** round, brown with cream stripes, and a short snout.
  - **pangolin:** layered scale plates, which roll into a ball on its idle beat.
  - **cubelet:** a die with pips and little feet.
  - **hexowl:** a hexagonal body, spectacles and a feather tuft.
  - **pisnake:** a body curled into the shape of π.
  - **raja_rafflesia:** five big red petals with white spots, a glowing core and leaf arms.
  - **abacus_titan:** a stone golem whose chest is a frame of rods with coloured beads, and rune eyes.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npm test`. Expected: PASS.
  - Screenshot each new monster and boss with `/dev/hero?only=` or snapshots and check it.
- [ ] **Step 5: Commit** with the message `feat(world3d): island monsters, Raja Rafflesia and Abacus Titan`.

### Task 7: Travel — jetty panel, boat ride, area banner and Explore page

**Files:**
- Create:
  - `src/features/world/JettyPanel.tsx` and `JettyPanel.test.tsx`;
  - `src/world3d/BoatRide.tsx` (a default export, lazy);
  - `src/game/ride.ts` and `ride.test.ts`;
  - `src/features/world/AreaBanner.tsx`.
- Modify:
  - `src/world3d/World3D.tsx`: the boatman interaction sets `jetty: true`, and `area` is emitted with the player position;
  - `GameCanvas.tsx` and `WorldPage.tsx`;
  - `src/features/landing/regions.ts` and `ExplorePage.tsx`: Science Island and Mathematics Mountains show as open;
  - the locales.

**Interfaces:**
- Produces, in `ride.ts`:
  - `rideMs(level: number, reduced: boolean): number`, which is 7000, or 4000 when `isUnlocked(level,'boat','swift_perahu')`, or 1200 when reduced;
  - `rideOver(startedAt: number, now: number, durationMs: number, loaded: boolean): boolean`, which is true only when `loaded && now - startedAt >= durationMs`;
  - `canSkip(): boolean` and `markSailed()`, using localStorage `eduventure.sailed`, and wrapped in try/catch.
- Consumes: `PLACES`, `BUILT_PLACES` and `setPlace`; `useGame.jetty` and `travel` from Task 1; and `World3D` props from Task 5.

- [ ] **Step 1: Write the failing tests.**
  - `ride.test.ts`:
    - `ride waits for load`: `rideOver(0, 9000, 7000, false)` is false and `rideOver(0, 7000, 7000, true)` is true.
    - `rideMs(7, false) === 4000`, `rideMs(6, false) === 7000` and `rideMs(10, true) === 1200`.
    - `canSkip()` is false before `markSailed()` and true after.
  - `JettyPanel.test.tsx`:
    - the current place is shown as "You are here" with no Sail button;
    - the other built places have Sail buttons;
    - `technology_city` and `language_kingdom` show a disabled "Coming soon";
    - clicking Sail sets `travel: { to }` and closes the panel;
    - Escape closes it.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/game/ride.test.ts src/features/world`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - When `travel` is set, `GameCanvas` unmounts `World3D` and shows `BoatRide`:
    - the scene is a perahu with the hero seated, rocking on wave-shader sea;
    - gulls circle, and the destination's silhouette (a theme-coloured island mesh) grows;
    - the camera tracks alongside;
    - meanwhile `PLACES[to].load()` and the place's props preload start.
  - When `rideOver` is true, call `setPlace(to)` and `markSailed()`, clear `travel`, and mount `World3D` with `atArrival`.
  - If the load fails, show the existing Boundary with Retry.
  - Show Skip only when `canSkip()`, and still wait for the load.
  - Under reduced motion, show a fade with the card "Sailing to {place}…".
  - `AreaBanner` shows the area name for 2.5 s whenever `area` changes to a non-null value, with `aria-live="polite"`.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npm test` and `npm run build`
  - Expected: PASS. The build's `BoatRide` and island maps are in separate chunks.
- [ ] **Step 5: Commit** with the message `feat(world): jetty, boat ride, area banner, islands open on Explore`.

### Task 8: End-to-end, docs and cleanup

**Files:**
- Modify: `tests/e2e/world.spec.ts`, `docs/ROADMAP.md`, `docs/decisions.md`, `docs/art-credits.md`, `docs/art-spec.md`
- Create: `tests/e2e/islands.spec.ts`

- [ ] **Step 1: Write the e2e test** in `islands.spec.ts`, `sail to Science Island and fight`:
  - a guest starts and finishes onboarding (reuse the helpers in `world.spec.ts`);
  - walk to the boatman with `clickGrid`, press E, and click Sail on Science Island;
  - wait for the island, up to 15 s;
  - `__world` reports the place `science_island`, and the area banner appears;
  - walk to a monster and start a battle;
  - the intercepted `start_encounter` response has `question.subject` in the science family;
  - flee, go back to the jetty, sail home, and check the place is `greenhaven`.
- [ ] **Step 2: Run the end-to-end suite.**
  - Run: `npm run test:e2e`
  - Expected: all pass, the old 8 plus the new ones.
- [ ] **Step 3: Update the docs.**
  - **ROADMAP:**
    - an "Island world — built" section;
    - the Malaysian outreach ideas as noted ideas: festival events, food items, outfits, SPM labels, school leaderboards and a Malay review.
  - **decisions.md:**
    - #23: the island comes from the monster row, never from the client;
    - #24: the unlock list lives on the server and the client mirrors it, checked by a test.
  - **art-credits:** any new pack used.
  - **art-spec:** the code props and how to replace them.
- [ ] **Step 4: Run the full verification.**
  - `npm test`, `npm run build`, `npm run test:rls`, `npm run test:e2e` and `npx supabase db advisors --linked`.
  - Expected: all green, with 0 advisor errors.
- [ ] **Step 5: Commit** with the message `test(e2e): islands; docs for the island world`.
