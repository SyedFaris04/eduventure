# Phase 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A player opens Eduventure, sees the live loading screen built on the owner's artwork, lands on the welcome page, starts as a guest or with an account, picks their education level and curriculum, creates a character, and reaches a Home screen, all saved in Supabase.

**Architecture:** React 19 single-page app (Vite 8, TypeScript 7) with React Router. Supabase holds every row; Row Level Security makes progression tables read-only to players. A boot runner drives the loading bar from real startup tasks. Three.js is used only for the welcome hero and is loaded on demand.

**Tech Stack:** React, React Router, Tailwind CSS v4 (`@tailwindcss/vite`), `motion` (Framer Motion's current package name), TanStack Query, Zustand, Zod, React Hook Form, i18next, Lucide, three + @react-three/fiber + @react-three/drei, @fontsource (Fredoka, Nunito), Supabase JS + Supabase CLI via `npx supabase`, Vitest + Testing Library, Playwright.

**Spec:** `docs/ROADMAP.md` (sections "Design calls I made", "Phase 1 in detail", "Standing rules"). Rules: `CLAUDE.md`.

## Global Constraints

- Node 22+. Install each dependency in the task that first uses it; check current docs for its setup at install time.
- Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` reach the browser. Any test needing more uses `.env.test.local` (gitignored by `.env.*.local`).
- Colour tokens (Tailwind `@theme` in `src/styles/index.css`): `grass #8BC34A`, `grass-dark #5E8C31`, `path #F2B872`, `path-dark #D9894A`, `cream #FFF6E3`, `water #9ED8F0`, `water-dark #4FA3C7`, `wood #8A5A3B`, `wood-dark #5C3A24`, `ink #3B2A1E`, `gold #F7C843`, `danger #E2574C`. Text on cream uses `ink` (contrast ≥ 4.5:1).
- Fonts: Fredoka (display), Nunito (body), self-hosted via @fontsource. Arabic, Chinese and Japanese fall back to system fonts.
- Languages: `en ms es ar zh fr ja`. English is the source; other files carry `"_status": "unreviewed"`. Arabic sets `<html dir="rtl">`.
- Age bands, computed the same way in TypeScript and SQL, using the youngest possible age for a birth year: `age = currentYear - birthYear - 1`; `under13` if age < 13, `teen` if age < 18, else `adult`. Guests start as `unknown` until they give a birth year.
- Every interactive element is reachable by keyboard and has an accessible name. `prefers-reduced-motion: reduce` disables all decorative motion.
- No horizontal scroll at 320 px width.
- Commit after each task (`git add` the task's files; message `feat(phase1): <task>`), ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Supabase unreachable or not configured at boot** → loading still completes (the session task resolves as "offline"), the welcome page shows "Can't reach the server" on account actions instead of hanging. Test in Task 3 and Task 9.
2. **Anonymous sign-ins disabled in the Supabase dashboard** → "Start Your Adventure" shows an error naming the setting. Test in Task 6.
3. **Phone portrait at 320 px** → loading panel, welcome buttons and creator fit with no horizontal scroll. Test in Task 9.
4. **Leaving onboarding halfway, then reloading any deep URL** → the route guard sends the player to the first unfinished step. Test in Task 9.
5. **An under-13 account sending a free-text character name straight to the API** → the database rejects it. Test in Task 5.

---

## File map

```
src/
  app/        App.tsx (router), providers.tsx, guards.tsx, boot.ts
  components/ui/  Button, Panel, Card, ProgressBar, Modal, Field (+ index.ts)
  features/
    loading/        LoadingScreen.tsx, hotspots.ts, sound.ts, Leaves.tsx
    landing/        WelcomePage.tsx, HeroScene.tsx (lazy), ExplorePage.tsx, regions.ts
    authentication/ ageBand.ts, schemas.ts, LoginPage.tsx, SignupPage.tsx, ResetPasswordPage.tsx, UpdatePasswordPage.tsx, useSession.ts
    onboarding/     OnboardingPage.tsx, schema.ts, useReferenceData.ts
    character/      appearance.ts, renderCharacterSvg.ts, safeName.ts, CharacterCreatorPage.tsx
    home/           HomePage.tsx
    styleguide/     StyleguidePage.tsx
  i18n/       index.ts, locales/{en,ms,es,ar,zh,fr,ja}.json
  services/   supabase.ts (exists)
  styles/     index.css
supabase/
  migrations/0001_foundation.sql
  seed.sql
tests/
  rls/rls.test.ts
  e2e/first-run.spec.ts
docs/decisions.md
```

---

### Task 1: Design system, router and test setup

**Files:** Create `src/styles/index.css`, `src/components/ui/*`, `src/app/App.tsx`, `src/app/providers.tsx`, `src/features/styleguide/StyleguidePage.tsx`, `docs/decisions.md`, `vitest.config.ts` (or `test` block in `vite.config.ts`), `src/components/ui/ui.test.tsx`. Modify `src/main.tsx`, `vite.config.ts`, `package.json`. Delete the Phase 0 `src/App.tsx`.

**Interfaces:**
- Produces: `<Button variant="primary|secondary|ghost" size="md|lg">`, `<Panel>` (wood-framed parchment box), `<Card selected?: boolean onSelect?>`, `<ProgressBar value: number /* 0..1 */ label: string>`, `<Modal open onClose title>`, `<Field label error?>` wrapping an input. All exported from `src/components/ui/index.ts`.
- Produces: `<Providers>` (QueryClientProvider; i18n added in Task 2). Routes `/styleguide` and a `*` not-found.

- [ ] **Step 1:** Install `tailwindcss @tailwindcss/vite react-router @tanstack/react-query zustand lucide-react motion @fontsource/fredoka @fontsource/nunito`, dev `vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`. Add scripts `"test": "vitest run"`.
- [ ] **Step 2: Failing tests** in `ui.test.tsx`:
  - `ProgressBar` renders `role="progressbar"` with `aria-valuenow="78"` for `value={0.78}` and clamps `1.4` to `100`.
  - `Card` with `onSelect` is a button with `aria-pressed` reflecting `selected`.
- [ ] **Step 3:** Run `npm test` — expect failures (components missing).
- [ ] **Step 4:** Implement tokens, fonts and components. Style: chunky rounded wood/parchment look matching the loading art (thick `wood-dark` outline, inner highlight, soft drop shadow), not flat dashboard cards. `StyleguidePage` shows every component and colour.
- [ ] **Step 5:** Write `docs/decisions.md` with one short entry per "Design call" in the roadmap.
- [ ] **Step 6:** `npm test` passes; `npm run build` passes; `/styleguide` looks right at 1280 px and 360 px.
- [ ] **Step 7:** Commit.

### Task 2: Languages and right-to-left

**Files:** Create `src/i18n/index.ts`, `src/i18n/locales/*.json`, `src/i18n/i18n.test.ts`. Modify `src/app/providers.tsx`.

**Interfaces:**
- Produces: `initI18n(): Promise<void>` (loads only the active language file, lazily via `import()`), `setLanguage(lang: Lang): Promise<void>` which also sets `document.documentElement.lang` and `dir`, `type Lang = 'en'|'ms'|'es'|'ar'|'zh'|'fr'|'ja'`, `LANGUAGES: { code: Lang; nativeName: string }[]`. Detected order: saved choice (localStorage, wrapped in try/catch) → browser → `en`.
- Key groups used by later tasks: `common.*`, `loading.tips[]` (≥ 8), `loading.facts[]` (≥ 12, each true and checkable), `welcome.*`, `auth.*`, `onboarding.*`, `levels.<levelId>.{name,description}`, `character.*`, `home.*`, `regions.<regionId>.{name,blurb}`.

- [ ] **Step 1:** Install `i18next react-i18next`.
- [ ] **Step 2: Failing tests:** `setLanguage('ar')` → `document.documentElement.dir === 'rtl'`; `setLanguage('ms')` → `dir === 'ltr'`, `lang === 'ms'`; every locale file has exactly the key set of `en.json` (deep key comparison).
- [ ] **Step 3:** Run, expect fail. **Step 4:** Implement; write all seven files (non-English marked unreviewed). **Step 5:** Tests pass. **Step 6:** Commit.

### Task 3: Boot runner and loading screen

**Files:** Create `src/app/boot.ts`, `src/app/boot.test.ts`, `src/features/loading/*`. Add `public/assets/loading/eduventure-loading.webp`.

**Interfaces:**
- Produces: `type BootTask = { id: string; weight: number; run: () => Promise<unknown> }`; `runBootTasks(tasks: BootTask[], onProgress: (fraction: number) => void): Promise<{ failed: string[] }>`. Progress = sum of weights of settled tasks ÷ total weight. A task that rejects counts as settled and its id goes in `failed`; boot never hangs on one task. `onProgress(1)` is called only after every task has settled.
- Produces: `<LoadingScreen onDone={() => void}>`. Boot tasks: `fonts` (`document.fonts.load` for both families), `i18n` (`initI18n`), `art` (decode the loading image), `session` (`supabase.auth.getSession()`, resolves `"offline"` when not configured or on error), `welcome-chunk` (`import()` of the welcome page).
- Produces: `hotspots.ts` — art is 1672 × 941. Starting regions in art pixels, tune by eye with `?debug=hotspots` drawing outlines:

  | id | x | y | w | h |
  |---|---|---|---|---|
  | boy | 420 | 290 | 300 | 420 |
  | girl | 740 | 400 | 230 | 320 |
  | cat | 230 | 460 | 240 | 230 |
  | slime | 360 | 700 | 140 | 95 |
  | dino | 1020 | 190 | 430 | 500 |
  | paintedBar | 355 | 775 | 830 | 70 |
  | paintedPercent | 1165 | 770 | 120 | 75 |
  | paintedTip | 535 | 855 | 605 | 55 |
  | paintedSound | 30 | 825 | 95 | 95 |

- [ ] **Step 1: Failing tests** in `boot.test.ts`:
  - Two tasks weights 1 and 3, the weight-3 task resolves first → progress calls are `[0.75, 1]`.
  - One task rejects → result `{ failed: ['x'] }` and the last progress call is `1`.
  - With a never-resolving task, progress never reaches `1` (assert after flushing timers).
- [ ] **Step 2:** Run, expect fail. **Step 3:** Implement `runBootTasks`. **Step 4:** Tests pass.
- [ ] **Step 5:** Convert the art once: `npx sharp-cli -i public/assets/loading/eduventure-loading.png -o public/assets/loading/eduventure-loading.webp -f webp -q 82` (one-off tool, not a dependency); use `<picture>` with PNG fallback.
- [ ] **Step 6:** Build `LoadingScreen`:
  - Art sits in a box with `aspect-ratio: 1672/941`; overlays are children positioned in % of that box, so they track the art at any size.
  - **Landscape:** box fits the screen (letterbox in `wood-dark`). Live bar, live percentage, tip strip and sound button sit exactly over their painted versions with opaque backgrounds.
  - **Portrait:** box height = screen height, centred horizontally on x ≈ 640 (the characters), overflow hidden. Bar, percentage and tip move into a bottom panel covering the bottom 20 %, which hides the painted UI.
  - Tips and facts alternate every 5 s with a fade, from `loading.tips` and `loading.facts`.
  - Leaves: 12 absolutely positioned SVG leaves drifting via CSS keyframes, in `Leaves.tsx`.
  - Parallax: pointer moves the art up to ±8 px and leaves ±16 px. Off for touch and reduced motion.
  - Reactions: each character hotspot is a `<button>` (label from i18n, e.g. "Pat the cat"). It holds a copy of the art clipped with an elliptical `clip-path`, animated on click: boy jump, girl bob, cat wiggle, slime squish, dino nod with a slow idle "breathing" (`scaleY` 1 → 1.015, 4 s, origin bottom). No blinking: needs separated art (documented limit).
  - Sound: `sound.ts` exports `playChime(kind: 'tap'|'done')` using a Web Audio oscillator (no audio files) and `soundEnabled` stored in localStorage (try/catch). Default off; first toggle press is the user gesture that unlocks audio.
  - When boot settles: hold at 100 % for 400 ms, fade out 500 ms, call `onDone`. If `failed` includes `session`, pass that on so the welcome page can show the offline notice.
- [ ] **Step 7:** Check by hand at 1440×900, 1024×768, 390×844 and 320×640, plus with reduced motion enabled in browser devtools.
- [ ] **Step 8:** Commit.

### Task 4: Welcome page, Explore the World, 3D hero

**Files:** Create `src/features/landing/*`. Modify `src/app/App.tsx`.

**Interfaces:**
- Produces routes `/welcome`, `/explore`. Button targets: Start Your Adventure → `startGuest()` (Task 6) then the guard (until Task 6 lands, it links to `/onboarding`); Login → `/login`; Create Account → `/signup`; Explore the World → `/explore`.
- Produces `REGIONS: { id: string; phase: number; colour: string }[]` — the 12 regions from the brief, in brief order, `greenhaven` phase 2, the rest phase 9. `/explore` shows them as illustrated cards with "Opens in Phase N" badges.
- Produces `HeroScene` (default export, lazy): floating low-poly island, rotating open book, graduation cap and compass, built from three primitives with toon materials in the palette. Rendered only when WebGL is available, reduced motion is off, and `navigator.hardwareConcurrency > 4` (missing → treat as 4). Otherwise a static CSS illustration (sky gradient, layered SVG hills, clouds).

- [ ] **Step 1:** Install `three @react-three/fiber @react-three/drei` and dev `@types/three`.
- [ ] **Step 2: Failing test** `landing.test.tsx`: welcome page renders four buttons with names Start Your Adventure / Login / Create Account / Explore the World; `REGIONS.length === 12` with unique ids.
- [ ] **Step 3:** Run, expect fail. **Step 4:** Implement. **Step 5:** Tests pass.
- [ ] **Step 6:** `npm run build` and confirm three.js is in a separate chunk (not in the entry chunk listed by Vite).
- [ ] **Step 7:** Commit.

### Task 5: Database foundation

**Files:** Create `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/0001_foundation.sql`, `supabase/seed.sql`, `tests/rls/rls.test.ts`. Add script `"test:rls": "vitest run tests/rls"`.

**Interfaces (tables, all with `created_at`/`updated_at` and an `updated_at` trigger where rows change):**
- Reference (readable by everyone, writable by nobody through the API): `education_levels(id text pk, isced text, sort int)` — the 11 levels, ids `early_childhood, primary, lower_secondary, upper_secondary, pre_university, diploma, undergraduate, postgraduate, doctoral, vocational, lifelong`; `countries(code char(2) pk, name)` — all ISO 3166-1 countries; `curricula(id text pk, country_code char(2) null, name, level_ids text[])` — `international` (null country) for every level, `my_kssr` (primary), `my_kssm` (lower and upper secondary), `my_stpm` and `my_matriculation` (pre-university); `grades(id text pk, curriculum_id, level_id, name, sort)`; `subjects(id text pk, name, level_ids text[])`; `safe_name_parts(part text, kind text check in ('adjective','noun'))`.
- Per player (row id = `auth.uid()`): `profiles(id pk → auth.users, display_name, birth_year int null, age_band text check in ('under13','teen','adult','unknown'), is_guest bool)`; `user_settings(user_id pk, language, sound_on, reduced_motion, low_performance)`; `user_privacy_settings(user_id pk, profile_visibility text default 'private', show_online bool default false)`; `parental_settings(user_id pk, guardian_email, chat_mode text default 'preset')`; `academic_profiles(user_id pk, level_id, country_code, curriculum_id, grade_id null, language, subject_ids text[], goals text[], difficulty smallint check 1..5)`; `characters(id uuid pk, user_id unique, name, appearance jsonb)`; `player_xp(user_id pk, xp bigint default 0, level int default 1)`; `player_wallets(user_id pk, gold bigint default 0 check ≥ 0)`.
- System: `admin_roles(user_id, role)`, `audit_logs(id, actor_id, action, target, data jsonb)` — no API access.
- Functions:
  - `age_band_for(birth_year int) returns text` (rule from Global Constraints).
  - Trigger `on auth.users insert` → creates profile, settings, privacy, xp and wallet rows. Reads `birth_year` and `guardian_email` from `raw_user_meta_data`. Anonymous users get `is_guest = true`, `age_band = 'unknown'`. Under-13 also gets a `parental_settings` row.
  - `set_birth_year(y int)` (security definer) works only while `birth_year is null`, sets `age_band`, and writes an audit row.
  - Trigger on `characters` insert/update: when the owner is `under13` or `unknown`, `name` must be `<adjective> <noun>` from `safe_name_parts`.
- RLS: enabled on every table. Players may select their own rows. Players may insert/update their own `academic_profiles`, `characters`, `user_settings` and `user_privacy_settings` only. `profiles` is select-only except `display_name`; enforce with column grants (`grant update (display_name)`). `player_xp`, `player_wallets` and `parental_settings` are select-only.

- [ ] **Step 1: You:** run `npx supabase login` once (opens the browser). **Me:** `npx supabase init`, then `npx supabase link --project-ref <ref>` (asks for the database password: you type it).
- [ ] **Step 2: Failing tests** in `rls.test.ts`. They use two anonymous sessions (`signInAnonymously`) against the cloud project and skip with a clear message if `.env.local` is missing.
  - A cannot select B's `academic_profiles` row (0 rows).
  - A `update player_wallets set gold = 999` → 0 rows changed, gold still 0.
  - A cannot update own `profiles.age_band`.
  - After `set_birth_year(currentYear - 10)`, A inserting a character named `"Bob123"` errors, and `"Brave Otter"` (if both parts are seeded) succeeds.
  - A second `set_birth_year` call errors.
  - `select age_band_for(2013)` = `under13`, `2012` = `teen`, `2008` = `teen`, `2007` = `adult` (assumes the database clock year 2026; compute expectations from the current year in the test).
- [ ] **Step 3:** Run `npm run test:rls`, expect fail (tables missing).
- [ ] **Step 4:** Write migration and seed; `npx supabase db push`; load the seed (`npx supabase db push --include-seed`, or paste `seed.sql` into the SQL editor if the CLI path differs).
- [ ] **Step 5:** `npm run test:rls` passes. **Step 6:** Commit (migration, seed, test, config; never the DB password).

### Task 6: Accounts

**Files:** Create `src/features/authentication/*` and `ageBand.test.ts`, `schemas.test.ts`. Modify `src/app/App.tsx`.

**Interfaces:**
- Produces `ageBandFromBirthYear(birthYear: number, now?: Date): 'under13'|'teen'|'adult'` (same rule as SQL).
- Produces `useSession(): { session: Session | null; loading: boolean; offline: boolean }` (Zustand store fed by `onAuthStateChange`).
- Produces `startGuest(): Promise<void>` (calls `signInAnonymously`). If the error says anonymous sign-ins are disabled, throw with a message telling the owner to enable them in Authentication → Sign In / Providers.
- Produces `upgradeGuest(email, password): Promise<void>` via `supabase.auth.updateUser` (email verification still applies).
- Routes `/login`, `/signup`, `/reset-password`, `/update-password` (target of the reset email; `redirectTo` = `${location.origin}/update-password`).
- Signup schema (Zod): `birthYear` between currentYear − 100 and currentYear − 3; email; password ≥ 10 chars. Asked in this order: birth year first. If the band is `under13`, the email label becomes "Parent or guardian's email", a consent checkbox is required, and the guardian email is sent as `guardian_email` metadata. `birth_year` is always sent as metadata.
- After signup: "Check your email" screen. Login errors are shown in plain language, including "email not confirmed".

- [ ] **Step 1: Failing tests:** `ageBandFromBirthYear(2013, new Date('2026-06-01')) === 'under13'`, 2012 → `teen`, 2008 → `teen`, 2007 → `adult`; signup schema rejects password `"short"` and birth year `currentYear`; under-13 schema requires `guardianConsent === true`; `startGuest` maps a mocked "Anonymous sign-ins are disabled" error to the dashboard hint.
- [ ] **Step 2:** Run, expect fail. **Step 3:** Install `zod react-hook-form @hookform/resolvers`; implement. **Step 4:** Tests pass.
- [ ] **Step 5:** By hand against your project: sign up, receive the email, confirm, log in, reset password, guest start. Note the Supabase free-tier email limit if mail stops arriving.
- [ ] **Step 6:** Commit.

### Task 7: Academic onboarding

**Files:** Create `src/features/onboarding/*` and `schema.test.ts`.

**Interfaces:**
- Consumes reference tables (Task 5) via `useReferenceData()` (TanStack Query, `staleTime: Infinity`).
- Produces route `/onboarding` (steps: age (guests with `unknown` band only, calls `set_birth_year`) → level (11 `Card`s) → country (searchable list, defaults from `navigator.language` region) → curriculum (filtered by country and level, always includes `international`) → grade (skipped when the curriculum has none) → language → subjects (multi-select, filtered by level) → goals (multi-select from 6 fixed goals in i18n) → difficulty (1–5)). Back/next buttons; progress dots; step state kept in the URL (`?step=`).
- Produces `/settings/academic`: the same form pre-filled, saving with upsert.
- Schema: `level_id`, `country_code`, `curriculum_id`, `language` required; `subject_ids` ≥ 1; `difficulty` 1–5.

- [ ] **Step 1: Failing tests:** schema rejects empty `subject_ids`; accepts a full valid object; the curriculum filter for `country MY` + level `primary` returns `my_kssr` and `international`, and for `country FR` + `primary` returns only `international`.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Pass. **Step 5:** Commit.

### Task 8: Character creator

**Files:** Create `src/features/character/*` and `renderCharacterSvg.test.ts`, `safeName.test.ts`.

**Interfaces:**
- Produces `type Appearance = { body: 'a'|'b'|'c'; skin: string; hairStyle: string; hairColour: string; eyes: string; face: string; top: string; bottom: string; shoes: string; accessory: string; weapon: string; backpack: string }`. Option lists live in `APPEARANCE_OPTIONS` (≥ 4 choices each, ≥ 8 skin tones, ≥ 10 hair styles including a hijab option, ≥ 10 hair colours). Starting weapons: wooden sword, short bow, apprentice staff, quill.
- Produces `renderCharacterSvg(a: Appearance, opts?: { facing?: 'front'|'back'; size?: number }): string`. Chibi style: head about 45 % of height, soft dark-brown outlines, flat colour with one shade. Each part is a `<g id="layer-<part>">` in draw order: backpack, body, bottom, shoes, top, head, face, eyes, hair, accessory, weapon. Phase 2 rasterises this same string into Phaser textures.
- Produces `generateSafeName(rng: () => number): string` from the same word lists seeded into `safe_name_parts` (`src/features/character/nameParts.ts` is the source; `seed.sql` is generated from it by a tiny script, `npm run gen:names`).
- Produces route `/character`: live preview, tabbed option groups, randomise button, name field (free text for `teen`/`adult`: 3–16 chars, letters, digits, spaces, a small blocklist; `under13`/`unknown`: generator with reroll, no text input). Saves to `characters`.

- [ ] **Step 1: Failing tests:** the SVG contains all 11 `layer-*` ids in draw order; changing `hairColour` changes only the hair layer's markup; `generateSafeName(() => 0)` returns `"<first adjective> <first noun>"`; the name schema rejects `"ab"` and `"x".repeat(17)`.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Pass.
- [ ] **Step 5:** By hand: every option visibly changes the preview; the preview stays sharp at 360 px and 1440 px.
- [ ] **Step 6:** Commit.

### Task 9: Guards, Home screen, end-to-end

**Files:** Create `src/app/guards.tsx`, `src/features/home/HomePage.tsx`, `playwright.config.ts`, `tests/e2e/first-run.spec.ts`. Add script `"test:e2e": "playwright test"`.

**Interfaces:**
- Produces `nextRequiredRoute(state: { session: boolean; hasAcademicProfile: boolean; hasCharacter: boolean }): '/welcome'|'/onboarding'|'/character'|null`. `<RequireProgress>` wraps `/onboarding`, `/character`, `/home` and redirects to the result when it is not the current route.
- App flow: `/` shows `LoadingScreen` → `onDone` → `nextRequiredRoute(...) ?? '/home'`.
- Home: character preview, display name, level and XP from `player_xp`, gold from `player_wallets` (read-only), academic summary with "Change" → `/settings/academic`, language picker, sound toggle, sign out, "Save your progress" for guests (`upgradeGuest`). "Enter the World" button disabled with the label "Opens in Phase 2".
- Offline: when `useSession().offline`, account buttons on the welcome page show "Can't reach the server. Check your connection and try again." and a Retry button.

- [ ] **Step 1: Failing unit test** for `nextRequiredRoute`: no session → `/welcome`; session without profile → `/onboarding`; profile without character → `/character`; complete → `null`.
- [ ] **Step 2:** Implement guards and Home; unit test passes.
- [ ] **Step 3:** Install dev `@playwright/test`, then `npx playwright install chromium`. Write `first-run.spec.ts`:
  - Loading reaches the welcome page; the progress bar ends at `aria-valuenow="100"`.
  - Start Your Adventure → age 2000 → choose Upper Secondary, Malaysia, KSSM, a grade, English, Mathematics, a goal, difficulty 3 → character, randomise, name → Home shows the name, level 1, gold 0.
  - Reload `/home` → same data. Open `/character` in a fresh guest session without onboarding → redirected to `/onboarding`.
  - Choosing العربية gives `html[dir=rtl]`.
  - At 320×640: `document.documentElement.scrollWidth <= 320` on loading, welcome, onboarding and character pages.
  - With `VITE_SUPABASE_URL` pointed at an unreachable host (separate Playwright project with that env): loading completes and the welcome page shows the offline notice.
- [ ] **Step 4:** `npm run test:e2e` passes. **Step 5:** Commit.

### Task 10: Phase check and report

- [ ] Run `npm test`, `npm run test:rls`, `npm run test:e2e`, `npm run build`; record the real output.
- [ ] Walk the roadmap's "Phase 1 is done when" list on desktop and on your phone (`npm run dev`, Network URL).
- [ ] Update `docs/ROADMAP.md` (Phase 1 status) and `docs/decisions.md`; report done and not-done to the owner.

---

## Needed from you before Task 5

1. A Supabase project with its URL and publishable key in `C:\dev\eduventure\.env.local` (see `README.md`).
2. In the dashboard: **Authentication → Sign In / Providers → allow anonymous sign-ins** (for guest play and the access-rule tests).
3. Run `npx supabase login` once in a terminal in `C:\dev\eduventure`, and have the database password ready.

Tasks 1–4 do not need any of this, so building can start right away.
