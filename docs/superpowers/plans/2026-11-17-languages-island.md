# Languages Island Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Language Kingdom, a fifth place with language monsters and the Lexicon Dragon, and the Language Hall, where English for Malaysian students and Bahasa Melayu for beginners are taught with Duolingo-style exercises. The server marks every exercise and pays each lesson once.

**Architecture:**
- The Code Academy's lesson engine is extended: new step kinds in the same content files, tables and functions.
- Language courses carry `kind: 'language'`. The Hall pages are the Academy pages filtered by kind.
- Speech uses the browser's `speechSynthesis`, with a voice fallback.
- Language Kingdom reuses the island system: theme, map, code props, monsters and a boss.

**Tech Stack:** React 19, zod, TanStack Query, zustand, three/R3F, Supabase migrations, Vitest, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-17-languages-island-design.md`

## Global Constraints

- **Server marks everything.** Every step kind except `card` (and `learn`/`write` for code courses) is marked by the server. Answers are never readable by the client before answering.
- **Listen is a bonus.** `complete_lesson` requires every marked step except `listen`. It pays **25 XP and 10 gold once per lesson per player**.
- **Typed answers are forgiving.** They are normalised: lower case, trimmed, inner whitespace collapsed, a final `.`, `!` or `?` dropped, and `'` and `"` removed. Server `norm_answer` = client `normAnswer`, and a test checks they agree.
- **Speech:** `speechSynthesis` only, no new dependencies. Voice order: English `en-GB`, then any `en-*`. Malay `ms-MY`, then `ms-*`, then `id-*`, then none (🔊 is hidden and Listen steps are skipped).
- **Phones:** at 360 px, no horizontal scroll; tiles and pairs wrap.
- **Text:** all UI strings are in the 7 locales. Lesson content is English and BM.
- **Database:** every change is a migration with RLS. Lessons start `in_review`.

## Review Focus

1. **A phone with no Malay voice.** Listen steps are skipped, 🔊 is hidden, and the lesson can still be completed and pays. *Test: Task 3, `listen steps are skipped without a voice`.*
2. **Typed answers with harmless slips** ("Selamat pagi." / "SELAMAT  PAGI") are accepted. A wrong word is not. *Test: Task 2, `typed slips are forgiven`.*
3. **Build tiles tapped twice, or removed and re-added.** The answer line shows each tile once, and the order sent is what is shown. *Test: Task 3, `build tiles move between tray and answer`.*
4. **Match pairs answered partly, then submitted.** Check stays disabled until every left card is paired. *Test: Task 3, `match needs every pair`.*
5. **Returning from the Hall.** The hero returns to the Hall door in Language Kingdom, and the Code Academy still shows only coding courses. *Test: Task 4, `academies are separate`.*

---

### Task 1: Language step kinds, content rules and Unit 1 of both courses

**Files:**
- Modify: `src/features/academy/lessonSchema.ts`, `src/features/academy/codeText.ts` (`normAnswer`), `src/features/academy/lessons.test.ts`
- Create: `content/courses/english-basics.json`, `content/courses/malay-basics.json` (Unit 1)

**Interfaces — produces:**
- **`courseSource`:**
  - `id` adds `'english-basics' | 'malay-basics'`;
  - `language` adds `'english' | 'malay'`;
  - a new `kind: 'code' | 'language'`, which the existing code course files gain as `"kind": "code"`;
  - lesson, unit and step id prefixes add `en` and `ms`.
- **Step union, new members:**
  - `card { word, meaning, emoji, say?, note? }`
  - `pick { prompt, say?, options, answer, explanation }`
  - `match { pairs: [string, string][] (3–5) }`
  - `build { prompt, tiles: string[], answer: string[], accept_orders?: string[][], explanation }`
  - `gap { sentence (contains ___), options, answer, explanation }`
  - `listen { say, options, answer }`
  - `type { prompt, accept: string[], explanation }`
- **`contentRules`** adds:
  - language courses use only the new kinds, and code courses only the old ones;
  - `answer` is an option id;
  - every `build.answer` word is in `tiles`, and `tiles` has at least one extra;
  - `gap.sentence` contains `___`;
  - `match` lefts and rights are unique;
  - `type.accept` is not empty;
  - every lesson has at least 2 marked steps.
- **`normAnswer(s: string): string`**, with the rule from Global Constraints.

- [ ] **Step 1: Write the failing tests** in `lessons.test.ts`.
  - The course list becomes `['english-basics', 'javascript-basics', 'malay-basics', 'python-basics']`.
  - Language courses are checked by the schema and rules. The execution checks stay for code courses only.
  - `normAnswer forgives slips`: `normAnswer('Selamat  pagi.') === normAnswer('selamat pagi')`, `normAnswer("I'm Aina!") === normAnswer('im aina')`, and `normAnswer('hello') !== normAnswer('hallo')`.
  - `the rules catch broken language steps`: a `build` whose answer uses a word missing from its tiles is reported.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/features/academy/lessons.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement the schema, `normAnswer` and Unit 1 content.**
  - English *Hello & me*: greetings, "I am …", numbers 1–10, meeting friends.
  - BM *Salam & perkenalan*: Selamat pagi/petang/malam, nama saya, nombor 1–10, apa khabar.
  - 4 lessons each, 6–8 steps, starting with `card` steps. Every step has BM meanings (English course) or English meanings (BM course).
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npx vitest run src/features/academy`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(hall): language step kinds and Unit 1 of English and BM`.

### Task 2: Server — marking the language steps

**Files:**
- Create: `supabase/migrations/<stamp>_language_lessons.sql` and `tests/rls/language.test.ts`
- Modify: `scripts/gen-lessons.mjs` (new fields and kinds, plus `kind`), `tests/rls/lessonAnswers.ts` (right answers for the new kinds)

**Interfaces — produces (SQL):**
- **`courses`:** adds `kind text not null default 'code' check (kind in ('code','language'))`, and the `language` check adds `english` and `malay`.
- **`lesson_steps`:** the kind check adds `card`, `pick`, `match`, `build`, `gap`, `listen` and `type`. New public columns: `word`, `meaning`, `emoji`, `say`, `prompt`, `note`, `sentence`, `tiles text[]`, `pairs jsonb`.
  - The generator stores `pairs` as `{ left: [...], right: [...] }`, each list shuffled by a seeded order.
  - The generator stores `tiles` shuffled by a seeded order.
- **Keys:**
  - pick, gap and listen: `{choice}`;
  - match: `{pairs: [[l, r], …]}`;
  - build: `{orders: [[…], …]}`, the answer plus `accept_orders`;
  - type: `{accept: […]}`.
- **`norm_answer(text) returns text`:** the same rule as `normAnswer`, granted to `authenticated`.
- **`answer_lesson_step`** (redefined) marks:
  - pick, gap and listen from `{choice}`;
  - match from `{pairs}`, equal as a set to the key;
  - build from `{order: string[]}`, equal to one of the key's `orders`;
  - type from `{text}`, where `norm_answer` is in the normalised `accept`.
  - `card` is refused like `learn`. The code kinds are unchanged.
- **`complete_lesson`** (redefined) requires every step whose kind is in `('predict','fix','pick','match','build','gap','type')` to be correct.

- [ ] **Step 1: Write the failing tests** in `tests/rls/language.test.ts`, using 2 guest players.
  - `marks every language kind`: one wrong then one right answer for a `pick`, `match`, `build`, `gap`, `type` and `listen` step from `en-u1-*`.
  - `typed slips are forgiven`: a `type` step answered with the accepted text uppercased, with a trailing "." and double spaces, is correct. A different word is wrong.
  - `the server normalises answers like the app`: `norm_answer` equals `normAnswer` for 5 samples.
  - `listen is a bonus`: answering every marked step except `listen` lets `complete_lesson` pay `{ first_time: true, xp: 25, gold: 10 }`.
  - `keys are not readable`: the `start_lesson` output contains no `"accept"`, `"answer"`, `"orders"` or `"pairs":[[` key data. Public `pairs` is `{left, right}`.
  - `courses carry their kind`: `from('courses').select('id, kind')` shows the code courses as `code` and the new ones as `language`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npm run test:rls -- tests/rls/language.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Write the migration and update the generator.**
  - Write the migration and update the generator.
  - Then run `npm run gen:lessons`. The code course files change only by `"kind": "code"`, and the generator now writes `courses.kind`.
  - Push with `npx supabase db push --remote --yes`, which the owner approved for project work.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npm run test:rls -- tests/rls/language.test.ts tests/rls/academy.test.ts`
  - Expected: PASS.
  - Run the advisors. Expected: 0 errors.
- [ ] **Step 5: Commit** with the message `feat(db): mark language steps; listen is a bonus`.

### Task 3: Speech, the language exercises, and the Hall pages

**Files:**
- Create: `src/features/academy/speech.ts` and `speech.test.ts`; `src/features/academy/LanguageStep.tsx`, which contains the components for `card`, `pick`, `match`, `build`, `gap`, `listen` and `type`; `src/features/academy/language.test.tsx`.
- Modify:
  - `LessonPlayer.tsx`: language kinds go to `LanguageStep`, Listen steps are skipped when `!canSpeak(lang)`, and `language: Lang` widens to include `english | malay`;
  - `AcademyPages.tsx`: the pages take `kind: 'code' | 'language'` and a base path `/academy` or `/hall`;
  - `academyApi.ts`: the catalogue includes `kind`;
  - `src/app/App.tsx`: the `/hall` routes;
  - `src/features/home/HomePage.tsx`: a "Language Hall" button;
  - the 7 locales (`hall.*`).

**Interfaces — produces:**
- `pickVoice(voices: { lang: string; name: string }[], lang: 'english' | 'malay'): { lang: string; name: string } | null`
- `canSpeak(lang): boolean`
- `speak(text, lang): void`
- `LanguageStep` props: `{ step, attempt, language, onPassed(): void, onError(key) }`. It answers through `answerStep` with `{choice}`, `{pairs}`, `{order}` or `{text}`.

- [ ] **Step 1: Write the failing tests.**
  - `speech.test.ts`:
    - `pickVoice` prefers `en-GB`, then any `en-*`;
    - for Malay, it prefers `ms-MY`, then `ms-*`, then `id-ID`, and gives `null` with only `en-US` and `ja-JP`.
  - `language.test.tsx`, with `academyApi` mocked:
    - `card` shows the emoji, word and meaning, and Continue is enabled.
    - `pick`: a wrong pick shows the explanation; the right pick enables Continue.
    - `build tiles move between tray and answer`: tapping a tray tile moves it into the answer line; tapping it there moves it back; a tile is never shown twice. Check sends `{ order: [...] }` in the shown order.
    - `match needs every pair`: Check is disabled until every left card is paired, then sends `{ pairs }`.
    - `type` sends `{ text }`.
    - `listen steps are skipped without a voice`: with `speechSynthesis.getVoices()` returning `[]`, a lesson `[card, listen, pick]` goes from the card straight to the pick, and the last step finishes the lesson.
  - `academy.test.tsx`: Python Basics appears only on the Academy page, and English only on the Hall page (`academies are separate`, using a mocked catalogue).
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/features/academy`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Build: a tray row and an answer row of tile buttons (each at least 44 px), wrapping.
  - Match: two columns. Tap a left card, then a right card, to pair them; pairs are colour-coded; tapping a pair breaks it.
  - Type: an input with `lang="en"` or `"ms"` and `autocapitalize="off"`.
- [ ] **Step 4: Run the tests and the build.**
  - Run: `npx vitest run` and `npm run build`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(hall): speech, language exercises and the Language Hall pages`.

### Task 4: Language Kingdom, its monsters, the Lexicon Dragon and Cikgu Lina

**Files:**
- Create: `src/game/maps/language_kingdom.ts` (map generator kept in the workspace), `supabase/migrations/<stamp>_language_kingdom.sql`.
- Modify, following the Technology City pattern:
  - `map.ts`: tile `cobble`; props `library_tower`, `signpost`, `scroll_tree`, `letter_block`, `language_hall` (3 × 3); monsters `wordworm`, `alphabat`, `commaleon`; boss `lexicon_dragon`; NPC `linguist`; theme `kingdom`;
  - `places.ts`: built;
  - `npcs.ts`: Cikgu Lina;
  - `themes.ts`, `codeProps.ts`, `Props.tsx` (`language_hall` half is 1.5), `buildMonster.ts`, `Minimap.tsx`;
  - `store.ts`: `academy` becomes `'code' | 'language' | null`;
  - `World3D.tsx`: `teacher` sets `academy: 'code'` and `linguist` sets `'language'`;
  - `WorldPage.tsx`: navigates to `/academy` or `/hall`;
  - `regions.ts`: open;
  - the locales;
  - tests (places, themes, monsters, sim, islands RLS, JettyPanel: no "Coming soon" rows remain).
- **The migration:**
  - the `islands` row `language_kingdom`: `['english','malay_language','academic_english']`;
  - monsters `wordworm` 100/40/16, `alphabat` 120/48/19, `commaleon` 130/55/22;
  - `boss_runs` check adds `lexicon_dragon`;
  - `boss_island('lexicon_dragon') = 'language_kingdom'`.

- [ ] **Step 1: Write the failing tests.**
  - The place is 44 × 44 with theme `kingdom`, its zones and boss, a `language_hall` prop with `linguist` within 3.5 tiles of its centre, and areas `['Language Hall', 'Library Tower', 'Market of Words', 'Story Gardens']`. Everything is reachable from arrival.
  - Monsters: 15 kinds and 5 bosses.
  - Themes: 5 themes, and every new tile and prop passes the footprint test (`language_hall` up to 3.2 wide).
  - Islands RLS, `language kingdom monsters ask language questions`: `start_encounter('wordworm')` gives a subject in the island list for a `primary` player, and the Lexicon Dragon is gated with `/level 5/`.
  - JettyPanel: no "Coming soon" text, and Language Kingdom has a Sail button.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/game src/world3d src/features/world`
  - Expected: FAIL.
- [ ] **Step 3: Implement, push and check visually.**
  - Implement and push. Screenshot `/dev/world?place=language_kingdom` (the Hall and the boss) and the monster contact sheet. Fix what looks wrong.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npx vitest run`, then `npm run test:rls -- tests/rls/islands.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(world): Language Kingdom, its monsters, the Lexicon Dragon and Cikgu Lina`.

### Task 5: About 60 language questions

**Files:**
- Create: `content/questions/batch-11.json` and its generated migration.

- [ ] **Step 1: Confirm the bank test fails on a broken question.** Add the file with one deliberately broken question and watch `npx vitest run src/features/battle/questionBank.test.ts` fail.
- [ ] **Step 2: Write the questions.**
  - English (`subject: 'english'`): 15 each for `primary`, `lower_secondary` and `upper_secondary`. Vocabulary in context, grammar (tenses, articles, prepositions, plurals) and short reading lines.
  - BM (`subject: 'malay_language'`, level `lifelong`): 15 beginner questions, with English prompts and BM answers.
  - Types: mcq, fill_blank, true_false and ordering. Every one has explanations and reasons for wrong options, and the status `in_review`.
- [ ] **Step 3: Run the tests and push.**
  - Run: `npx vitest run src/features/battle`. Expected: PASS.
  - Then run `npm run gen:questions` and push.
- [ ] **Step 4: Run the islands server test.**
  - Run: `npm run test:rls -- tests/rls/islands.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `content: 60 language questions for Language Kingdom`.

### Task 6: Admin tab for Language Hall lessons

**Files:**
- Modify: `src/features/admin/AdminPage.tsx` (a third tab, "Language Hall lessons"), `LessonReview.tsx` (`kind` prop; shows `card`, `pairs`, `tiles`, `sentence`, `say` and keys), `review.ts` (`useLessonBank(kind)` filters through `courses.kind`).
- Test: `src/features/admin/review.test.ts`, `filterByKind keeps only that kind of course`.

- [ ] **Step 1: Write the failing test.** A pure helper, `filterByKind(lessons, courses, kind)`.
- [ ] **Step 2: Run the test and confirm it fails.**
  - Run: `npx vitest run src/features/admin`
  - Expected: FAIL.
- [ ] **Step 3: Implement, then check in the browser.** Implement the tab, then screenshot the tab logged in with the `.env.test.local` admin account.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npx vitest run src/features/admin`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(admin): review Language Hall lessons`.

### Task 7: Units 2 and 3 of both courses

**Files:**
- Modify: `content/courses/english-basics.json`, `content/courses/malay-basics.json`, and the generated migrations.

- [ ] **Step 1: Write the content.**
  - English *Family & friends* and *Food & my day*; BM *Keluarga & nombor* and *Makanan & pasar*.
  - 4 lessons each, 6–8 steps, Malaysian context (nasi lemak, teh tarik, pasar, kampung).
- [ ] **Step 2: Run the content tests.**
  - Run: `npx vitest run src/features/academy/lessons.test.ts`
  - Expected: PASS, with 48 lessons in total across the 4 courses.
- [ ] **Step 3: Generate and push.**
  - Run `npm run gen:lessons` and push.
  - Add to `language.test.ts`: `start_lesson('ms-u2-l1')` is refused with `/finish unit 1/i`.
- [ ] **Step 4: Run the server test.**
  - Run: `npm run test:rls -- tests/rls/language.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `content: Units 2 and 3 of English and BM`.

### Task 8: End-to-end test, docs and final checks

**Files:**
- Create: `tests/e2e/hall.spec.ts` (registered in the `online` project).
- Modify: `docs/ROADMAP.md`, `docs/decisions.md` (#27: listening is a bonus and every language step is marked by the server), `docs/art-credits.md`.

- [ ] **Step 1: Write the e2e test** `english lesson in the hall`:
  - a guest sails to Language Kingdom, talks to Cikgu Lina, and lands on `/hall`;
  - opens English and lesson 1, and plays every step from the course file. Headless Chrome has no voices, so Listen steps must be skipped.
  - sees "+25 XP";
  - "Back to the world" returns to the Hall door.
- [ ] **Step 2: Run it.**
  - Run: `npx playwright test tests/e2e/hall.spec.ts --project=online`
  - Expected: PASS.
- [ ] **Step 3: Update the docs.**
- [ ] **Step 4: Run the full verification.**
  - `npx vitest run`, `npm run build`, `npm run test:rls`, `npm run test:e2e` and the advisors.
  - Wait out the guest sign-in limit between the server and end-to-end suites.
  - Expected: all green.
- [ ] **Step 5: Commit** with the message `test(e2e): english lesson; docs for the languages island`.
