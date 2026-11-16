# Coding Island Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Technology City, a fourth place with code-reading monsters and the Glitch Golem, and the Code Academy, where Python Basics and JavaScript Basics lessons run real code in the browser with a CodeMirror editor and terminal. The server marks the Predict and Fix steps and pays each lesson's reward once.

**Architecture:**
- **Lessons as content.** Lessons are JSON content files, validated and executed by the unit tests, then turned into migrations by a generator. This is the same pipeline the question bank uses.
- **Server.** It stores public step data separately from server-only keys. It marks Predict and Fix steps, refuses locked units, and pays 25 XP and 10 gold once per lesson.
- **Client.** Academy pages are lazy routes. Code runs in Web Workers: JavaScript directly, and Python through Pyodide from jsDelivr. Every run has a 3-second limit and the worker is replaced after a timeout.
- **Technology City.** It reuses the island-world system: a new theme, map, code props, monsters and a boss.

**Tech Stack:**
- React 19, react-router, TanStack Query, zod, zustand;
- CodeMirror 6 (`codemirror`, `@codemirror/lang-python`, `@codemirror/lang-javascript`), the one new runtime dependency;
- Pyodide: from the CDN at runtime, and the `pyodide` npm package as a development dependency for tests;
- Supabase migrations (pushed with `npx supabase db push --remote --yes`, which the owner allowed per project);
- three and R3F; Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-coding-island-design.md`

## Global Constraints

- **Rewards are server-only.** XP and gold change only inside `security definer` functions. Predict and Fix answers are never readable by the client before answering.
- **The lesson reward** is **25 XP and 10 gold, paid once per lesson per player**. Repeats pay 0.
- **Dependencies:** CodeMirror 6 is the only new runtime dependency. Pyodide loads from `https://cdn.jsdelivr.net/pyodide/v<VERSION>/full/` at a pinned `<VERSION>`, the same version as the `pyodide` development dependency. Python and the editor never load with the first page.
- **Code runs** stop after **3 seconds** and output is capped at **200 lines**. The game never freezes.
- **Phones:** at 360 px wide the lesson page has no horizontal scroll.
- **Text:** every UI string is in all 7 locales. Lesson text is English.
- **Database:** every change is a migration, timestamped after the newest existing one, with RLS on every new table. Content files follow `in_review` → approved → published, and drafts are visible only while `app_settings.allow_draft_questions` is true.

## Review Focus

1. **A Python lesson opened with a slow connection, or with the CDN blocked.** The terminal must say Python couldn't load and offer Retry. Learn, Predict and Fix steps must still be usable. *Test: Task 2, `python load failure is reported`.*
2. **Code that prints in an endless loop** (`while True: print(1)`). Output is capped, the run stops at 3 s, and the next run works. *Test: Task 2, `runaway output is capped and the next run works`.*
3. **A Fix answer where the player also changed other lines, or the line count.** The player gets a clear "change only line N" message, not a wrong mark that can't be fixed. *Test: Task 4, `fix step extracts the marked line`.*
4. **Calling `complete_lesson` directly** without answering, with another player's attempt, or twice. Each is refused or pays 0. *Test: Task 3, `complete_lesson refusals`.*
5. **Leaving the Academy back to the world.** The player returns to the Academy door in Technology City, not the jetty or Greenhaven. *Test: Task 5, `returns to the academy door`.*

---

### Task 1: Lesson format, content checks and Unit 1 of both courses

**Files:**
- Create: `src/features/academy/lessonSchema.ts`, `src/features/academy/codeText.ts`, `src/features/academy/lessons.test.ts`
- Create: `content/courses/python-basics.json`, `content/courses/javascript-basics.json` (Unit 1 only in this task)
- Modify: `package.json` (devDependency `pyodide`, exact version)

**Interfaces — produces:**
- **`lessonSchema.ts`:**
  - `courseSource` (zod): `{ _meta: { author, license }, id: 'python-basics' | 'javascript-basics', language: 'python' | 'javascript', title, units: Unit[] }`.
  - `Unit = { id, title, lessons: Lesson[] }`.
  - `Lesson = { id: /^(py|js)-u\d-l\d$/, version, status, title, objective, steps: Step[] (5–8) }`.
  - `Step`, a union discriminated by `kind`, each with an `id` (`<lesson>-s<n>`) and `text`:
    - `learn { code, expected_output }`
    - `predict { code, options?: {id,text}[], answer?: string, answer_text?: string, explanation }` (exactly one of `answer` and `answer_text`)
    - `fix { code, broken_line: number, accept: string[], expected_output, hint, explanation }`
    - `write { starter, expected_output, must_use?: string[], solution, hint }`
  - `contentRules(course): string[]`, which returns the problems found:
    - ids are unique;
    - `broken_line` is within `code`;
    - the broken line itself is not accepted;
    - `answer` is one of the option ids;
    - every lesson has at least one Predict or Fix step, so the server has something to mark.
- **`codeText.ts`:**
  - `normOutput(s: string): string` trims trailing whitespace on each line and trailing blank lines.
  - `normCode(s: string): string` trims, collapses whitespace runs to one space, then removes spaces next to `()[]{},:;=+-*/<>!` (not quotes).
  - `replaceLine(code, n, line): string` replaces line `n` (1-based).
  - The server uses the same `normCode` rule (Task 3).

- [ ] **Step 1: Write the failing tests** in `lessons.test.ts`.
  - `every course file matches the schema and the content rules`.
  - `normCode ignores spacing but not string contents`:
    - `normCode('print( "Hi" )') === normCode('print("Hi")')`;
    - `normCode('x = "a b"') !== normCode('x = "ab"')`.
  - `javascript samples print what they claim`: run each Learn `code`, each Fix `replaceLine(code, broken_line, accept[0])` and each Write `solution` in `node:vm`, with a captured `console.log`. Compare `normOutput` with the stated output.
  - `python samples print what they claim`: the same, using `loadPyodide()` from the `pyodide` dev package, once per file, with `setStdout({ batched })`. Timeout 120 s.
  - `predict answers are right`: for `answer_text`, the code's real output equals it. For options, the option text whose id is `answer` equals the real output.
  - `fix steps really are broken`: the original code's output differs from `expected_output`, or the original throws.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/features/academy/lessons.test.ts`
  - Expected: FAIL (no files yet).
- [ ] **Step 3: Install and implement.**
  - Install: `npm i -D pyodide@<latest exact>`.
  - Implement the schema and `codeText`.
  - Write Unit 1 ("Hello, code": output, strings, variables, joining text) for both languages, 4 lessons each with 5–8 steps.
  - `_meta.author` is `"Eduventure (original lessons)"` and `license` is `"CC BY 4.0"`. Every lesson starts `status: "in_review"`, `version: 1`.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npx vitest run src/features/academy/lessons.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(academy): lesson format, content checks, Unit 1 of Python and JavaScript Basics`.

### Task 2: Code runner (Web Workers with a time limit)

**Files:**
- Create:
  - `src/features/academy/runner/jsCore.ts`: `runJsSource(code): { stdout: string; error: string | null }` captures `console.log` and `console.error`, joins arguments like Node does, and caps output.
  - `src/features/academy/runner/js.worker.ts` and `py.worker.ts`: module workers. The Python one does `await import(CDN + 'pyodide.mjs')` once, then `runPythonAsync`.
  - `src/features/academy/runner/runner.ts` and `runner.test.ts`.
  - `src/features/academy/runner/pyodideVersion.ts`: `PYODIDE_VERSION`, the same as the dev dependency. A test asserts they match.

**Interfaces — produces:**
- `type RunResult = { stdout: string; error: string | null; timedOut: boolean; truncated: boolean }`
- `createRunner(lang: 'python' | 'javascript', makeWorker: () => WorkerLike, opts?: { timeoutMs?: number }): { run(code: string): Promise<RunResult>; ready(): Promise<void>; dispose(): void }`
  - The default `timeoutMs` is 3000. On a timeout it terminates the worker and makes a fresh one for the next run.
  - `ready()` rejects with `Error('python-unavailable')` when loading fails.
- `runCode(lang, code)`: the app-level helper. It keeps one warm runner per language, created with the real `new Worker(new URL(..., import.meta.url), { type: 'module' })`.
- `OUTPUT_LINE_CAP = 200`.

- [ ] **Step 1: Write the failing tests** in `runner.test.ts`. They use a fake `WorkerLike` that the test controls, plus `runJsSource` directly.
  - `runs javascript and captures output`: `runJsSource('console.log(1+1); console.log("a","b")')` gives `stdout` `'2\na b'`.
  - `reports errors without throwing`: `runJsSource('nope()')` gives an `error` that matches `/nope is not defined/`.
  - `runaway output is capped and the next run works`:
    - `runJsSource('for(let i=0;i<10000;i++) console.log(i)')` gives 200 lines and `truncated: true`;
    - with a fake worker that never answers, `run()` resolves `timedOut: true` after `timeoutMs`, `makeWorker` is called again, and the next `run()` resolves normally (fake timers).
  - `python load failure is reported`: when a fake worker posts `{ type: 'load-error' }`, `ready()` rejects with `/python-unavailable/`.
  - `pyodide version is pinned in one place`: `PYODIDE_VERSION` equals `package.json` `devDependencies.pyodide`.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/features/academy/runner`
  - Expected: FAIL.
- [ ] **Step 3: Implement the runner and workers.**
  - The worker protocol is `{ type: 'run', id, code }`, answered by `{ type: 'result', id, stdout, error, truncated }`. The Python worker also sends `{ type: 'ready' | 'load-error' }`.
  - Python output: stdout and stderr through `setStdout` and `setStderr` with the batched callback, capped at 200 lines.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npx vitest run src/features/academy/runner`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(academy): code runner with workers, time limit and output cap`.

### Task 3: Server — lessons, attempts, marking, the once-only reward, review; and the generator

**Files:**
- Create:
  - `supabase/migrations/<stamp>_academy.sql`, with a stamp after the newest migration;
  - `scripts/gen-lessons.mjs` (`npm run gen:lessons`), which writes `<stamp>_lessons_<course>.sql` with a content hash and skips unchanged files, like `gen-questions`;
  - `tests/rls/academy.test.ts`, `tests/rls/lessonAnswers.ts` (reads the course files, like `answers.ts`).
- Modify: `package.json` (the script).

**Interfaces — produces (SQL):**
- **Tables:**
  - `courses(id pk, language, title, sort)`;
  - `lessons(id pk, course_id, unit_index int, unit_title, lesson_index int, title, objective, status, version, source_name, license)`;
  - `lesson_steps(id pk, lesson_id, step_index, kind, text, code, options jsonb, broken_line, starter, expected_output, must_use text[], hint)`: public. No Predict answers, Fix `accept`, explanations or Write solutions.
  - `lesson_step_keys(step_id pk, answer jsonb, explanation, solution)`: server-only.
  - `lesson_attempts(id uuid pk, user_id, lesson_id, status 'active' | 'completed', last_answer_at, created_at)`, with a unique active attempt per (user, lesson).
  - `lesson_step_results(attempt_id, step_id, correct bool, tries int, pk (attempt_id, step_id))`.
  - `lesson_rewards(user_id, lesson_id, xp, gold, created_at, pk (user_id, lesson_id))`.
- **RLS:**
  - courses, lessons and steps are readable by `authenticated` when published, or while drafts are allowed;
  - attempts, results and rewards are readable by their own player only;
  - keys are never readable;
  - there are no client writes.
- **Functions:**
  - `norm_code(text) returns text`: the same rule as `normCode`.
  - `norm_output(text) returns text`: the same rule as `normOutput`.
  - `start_lesson(p_lesson text) returns jsonb`:
    - returns `{ attempt_id, lesson: {id,title,course_id,unit_index,lesson_index}, steps: [...public fields...], results: [{step_id, correct, tries}] }`;
    - resumes the active attempt;
    - refuses `'Finish unit N first'` when any lesson of an earlier unit in the course has no `lesson_rewards` row for the player;
    - refuses unknown or unpublished lessons as `'Lesson not found'`.
  - `answer_lesson_step(p_attempt uuid, p_step text, p_answer jsonb) returns jsonb`:
    - Predict takes `{choice}` or `{text}`. Fix takes `{line}`, compared with `norm_code` against every accepted form.
    - Refuses Learn and Write steps.
    - Refuses `'Too fast'` within 1 s of the attempt's `last_answer_at`.
    - Returns `{ correct, explanation, accepted }`. `accepted` (the right option, text or line) appears only when correct or after the second wrong try.
  - `note_write_attempt(p_attempt, p_step) returns void`: counts a failed Write check.
  - `lesson_solution(p_attempt, p_step) returns text`: refused `'Try twice first'` until 2 noted tries.
  - `complete_lesson(p_attempt uuid) returns jsonb`:
    - refused `'Answer every question first'` unless every Predict and Fix step has `correct = true` in this attempt;
    - pays 25 XP and 10 gold on the first `lesson_rewards` insert, and `0/0` otherwise, with `first_time`;
    - marks the attempt `completed`;
    - returns `{ first_time, xp, gold, totals: {xp, level, gold}, leveled_up }`.
  - `my_course_progress(p_course text) returns text[]`: the completed lesson ids.
  - `review_lesson(p_id, p_action, p_note) returns jsonb`: the same transitions and roles as `review_question`, writing the audit log.

- [ ] **Step 1: Write the failing tests** in `tests/rls/academy.test.ts`. Use a single live guest player `a` and player `b`, keeping sign-ins to 2 or fewer (rate limit, decision #20).
  - `answers are not readable`: `from('lesson_step_keys').select()` returns no rows or an error, and `start_lesson` output contains no `accept`, `answer` or `solution`.
  - `marks predict and fix`: a wrong then a right Predict, then a Fix, answered with `{ line: accept[0] }` with extra spaces, comes back correct.
  - `complete_lesson refusals`:
    - completing before answering errors with `/answer every question/i`;
    - player `b` completing `a`'s attempt errors with `/not found/i`;
    - answering after completion is refused.
  - `first completion pays once`:
    - the first `complete_lesson` gives `{ first_time: true, xp: 25, gold: 10 }`, and the totals rise by exactly 25 and 10;
    - completing a second attempt of the same lesson gives `{ first_time: false, xp: 0, gold: 0 }`.
  - `units unlock in order`: `start_lesson('py-u2-l1')` errors with `/finish unit 1/i` for a fresh player. Unit 2 content arrives in Task 8; until then, assert on `js-u2-l1` being refused as `'Lesson not found'` or `'Finish unit 1 first'`. Either is a refusal.
  - `solution needs two tries`: `lesson_solution` is refused before two `note_write_attempt` calls and returns text after them.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npm run test:rls -- tests/rls/academy.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Write the migration and generator, then push.**
  - Write the migration and the generator, and run `npm run gen:lessons`.
  - Push: `npx supabase db push --remote --yes`. Expected: the migrations apply.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npm run test:rls -- tests/rls/academy.test.ts`
  - Expected: PASS.
  - Then run `npx supabase db advisors --linked`. Expected: 0 errors.
- [ ] **Step 5: Commit** with the message `feat(db): academy lessons, marking, once-only rewards, review`.

### Task 4: The Academy pages and lesson player

**Files:**
- Create:
  - `src/features/academy/academyApi.ts`: typed wrappers for the Task 3 functions.
  - `src/features/academy/progress.ts`: `unitUnlocked(units: {lessonIds: string[]}[], unitIndex: number, completed: Set<string>): boolean`.
  - `src/features/academy/checkWrite.ts`: `checkWrite(code: string, stdout: string, step: { expected_output: string; must_use?: string[] }): { ok: true } | { ok: false; reason: 'output' | 'must_use'; missing?: string }`.
  - `src/features/academy/fixLine.ts`: `fixLine(original: string, edited: string, brokenLine: number): { line: string } | { error: 'line-count' | 'other-lines' }`.
  - `AcademyPage.tsx` (`/academy`), `CoursePage.tsx` (`/academy/:course`), `LessonPage.tsx` (`/academy/:course/:lesson`).
  - `CodeEditor.tsx`: CodeMirror 6 with the language pack, plus `insert(text)` for the key row; lazily imported.
  - `KeyRow.tsx`, `Terminal.tsx` (with `aria-live="polite"`).
  - Tests: `academy.test.tsx`.
- Modify:
  - `src/app/App.tsx`: the three routes, signed-in, lazy.
  - `src/features/home/HomePage.tsx`: a "Code Academy" button.
  - all 7 locales (`academy.*`).

**Interfaces — consumes:**
- `runCode` (Task 2);
- `start_lesson`, `answer_lesson_step`, `note_write_attempt`, `lesson_solution`, `complete_lesson` and `my_course_progress` (Task 3);
- `LevelUp` from `BattlePanel.tsx` for the reward screen.

- [ ] **Step 1: Write the failing tests** in `academy.test.tsx`.
  - `checkWrite`:
    - correct output with `must_use` met gives `{ ok: true }`;
    - wrong output gives `reason: 'output'`;
    - right output without the `for` loop gives `reason: 'must_use', missing: 'for'`.
  - `fix step extracts the marked line`:
    - editing only line 2 gives `{ line: <edited line 2> }`;
    - also editing line 1 gives `{ error: 'other-lines' }`;
    - adding a line gives `{ error: 'line-count' }`.
  - `unitUnlocked`: unit 0 is always open; unit 1 opens only when every unit-0 lesson is in `completed`.
  - **LessonPage component test**, with a mocked `academyApi` and `runCode`:
    - the Learn step's Run shows the output in the terminal;
    - a wrong Predict shows the explanation and keeps Continue disabled;
    - the right one enables Continue;
    - a Write step with the right code passes and calls nothing on the server for marking;
    - the final step calls `complete_lesson` and shows "+25 XP" and "+10 gold".
  - `python load failure keeps the lesson usable`: when `runCode` rejects `python-unavailable`, the terminal shows the localized "Python couldn't load" with Retry, while a Predict step can still be answered.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/features/academy`
  - Expected: FAIL.
- [ ] **Step 3: Install and implement.**
  - Install: `npm i codemirror @codemirror/lang-python @codemirror/lang-javascript` (exact versions saved).
  - **Lesson layout:**
    - a single column on phones;
    - the editor on the left and the step and terminal on the right from 1024 px;
    - the key row wraps;
    - no horizontal scroll at 360 px.
  - **Key row:**
    - Python: `print()`, `""`, `+`, `=`, `if`, `else:`, `for`, `in`, `range()`, `:`, `⇥`;
    - JavaScript: `console.log()`, `""`, `+`, `=`, `let`, `if`, `else`, `for`, `{}`, `;`, `⇥`.
- [ ] **Step 4: Run the tests and check the build.**
  - Run: `npx vitest run src/features/academy` and `npm run build`
  - Expected: PASS. CodeMirror is in the lesson-page chunk only, not the entry chunk.
- [ ] **Step 5: Commit** with the message `feat(academy): academy pages, lesson player, editor, key row and terminal`.

### Task 5: Technology City, its monsters, the Glitch Golem and Cikgu Byte

**Files:**
- Create:
  - `src/game/maps/technology_city.ts`;
  - `supabase/migrations/<stamp>_technology_city.sql`: the island row; monsters `bugsy` (100/40/16), `bytebot` (120/48/19), `loopy` (130/55/22); `boss_runs.boss_id` gains `glitch_golem`; `boss_island('glitch_golem') = 'technology_city'`; `start_boss` accepts `glitch_golem`.
- Modify:
  - `src/game/map.ts`: tiles `circuit` and `metal`; props `server_tower`, `neon_lamp`, `robot_statue`, `holo_tree`, `academy`; monsters `bugsy`, `bytebot`, `loopy`; boss `glitch_golem`; NPC `teacher`; theme `tech`.
  - `src/game/places.ts`: `technology_city` is built.
  - `src/game/npcs.ts`: Cikgu Byte.
  - `src/world3d/themes.ts`: `tech`, with a `circuit` tint and a dusk sky.
  - `src/world3d/props/codeProps.ts`: the 5 props; `academy` is 3 × 3.
  - `src/world3d/monsters/buildMonster.ts`: 3 monsters and the boss.
  - `src/features/world/Minimap.tsx` (colours).
  - `src/world3d/World3D.tsx`: the teacher NPC sets `useGame.setState({ academy: true })`.
  - `src/game/store.ts`: `academy: boolean`.
  - `src/game/placeStore.ts`: `resumeAt: Point | null`.
  - `src/game/sim.ts`: opts `start?: Point`, which beats `atArrival`.
  - `src/features/world/WorldPage.tsx`: when `academy` turns true, save `resumeAt` as the hero's tile and navigate to `/academy`.
  - `src/features/world/GameCanvas.tsx`: `CurrentPlace` passes `resumeAt` once, then clears it.
  - `src/features/battle/BossPanel.tsx`: the boss texts.
  - the 7 locales: `regions.technology_city`, monsters, `bosses.glitch_golem`, `npc.teacher`.
  - `src/features/landing/regions.ts`: open.
  - Tests: `src/game/places.test.ts`, `src/world3d/themes.test.ts`, `src/world3d/monsters/monsters.test.ts`, `src/game/sim.test.ts`, `tests/rls/islands.test.ts`.

- [ ] **Step 1: Write the failing tests.**
  - **places:** `technology_city` is built, 44 × 44 with theme `tech`, zones `bugsy`/`bytebot`/`loopy`, boss `glitch_golem`, an `academy` prop, the teacher NPC beside it, and areas `['Code Academy', 'Server Gardens', 'Neon Plaza', 'Data Docks']`. Every zone, the boss, the boatman and the teacher can be reached from arrival.
  - **themes:** `tech` has every colour, and the new code props pass the footprint test. `academy` may be up to 3.2 wide.
  - **monsters:** 12 kinds and 4 bosses build at the right sizes.
  - **sim, `returns to the academy door`:** `new WorldSim(map, rng, { start: {x: 10, y: 12} })` starts at (10.5, 12.5) even with `atArrival: true`.
  - **islands RLS, `technology city monsters ask programming questions`:**
    - `start_encounter('bytebot')` serves a subject in `['programming','computer_science','artificial_intelligence','cybersecurity']`;
    - `start_boss({p_boss:'glitch_golem'})` errors with `/level 5/` for a level-1 player.
- [ ] **Step 2: Run the tests and confirm they fail.**
  - Run: `npx vitest run src/game src/world3d`, then `npm run test:rls -- tests/rls/islands.test.ts`
  - Expected: FAIL.
- [ ] **Step 3: Implement, push the migration, and check visually.**
  - Push the migration.
  - Screenshot `/dev/world?place=technology_city` and the monster contact sheet. Check them and fix what looks wrong.
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npx vitest run`, then `npm run test:rls -- tests/rls/islands.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `feat(world): Technology City, its monsters, the Glitch Golem and Cikgu Byte`.

### Task 6: About 60 code-reading questions

**Files:**
- Create: `content/questions/batch-10.json` (subject `programming`), and the migration generated by `npm run gen:questions`.

- [ ] **Step 1: Run the existing bank tests against the new file.** It doesn't exist yet, so first write the file skeleton with 1 deliberately broken question and confirm `npx vitest run src/features/battle/questionBank.test.ts` FAILS on it.
- [ ] **Step 2: Write the questions.**
  - 60 questions, Python and JavaScript, levels `primary` / `lower_secondary` / `upper_secondary` / `pre_university`.
  - Types: mostly `mcq` "What does this print?", plus `true_false`, `fill_blank` and `ordering`.
  - Every one has an explanation, a reason for each wrong option, an objective, an alignment, and the status `in_review`.
  - Code goes in the prompt with real line breaks.
- [ ] **Step 3: Check that every "what does this print" answer is real.** Extend `lessons.test.ts` with `code-reading questions print their answers`. It applies to questions tagged `topic: "Code reading"` with a `code` field (an extra source field the schema allows), and runs JS and Python as in Task 1.
- [ ] **Step 4: Run the tests and generate the migration.**
  - Run: `npx vitest run src/features/battle src/features/academy`. Expected: PASS.
  - Then `npm run gen:questions` and push.
- [ ] **Step 5: Commit** with the message `content: 60 code-reading questions for Technology City`.

### Task 7: Admin review of lessons

**Files:**
- Modify: `src/features/admin/AdminPage.tsx` (a "Lessons" tab), `src/features/admin/review.ts` (`useAdminLessons`), and the locales.
- Test: `src/features/admin/review.test.ts`.

- [ ] **Step 1: Write the failing test** `lesson actions match question actions`. `allowedActions` is reused, and the Lessons tab lists a lesson with its steps, read through a new admin-only `admin_lesson(p_id)` that includes the keys for reviewers. Add the function to a small migration.
- [ ] **Step 2: Run the test and confirm it fails.**
  - Run: `npx vitest run src/features/admin`
  - Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Approve, reject and publish call `review_lesson`. Bulk approve for one unit.
  - `admin_lesson` is refused for non-reviewers (an RLS test is added to `academy.test.ts`).
- [ ] **Step 4: Run the tests and confirm they pass.**
  - Run: `npx vitest run src/features/admin`. Expected: PASS.
  - The RLS check for admins runs with the existing `TEST_ADMIN_*` account if present (it is skipped otherwise, like today's admin tests).
- [ ] **Step 5: Commit** with the message `feat(admin): review lessons`.

### Task 8: Units 2 and 3 of both courses

**Files:**
- Modify: `content/courses/python-basics.json`, `content/courses/javascript-basics.json`, and the migrations generated by `npm run gen:lessons`.

- [ ] **Step 1: Add the content.**
  - Add Unit 2 ("Numbers and choices": arithmetic, comparisons, if/else) and Unit 3 ("Repeat and collect": for loops, while with a counter, lists or arrays, looping over a list).
  - 4 lessons each, 5–8 steps.
  - The tests from Task 1 must FAIL first on one deliberately wrong expected output, then pass when fixed.
- [ ] **Step 2: Run the content tests.**
  - Run: `npx vitest run src/features/academy/lessons.test.ts`
  - Expected: PASS, with 24 lessons in total.
- [ ] **Step 3: Generate and push.**
  - Run `npm run gen:lessons`, then push.
  - Update `academy.test.ts` (RLS) so `py-u2-l1` is refused with `/finish unit 1/i`.
- [ ] **Step 4: Run the server test.**
  - Run: `npm run test:rls -- tests/rls/academy.test.ts`
  - Expected: PASS.
- [ ] **Step 5: Commit** with the message `content: Units 2 and 3 of Python and JavaScript Basics`.

### Task 9: End-to-end test, docs and final checks

**Files:**
- Create: `tests/e2e/academy.spec.ts` (registered in the `online` project).
- Modify: `docs/ROADMAP.md`, `docs/decisions.md` (#25: code runs in the browser and the reward is paid once; #26: lessons as reviewed content files whose samples are executed by the tests), `docs/art-credits.md`, `CLAUDE.md` (add `gen:lessons`).

- [ ] **Step 1: Write the e2e test** `python lesson in the browser`:
  - a guest walks to Pak Hamid, sails to Technology City, talks to Cikgu Byte, and lands on `/academy`;
  - opens Python Basics, then lesson 1;
  - answers each step from `content/courses/python-basics.json`: Predict by option or text; Fix by typing the accepted line into the editor; Write by typing the solution, pressing Run, and seeing the expected output in the terminal (Python really loads from the CDN);
  - sees "+25 XP";
  - replays the lesson and sees no XP;
  - "Back to the world" returns to Technology City at the Academy door.
- [ ] **Step 2: Run it.**
  - Run: `npx playwright test tests/e2e/academy.spec.ts --project=online`
  - Expected: PASS.
- [ ] **Step 3: Update the docs.**
- [ ] **Step 4: Run the full verification.**
  - `npx vitest run`, `npm run build`, `npm run test:rls`, `npm run test:e2e` and the advisors.
  - Wait for the guest sign-in limit between the server and end-to-end suites if needed.
  - Expected: all green.
- [ ] **Step 5: Commit** with the message `test(e2e): python lesson; docs for the coding island`.
