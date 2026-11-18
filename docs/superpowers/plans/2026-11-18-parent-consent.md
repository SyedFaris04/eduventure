# Parent Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Under-18 players get a parent link to share; a parent approves on their own phone, sets a daily limit and reads a weekly report; play time is counted and enforced; a break reminder appears every 40 minutes.

**Architecture:** New tables `guardian_codes`, `guardianships`, `play_minutes`, written only by functions; a BEFORE INSERT trigger on encounters, boss runs and lesson attempts enforces the limit. Child UI on Home and in the world; a parent page `/parent` outside the onboarding guard.

**Tech Stack:** Supabase Postgres, React 19 + TanStack Query, react-router, i18next, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-parent-consent-design.md`

## Global Constraints

- Needs a parent: `age_band_for(birth_year) in ('under13','teen')`. Code: 8 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, shown as `XXXX-XXXX`, valid 7 days, one per child (asking again replaces it).
- Approver: signed in, not anonymous (`auth.jwt() ->> 'is_anonymous'` not true), `age_band_for(birth_year) = 'adult'`, ticked confirmation, not the child. One guardian per child.
- Daily limit: null, 30, 60, 90 or 120 minutes. `note_play()` counts at most one minute per 50 s per player (player's local day).
- Starting a battle, boss run or lesson when `minutes_today >= limit` → `Time's up for today` (P0001). Resuming an existing one is allowed.
- Break reminder every 40 minutes of continuous visible play (client only).
- Never sign a guest out. Seven locales. Migration pushed only after the owner's approval.

## Review Focus

- A parent opening the link on the child's own phone (guest session) → message to use their own phone, no sign-out → Task 3 test.
- Parent signs up (email confirmation) and comes back later: the code survives the round trip (kept in localStorage) → Task 3 test of the `pendingParentCode` helper.
- Expired or mistyped code → clear message, nothing linked → Task 1 test.
- Child already approved by someone else → second parent refused → Task 1 test.
- The limit trigger blocks new battles but never an in-progress answer → Task 1 test shows `answer_question` unaffected (no insert) while `start_encounter` refuses — exercised with the pure `play_left()` and by checking the trigger exists on all three tables via a failing insert path is not reachable live; covered by the pure function test plus code review.

---

### Task 1: Server

**Files:** Create `supabase/migrations/20261118090000_parent_consent.sql`, `tests/rls/parents.test.ts`

**Interfaces (SQL, `public.`):**
- `guardian_codes(child_id uuid pk, code text unique, expires_at timestamptz)`, `guardianships(child_id uuid pk, guardian_id uuid, approved_at timestamptz, daily_limit int null check in (30,60,90,120))`, `play_minutes(user_id uuid, day date, minutes int, last_ping timestamptz, pk(user_id, day))` — RLS on, no client grants (functions only).
- `needs_guardian(p_user uuid) returns boolean` (internal).
- `request_guardian_code() returns jsonb {code, expires_at}` — errors `Only players under 18 need a parent`, `A parent has already approved this account`.
- `my_guardian() returns jsonb {status: 'not_needed'|'none'|'pending'|'approved', code, expires_at, daily_limit, minutes_today, minutes_left}`.
- `approve_child(p_code text, p_confirm boolean) returns jsonb {child_name}` — errors `Sign in with a parent account`, `Parents must be 18 or older`, `Please confirm you are the parent or guardian`, `That code is not valid or has expired`, `You cannot approve your own account`, `This child already has a parent`. Code matched case-insensitively with or without the dash; deleted on approval; audit log `approve_child`.
- `my_children() returns jsonb [{child_id, name, approved_at, daily_limit}]`; `set_child_limit(p_child uuid, p_minutes int) returns void`; `remove_child(p_child uuid) returns void` — guardian only (`Not your child`).
- `child_report(p_child uuid) returns jsonb {week: [{day, minutes, played}] (Mon–Sun), questions, correct, lessons, strong: [topic], practise: [topic], streak}` — guardian only.
- `play_left(p_minutes int, p_limit int) returns int` (immutable; null when no limit) — granted.
- `note_play() returns jsonb {minutes_today, daily_limit, minutes_left}`.
- Trigger `check_play_limit()` BEFORE INSERT on `encounters`, `boss_runs`, `lesson_attempts`.

- [ ] **Step 1: Failing tests** (`parents.test.ts`; guests: an adult (2000) and a child (2014); the parent is the admin account from `.env.test.local`, skipped if absent):
  - `play_left(10, null)` null; `play_left(29, 30)` 1; `play_left(31, 30)` 0.
  - adult guest: `my_guardian` status `not_needed`; `request_guardian_code` → /only players under 18/.
  - child: status `none`; request → code matches `^[A-Z2-9]{4}-[A-Z2-9]{4}$`, status `pending`; request again → different code, old one no longer approves.
  - child approving own code → /parent account/ (anonymous).
  - adult guest approving → /parent account/.
  - parent: bad code → /not valid/; without confirm → /confirm/; lower-case code without dash + confirm → `{child_name}`; child status `approved`; `my_children` contains the child; requesting a code now → /already approved/.
  - `set_child_limit(child, 45)` → error; `(child, 30)` ok → child `my_guardian` daily_limit 30, minutes_left 30; child `note_play` twice quickly → minutes_today 1.
  - `child_report(child)` as parent → `week` has 7 entries, `questions` ≥ 0; as the child → /not your child/.
  - `remove_child` → child status `none`; `my_children` without the child.
- [ ] **Step 2: Run** `npx vitest run --config vitest.rls.config.ts tests/rls/parents.test.ts` — FAIL.
- [ ] **Step 3: Migration.** **Step 4: Push** (approved), advisors 0 errors, file + `npm run test:rls` PASS. **Step 5: Commit** `feat(parents): parent approval, limits, report and play time`.

### Task 2: Child side

**Files:** Create `src/features/parents/useGuardian.ts`, `src/features/parents/AskParentCard.tsx` (+ test), `src/features/parents/usePlayClock.ts`, `src/features/parents/BreakReminder.tsx` (+ test); modify `HomePage.tsx`, `WorldPage.tsx`, `AcademyPages.tsx` (lesson page mounts the clock), `battleApi.ts` (`/time's up/` → `parents.timeUp`), lesson start error mapping, locales.

**Interfaces:** `useGuardian(uid)` (key `['guardian', uid]`, rpc `my_guardian`); `requestGuardianCode()`; `parentLink(code: string, origin = location.origin): string` → `${origin}/parent?code=${code}`; `whatsappLink(text: string)` → `https://wa.me/?text=…`; `usePlayClock(active: boolean)` pings `note_play` every 60 s while `active && document.visibilityState === 'visible'`, and returns `{ minutesLeft }`; `BreakReminder({ minutes })` shows the card when continuous minutes ≥ 40 and every 40 after "Keep playing".

- [ ] **Step 1: Failing tests:** AskParentCard: status `none` → "Ask my parent" button calls request; `pending` → shows code, a WhatsApp link whose `href` contains the encoded parent link, and "Copy"; `approved` with a limit → "Minutes left today: 25"; `not_needed` → renders nothing. BreakReminder: at 39 minutes nothing; at 40 the card; "Keep playing" hides it until 80. `parentLink('ABCD-EF23', 'http://x')` = `http://x/parent?code=ABCD-EF23`.
- [ ] **Step 2–4:** FAIL → implement → `npm test`, `tsc` PASS. **Step 5: Commit** `feat(parents): ask my parent, play clock and break reminder`.

### Task 3: Parent page

**Files:** Create `src/features/parents/ParentPage.tsx` (+ `ParentView` test), `src/features/parents/pendingCode.ts` (+ test); modify `App.tsx` (`/parent`, not behind `RequireProgress`), `LoginPage.tsx` and `SignupPage.tsx` (after success go to `/parent` when a pending code exists), locales.

**Interfaces:** `savePendingCode(code)`, `takePendingCode(): string | null`, `peekPendingCode()` (localStorage key `eduventure.parentCode`, try/catch); `ParentView({ session: 'none'|'guest'|'parent', code, children, reports, onApprove, onSetLimit, onRemove })`.

- [ ] **Step 1: Failing tests:** `none` → links to log in and to create a parent account; `guest` → "Please open this link on your own phone" and no sign-out button; `parent` with a code → Approve disabled until the tick box is ticked, then calls `onApprove(code)`; a child row shows its report numbers and a limit select whose change calls `onSetLimit(id, 60)`; Remove calls `onRemove(id)`. Pending code survives save → peek → take → second take is null.
- [ ] **Step 2–4:** FAIL → implement → `npm test`, `tsc` PASS. **Step 5: Commit** `feat(parents): parent page`.

### Task 4: End-to-end, docs, gates, merge

- [ ] `tests/e2e/parents.spec.ts`: a new under-13 player sees "Ask my parent" on Home, taps it, sees a code; opening `/parent?code=…` in the same (guest) browser shows the "own phone" message. Add to `playwright.config.ts`.
- [ ] ROADMAP entry and decision #31; gates (`npm test`, build, `test:rls`, `test:e2e` with cool-down re-runs, advisors); merge `--no-ff`, push, delete branch.
