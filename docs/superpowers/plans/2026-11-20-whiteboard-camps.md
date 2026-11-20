# Whiteboard camps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each island's built whiteboard stand opens a lasting camp board where players pin notes, with safe-by-age rules enforced on the server.

**Architecture:** Notes live in Postgres (`board_notes`), reached only through `security definer` functions that check age, parent approval, visibility, the text filter and limits. The client reads an island's board with TanStack Query, refetching every 20 s while open, and posts through RPCs. The world opens the board like the workbench (a `board` prompt and store flag).

**Tech Stack:** React 19, R3F, zustand, TanStack Query, i18next (7 locales), Supabase Postgres, Vitest (unit and live `test:rls`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-20-whiteboard-camps-design.md`

## Global Constraints

- All rules in `security definer set search_path = ''` functions. Clients get no table access (`revoke all … from anon, authenticated`, RLS on).
- Never edit a live migration. Copy functions forward from their latest version (`my_children`: `20261121090002_multiplayer_safety.sql`; `name_ok`: `20261121090003_name_filter_words.sql`).
- Push with `npx supabase db push --remote --yes` (approved for this project). After the push, `npx supabase db advisors --remote --level error` must report 0.
- Text: 120 characters at most. Latin letters only (A–Z, Latin-1 and Latin Extended-A accents), ASCII digits, spaces and `.,!?'"-:;()`.
- Limits: 5 notes an hour per player, 10 note reports a day per player, 3 distinct reports hide a note, notes shown for 3 days and the newest 50, notes deleted after 30 days.
- Under-13 and unknown-age readers never receive a note with a `body`.
- All UI text in en, ms, es, ar, zh, fr, ja. `/admin` text is English, like the rest of `/admin`.
- No XP, gold or mission progress for notes.
- Never commit `.env.test.local`.

## Review Focus

- A sentence of ordinary student English or Malay refused by the word filter (squashing across words). Covered by `tests/sql/text-ok.sql` with `wrong: 0`.
- A child reading a typed note through any path: `island_board`, or a note made visible again by `resolve_note`. Covered in `board.test.ts`.
- A hidden, banned or parent-hidden writer still on the board through old notes. Covered in `board.test.ts`.
- Contact details slipping through: spaced phone numbers ("012 345 6789"), "name at gmail dot com", full-width digits. The first and last are tested; "at … dot" is a known gap, left to reports.
- An open board left running on a phone: the refetch must stop when the panel closes or the tab is hidden. Tested in `boardApi.test.ts`.

---

### Task 1: Text filter for sentences (`text_ok`)

**Files:**
- Create: `supabase/migrations/20261121100000_board_text_filter.sql`
- Create: `tests/sql/text-ok.sql`
- Modify: `content/blocked-words.txt` and regenerate if the sentence test finds false refusals (`python scripts/gen-blocked-words.py`)

**Interfaces:**
- Produces: `public.fold_text(p_text text) returns text` (lower-case plus leetspeak `013457@$` → `oieastas`, plus accented Latin letters → base letter). `public.text_words(p_text text) returns text[]` (folded words, with runs of single letters joined, as in `name_ok`). `public.text_ok(p_text text) returns text`: null when fine, else `'script' | 'phone' | 'email' | 'link' | 'handle' | 'word'`, checked in that order. `name_ok` is rewritten on top of `fold_text` and `text_words` with identical results.

- [ ] **Step 1:** Write `tests/sql/text-ok.sql` in the style of `tests/sql/names-ok.sql`: a `cases (text, expected)` list and a `wrong` count. It needs at least 40 ordinary sentences, expected null, among them "who reads this?", "a bit challenging", "my therapist says hi", "I scored 100 in 2026!", "Hakim and Wan Kamal", "Jom belajar sains", "Saya suka matematik", "class assessment is hard", "Café crème", "Q: what's 7 x 8?". Rude and contact cases: "f.u.c.k" and "you are sh1t" → `word`; "012 345 6789" and "0123456789" → `phone`; "mail me a@b.co" → `email`; "go to www.site.com", "site.my" and "http://x" → `link`; "@cool_kid" → `handle`; "你好", "１２３４５６７" and "привет" → `script`.
- [ ] **Step 2:** Run it before the migration exists. Run: `npx supabase db query --remote --yes -f tests/sql/text-ok.sql`. Expected: an error that `text_ok` does not exist.
- [ ] **Step 3:** Write the migration.
  - Words match **within each word**: whole-word entries equal a word; other entries are a substring of a word.
  - Phone: a run matching `[0-9][0-9 .()-]*[0-9]` that contains 7 or more digits, checked on the raw text.
  - Grants: `text_ok` to authenticated, the helpers to no one.
  - Push: `npx supabase db push --remote --yes`.
- [ ] **Step 4:** Run the sentence test and `tests/sql/names-ok.sql`. Expected: `wrong: 0` for both. If an ordinary sentence fails on a substring entry (for example "therapist"), prefix that entry with `=` in `content/blocked-words.txt`, run `python scripts/gen-blocked-words.py`, push, and run both tests again.
- [ ] **Step 5:** Commit: `feat(board): text filter for sentences`.

### Task 2: Board data and rules

**Files:**
- Create: `supabase/migrations/20261121100100_board.sql` (use the next free timestamp if the regenerated word migration took it)
- Create: `tests/rls/board.test.ts`

**Interfaces:**
- Consumes: `text_ok` (Task 1), plus `visibility_reason`, `age_band_for`, `player_blocks`, `has_role`, `own_child`, `audit_logs` and `profiles.is_guest/public_id`.
- Produces these RPCs, all `authenticated` only:
  - `board_rights() → {can_write: boolean, can_type: boolean, reason: null|'guest'|'no_age'|'banned'|'hidden_parent'|'hidden_self'|'awaiting_parent'|'needs_parent'|'parent_off'|'chat_off'}`. Map `visibility_reason` values `parent` → `hidden_parent` and `off` → `hidden_self`. `can_type` is true only for 13 and over.
  - `island_board(p_place text) → {open: boolean, notes: [{id, public_id, name, sticker, phrase, body, created_at, mine}]}`.
  - `post_note(p_place text, p_sticker text, p_phrase text, p_body text) → {id}`. Errors:
    - `'You cannot write here: <reason>'` (42501)
    - `'The board is not built yet'`
    - `'Stickers and phrases only'`
    - `'Not allowed: <problem>'`
    - `'Too many notes'`
    - `'Empty note'`
    - `'Unknown sticker'` / `'Unknown phrase'`
    - `'Too long'`
  - `delete_my_note(p_id bigint)`.
  - `report_note(p_id bigint, p_reason text)`, where the reason is rude, personal_info, unkind or other. Errors: `'You cannot report your own note'`, `'Too many reports today'`, `'No such note'`.
  - `reported_notes() → [{id, place, sticker, phrase, body, public_id, name, hidden, reports, reasons, created_at}]`.
  - `resolve_note(p_id bigint, p_remove boolean)`.
  - `set_child_board_writing(p_child uuid, p_on boolean)`.
  - `my_children()` gains `board_writing`.
- Sticker keys: `star, heart, thumbs_up, clap, idea, book, rocket, trophy, smile, party, plant, question`. Phrase keys: `p01`…`p20`. Both are kept as check constraints on `board_notes`.

- [ ] **Step 1:** Write `tests/rls/board.test.ts` with the `player()` helper copied from `multiplayer.test.ts`, using the QA board `qa_camp` (see Ruling R1). Tests:
  - `board_rights` reasons:
    - a guest who keeps the anonymous profile gets `guest`; mark the profile as non-guest the way `multiplayer.test.ts` does, or assert `guest` for a fresh anonymous player whose `is_guest` is true;
    - an adult gets `{can_write: true, can_type: true, reason: null}`;
    - an under-13 gets `awaiting_parent`;
    - a teen without a parent gets `needs_parent`;
    - a player with no birth year gets `no_age`;
    - a player who turned "Let other players see me" off gets `hidden_self`.
  - An adult posts a typed note on `qa_camp`, sees it with `mine: true`, and deletes it.
  - Posting on `greenhaven` (stand not built) is refused with `not built`, unless production has built it, in which case that assertion is skipped.
  - A typed note with "0123456789" is refused with `Not allowed: phone`.
  - The 6th note in an hour is refused with `Too many notes`.
  - Under-13 readers get no body notes: create a parent account and approve the child through `request_guardian_code` / `approve_child`, as in `parents.test.ts`. The child then reads `qa_camp` and sees the sticker note but not the typed one.
  - A blocked writer's notes are left out for the blocker.
  - Three reports from 3 players hide the note for everyone.
  - The writer turns visibility off and their note disappears from the board.
  - `reported_notes` and `resolve_note` are refused for a normal player.
- [ ] **Step 2:** Run: `npm run test:rls -- board`. Expected: FAIL (functions missing).
- [ ] **Step 3:** Write the migration as the spec's Database section describes.
  - Add the `qa_camp` whiteboard row to `camp_projects` with `built_at = now()` and cost `{}`.
  - Board places are the places that have a `whiteboard` row.
  - The 30-day cleanup runs inside `post_note` for that place.
  - Push it.
- [ ] **Step 4:** Run: `npm run test:rls -- board`. Expected: PASS. Run `npm run test:rls -- multiplayer parents`. Expected: PASS (`my_children` and `name_ok` unchanged for them). A 429 means the anonymous sign-in limit was hit: retry in the background every 5 minutes, as in multiplayer.
- [ ] **Step 5:** Run the advisors (expect 0), then commit: `feat(board): notes, rights, reports and moderation in the database`.

### Task 3: Content, rules and translations

**Files:**
- Create: `src/features/board/boardRules.ts`, `src/features/board/boardRules.test.ts`
- Modify: the 7 files in `src/i18n/locales/*.json` (a `board` block, written by a scratchpad Python script)

**Interfaces:**
- Produces:
  - `STICKERS: readonly StickerKey[]` and `STICKER_ICON: Record<StickerKey, string>`: emoji, as with emotes, ⭐❤️👍👏💡📚🚀🏆😊🎉🌱❓.
  - `PHRASES: readonly string[]` (`p01`…`p20`).
  - `QUESTION_COUNT = 14`.
  - `dailyQuestion(now: Date): number`: days since 1970-01-01 in Asia/Kuala_Lumpur, mod 14.
  - `MAX_BODY = 120`.
  - `bodyProblem(text: string): null | 'script' | 'long'`: a client-side hint only; the server decides.
  - i18n keys: `board.sticker.<key>` (screen-reader names), `board.phrase.p01…p20`, `board.q.0…13`, plus `board.title`, `board.closed`, `board.write.*`, `board.reason.*`, `board.error.*`, `board.report.*`, `board.prompt`.
- [ ] **Step 1:** Write the failing tests:
  - `dailyQuestion` gives the same index all day in Kuala Lumpur, and the next index after KL midnight (16:00 UTC);
  - the key lists match the server's (12 stickers, 20 phrases);
  - `bodyProblem('你好')` is `'script'`;
  - `bodyProblem('x'.repeat(121))` is `'long'`;
  - `bodyProblem('Café!')` is null;
  - every `board.*` key in en exists in all 7 locales.
- [ ] **Step 2:** Run: `npx vitest run src/features/board`. Expected: FAIL.
- [ ] **Step 3:** Implement `boardRules.ts`. Write the phrases and questions (themes from the spec) into all 7 locales with one script, using the Write tool for non-ASCII text.
- [ ] **Step 4:** Run the same command. Expected: PASS. Commit: `feat(board): stickers, phrases and daily questions`.

### Task 4: Board panel and composer

**Files:**
- Create: `src/features/board/boardApi.ts`, `boardApi.test.ts`, `BoardPanel.tsx`, `BoardPanel.test.tsx`, `NoteComposer.tsx`, `NoteComposer.test.tsx`
- Modify: `src/game/store.ts` (`board: boolean`, added to `worldPaused`)

**Interfaces:**
- Consumes: Task 2 RPCs, Task 3 rules, `blockPlayer` from `multiplayerApi.ts`, `usePlace`, `useSession`.
- Produces:
  - `boardKey(place)`;
  - `useIslandBoard(place, open)`, with `refetchInterval: 20_000` only while open and `refetchIntervalInBackground: false`;
  - `useBoardRights(uid)`;
  - `postNote`, `reportNote`, `deleteMyNote`;
  - `boardErrorKey(message) → i18n key`;
  - `<BoardPanel />`, which renders only when `useGame` `board` is true, like `CraftPanel`;
  - `<NoteComposer rights onPost />`.
- [ ] **Step 1:** Write the failing tests:
  - **The composer:**
    - for an adult it shows the sticker picker, the phrase picker and a text box with a "120 left" counter;
    - for `can_type: false` it shows no text box;
    - for each `reason` it shows `board.reason.<reason>` instead of the pickers;
    - Pin is disabled until something is picked.
  - **The panel:**
    - it shows the daily question and the notes (phrase in the reader's language, "Player" for a null name);
    - tapping someone else's note offers Report and Hide this player, and tapping your own offers Delete;
    - a closed board shows `board.closed`.
  - **The API:** `boardErrorKey` maps every server message from Task 2, and the query does not refetch while closed.
- [ ] **Step 2:** Run: `npx vitest run src/features/board`. Expected: FAIL.
- [ ] **Step 3:** Implement. After a post, invalidate `boardKey(place)` so your own note shows at once. Esc and ✕ close the panel.
- [ ] **Step 4:** Run the same command, then `npm test`. Expected: PASS. Commit: `feat(board): board panel and note composer`.

### Task 5: Opening the board in the world

**Files:**
- Modify: `src/game/store.ts` (Prompt gains `{ kind: 'board' }`), `src/game/sim.ts` (a prompt near the `whiteboard` prop), `src/game/sim.test.ts`, `src/world3d/World3D.tsx` (E opens `board`; `promptKey`), `src/features/world/TouchControls.tsx` (an icon for `board`, and `board` counted as busy), `src/features/world/WorldPage.tsx` (mount `<BoardPanel />`), `src/world3d/props/harvestProps.ts` (sticky notes on the built whiteboard)

**Interfaces:**
- Consumes: `BoardPanel` (Task 4).
- [ ] **Step 1:** Write the failing test in `sim.test.ts`: "standing by the whiteboard opens the board". It mirrors the workbench test and expects `{ kind: 'board' }`. The prompt shows even before the stand is built, and the panel then explains what's missing.
- [ ] **Step 2:** Run: `npx vitest run src/game/sim.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement the wiring and add 4–5 coloured note quads to the whiteboard model.
- [ ] **Step 4:** Run `npm test` and `npm run build`. Expected: PASS. Take a `/dev/world` screenshot of the built board (the dev route can pass `built`). Commit: `feat(board): open the camp board from the world`.

### Task 6: Parent switch and reported notes in /admin

**Files:**
- Modify: `src/features/parents/ParentPage.tsx`, `ParentPage.test.tsx` (an `onSetBoardWriting` prop and a "Can write on boards" checkbox next to the visibility switch)
- Create: `src/features/admin/ReportedNotes.tsx`, `ReportedNotes.test.tsx`
- Modify: `src/features/admin/AdminPage.tsx` (render it wherever `PlayerReports` renders)

**Interfaces:**
- Consumes: `set_child_board_writing`, `my_children.board_writing`, `reported_notes`, `resolve_note`, `ban_from_multiplayer`.
- [ ] **Step 1:** Write the failing tests:
  - unchecking the switch calls `onSetBoardWriting('c1', false)`;
  - `ReportedNotes` lists a note with its report count, and Remove, Keep and Ban call `resolve_note(id, true)`, `resolve_note(id, false)` and `ban_from_multiplayer(public_id, true)`, with Ban needing a second tap as in `PlayerReports`.
- [ ] **Step 2:** Run: `npx vitest run src/features/parents src/features/admin`. Expected: FAIL.
- [ ] **Step 3:** Implement. Add the parent i18n key to all 7 locales.
- [ ] **Step 4:** Run the same command, then `npm test`. Expected: PASS. Commit: `feat(board): parent switch and moderation of notes`.

### Task 7: End-to-end test and docs

**Files:**
- Create: `tests/e2e/board.spec.ts`
- Modify: `docs/decisions.md` (#43), `docs/ROADMAP.md`, `CLAUDE.md`, `README.md` if it lists features

**Interfaces:**
- Consumes: everything above. The test uses the dev route `/dev/board?place=qa_camp`, which renders `BoardPanel` open for the signed-in player (Ruling R2).
- [ ] **Step 1:** Write the test: `newPlayer(page, {year: 2000})`, open `/dev/board?place=qa_camp`, pick a sticker, type "Plants make oxygen", pin it, and see it listed. Then type "call 0123456789" and see the phone refusal text.
- [ ] **Step 2:** Run: `npx playwright test tests/e2e/board.spec.ts --project online`. Expected: FAIL (no route).
- [ ] **Step 3:** Add the dev route, following the existing `/dev/*` routes.
- [ ] **Step 4:** Run the test again. Expected: PASS. Then run `npm test` and `npm run build`. Expected: PASS.
- [ ] **Step 5:** Write the docs. Commit: `feat(board): end-to-end test and docs`.

## Rulings made while planning

- **R1:** The live and end-to-end tests need a built board, and the test database is production. The migration adds a hidden `qa_camp` board, a `camp_projects` whiteboard row already built that no map reaches. Cost if wrong: one invisible test board in production.
- **R2:** The end-to-end test opens the board through a `/dev/board` route instead of walking to an island's whiteboard, because no island's stand is built yet. Cost if wrong: the walk-up prompt is covered only by `sim.test.ts`.
