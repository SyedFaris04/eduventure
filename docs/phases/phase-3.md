# Phase 3 — Education Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A real, reviewable question bank of 500+ questions with a Draft → Review → Approved → Published workflow run from inside the app, richer question types, learning that adapts to each player's weak topics, daily/weekly missions, gentle streaks, an Academic Library, and a multi-round region boss.

**Architecture:** Same rule as Phase 2: content and progression change only through database functions. Reviewers act through role-checked security-definer functions; every review action writes an audit row. The repo's `content/questions/*.json` stays the source for authored batches (validated by tests, imported by migration); approvals happen in the database and are exported back to the repo so the files never fall behind.

**Spec:** `docs/ROADMAP.md` (Phase 3), brief Part 6 and Part 7. Rules: `CLAUDE.md`.

## Owner decisions (2026-11-16)

- Build the **review screens first**, then add questions in **batches of about 50 per subject**; the owner approves each batch in the app.
- Unapproved questions stay usable only in this development project, with the Draft badge (decision #15).

## Owner set-up needed (once)

1. Supabase → Authentication → URL Configuration: Site URL `http://localhost:5173`, redirect URLs `http://localhost:5173/**`.
2. Sign up in the game with your own email (the built-in mailer delivers to project members).
3. Make that account an admin: Supabase → SQL Editor → run
   `insert into public.admin_roles (user_id, role) select id, 'admin' from auth.users where email = '<your email>';`
   (Done by you so no personal email is ever stored in the repository.)

## Tasks (in order)

1. **Review workflow (database).** `question_reviews` (audit history: who, action, note, from/to status, version), role helpers `has_role()`, review functions `review_question(id, action, note)` (approve / reject / request_changes / publish / unpublish) and `bulk_review(ids[], action)`; reviewers and admins can read questions + keys; everyone else unchanged. Tests: a normal player cannot call them or read keys; actions write history; illegal transitions rejected (e.g. publish a rejected question).
2. **Review screens.** `/admin` (role-gated): question list with filters (status, level, subject, type, search), batch select + approve, detail drawer with answer key, explanations, sources, history and a note box; duplicate warnings (normalised prompt match); per-question stats (attempts, % correct). Export approvals back to `content/` (`npm run sync:questions`).
3. **Question editor + new types.** Add/edit form with live validation (shared Zod schema). New types: multiple-select, matching, ordering, short answer (accept list); optional image per question (Supabase Storage, admin upload). Battle UI and `is_correct()` support every type.
4. **Learning model.** `topics`, `learning_objectives`, `topic_mastery` (updated inside `answer_question`; accuracy-based, speed ignored); `pick_question` weights weak topics and spaces repeats; Academic Library page (every question you've answered, with its explanation, filter by topic).
5. **Missions and streaks.** Daily (3) and weekly (2) missions generated per player from templates, progress counted server-side, rewards claimed through a function; streak of learning days with one free rest day per week and no punishment for gaps. Energy is not introduced (decision: no fake meters).
6. **Region boss.** Greenhaven boss with 4 rounds (Maths, Science, critical thinking, mixed), difficulty from the player's level, once-per-day reward.
7. **Content batches.** Primary 150, secondary 200 (lower + upper), pre-university/university 150, each batch validated, imported, then reviewed by the owner in `/admin`.
8. **Phase check.** All suites, advisors, docs; merge and push.

## Done when

- The owner can approve/reject/publish questions in `/admin`, with history, and a production setting serves only published questions.
- At least 500 questions exist across the agreed distribution, each with source, licence, objective and explanations.
- Weak topics measurably come up more often (test); missions and streak rewards are paid by the server only; the boss can be beaten once per day for its reward.

## Build record (2026-11-16)

### Rulings (decision — reason — cost if wrong)

- Mastery is (correct + 1) / (attempts + 2) per topic, and questions are drawn by weighted random (weight 1.5 − mastery) — accuracy only, never speed; a smoothed rate keeps one lucky answer from hiding a weak topic — weights may need tuning once real players exist.
- A repeat correct answer within 24 hours earns 0 XP, and answers sent faster than 1.5 s are refused — stops farming one easy question — very fast readers may see the "take your time" note.
- Streaks allow one rest day per week, and days follow the player's own time zone — gentle on young players and fair across countries — none.
- The boss has 4 rounds × 3 correct answers, 3 hearts, and pays 150 XP / 80 gold once per local day; losing costs nothing — matches "no punishment" — none.
- New question types are marked by the same pure `is_correct()`; short answers ignore case, spacing and punctuation — one marking path for every type — accept lists must cover real spelling variants (reviewers can request changes).
- An accept entry is dropped when normalising would make it match a wrong answer (e.g. "CO₂" normalises to "co") — avoids marking carbon monoxide correct — players typing the subscript form must use "CO2".
- The in-app editor, image questions and `sync:questions` moved to later phases — the content files stay the single source (decision #19) — reviewers fix questions via "request changes" rather than editing in place.
- Server tests read answer keys from every content file (`tests/rls/answers.ts`) — tests broke once the bank grew past the starter file — none.

### Known limits

- All 510 questions are in review; with `allow_draft_questions` on (dev only) they play with a Draft badge until approved.
- Bahasa Melayu questions are written in Malay; all other questions are in English. Translation of questions is not planned before Phase 8.
- Running the access-rule and end-to-end suites back to back can hit Supabase's guest sign-in limit (decision #20).

### Results

- `npm test` 87/87 · `npm run test:rls` 42 passed, 3 skipped (admin tests need `TEST_ADMIN_EMAIL`/`TEST_ADMIN_PASSWORD`) · `npm run build` OK · Supabase advisors: 0 errors (34 expected warnings: player-callable server functions, guest-play policies, leaked-password protection, which is on the Phase 8 list).
- Question bank in the live project: 510 questions, 510 answer keys, 8 types, 25 subjects, all `in_review`.
- Final review: self-review (owner did not ask for subagents).
