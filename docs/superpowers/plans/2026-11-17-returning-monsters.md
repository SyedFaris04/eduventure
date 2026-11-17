# Returning Monsters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Topics come back as glowing Returning monsters on their island when the player's memory timer for them runs out; beating one pays a comeback bonus and counts for a daily mission; every wrong answer shows a clear "Why not?" card.

**Architecture:** `topic_mastery` gains a timer driven by a pure SQL `next_review()`; `my_returning()` counts due topics per island; encounters get a `returning` flag that `pick_question` and `answer_question` honour. The client sim spawns that many flagged monsters per place, and the battle panel starts Returning battles.

**Tech Stack:** Supabase Postgres, React 19 + TanStack Query, zustand, three.js/R3F, i18next, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-returning-monsters-design.md`

## Global Constraints

- Timer: right & due (or first sighting) → strength ×2 (first right answer = 2 days), max 60 days, `due_at = now + strength days`; right & not due → unchanged; wrong → strength 1, `due_at = now + 2 minutes`. Backfill: strength 1, `due_at = last_seen + 1 day`.
- Returning count per island = due topics that still have an eligible question for the player, capped at 3; subjects on no island belong to `greenhaven`.
- Comeback bonus +20 XP +10 gold on winning a Returning battle. Mission `d_returning_3` (daily, kind `defeat_returning`, target min(3, due count), 30 XP, 15 gold), only given when something is due.
- No penalties for overdue topics; client never decides due-ness or pays.
- Seven locales get every new key; migrations pushed only after the owner's approval for this project.

## Review Focus

- A player with **no academic profile subjects or a level with few questions**: `my_returning` must count only topics with an eligible question, else a Returning monster would start a battle that can't ask anything → Task 1 test `due topic without an eligible question is not counted` (covered by the eligibility join; asserted via a topic from another level is impossible to arrange live — so assert `my_returning` count ≤ number of distinct due topics and that `start_encounter(..., true)` on a counted island always returns a question).
- **Returning battle runs out of due topics mid-fight** → must fall back to normal island questions, not error → Task 1 test continues answering after the due topic is cleared until the monster is beaten.
- **Two tabs / double start**: `start_encounter` already returns the active encounter; a Returning request while a normal battle is active returns that battle unchanged → Task 1 test.
- **Beaten Returning monster must not respawn** in the same visit even though normal ones do → Task 2 sim test.
- **Boss wrong answers** also show the "Why not?" card → Task 3 test renders the card through `QuestionCard`, which both panels use.

---

### Task 1: Server — timer, due counts, Returning battles, bonus and mission

**Files:**
- Create: `supabase/migrations/20261117120000_returning_monsters.sql`, `tests/rls/returning.test.ts`

**Interfaces (SQL, `public.`):**
- `topic_mastery` + `strength_days numeric(6,2) not null default 1`, `due_at timestamptz not null default now() + interval '1 day'` (backfill as above).
- `next_review(p_strength numeric, p_due timestamptz, p_correct boolean, p_now timestamptz) returns jsonb` — immutable, `{strength, due_at}`; `p_due` null = first sighting. Granted to authenticated (pure).
- `record_mastery(...)` same signature, now sets strength/due via `next_review`.
- `topic_island(p_subject text) returns text` (island id or `greenhaven`); internal.
- `my_returning() returns jsonb` — `[{island_id, count}]` for islands with count > 0, count capped at 3, only due topics with ≥1 eligible question (published, or draft when `allow_draft_questions`; matching the player's `level_id`).
- `drop function pick_question(uuid, text)`; `create pick_question(p_user uuid, p_monster text default null, p_returning boolean default null) returns text` — when returning (explicit, or the active encounter's flag), pass 0 picks among the island's due topics (random), then the existing passes.
- `encounters.returning boolean not null default false`; `encounter_state` adds `returning`.
- `drop function start_encounter(text)`; `create start_encounter(p_monster text, p_returning boolean default false) returns jsonb` — an active encounter is returned unchanged; returning with nothing due on the monster's island → `Nothing is due on this island` (P0001).
- `answer_question` (redefine from `20261116090100_unlocks.sql`, same shape) adds `'returning_bonus'`: `{xp:20, gold:10}` when a returning encounter is won (added to totals, xp_earned, gold_earned), else null; on that win also `bump_missions(user,'defeat_returning',null)` merged into `missions_completed`.
- `mission_templates.kind` check gains `defeat_returning`; row `('d_returning_3','daily','defeat_returning',3,30,15)`; `ensure_missions` gives it only when the due count (all islands, uncapped) > 0, with target `least(3, due)`.

- [ ] **Step 1: Write the failing tests** (`tests/rls/returning.test.ts`, two guest players as in `pet.test.ts`):
  - `next_review schedule`: `(1, null, true, t)` → strength 2, due t+2d; `(2, t-1h, true, t)` → 4, t+4d; `(32, t-1h, true, t)` → 60, t+60d; `(4, t+1d, true, t)` → 4, due t+1d unchanged; `(8, t-1h, false, t)` → 1, t+2min.
  - `fresh player has nothing returning`: `my_returning` → `[]`; `start_encounter('hornbill', true)` → /nothing is due/; no `d_returning_3` in `my_missions`.
  - `a mistake comes back` (timeout 420 s): on `hornbill` answer one wrong (note its topic), flee; `topic_mastery` row for it has strength 1 and due within 3 min; wait 125 s; `my_returning` contains `{island_id:'science_island', count:1}`; `my_missions` has `d_returning_3` with target 1; a normal battle already active is returned unchanged by `start_encounter('hornbill', true)` (start normal first, then call with true → same `encounter_id`, `returning:false`; flee). Then `start_encounter('hornbill', true)` → `returning: true` and the first question's topic equals the noted topic; answer right until won (falls back to island questions after the due topic clears) → final result `returning_bonus` `{xp:20, gold:10}` and `missions_completed` contains `d_returning_3`; `my_returning` → `[]`.
- [ ] **Step 2: Run** `npx vitest run --config vitest.rls.config.ts tests/rls/returning.test.ts` — Expected: FAIL (`next_review` missing).
- [ ] **Step 3: Write the migration** per the interfaces; re-grant execute on the recreated `start_encounter` to authenticated and revoke internals.
- [ ] **Step 4: STOP for the owner's push approval**, then `npx supabase db push --remote --yes`; `npx supabase db advisors --remote` → 0 errors.
- [ ] **Step 5: Run** the test file, then `npm run test:rls` → all pass.
- [ ] **Step 6: Commit** `feat(review): memory timer, Returning battles, comeback bonus and mission`.

### Task 2: World — spawn and mark Returning monsters

**Files:**
- Modify: `src/game/sim.ts`, `src/game/sim.test.ts`, `src/game/store.ts` (`battle` gains `returning: boolean`), `src/world3d/World3D.tsx` (prop `returning?: number`, pass to the sim, put `returning` into `battle`), `src/world3d/Actors.tsx` (marker), `src/world3d/monsters/buildMonster.ts` (`buildReturningMarker(): Group`), `src/world3d/monsters/monsters.test.ts`

**Interfaces:**
- `SimMonster.returning?: boolean`; `WorldSim` opts gain `returning?: number` → spawns `min(3, n)` extra monsters with ids `returning-<i>`, kinds cycling through the map's `monsterCounts` kinds, `returning: true`; when beaten they never respawn.
- Interaction prompt for monsters gains `returning: boolean`.
- `buildReturningMarker()` — golden glowing ring (`*#ffd54f`) on the ground plus a floating star above (~1.1 units), < 10 meshes.

- [ ] **Step 1: Failing tests:** sim with `returning: 2` has exactly 2 monsters with `returning`, of the map's kinds; after `defeat(id)` of one and advancing past `RESPAWN_MS`, it stays dead while a beaten normal monster respawns; `returning: 0` adds none; the prompt for a nearby returning monster has `returning: true`. `buildReturningMarker` has > 1 and < 10 meshes and at least one emissive material.
- [ ] **Step 2: Run** `npx vitest run src/game src/world3d` — FAIL.
- [ ] **Step 3: Implement**; `MonsterActor` adds the marker (marker bobs unless reduced motion).
- [ ] **Step 4: Run** — PASS. **Step 5: Commit** `feat(review): Returning monsters in the world`.

### Task 3: Battle, jetty, "Why not?" card, strings

**Files:**
- Create: `src/features/review/useReturning.ts`, `src/features/battle/WhyNot.tsx`, `src/features/battle/WhyNot.test.tsx`
- Modify: `src/features/battle/battleApi.ts` (`startEncounter(monster, returning = false)`, types gain `returning`, `returning_bonus`), `src/features/battle/BattlePanel.tsx` (badge, bonus line, invalidate `['returning', uid]` and missions when the battle ends), `src/features/battle/QuestionCard.tsx` (wrong result renders `<WhyNot>` instead of the two plain lines), `src/features/world/GameCanvas.tsx` + `WorldPage.tsx` (pass the current place's count to `World3D`), `src/features/world/JettyPanel.tsx` (+ test: badge), `src/i18n/locales/*.json`

**Interfaces:**
- `useReturning(uid) → UseQueryResult<Record<string, number>>` (key `['returning', uid]`, rpc `my_returning`, mapped `{island_id: count}`).
- `WhyNot({ reason, explanation }: { reason?: string | null; explanation: string })`.
- Strings: `review.badge` "Returning", `review.bonus` "Comeback bonus: +{{xp}} XP, +{{gold}} gold", `review.jetty` "✨ {{n}} returning", `review.whyNot` "Why not?", `review.comesBack` "This topic will come back soon as a Returning monster.", `missions.d_returning_3` "Defeat {{target}} Returning monsters" (check how mission titles get the target; use the existing interpolation).

- [ ] **Step 1: Failing tests:** `WhyNot` shows the heading "Why not?", the reason when given, the explanation and the come-back line; with no reason only the explanation + line. `QuestionCard` with a wrong result renders "Why not?"; with a right result it does not. `JettyPanel` shows "✨ 2 returning" next to Science Island when the hook returns `{science_island: 2}` (mock the hook like existing JettyPanel tests mock state).
- [ ] **Step 2: Run** `npx vitest run src/features` — FAIL.
- [ ] **Step 3: Implement** and add all locale keys.
- [ ] **Step 4: Run** `npm test` and `npx tsc --noEmit` — PASS. **Step 5: Commit** `feat(review): Why not? card, Returning badge, bonus and jetty counts`.

### Task 4: End-to-end, docs, gates, merge

**Files:** `tests/e2e/world.spec.ts` (extend: after a wrong answer the "Why not?" card is visible), `docs/ROADMAP.md`, `docs/decisions.md` (#29)

- [ ] **Step 1:** Extend the world e2e; run it — PASS.
- [ ] **Step 2:** Docs: roadmap section; decision #29 (memory timer rules, wrong → 2 minutes, no penalties).
- [ ] **Step 3:** Gates: `npm test`, `npm run build`, `npm run test:rls`, `npm run test:e2e` (re-run sign-in-limited tests after a cool-down), advisors 0 errors.
- [ ] **Step 4:** Commit, merge `--no-ff` to main, push, delete the branch.
