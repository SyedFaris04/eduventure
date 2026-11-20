# Festival Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Festival and school-holiday events (year-end school holiday, Chinese New Year, Ramadan/Raya, Merdeka, Deepavali), each with Kampung decorations, festival missions that pay festival tokens, and a festival stall that sells items for tokens.

**Architecture:**
- **Dates** live in a `festivals` table in Malaysia time. One internal function, `active_festivals(uid)`, says which festivals are on. That means real dates, plus an admin's preview.
- **Missions:** festival missions extend the existing mission system with a `festival_kind` and a `token_reward`.
- **Stall:** festival items are `shop_items` rows with `festival_kind` and `token_price`, sold only by `buy_festival_item`.
- **Client:** it reads `my_festivals()` to show a HUD chip, a missions section, the stall and the 3D decorations.

**Tech Stack:** Supabase Postgres (plpgsql), React 19 + TS + TanStack Query, R3F/three, i18next (7 locales), Vitest, Vitest live database tests (`npm run test:rls`).

**Spec:** `docs/superpowers/specs/2026-11-20-festival-events-design.md`

## Global Constraints

**Database**
- Every reward and purchase happens in a `security definer set search_path = ''` function. Internal helpers are revoked from `public, anon, authenticated`. Client RPCs are revoked from `public, anon` and granted to `authenticated`.
- Each database change is a new migration that copies the function's latest version. Never edit a pushed migration. Push with `npx supabase db push --remote --yes` (approved for this project), then check that the advisors show 0 errors.

**Content and wording**
- No religious symbols or sites, no flags or emblems, and no real brands in decorations or items.
- Merdeka bunting uses red, white, blue and yellow, and never the flag.
- No countdown or "last chance" wording.
- All player-facing text goes in en, ms, es, ar, zh, fr and ja. The admin page stays English-only, as it is today.

**Data and tests**
- Festival dates use the `Asia/Kuala_Lumpur` date. Daily festival missions use `public.local_today(uid)`.
- Tokens: the `player_wallets.festival_tokens` column, shared across all festivals. They never expire.
- The test database is production. Write non-ASCII text and apostrophes with the Write tool, never heredocs. Never commit `.env.test.local`.

## Review Focus

1. **Two festivals on at once** (CNY and Raya overlap in February 2027). The HUD, the missions section, the stall and the decorations must show both, and claiming or buying must work for each. Covered by tests in Tasks 4, 5, 6 and 7, which use two kinds.
2. **A previewed festival that is also really on** must appear only once, in `my_festivals` and in the missions. Covered by the Task 1 test (`active_festivals` is distinct by kind).
3. **A festival that ends** while a mission is completed but not claimed: the mission disappears and the claim is refused. Covered by Task 2: claiming checks that the mission is still current.
4. **Players outside Malaysia:** a festival switches on by the Malaysia date, but daily missions follow the player's own day. Covered by Task 2: the daily festival mission's `period_start` is `local_today`, and the festival check uses KL time.
5. **Gold-shop leaks:** festival items must never be sold for gold or shown in the gold shop or Pet Corner. Covered by Task 3 (`buy_item` refusal) and Task 4 (catalogue filter tests).

---

### Task 1: Festivals, tokens and admin preview (database)

**Files:**
- Create: `supabase/migrations/20261120100000_festivals.sql`
- Create: `tests/rls/festivals.test.ts`

**Interfaces:**
- Produces (SQL):
  - table `public.festivals(id text pk, kind text check in ('school_holiday','cny','raya','merdeka','deepavali'), starts_on date, ends_on date, check (ends_on >= starts_on))`. Authenticated users can select it; there are no client writes.
  - table `public.festival_previews(user_id uuid pk references auth.users on delete cascade, festival_id text not null references festivals)`. No client access at all; RLS is on with no policies.
  - column `player_wallets.festival_tokens int not null default 0 check (festival_tokens >= 0)`.
  - `public.active_festivals(p_user uuid) returns setof public.festivals`: internal and revoked. It returns the festivals where `(now() at time zone 'Asia/Kuala_Lumpur')::date between starts_on and ends_on`, union the user's preview row if `has_role`-equivalent admin. Use a direct `exists (select 1 from public.admin_roles where user_id = p_user and role = 'admin')`, because `has_role` reads `auth.uid()`. Result is distinct on `kind`, with the preview winning.
  - `public.my_festivals() returns jsonb`: `{ festivals: [{id, kind, starts_on, ends_on, preview}], tokens }`.
  - `public.set_festival_preview(p_id text, p_reset boolean default false) returns jsonb`. It raises 'Admins only' (42501) unless `has_role(array['admin'])`. Null `p_id` deletes the preview row. With `p_reset` and a non-null id, it wipes the caller's own festival progress for that kind and sets `festival_tokens = 50`. The mission and item wipes need Tasks 2 and 3, so in this task only the token reset exists. Tasks 2 and 3 redefine the function to add their wipes. Returns `my_festivals()`.
- Seeds the 6 festival rows exactly as in the spec table.

- [ ] **Step 1: Write failing live tests in `tests/rls/festivals.test.ts`**
  - Setup: an anonymous `player()` as in `harvest.test.ts`, plus an `admin` client signed in with `TEST_ADMIN_EMAIL` and `TEST_ADMIN_PASSWORD`. The admin tests are skipped if those are missing.
  - `it('lists the festivals on now in Malaysia time, with tokens')`: `my_festivals` returns `tokens: 0`. Each returned festival satisfies `starts_on <= todayKL <= ends_on`, where `todayKL = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date())`. All have `preview: false`.
  - `it('festival dates, tokens and previews cannot be written by players')`: these return nothing or an error, and afterwards `my_festivals().tokens === 0`:
    - `from('festivals').insert(...)`;
    - `from('player_wallets').update({ festival_tokens: 999 })`;
    - `from('festival_previews').insert(...)`.
  - `it('only admins can preview')`: `set_festival_preview({ p_id: 'cny_2027' })` from the anonymous player has an error matching `/Admins only/`.
  - `it('an admin preview shows that festival once, and reset sets 50 tokens')`:
    - The admin calls `set_festival_preview({ p_id: 'cny_2027', p_reset: true })`.
    - `my_festivals` then has exactly one `cny` entry with `preview: true`, and `tokens === 50`.
    - `afterAll` clears the preview with `p_id: null`.

- [ ] **Step 2: Run and see it fail**
  Run: `npx vitest run -c vitest.rls.config.ts tests/rls/festivals.test.ts`
  Expected: FAIL with "Could not find the function public.my_festivals".

- [ ] **Step 3: Write the migration and push it**
  Run: `npx supabase db push --remote --yes`.

- [ ] **Step 4: Run the tests and see them pass**
  Run: the same as Step 2. Expected: PASS (4 tests).

- [ ] **Step 5: Commit** `feat(festivals): festival dates, tokens and admin preview`

### Task 2: Festival missions (database)

**Files:**
- Create: `supabase/migrations/20261120100001_festival_missions.sql`
- Modify: `tests/rls/festivals.test.ts`, `tests/rls/missions.test.ts`

**Interfaces:**
- Consumes: `active_festivals(uuid)` from Task 1.
- Produces:
  - **Template table changes:**
    - `mission_templates` gains `festival_kind text null` (same check as `festivals.kind`) and `token_reward int not null default 0 check (token_reward >= 0)`.
    - The period check becomes `('daily','weekly','festival')`.
    - The kind check adds `'harvest'` and `'lesson'`.
  - **25 template rows:**
    - ids are `f_<kind>_daily`, `f_<kind>_answers`, `f_<kind>_monsters`, `f_<kind>_harvest` and `f_<kind>_lessons`, for kind in the 5 kinds;
    - each row's period, kind, target, xp, gold and tokens are exactly as in the spec table.
  - **Function changes**, each copied from its latest version:
    - `ensure_missions`: from `20261117120000_returning_monsters.sql`.
      - Normal templates (`festival_kind is null`) work as before.
      - Festival templates are inserted only for kinds in `active_festivals(p_user)`.
      - `period_start` is `local_today` for daily, or the festival's `starts_on` for `festival`.
    - `current_missions`: from `20261116012700_missions_streaks.sql`.
      - A festival template's row is current only if its kind is active.
      - For `period = 'festival'`, it also needs `period_start = that festival's starts_on`.
      - For daily, `period_start = local_today`.
      - Weekly and normal daily rows are unchanged.
    - `my_missions`: each row adds `festival` (`t.festival_kind`), `tokens` (`t.token_reward`), and `ends_on` for a `festival` period (otherwise null).
    - `claim_mission`:
      - It refuses with 'This mission has ended' unless `p_id in (select id from current_missions(v_uid))`. This also applies to normal missions; it matches what the panel shows.
      - It adds `token_reward` to `player_wallets.festival_tokens`, and returns `tokens` (the reward) and `totals.tokens`.
    - `answer_harvest`: from `20261120090003_harvest_no_double_pay.sql`. After paying, it calls `perform public.bump_missions(v_uid, 'harvest', null)` and merges its result into the `missions_completed` it returns.
    - `complete_lesson`: from `20261119090000_teach_your_pet.sql`. On every completion it calls `bump_missions(v_uid, 'lesson', null)`, and its returned jsonb gains `missions_completed`.
    - `set_festival_preview`: when `p_reset` is set, it also deletes the caller's `player_missions` whose template has that `festival_kind`.
  - **`bump_missions`** needs no change: it matches by kind on current missions.

- [ ] **Step 1: Write the failing live tests**
  - In `festivals.test.ts`:
    - `it('festival missions appear only for festivals that are on')`: for the anonymous player, the set of `festival` values from `my_missions` rows with a non-null `festival` equals the set of kinds from `my_festivals`.
    - `it('an admin preview gives the five festival missions, and harvesting fills the daily and harvest ones')`:
      - The admin previews `merdeka_2027` with reset.
      - `my_missions` filtered to `festival === 'merdeka'` has 5 rows: daily target 5 with tokens 2, festival-period rows with `ends_on: '2027-09-16'`, all at progress 0.
      - Then harvest 5 greenhaven tree or rock nodes correctly. Skip nodes in `my_harvest_cooldowns('greenhaven')` and nodes needing a pickaxe. Reuse the `harvest()` helper copied from `harvest.test.ts`.
      - `f_merdeka_daily` is now completed, and `f_merdeka_harvest` has progress 5.
      - Record the daily id, then switch the preview to `cny_2027` without reset, so merdeka is off.
        - `my_missions` has no `merdeka` rows.
        - `claim_mission(daily id)` errors with `/ended/`.
      - Switch back to `merdeka_2027` without reset.
        - `claim_mission(daily id)` returns `tokens: 2` and `totals.tokens: 52`.
        - Claiming again errors with `/already claimed/`.
  - In `missions.test.ts`: change "gives every player 3 daily and 2 weekly missions" so it counts only rows with `festival === null`.

- [ ] **Step 2: Run and see the new tests fail**
  Run: `npx vitest run -c vitest.rls.config.ts tests/rls/festivals.test.ts tests/rls/missions.test.ts`
  Expected: the new festival tests FAIL (no `festival` field / 0 rows).

- [ ] **Step 3: Write the migration and push it.**

- [ ] **Step 4: Run the tests and see them pass.** Also run `tests/rls/harvest.test.ts tests/rls/academy.test.ts tests/rls/language.test.ts`. Expected: all PASS.

- [ ] **Step 5: Commit** `feat(festivals): festival missions that pay tokens`

### Task 3: Festival stall (database)

**Files:**
- Create: `supabase/migrations/20261120100002_festival_stall.sql`
- Modify: `tests/rls/festivals.test.ts`, `tests/rls/shop.test.ts`

**Interfaces:**
- Produces:
  - **`shop_items` changes:**
    - It gains `festival_kind text null` (the kinds check) and `token_price int null`, with `check ((festival_kind is null) = (token_price is null))`.
    - Insert 10 rows: id, slot, rarity `common`, `price 1`, sort and `token_price` exactly as in the spec items table.
    - If the slot check does not yet allow a needed slot, extend it.
  - **`buy_item`:** copied from `20261120090000_harvest_craft.sql`. After the craft check, it raises 'This item is sold at the festival stall' (22023) when `festival_kind is not null`.
  - **`buy_festival_item(p_item text) returns jsonb { item_id, tokens }`:**
    - It checks, in order and with these exact messages:
      1. 'Not signed in';
      2. 'No such festival item';
      3. 'This festival is not on right now' (kind not in `active_festivals`);
      4. lock the wallet `for update`, then 'You already own this item';
      5. 'Not enough festival tokens'.
    - It spends `token_price`, inserts into `player_items`, and writes `audit_logs` with action `'buy_festival_item'`.
  - **`set_festival_preview`:** with `p_reset`, it also deletes the caller's `player_items` whose `shop_items.festival_kind` is that kind.

- [ ] **Step 1: Write the failing live tests**
  - In `festivals.test.ts`:
    - `it('the stall refuses when the festival is off, and the gold shop never sells festival items')`:
      - Pick an item whose kind is not in the anonymous player's `my_festivals` (`deepavali` → `pet_marigold`, unless deepavali is on).
      - `buy_festival_item` errors with `/not on right now/`.
      - `buy_item({ p_item: 'pet_marigold' })` errors with `/festival stall/`.
    - `it('an admin can buy a previewed festival item once with tokens')`:
      - Preview `school_holiday` (`year_end_2026`) with reset, so tokens are 50.
      - `buy_festival_item('pet_shades')` returns `tokens: 30`.
      - Buying it again errors with `/already own/`.
      - `buy_festival_item('holiday_sunhat')` returns `tokens: 0`.
      - Previewing again with reset and buying `holiday_sunhat` again succeeds, which proves the reset removed the item.
    - `it('buying without enough tokens is refused')`:
        - Preview `cny_2027` with reset (tokens 50).
        - Buy `lion_dance_hat` (30), leaving 20.
        - Buy `pet_lantern` (20), leaving 0.
        - Preview `raya_2027` *without* reset (tokens stay 0).
        - `buy_festival_item('pet_ketupat')` errors with `/Not enough festival tokens/`.
  - In `shop.test.ts`: the catalogue comparison adds `festival_kind: 'festival' in i ? i.festival : null` and `token_price: 'tokens' in i ? i.tokens : null`. Select those columns too.

- [ ] **Step 2: Run and see it fail**
  Expected: FAIL (`buy_festival_item` missing; `shop.test` columns missing).

- [ ] **Step 3: Write the migration, push it, and add the 10 catalogue rows**
  - Add the rows to `src/features/shop/catalogue.ts` (as in Task 4's Interfaces) so that `shop.test` can pass.

- [ ] **Step 4: Run the tests and see them pass**
  Run: `festivals.test.ts`, `shop.test.ts` and `harvest.test.ts` (it checks the craft-only refusal). Expected: PASS.

- [ ] **Step 5: Commit** `feat(festivals): festival stall sells items for tokens`

### Task 4: Client festival data and catalogue filters

**Files:**
- Modify: `src/features/shop/catalogue.ts`, `src/features/shop/PetCorner.tsx` (`PET_ITEMS` filter)
- Create: `src/features/festival/festivalApi.ts`, `src/features/festival/festivalRules.ts`, `src/features/festival/festivalRules.test.ts`
- Modify: `src/features/pet/petRules.test.ts` (counts)

**Interfaces:**
- Produces:
  - **Catalogue:** 10 entries such as `{ id: 'pet_shades', slot: 'pet_hat', rarity: 'common', price: 1, festival: 'school_holiday', tokens: 20 }`. The ids, slots and token prices are exactly as in the spec.
  - **Shop filters:** `HERO_ITEMS` and `PET_ITEMS` also exclude `'festival' in i`.
  - **`festivalRules.ts`:**
    - `export type FestivalKind = 'school_holiday' | 'cny' | 'raya' | 'merdeka' | 'deepavali'`
    - `export const FESTIVAL_ITEMS: (kind: FestivalKind) => ShopItem[]`: hero item first, then the pet item.
    - `export function untilLabel(endsOn: string, locale: string): string`: a short day and month, for example `3 Jan` in en-GB style via `Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' })` on `${endsOn}T00:00:00Z`.
  - **`festivalApi.ts`:**
    - `export type Festival = { id: string; kind: FestivalKind; starts_on: string; ends_on: string; preview: boolean }`
    - `export const festivalsKey = (uid?: string) => ['festivals', uid]`
    - `export function useFestivals(uid?: string)`: a query on `my_festivals`, `refetchInterval: 600_000`, returning `{ festivals: Festival[]; tokens: number }`.
    - `export async function buyFestivalItem(id: string): Promise<number>`: returns the tokens left and throws the Supabase error.
    - `export async function setFestivalPreview(id: string | null, reset: boolean): Promise<void>`
    - `export function festivalErrorKey(message: string): string`. It maps:
      - `/not on right now/` → `festival.errors.off`;
      - `/already own/` → `shop.errors.owned`;
      - `/Not enough festival tokens/` → `festival.errors.tokens`;
      - anything else → `shop.errors.failed`.

- [ ] **Step 1: Write the failing tests in `festivalRules.test.ts`**
  - `FESTIVAL_ITEMS('cny')` ids equal `['lion_dance_hat', 'pet_lantern']`.
  - Every kind has exactly 2 items, and the token totals are 50.
  - `HERO_ITEMS` and `PET_ITEMS` contain no festival items.
  - `untilLabel('2027-01-03', 'en-GB')` is `'3 Jan'`.
  - `festivalErrorKey` maps the four cases.
  - Update the `petRules.test` counts if they count the catalogue: pet catalogue items become 8 sold + 3 crafted + 5 festival.

- [ ] **Step 2: Run and see it fail.** Run: `npx vitest run src/features/festival src/features/pet`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run and see it pass.** Expected: PASS.

- [ ] **Step 5: Commit** `feat(festivals): client festival data and catalogue`

### Task 5: Festival section in the missions panel

**Files:**
- Modify: `src/features/missions/MissionsPanel.tsx`
- Create: `src/features/missions/MissionsPanel.test.tsx` (mock `supabase.rpc` the same way existing panel tests do)
- Modify: `src/i18n/locales/*.json`

**Interfaces:**
- Consumes: the `my_missions` row fields `festival`, `tokens` and `ends_on` from Task 2, and `useFestivals`/`festivalsKey` from Task 4.
- Produces:
  - `Mission` gains `festival: FestivalKind | null; tokens: number; ends_on: string | null`.
  - The normal daily and weekly sections show only rows with `festival === null`.
  - **A "Festival" section** for each festival kind with rows:
    - heading `t('festival.name.<kind>')`;
    - each row titled `t('missions.festival.<template kind>', { festival, target })`;
    - a token reward (`Star` icon, `+{tokens}`);
    - `t('festival.until', { date: untilLabel(ends_on, i18n.language) })` on festival-period rows.
  - **Claiming** also invalidates `festivalsKey(uid)`.
  - **New i18n keys** (all 7 locales):
    - `festival.name.{school_holiday,cny,raya,merdeka,deepavali}`; Hari Raya, Deepavali and Merdeka stay as they are;
    - `festival.until` = "until {{date}}";
    - `festival.tokens` = "{{n}} festival tokens";
    - `festival.errors.{off,tokens}`;
    - `missions.festival.{answer_correct,defeat_monsters,harvest,lesson}`.

- [ ] **Step 1: Write the failing tests**
  - `it('shows each festival's missions in their own section with token rewards')`:
    - The rpc mock returns 1 normal daily row, 2 `cny` rows (daily and answers with `ends_on`) and 1 `raya` row.
    - Expect headings "Chinese New Year" and "Hari Raya", "+2" on the cny daily, and "until 20 Feb" on the answers row.
    - The normal daily section has 1 row.
  - `it('hides the festival section when there are no festival missions')`.

- [ ] **Step 2: Run and see them fail.** Run: `npx vitest run src/features/missions`. Expected: FAIL.

- [ ] **Step 3: Implement it and add the i18n keys** (use a Python script written with the Write tool).

- [ ] **Step 4: Run and see them pass**, plus `npx vitest run src/i18n` (the locale key parity test). Expected: PASS.

- [ ] **Step 5: Commit** `feat(festivals): festival missions on the home panel`

### Task 6: Festival stall on the shop page

**Files:**
- Create: `src/features/festival/FestivalStall.tsx`, `src/features/festival/FestivalStall.test.tsx`
- Modify: `src/features/shop/ShopPage.tsx` (render `<FestivalStall/>` above the `shop.intro` line), `src/i18n/locales/*.json`

**Interfaces:**
- Consumes: `useFestivals`, `buyFestivalItem`, `festivalErrorKey`, `FESTIVAL_ITEMS`, `useOwnedItems`/`ownedItemsKey`.
- Produces:
  - `export function FestivalStall()`: a `<section id="festival" aria-label={t('festival.stall')}>`. It renders nothing when no festival is on.
  - Header: the token count (`festival.tokens`). For each active festival, its name, "until <date>", and its 2 items.
  - **Each item card:**
    - a Snapshot preview (hero item on the player's look; pet item via the same pet preview PetCorner uses);
    - the token price;
    - Buy, or Owned ("Wear" / "Dress" reuse is not needed here: owned items show `shop.owned` and the player wears them from the normal flows);
    - when tokens are short, the Buy button is disabled and `festival.needMore` ("{{n}} more tokens") shows.
  - **After buying:** invalidate `festivalsKey`, `ownedItemsKey` and `['character', uid]`, then show a success message (`shop.bought`).
  - New i18n keys: `festival.stall` ("Festival stall") and `festival.needMore`. Reuse `shop.owned` if it exists, otherwise add it.

- [ ] **Step 1: Write the failing tests**
  - `it('lists both active festivals with their items and token prices')`: with cny and raya active and 25 tokens, expect 4 cards. `Buy Lion dance hat` is disabled with "5 more tokens", and `Buy Lantern charm` is enabled.
  - `it('shows Owned for items the player has')`.
  - `it('renders nothing when no festival is on')`.
  - `it('shows the server reason when buying fails')`: `buyFestivalItem` rejects with "This festival is not on right now", and the `festival.errors.off` text shows.

- [ ] **Step 2: Run and see them fail. Step 3: Implement. Step 4: Run them and see them pass.** Also run `npx vitest run src/features/shop src/i18n`.

- [ ] **Step 5: Commit** `feat(festivals): festival stall in the shop`

### Task 7: World HUD chip and Kampung decorations

**Files:**
- Create: `src/features/festival/FestivalChip.tsx`, `src/features/festival/FestivalChip.test.tsx`, `src/world3d/FestivalDecor.tsx`
- Modify: `src/features/world/WorldPage.tsx` (chip under `<MaterialsBar/>`), `src/features/world/GameCanvas.tsx` (pass `festivals`), `src/world3d/World3D.tsx` (prop `festivals?: FestivalKind[]`, rendering `<FestivalDecor map kinds fancy/>` only when `map.id === 'greenhaven'`, or whatever the map's place id field is), `src/world3d/world3d.test.tsx` (mock `useFestivals`, and add a render test), `src/i18n/locales/*.json`

**Interfaces:**
- Produces:
  - **`FestivalChip()`:**
    - It renders nothing when no festival is on.
    - Otherwise it is a `Link` to `/shop#festival` with `aria-label={t('festival.chipLabel', { names, n: tokens })}`.
    - It shows a `Star` icon, the festival names joined with " · ", and the token count.
  - **`FestivalDecor({ map, kinds, fancy }: { map: GameMap; kinds: FestivalKind[]; fancy: boolean })`:**
    - It builds one group per kind, named `festival-<kind>`.
    - Decorations are code-drawn meshes using `geometry()`/`material()` from `./hero/materials`. The spec lists what each kind shows.
    - Positions are chosen on walkable tiles away from paths, and the pieces are not solid.
    - When `fancy` is false (low quality or reduced motion), it uses half the pieces and no `useFrame` movement. Merdeka fireworks are `Sparkles` bursts only when `fancy`.
  - New i18n key: `festival.chipLabel`.

- [ ] **Step 1: Write the failing tests**
  - `FestivalChip.test`:
    - It links to `/shop#festival` and shows "Chinese New Year · Hari Raya" and the token count when both are on.
    - It renders nothing when there are none.
  - `world3d.test.tsx`:
    - `it('decorates the Kampung for each festival that is on')`: render World3D for greenhaven with `festivals={['cny','merdeka']}`, then find scene objects named `festival-cny` and `festival-merdeka`.
    - The Science Island map with `['cny']` has no `festival-cny`.

- [ ] **Step 2: Run and see them fail. Step 3: Implement. Step 4: Run them and see them pass.** Run `npx vitest run src/features/festival src/world3d src/features/world`.

- [ ] **Step 5: Check it by eye** with an admin preview of each kind on the dev server, or by temporarily passing `festivals` in WorldLab. Take a screenshot to `test-results/festival-<kind>.png` and read it.

- [ ] **Step 6: Commit** `feat(festivals): festival decorations and HUD chip`

### Task 8: Festival item models and names

**Files:**
- Modify: `src/world3d/hero/parts.ts` (cases `holiday_sunhat`, `lion_dance_hat`, `songket_top`, `sparkler_wand`, `kolam_shawl`), `src/world3d/pet/buildPet.ts` (`pet_shades` in HATS; `pet_lantern`, `pet_ketupat`, `pet_bunting`, `pet_marigold` in NECKS), `src/i18n/locales/*.json` (`character.opt.<id>` for all 10)
- Test: the existing parts and pet tests, plus a new `it('every festival item has a model')` in `src/world3d/hero/parts.test.ts` (or the nearest existing parts test). It checks that each `CATALOGUE` festival item with a hero slot returns a non-empty part list, and that each pet item exists in HATS or NECKS.

- [ ] **Step 1: Write the failing test. Step 2: Run it and see it fail** (empty parts).
- [ ] **Step 3: Model each item** from simple shapes, following the spec descriptions:
  - `top` items: if the top slot draws through a palette or pattern path rather than `parts.ts` cases, follow the way `scholar_coat`/`star_cloak` are drawn.
  - Then add the names in all 7 locales.
- [ ] **Step 4: Run it and see it pass**, plus `npx vitest run src/world3d src/i18n`. Take a snapshot of each item on the hero and pet (Shop preview, dev server) and read the screenshot.
- [ ] **Step 5: Commit** `feat(festivals): festival outfits and pet items`

### Task 9: Admin festival preview, docs, and full gates

**Files:**
- Create: `src/features/admin/FestivalPreview.tsx`, `src/features/admin/FestivalPreview.test.tsx`
- Modify: `src/features/admin/AdminPage.tsx` (render it for `isAdmin`, in the header area), `docs/decisions.md` (#41 Festival events), `docs/ROADMAP.md` (festival section; tick the outreach idea), `CLAUDE.md` (a note that the owner edits festival dates in the `festivals` table, and that new festivals are new rows)

**Interfaces:**
- Consumes: `setFestivalPreview`, `useFestivals`, `festivalsKey`.
- Produces: `FestivalPreview()`, English only:
  - a `<select aria-label="Festival preview">` with the option "None" and each festival id. The ids are fetched with `supabase.from('festivals').select('id, kind, starts_on, ends_on').order('starts_on')`;
  - a "Reset my preview progress" checkbox;
  - an "Apply" button that calls `setFestivalPreview(id|null, reset)`, then invalidates `festivalsKey`, `['missions', uid]` and `ownedItemsKey`;
  - a line explaining that the reset removes *your own* festival missions and festival items for that festival and sets your tokens to 50.

- [ ] **Step 1: Write the failing test.** Selecting `cny_2027`, ticking reset and pressing Apply calls `setFestivalPreview('cny_2027', true)`. "None" calls it with `(null, false)`.
- [ ] **Step 2: Run and see it fail. Step 3: Implement. Step 4: Run and see it pass.**
- [ ] **Step 5: Write the docs.**
- [ ] **Step 6: Full gates:**
  - `npm test`: all pass;
  - `npm run test:rls -- festivals shop missions harvest`: all pass;
  - `npm run build`: passes;
  - Supabase advisors: 0 errors;
  - e2e: `npx playwright test --project=online tests/e2e/world.spec.ts tests/e2e/harvest.spec.ts`: pass (to check nothing regressed in the HUD stack).
- [ ] **Step 7: Commit** `feat(festivals): admin preview; docs`

## Plan rulings (made while planning)

- **The preview lives in its own `festival_previews` table**, not in `user_settings.festival_preview`. Players already have a table-wide `update` grant on `user_settings`; a separate table with no client access closes that gap without changing column grants. If this is wrong, it only costs one extra table.
- **`claim_mission` now refuses missions that are no longer current**, for all missions. Before, a stale daily mission could be claimed through the API after its day ended. If this is wrong, a stale API claim gets refused, and the panel never offers one anyway.
- **No end-to-end test for the festival**: it needs the admin login in Playwright. The live tests cover the server, and unit tests cover the interface.
