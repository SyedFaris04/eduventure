# Phase 2 — Playable Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** From Home, "Enter the World" opens Greenhaven Village: an isometric map the player walks around (keyboard, joystick, tap), talks to villagers, and battles three kinds of friendly monsters by answering questions, earning XP, gold and levels that the server calculates and that survive a reload.

**Architecture:** Phaser 3.90 renders the world inside a lazy-loaded React route (`/world`). World logic (projection, movement, collision, pathfinding, map parsing) is plain TypeScript with unit tests; Phaser only draws. React overlays (HUD, dialogue, battle, minimap, joystick) talk to Phaser through one Zustand store. Battles run entirely in database functions: the client receives questions without answers and sends answers; the server marks, applies damage, awards XP and gold, and levels the player.

**Tech Stack:** Phaser 3.90, React 19, Zustand, Supabase (Postgres functions + RLS), Vitest, Playwright.

**Spec:** `docs/ROADMAP.md` (Phase 2, Design calls, Standing rules). Rules: `CLAUDE.md`.

## Owner decisions (2026-11-16)

- Starter questions serve **Primary and Lower Secondary** (Maths, Science, English; international + KSSR/KSSM aligned). Other levels get a small mixed general-knowledge pool until Phase 3.
- Starter questions enter as **in review**. Battles may use them only while the server setting `allow_draft_questions` is on (this development project), and show a **Draft** badge. A production project leaves it off. The owner reviews them on a checklist page; approved ones are published by migration.

## Global Constraints

- Phaser `3.90.x` only, imported only from the `/world` route chunk (never in the entry chunk).
- Answer keys never reach the browser before the answer is submitted: they live in `question_keys`, which has no grants for `anon`/`authenticated`.
- Every XP, gold or level change happens inside `answer_question()` (security definer). Clients have no write path to `player_xp`, `player_wallets`, `encounters` or `question_attempts`.
- Anti-farming: a question answered correctly in the last 24 h earns 0 XP and 0 gold; at least 1.5 s between answers in one encounter; one active encounter per player.
- Level curve (same in SQL and TS): XP needed to go from level n to n+1 is `round(100 * n^1.5)`.
- Isometric tiles 64 × 32 px. Map size 36 × 36. Depth = screen y.
- All new UI text in all seven locales (parity test). Questions themselves are English only for now (original language rule).
- Touch: joystick and an Interact button on coarse pointers; nothing depends on hover.
- Reduced motion: no camera shake, no screen flashes; idle animations off.

## Review Focus

1. **Player standing on a tile edge or moving diagonally into a corner** → never walks through a blocked tile and never gets stuck. Test in Task 2 (`movement.test.ts`).
2. **Answer sent twice quickly, or after the encounter finished** → second call is rejected; no double XP. Test in Task 5 (RLS).
3. **Player with an academic level that has no starter questions (e.g. Doctoral)** → battles still start, using the general pool. Test in Task 5.
4. **Phone in portrait at 360 px** → joystick, Interact button, HUD and battle panel fit with no overlap or horizontal scroll. Test in Task 6 (e2e).
5. **Reload mid-battle** → the encounter resumes or is cleanly abandoned; XP is not lost or duplicated. Test in Task 5 (RLS: `start_encounter` returns the active encounter).

---

## File map

```
content/questions/starter.json        question source of truth (with answers; never imported by src/)
scripts/gen-questions.mjs             validates + writes supabase/migrations/*_starter_questions.sql
src/game/
  GameCanvas.tsx                      mounts/destroys Phaser, lazy route /world
  store.ts                            Zustand bridge: input vector, prompt, dialogue, encounter, player pos
  iso.ts / iso.test.ts                grid <-> screen projection
  map.ts / map.test.ts                ASCII map parser, blocked tiles, spawns
  maps/greenhaven.ts                  the village map (ASCII rows + legend)
  movement.ts / movement.test.ts      continuous movement with collision; A* for tap-to-move
  levels.ts / levels.test.ts          XP curve (mirror of SQL)
  art/tiles.ts                        tiles, trees, houses, rocks, fences drawn with Phaser Graphics
  art/monsters.ts                     renderMonsterSvg(type) — same approach as characters
  scenes/BootScene.ts, WorldScene.ts
src/features/world/
  WorldPage.tsx, Hud.tsx, Minimap.tsx, Joystick.tsx, InteractButton.tsx, DialogueBox.tsx
  BattlePanel.tsx, battleApi.ts, QuestionView.tsx
src/features/dev/QuestionReviewPage.tsx   /dev/questions checklist (dev builds only)
supabase/migrations/*_battles.sql, *_starter_questions.sql
tests/rls/battles.test.ts
tests/e2e/world.spec.ts
docs/art-spec.md
```

### Task 1: World shell, map and rendering
- Install `phaser@3.90`. `/world` route (guarded, lazy) with `GameCanvas`; Home "Enter the World" enabled.
- `iso.ts`: `gridToScreen({x,y}) → {x,y}`, `screenToGrid`. Tests: round trip for 5 points; origin maps to (0,0); (1,0) → (32,16).
- `map.ts`: `parseMap(rows, legend) → { width, height, tiles: TileKind[][], blocked(x,y), spawns }`. Tests: Greenhaven is 36×36, player spawn walkable, every monster zone non-empty and walkable, map border is blocked.
- Greenhaven layout: village square with paths, two houses, elder's tree, pond with bridge, flower beds, monster meadow (east), rocky ridge (north-east), forest border.
- BootScene draws all textures procedurally (hand-painted look: soft outlines, two-tone shading, grass tufts, water shimmer, tile side faces along water/edges). WorldScene renders tiles + objects with y-sorting, camera bounds.

### Task 2: Movement and input
- `movement.ts`: `step(pos, dir, dt, blocked) → pos` with speed 3.2 tiles/s, collision radius 0.3 tiles, sliding along walls. `findPath(start, goal, blocked) → Point[] | null` (A*, 8-way, no corner cutting). Tests: blocked tile stops movement; diagonal into a corner slides, never enters; path avoids water and reaches the target; unreachable goal → null.
- Input: WASD/arrows (screen-relative), joystick vector, tap/click → path. Hero sprite from `renderCharacterSvg` (front/back), flip for left, walk bob. Camera follows smoothly.

### Task 3: HUD, minimap, NPCs, dialogue
- HUD (React): portrait, name, level, XP bar to next level (`levels.ts`), gold. Desktop top-left card; phone compact top bar. Minimap (canvas): tiles, player, NPCs, monster zones; tap to toggle size.
- Two NPCs drawn with `renderCharacterSvg` presets: Elder Rowan (explains battles), Nori the shopkeeper (shop opens in Phase 4, said in dialogue). Interact prompt within 1.3 tiles: `E`/`Space`/`Enter` or Interact button. Dialogue box with paging, keyboard and tap.
- `levels.ts`: `xpToNext(level)`, `levelForXp(xp)`. Tests: level 1 → 100, level 2 → 283, `levelForXp(99)=1`, `levelForXp(100)=2`, `levelForXp(383)=3`.

### Task 4: Starter questions
- `content/questions/starter.json`: ~70 questions — Primary (Maths 15, Science 10, English 5), Lower Secondary (Maths 15, Science 10, English 5), General pool 10. Types: multiple choice, true/false, numeric, fill-in-the-blank. Each has id, level_ids, subject, topic, difficulty 1–5, bloom level, prompt, options, answer, explanation, a reason for every wrong option, learning objective, curriculum alignment note, source (original work aligned to the named curriculum topic), licence `CC BY 4.0 (Eduventure original)`, status `in_review`, version 1.
- Validator (unit test over the file): schema, unique ids, unique prompts, exactly one correct option, wrong-option reasons present, numeric answers parse, no answer text in the prompt.
- `npm run gen:questions` writes the migration. `/dev/questions` (dev builds only) shows every question as a readable checklist for the owner.

### Task 5: Battle server
- Migration: `monsters`, `questions` (public fields), `question_keys` (answer + explanations; no client grants), `encounters`, `question_attempts`, `app_settings(allow_draft_questions)`, `level_for_xp()`, `xp_to_next()`.
- `start_encounter(p_monster text)` → active encounter if one exists, else new; picks a question for the player's level/subjects (general pool fallback), avoiding the last 10 seen; returns question without answer.
- `answer_question(p_encounter uuid, p_answer jsonb)` → marks; correct: damage `12 + 4·difficulty` × combo bonus (+10 % per streak, max +50 %), XP `5·difficulty`, gold `2·difficulty` (0 if farmed); wrong: player loses 10 HP, combo resets, explanation for the chosen option; monster defeated → bonus XP/gold from `monsters`; player at 0 HP → encounter ends, nothing lost. Returns result + next question + new totals + `leveled_up`.
- `flee_encounter(p_encounter uuid)`.
- RLS tests: answer never in `start_encounter` payload; correct answer (read from the content file) lowers monster HP and raises XP; same question again within 24 h → 0 XP; second answer within 1.5 s rejected; another player's encounter rejected; finished encounter rejects answers; Doctoral player still gets a question; `question_keys` unreadable.

### Task 6: Monsters, battle UI, end-to-end
- Three monsters (original designs, SVG renderer): Sproutling (HP 60), Pebblewing (HP 90), Dinobud (HP 120). They wander in their zones; walking into one or pressing Interact starts a battle.
- Battle panel (React overlay, keyboard + touch): monster portrait and HP bar, player HP, question with Draft badge when not published, answer UI per type, feedback with explanation, combo, Continue / Flee, victory card with XP, gold and level-up.
- E2E: enter world from Home; move with keyboard; talk to the Elder; start a battle, answer until it ends (or flee), XP/gold on Home match the server; reload keeps them; 360 × 740 portrait has no overlap or horizontal scroll.

### Task 7: Phase check
- `npm test`, `npm run test:rls`, `npm run test:e2e`, `npm run build`, Supabase advisors. `docs/art-spec.md` (sizes and formats for replacement art). Report; merge and push per `CLAUDE.md`.

---

## Build record (2026-11-16)

### Rulings (decision — reason — cost if wrong)

- Phaser 3.90 instead of 4.2 — the brief names Phaser 3 and 3.90 is mature — upgrade later touches only `src/game/scenes`.
- Map written as ASCII rows in TypeScript instead of Tiled JSON — editable without an editor and covered by tests — a Tiled importer can be added when real art arrives.
- Tapping an NPC walks to a side-by-side tile, and the talk range is 1.5 tiles — a diagonal neighbour (1.41 tiles) was out of the original 1.3 range — none.
- Phaser does not capture keys — capturing Enter/Space/WASD blocked dialogue buttons and answer fields — none.
- Interact ignores presses for 300 ms after a panel closes — the closing key otherwise reopened the dialogue — none.
- Canvas renders at device pixel ratio (max 2) — art looked soft on phones — slightly more GPU work on high-DPI screens.
- Battles start only from Interact — avoids accidental battles for young players — none.
- Rendering pauses while the battle panel is open, and the panel has no backdrop blur — blur over a live canvas stalled rendering — none.
- `start_encounter` returns the existing battle when two starts race — seen once in the browser under React dev double-effects; not reproducible from tests — none.
- HUD updates from each answer's server totals — players see XP rise during the battle — none.
- No asset manifest yet: textures are looked up by fixed keys and `docs/art-spec.md` lists them — a manifest has nothing to point at until real art exists — small loader change later.
- Energy is not shown or used yet — no mechanic consumes it in Phase 2; showing a fake bar would break the "no fake numbers" rule — added with missions in Phase 3.
- `/dev/questions` is English-only and development-only — internal review tool; it contains answer keys, and the production build was checked to contain none — none.

### Known limits

- In headless test browsers the world renders slowly (software WebGL), so world tests wait on game state rather than fixed delays.
- Starter questions are English only and unverified until the owner approves them.
- Generated question migrations sort after the newest migration on disk; content changes need `npm run gen:questions` then `db push`.

### Results

- `npm test` 73/73 · `npm run test:rls` 21/21 (live project) · `npm run test:e2e` 8/8 · `npm run build` OK (entry 77 KB gzip; Phaser 324 KB gzip loaded only on /world) · Supabase advisors: 0 errors.
- Final review: self-review (owner did not ask for subagents).
