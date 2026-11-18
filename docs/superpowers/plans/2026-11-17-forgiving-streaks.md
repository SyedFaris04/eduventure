# Forgiving Streaks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Earned streak shields, a gentler streak display with week dots, and a count/week view setting.

**Architecture:** A pure SQL `streak_from_days()` computes everything from `learning_days`; `my_streak()` wraps it and adds week dots, month days and the view. The missions panel renders it.

**Tech Stack:** Supabase Postgres, React 19 + TanStack Query, i18next, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-forgiving-streaks-design.md`

## Global Constraints

- Shield every 7 played days (lifetime), max 2; a missed past day uses the ISO week's rest day first, then a shield, else the streak restarts; today never counts as missed; rest/shield days keep the streak but don't add to it.
- View default: `week` for under-13 (`age_band_for(birth_year) = 'under13'`), else `count`; `user_settings.streak_view` overrides.
- Seven locales; migration pushed only after the owner's approval for this project.

## Review Focus

- A player whose very first day is today: current 1 (if played), shields 0, no crash on a one-element array → Task 1 case.
- A long gap (months away): streak restarts, shields can't cover more than they hold, best is kept → Task 1 case.
- Two missed days in the same week with 1 shield: rest covers one, shield the other, streak survives → Task 1 case.
- Under-13 with no saved view sees week dots, no number → Task 2 test.
- Broken streak never renders "0-day" text → Task 2 test.

---

### Task 1: Server — `streak_from_days`, richer `my_streak`, `streak_view`

**Files:** Create `supabase/migrations/20261117130000_forgiving_streaks.sql`, `tests/rls/streaks.test.ts`

**Interfaces:** `streak_from_days(p_days date[], p_today date) returns jsonb` `{current, best, shields, rest_available, today_done}` (immutable, granted to authenticated). `my_streak()` returns those plus `week: boolean[7]`, `month_days: int`, `view: 'count'|'week'`. `user_settings.streak_view text null check in ('count','week')`.

- [ ] **Step 1: Failing tests** (`streaks.test.ts`, one guest) — with today = Wed 2026-11-18 (`d(n)` = today − n days):
  - `[]` → current 0, best 0, shields 0, rest_available true, today_done false.
  - `[today]` → current 1, today_done true.
  - 7 days in a row ending yesterday → current 7, shields 1, best 7.
  - 14 in a row ending today → current 14, shields 2; 21 in a row → shields still 2.
  - Days d(9)..d(3) played (7, earns a shield), d(2) and d(1) missed (both in this ISO week, Mon d(2), Tue d(1)): rest covers d(2), shield covers d(1) → current 7, shields 0, rest_available false.
  - Same but no shield earned (only d(5)..d(3) played) → current 0 (restarted), best 3.
  - Long gap: 10 days played 60 days ago, then today → current 1, best 10.
  - Live `my_streak` for the guest (birth year 2000): `view` = 'count', `week` has 7 entries, `month_days` ≥ 0; after `update user_settings set streak_view='week'` → `view` = 'week'.
- [ ] **Step 2: Run** `npx vitest run --config vitest.rls.config.ts tests/rls/streaks.test.ts` — FAIL.
- [ ] **Step 3: Migration** per the interfaces (`my_streak` redefined; same grants).
- [ ] **Step 4: STOP for push approval;** push; advisors 0 errors; run the file and `npm run test:rls` — PASS.
- [ ] **Step 5: Commit** `feat(streaks): earned shields, week dots and a view setting`.

### Task 2: Missions panel

**Files:** Create `src/features/missions/StreakBox.tsx`, `src/features/missions/StreakBox.test.tsx`; modify `src/features/missions/MissionsPanel.tsx`, locales.

**Interfaces:** `StreakBox({ streak, onToggleView }: { streak: Streak; onToggleView: () => void })`, `type Streak = { current; best; shields; rest_available; today_done; week: boolean[]; month_days; view }`.

- [ ] **Step 1: Failing tests:** count view shows "12-day streak", "2 shields", "rest day ready", 7 dots (role img, labelled "Played on 4 of 7 days this week"); week view hides the number; current 0 with month_days 14 shows "You learned on 14 days this month — start a new streak today!" and no "0-day"; current 0 and month_days 0 shows "Answer a question today to start a streak"; toggle button calls `onToggleView`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**; toggle saves `user_settings.streak_view` then refetches `['streak', uid]`. **Step 4:** `npm test`, `npx tsc --noEmit` — PASS. **Step 5: Commit** `feat(streaks): gentler streak box`.

### Task 3: Docs, gates, merge

- [ ] ROADMAP entry, decision #30; `npm test`, `npm run build`, `npm run test:rls`, `npm run test:e2e` (re-run sign-in-limited tests after a cool-down); merge `--no-ff`, push, delete branch.
