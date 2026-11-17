# Knowledge Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A pet egg at level 2 that grows from learning, evolves through gates of pet points + level + an earn-only gold fee, picks its adult form from the subjects studied, wears gold-bought accessories, and follows the hero.

**Architecture:** One `player_pets` row per player, written only by Postgres functions (`hatch_pet`, `evolve_pet`, `dress_pet`, internal `pet_award`) hooked into the existing `after_answer()` and `complete_lesson()`. Pure rules (`pet_form`, `pet_next`) are separate SQL functions mirrored in `src/features/pet/petRules.ts`. The 3D pet is built from primitives like the monsters.

**Tech Stack:** Supabase Postgres (plpgsql, RLS), React 19 + TanStack Query, three.js/R3F, i18next, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-knowledge-pet-design.md`

## Global Constraints

- Points: +1 per correct answer (max 30/day from answers, player's local day), +5 per first lesson completion, +3 per day played. Never subtracted.
- Gates: hatch level 2 (free); young = 100 points + level 5 + 50 gold; adult = 300 points + level 10 + 150 gold. Level gates live in `level_unlocks` kind `pet`, keys `pet_egg` 2, `pet_young` 5, `pet_adult` 10.
- Adult form: every branch ≥ 20% of the branch total, or total 0 → `seimbang`; else the largest branch, ties in order science, maths, technology, language.
- Branches from `islands.subject_ids`: science_island→science, mathematics_mountains→maths, technology_city→technology, language_kingdom→language; other subjects → no branch (total only). Day points → total only. Code lessons → technology, language lessons → language.
- Species: kancil, beruang, naga. Names (preset keys only): comel, bulat, si_pintar, tompok, bintang, kiki, mochi, ombak.
- Pet shop slots `pet_hat`, `pet_neck`, `pet_dye`; items and prices exactly the spec's catalogue table. Bought with existing `buy_item()`.
- The client never writes `player_pets`; every function is `security definer set search_path = ''`, signed-in only; internal helpers revoked from `authenticated`.
- No pet decay, sadness, notifications or stat effects. All seven locales get every new key (en + ms proper, others drafted).
- Migrations are pushed only after the owner approves the db push for this project.

## Review Focus

- A player who reaches level 2 by finishing **lessons only** (never battling) must still be able to hatch → Task 2 test `hatch after lessons only` (level comes from `player_level`, not battles).
- Boat travel or an island change moves the hero far in one frame; the pet must appear beside the hero, not swim across the map → Task 3 test `followStep snaps after a jump`. (Double-tapped Evolve is covered by `for update` locks on the pet row and wallet in Task 2.)
- A pet still wearing an item the player somehow no longer owns, or a dye on the hat slot → Task 2 test `dress rejects wrong slot`.
- The world without a pet (level 1) and the pet page while data loads must not crash → Task 4 test `PetPage shows the egg lock at level 1`; Task 3 `PetFollower renders nothing without a pet`.
- Answer points after the 30 cap must still give XP/gold normally (cap touches only the pet) → Task 2 test `answer cap` checks `xp_gained > 0` on the 31st answer.

---

### Task 1: Pet rules, unlocks and catalogue on the client

**Files:**
- Create: `src/features/pet/petRules.ts`, `src/features/pet/petRules.test.ts`
- Modify: `src/game/unlocks.ts` (kind `pet` + 3 rows), `src/game/unlocks.test.ts`, `src/features/shop/catalogue.ts` (8 pet items)

**Interfaces:**
- Produces:
  - `PET_SPECIES = ['kancil','beruang','naga'] as const`, `type PetSpecies`
  - `PET_NAMES = ['comel','bulat','si_pintar','tompok','bintang','kiki','mochi','ombak'] as const`
  - `BRANCHES = ['science','maths','technology','language'] as const`, `type Branch`, `type Branches = Record<Branch, number>`
  - `type PetStage = 'baby'|'young'|'adult'`, `type PetForm = Branch | 'seimbang'`
  - `type Pet = { species: PetSpecies; name: string; stage: PetStage; form: PetForm | null; points: number; branches: Branches; look: PetLook }`, `type PetLook = { hat?: string; neck?: string; dye?: string }`
  - `STEPS = { young: { points: 100, gold: 50 }, adult: { points: 300, gold: 150 } }` (levels come from `unlockLevel('pet', 'pet_young'|'pet_adult')`)
  - `petForm(b: Branches): PetForm`
  - `petNext(stage: PetStage, points: number, level: number, gold: number): { next: 'young'|'adult'|null; points: number; level: number; gold: number; missing: ('points'|'level'|'gold')[] }` — `next: null` (and zeros, empty missing) at adult.
  - `UnlockKind` gains `'pet'`; `PET_SLOTS = ['pet_hat','pet_neck','pet_dye'] as const`; `isPetItem(item: ShopItem): boolean`.

- [ ] **Step 1: Write the failing tests** in `petRules.test.ts`:

```ts
expect(petForm({ science: 10, maths: 3, technology: 0, language: 0 })).toBe('science')
expect(petForm({ science: 25, maths: 25, technology: 25, language: 25 })).toBe('seimbang')
expect(petForm({ science: 20, maths: 20, technology: 20, language: 19 })).toBe('science') // 19/79 < 20% → not balanced; tie → science first
expect(petForm({ science: 0, maths: 0, technology: 0, language: 0 })).toBe('seimbang')
expect(petForm({ science: 5, maths: 9, technology: 9, language: 0 })).toBe('maths')
expect(petNext('baby', 100, 5, 50)).toEqual({ next: 'young', points: 100, level: 5, gold: 50, missing: [] })
expect(petNext('baby', 99, 4, 10).missing).toEqual(['points', 'level', 'gold'])
expect(petNext('young', 300, 10, 150).next).toBe('adult')
expect(petNext('adult', 999, 99, 9999)).toEqual({ next: null, points: 0, level: 0, gold: 0, missing: [] })
```

In `unlocks.test.ts`: `isUnlocked(1,'pet','pet_egg')` false, `isUnlocked(2,'pet','pet_egg')` true, `unlockLevel('pet','pet_adult')` 10. Catalogue: 8 items pass `isPetItem`, none of the old ones do; `shopValues('accessory')` (appearance.ts) still excludes pet items.

- [ ] **Step 2: Run** `npx vitest run src/features/pet src/game/unlocks.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the interfaces above. `petForm`: total = sum; balanced when total = 0 or every branch ≥ 0.2 × total; else first max in BRANCHES order.
- [ ] **Step 4: Run** `npx vitest run src/features/pet src/game src/features/character` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(pet): client rules, unlocks and pet shop items`.

### Task 2: Database — pet table, rules, awards, hatch/evolve/dress

**Files:**
- Create: `supabase/migrations/20261117110000_knowledge_pet.sql`, `tests/rls/pet.test.ts`

**Interfaces:**
- Consumes: Task 1 lists (the migration copies them; `unlocks.test.ts`/`shop.test.ts` live checks compare).
- Produces (SQL, all `public.`):
  - table `player_pets(user_id uuid pk → auth.users on delete cascade, species text check, name text check, stage text default 'baby' check, form text null check, points int default 0, branches jsonb default '{"science":0,"maths":0,"technology":0,"language":0}', answer_day date, answer_points int default 0, look jsonb default '{}', hatched_at timestamptz default now(), evolved_at timestamptz)`; RLS select own row; no insert/update/delete grants.
  - `pet_form(p_branches jsonb) returns text` (immutable), `pet_next(p_stage text, p_points int, p_level int, p_gold bigint) returns jsonb` (stable; same shape as TS `petNext`, keys `next, points, level, gold, missing`) — both granted to authenticated (pure).
  - `subject_branch(p_subject text) returns text`, `pet_award(p_user uuid, p_branch text, p_kind text) returns void` (`answer` +1 capped 30/local day, `lesson` +5, `day` +3; no pet → no-op) — revoked from public/anon/authenticated.
  - `hatch_pet(p_species text, p_name text) returns jsonb` (the row as jsonb). Errors: `Reach level % to hatch an egg` (P0001), `You already have a pet` / `Unknown species` / `Unknown name` (22023).
  - `evolve_pet() returns jsonb` `{pet, gold}`. Locks pet row then wallet `for update`; errors `No pet yet` (P0002), `Your pet is fully grown`, `Needs more pet points`, `Reach level % to evolve`, `Not enough gold` (P0001). Sets `form = pet_form(branches)` on adult; audit log `evolve_pet`.
  - `dress_pet(p_slot text, p_item text) returns jsonb` (the look). `p_slot` in hat/neck/dye; `p_item` null removes; item must exist with slot `'pet_' || p_slot` and be owned, else `You do not own this item` (42501).
  - `after_answer` (redefine, same signature): if correct → `pet_award(user, subject_branch(subject), 'answer')`; if the `learning_days` insert inserted a row → `pet_award(user, null, 'day')`.
  - `complete_lesson` (redefine from `20261117100000_language_lessons.sql`, same signature/return): always insert today into `learning_days` (+ `day` award when new); on first completion `pet_award(user, case course kind when 'code' then 'technology' else 'language' end, 'lesson')`.
  - `level_unlocks.kind` check gains `'pet'`; rows `(2,'pet','pet_egg'),(5,'pet','pet_young'),(10,'pet','pet_adult')`. `shop_items.slot` check gains the three pet slots; insert the 8 items (sort 200+).

- [ ] **Step 1: Write the failing tests** in `tests/rls/pet.test.ts` (live project; `player()` as in `unlocks.test.ts`; level-up loop as `second chance at level 3`):
  - `pet_form and pet_next match the client` — loop the Task 1 cases through `rpc('pet_form')`/`rpc('pet_next')` and compare with `petForm`/`petNext`.
  - `level 1 cannot hatch; the row cannot be written` — `hatch_pet` error /Reach level 2/; `from('player_pets').insert(...)` errors; `rpc('pet_award', …)` errors.
  - `hatch, points and branches` (timeout 240 s) — battle `dinobud` until level 2; hatch `kancil`/`comel` → stage `baby`, points 0; second hatch → /already have/; unknown name → /Unknown name/. Start `hornbill` (science island), one right answer → points 1, `branches.science` 1. One wrong answer → unchanged.
  - `answer cap` (timeout 300 s) — continue right answers until 30 answer points today; the next right answer leaves points unchanged and still has `xp_gained >= 0` without error.
  - `evolve gates` — `evolve_pet` → /Needs more pet points/.
  - `dress rejects wrong slot and unowned items` — `dress_pet('neck','pet_bell')` → /do not own/; `buy_item('pet_bell')` then `dress_pet('neck','pet_bell')` → look `{neck:'pet_bell'}`; `dress_pet('hat','pet_bell')` → /do not own/; `dress_pet('neck', null)` → `{}`.
  - `hatch after lessons only` (timeout 300 s) — fresh player completes 4 Code Academy lessons via `lessonAnswers.ts` (`rightStep`, `marked`) → level 2; hatch `naga`/`kiki` succeeds; one more first lesson completion → points 5, `branches.technology` 5.
- [ ] **Step 2: Run** `npx vitest run --config vitest.rls.config.ts tests/rls/pet.test.ts` — Expected: FAIL (function `pet_form` does not exist).
- [ ] **Step 3: Write the migration** per the interfaces. `pet_award` keeps the cap with `answer_day`/`answer_points`, resetting when `answer_day <> local_today(user)`; branch add via `jsonb_set(branches, array[branch], to_jsonb(coalesce((branches->>branch)::int,0)+n))`.
- [ ] **Step 4: STOP — ask the owner to approve `npx supabase db push --remote --yes` for this project.** Then push, and run `npx supabase db advisors --linked` — Expected: 0 errors.
- [ ] **Step 5: Run** `npm run test:rls` — Expected: all pass (incl. existing `unlocks` and `shop` match tests). Space runs to respect the anonymous sign-in rate limit.
- [ ] **Step 6: Commit** `feat(pet): server pet table, awards, hatch, evolve and dress`.

### Task 3: The 3D pet — model, snapshot and follower

**Files:**
- Create: `src/world3d/pet/buildPet.ts`, `src/world3d/pet/pet.test.ts`
- Modify: `src/world3d/snapshotKey.ts`, `src/world3d/snapshot.ts`, `src/world3d/Actors.tsx` (add `PetFollower`), `src/world3d/World3D.tsx` (render it; new prop `pet?: Pet | null`), `src/features/world/GameCanvas.tsx` (pass the pet), `src/world3d/snapshot.test.ts`

**Interfaces:**
- Consumes: `Pet`, `PetSpecies`, `PetStage`, `PetForm`, `PetLook` (Task 1); `geometry`, `material` from `../hero/materials` and the `Part` style of `buildMonster.ts`.
- Produces: `buildPet(species: PetSpecies, stage: PetStage, form: PetForm | null, look: PetLook): Group` (feet on y = 0, facing +z, ~0.8 units tall before stage scale); `PET_SCALE: Record<PetStage, number> = { baby: 0.45, young: 0.6, adult: 0.75 }`; `Subject` gains `{ kind: 'pet'; pet: Pick<Pet,'species'|'stage'|'form'|'look'> }` with key `pet:${species}|${stage}|${form}|${hat}|${neck}|${dye}`; `PetFollower({ sim, pet, reduced })`; pure `followStep(pet: {x,y}, hero: {x,y}, facing: number, dt: number): {x,y}` in `buildPet.ts`'s sibling `src/world3d/pet/follow.ts`.

- [ ] **Step 1: Write the failing tests** (`pet.test.ts`): every species × stage × form (incl. null) builds a Group with > 4 meshes and < 60; adult forms differ in at least one material colour from each other; `look.hat` adds meshes vs no hat; `look.dye` changes the body colour; `snapshotKey({kind:'pet',…})` differs when any look slot changes; `followStep snaps after a jump` (hero 10 tiles away → result within 1 tile of the hero; hero 1.5 tiles away → moves closer but not onto the hero); `PetFollower renders nothing without a pet` (render `World3D` test pattern from `world3d.test.tsx` with `pet={null}`).
- [ ] **Step 2: Run** `npx vitest run src/world3d` — Expected: FAIL.
- [ ] **Step 3: Implement.** Species silhouettes: kancil (slim fawn body, big ears, thin legs), beruang (round black bear, cream chest crescent), naga (green serpent-dragon, small horns, curled tail). Young adds size detail (longer ears / claws / wing nubs); adult adds the form crest and a glowing (`*` colour) accent in the form colour (science `#4fc3f7`, maths `#ffb74d`, technology `#7c4dff`, language `#e57373`, seimbang gold `#ffd54f`). Hats sit on the head anchor; neck items ring the neck; dye replaces the main body colour. Follower: target = hero pos − 0.9 tiles along hero facing; ease toward it (`k = min(1, dt*4)`), face movement, idle bob; snap when > 4 tiles away (after boat travel); `reduced` → no bob.
- [ ] **Step 4: Run** `npx vitest run src/world3d` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(pet): 3D pet model, snapshot and follower`.

### Task 4: Pet page, HUD and Home links, i18n

**Files:**
- Create: `src/features/pet/usePet.ts`, `src/features/pet/PetPage.tsx`, `src/features/pet/PetPage.test.tsx`
- Modify: `src/app/App.tsx` (`/pet`, protected like `/shop`), `src/features/world/Hud.tsx` (paw link to `/pet`, pet snapshot when hatched), `src/features/world/WorldPage.tsx` (pass pet to `GameCanvas`), `src/features/home/HomePage.tsx` (Pet button), `src/i18n/locales/*.json` (`pet.*`, `unlocks.pet_egg|pet_young|pet_adult`, `character.opt.<8 pet item ids>`)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `usePet(uid) → UseQueryResult<Pet | null>` (key `['pet', uid]`, `from('player_pets').select('species,name,stage,form,points,branches,look').maybeSingle()`), `hatchPet(species, name)`, `evolvePet()`, `dressPet(slot: 'hat'|'neck'|'dye', item: string | null)` — each returns the rpc data and throws its error; `PetPage`.

- [ ] **Step 1: Write the failing tests** (`PetPage.test.tsx`, mocking `usePet`/`useProgression` like `TitlePicker.test.tsx` mocks its hooks):
  - `PetPage shows the egg lock at level 1` — text "Reach level 2 to hatch your egg".
  - at level 2 with no pet: three species buttons and a name select; Hatch calls `hatchPet('beruang','mochi')` after choosing.
  - baby with 40 points, level 3, 20 gold: progress "40 / 100", checklist marks points, level and gold as missing, Evolve disabled.
  - baby with 100 points, level 5, 60 gold: Evolve enabled; clicking calls `evolvePet`.
  - young: branch bars for the four subjects and "Heading for: Maths form" when maths leads.
- [ ] **Step 2: Run** `npx vitest run src/features/pet` — Expected: FAIL.
- [ ] **Step 3: Implement** the page with the existing UI kit (`Panel`, `Button`, `ProgressBar`, `SceneBackdrop`, `FormMessage`), error mapping by regex like `ShopPage`, invalidating `['pet', uid]` and `['progression', uid]` after each action. Dress section lists owned pet items per slot (from `useOwnedItems`) with Wear / Take off. Add all locale keys (`i18n.test.ts` checks every locale has them).
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(pet): pet page, HUD and home links`.

### Task 5: Shop pet corner and the battle cheer

**Files:**
- Modify: `src/features/shop/ShopPage.tsx`, `src/features/battle/BattlePanel.tsx`, `src/i18n/locales/*.json`
- Test: `src/features/shop/ShopPage.test.tsx` (create), `src/features/battle/BattlePanel.test.tsx` (extend if present, else create a focused test of the cheer line component)

**Interfaces:**
- Consumes: `isPetItem`, `usePet`, Snapshot `kind: 'pet'`.
- Produces: `PetCheer({ pet })` inside `BattlePanel.tsx` — renders `t('pet.cheer', { name })` after a wrong answer when a pet exists.

- [ ] **Step 1: Write the failing tests:** shop renders a "Pet corner" heading with the 8 pet items and the hero grid without them; pet items show a pet preview when the player has a pet and a "Hatch a pet to try this on" note when not; after a wrong answer with a pet the cheer line shows the pet's translated name; with no pet, no cheer.
- [ ] **Step 2: Run** `npx vitest run src/features/shop src/features/battle` — Expected: FAIL.
- [ ] **Step 3: Implement.** Pet items are bought with `buyItem`; "Wear" for an owned pet item calls `dressPet(slot without 'pet_', id)`.
- [ ] **Step 4: Run** `npm test` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(pet): pet corner in the shop and a cheer after wrong answers`.

### Task 6: End-to-end, docs and final checks

**Files:**
- Create: `tests/e2e/pet.spec.ts`
- Modify: `playwright.config.ts` (online project `testMatch` gains `pet.spec.ts`), `docs/ROADMAP.md` (knowledge pet section), `docs/decisions.md` (#28: pet gates on learning + level, gold as earn-only token fee; lesson days now count for streaks)

- [ ] **Step 1: Write** `pet.spec.ts`: `newPlayer` → `/pet` shows "Reach level 2 to hatch your egg"; `/shop` shows "Pet corner" and `pet_bell` priced 50; `/world` loads with no pet and the HUD paw link opens `/pet`.
- [ ] **Step 2: Run** `npx playwright test tests/e2e/pet.spec.ts` — Expected: PASS.
- [ ] **Step 3: Run the full gate:** `npm test`, `npm run build`, `npm run test:rls`, `npm run test:e2e`, `npx supabase db advisors --linked` — Expected: all pass, 0 advisor errors.
- [ ] **Step 4: Commit** `test(e2e): pet page and shop; docs for the knowledge pet`, then finish the branch (merge `--no-ff` to main, push, delete branch) per the standing instruction.
