# Whiteboard camps — design

Date: 2026-11-20. Status: approved by the owner ("proceed"), with the reviewer's questions settled below (owner: typing is Latin letters only; database push approved).

## Intent

The owner asked for this: "at each island there will be a whiteboard which have a camp, where all the player can gather and write on the whiteboard to discuss and interact." Each island's camp already has a whiteboard stand that players build together (decision #40). This project makes the board work. Many players are children, so the owner chose **safe by age**:
- Under-13s write with stickers and ready-made phrases only.
- Teens and adults also type filtered text.
- Anything can be reported.
- Players under 18 need a parent's approval to write at all.

The owner chose a **lasting island board**: notes stay on the island's board for everyone who visits it, not only for the players standing there at that moment.

## Goals

- Each island's board opens once the island has built its whiteboard stand (`camp_projects` row `whiteboard` with `built_at` set). Walk to it and press E, or tap it, the same way the workbench opens.
- **Notes** are short posts pinned to the board. A note is a sticker, a ready-made phrase, typed text (13 and over only), or a sticker together with a phrase or text.
- A **daily discussion question** sits at the top of the board, rotating each day (Malaysia date) from a list of 14, so the talk stays on learning.
- **Safe by age**, enforced on the server:
  - **Under 13 and unknown age:** stickers and phrases only. They never *see* typed notes either, because under-13s never receive free text from strangers (roadmap Phase 5 rule).
  - **13 and over:** may type up to **120 characters**, using **Latin letters only** (A–Z with accents such as é), digits, spaces and basic punctuation (owner's choice). Players of the zh, ja and ar languages use stickers and phrases, which show in their own language. Text is refused if it contains another script, a blocked word, a phone number, an email address, a link or an @handle. The refusal says which kind of problem it was, never the word itself.
  - **Under 18:** may write only with an approved parent (`guardianships` row), and only while the parent's new "Can write on boards" switch is on (on by default).
  - **Writing shows your name, so it follows the visibility rules** (`visibility_reason`). A player who is banned, hidden by a parent, hidden by their own "Let other players see me" switch, or an under-13 waiting for a parent can read but not write. Notes by writers who are not visible right now are left out of the board.
  - **Unknown age** (signed in, no birth year) can't write; they are told to set their birth year first.
  - **Adult guests** can read but not write, because anyone can claim to be an adult as a guest. A guest under 18 with an approving parent may write: the parent vouches (most players start as guests). Guests can report. Under-13s whose parent set `chat_mode = 'off'` can't write either (this matches the emote rule).
- **Limits:** 5 notes an hour per player. Notes show for **3 days**, and the board lists the newest 50.
- **Safety tools:**
  - Tap a note to **report** it (reason: rude, personal information, unkind, other) or to **hide that player** (reuses `player_blocks`, so they disappear from the board and the world).
  - A player can delete their own notes.
  - A note reported by **3 different players** is hidden from everyone until a moderator looks at it.
  - Moderators (admin or moderator role) get a **Reported notes** list in `/admin`, where they can remove the note, keep it (unhide and clear its reports) or ban the writer from multiplayer (existing `ban_from_multiplayer`).
- **No rewards** for writing: no XP, gold or mission progress, so nothing invites spam.
- All seven languages. Phrases and questions are stored as keys and show in each reader's language, so an English writer and a Malay reader understand each other.

## Non-goals

- Freehand drawing. A filter can't check drawings, so they aren't safe for children.
- Live delivery through the room server, private messages, replies in threads, and likes.
- Notes from other islands, search, and history beyond 3 days.

## Anti-goals

- **A child seeing or sending free text from a stranger.** Under-13 readers receive no typed notes at all; the server leaves them out, rather than the browser hiding them.
- **Personal information on a board.** No phone numbers, emails, links or handles. Only the writer's character name and random `public_id` are shown, never the account id or age.
- **A board that's blank or broken without the room server.** It works entirely through the database.
- **Surprise costs.** No Supabase Realtime. An open board refreshes every 20 seconds and stops when it's closed.

## Constraints

- **Stack:** React 19 + R3F, zustand game store, TanStack Query, i18next (en, ms, es, ar, zh, fr, ja). Supabase Postgres, with every rule in `security definer set search_path = ''` functions and no direct table access for clients.
- **Islands:** greenhaven, language_kingdom, mathematics_mountains, science_island, technology_city (the `place` values used by `camp_projects`).
- **Reuse:**
  - Age bands: `age_band_for`.
  - Parents: `guardianships`, `own_child`, `my_children`.
  - The word list: `blocked_words` and the matching rules of `name_ok`, where whole-word entries match words and the others match the flattened text.
  - Safety: `player_blocks`, `has_role`, `ban_from_multiplayer`, `audit_logs`, and `profiles.public_id` / `multiplayer_banned`.
- A migration that's already live is never edited. Functions are copied forward from their latest version.
- The database push needs the owner's approval for this project.

## Approaches considered

1. **Notes saved in the database through server functions (chosen).** Works today without the room server, every rule is checked on the server, and saved notes are easy to moderate. Cost: notes arrive up to 20 seconds late.
2. **Live notes through the room server.** Instant, but it needs the Cloudflare deploy that's still waiting on the owner, the board is empty when nobody's there, and moderation is harder. It can be added later as a "board changed" nudge.
3. **Supabase Realtime.** Rejected during multiplayer: it bills per recipient, and the free plan's message limits are low.

## Design

### Database (one migration plus the content seed, pushed with approval)

- **`board_notes`**:
  - Columns: `id`, `place`, `author_id` (references auth.users, on delete cascade), `sticker` text or null, `phrase` text or null, `body` text or null (at most 120 characters), `hidden` boolean (default false), `created_at`.
  - A check requires at least one of sticker, phrase or body.
  - The sticker and phrase keys must be in the allowed lists. Those lists are a check constraint or a small reference table; the builder chooses.
  - Indexed on `(place, created_at desc)` and `(author_id, created_at desc)`.
- **`note_reports`**: `(note_id, reporter_id)` primary key, `reason` in rude, personal_info, unkind or other, `created_at`, `status` open or closed.
- **`guardianships.board_writing`**: boolean, default true.
- **`text_ok(p_text) returns text`**: returns null if the text is fine, otherwise the problem: `script`, `word`, `phone`, `email`, `link` or `handle`.
  - **script:** anything other than Latin letters (with accents), ASCII digits, spaces and basic punctuation `.,!?'"-:;()` is refused. This also catches full-width or Arabic-Indic digits and look-alike letters.
  - **word:** the same word list and leetspeak undoing as `name_ok`, but matched **within each word** of the sentence, not across the whole squashed text: whole-word entries must equal a word, other entries may appear inside a word. Runs of single letters are joined first, so "f u c k" and "f.u.c.k" are still caught. Squashing a sentence would refuse ordinary text ("who reads" contains a rude word once squashed). Share the word list and the letter-folding helper with `name_ok`; names keep their current matching. Words that wrongly fail inside an ordinary word (for example "therapist") are fixed in `content/blocked-words.txt` by making the entry whole-word, found by the SQL sentence test.
  - **phone:** 7 or more digits once spaces, dashes, dots and brackets are removed.
  - **email:** something@something.something.
  - **link:** `http`, `www.`, or a word followed by a dot and a common ending (.com, .my, .net, .org, .io, .gg, .ly, .me).
  - **handle:** `@` followed by a letter.
- **`board_rights() returns jsonb`**: `{can_write, can_type, reason}`. The reason is the first that applies of `guest`, `no_age`, `banned`, `hidden_parent`, `hidden_self`, `awaiting_parent`, `needs_parent` (teen without an approved parent), `parent_off` (board switch), `chat_off`, or null.
- **`island_board(p_place) returns jsonb`**: `{open, notes}`.
  - `open` is whether the island's whiteboard stand is built.
  - `notes` is the newest 50 notes from the last 3 days. Each note has `id`, `public_id`, `name`, `sticker`, `phrase`, `body`, `created_at` and `mine`.
  - **Leave out:** hidden notes; notes by players the reader blocked; notes by writers who are not visible now (`visibility_reason` not null, which includes banned); and, for an under-13 or unknown-age reader, every note that has a body.
  - The name is shown only if it passes `name_ok`, otherwise null (the client shows "Player"), as on the room card.
- **`post_note(p_place, p_sticker, p_phrase, p_body)`**: checks everything above, then inserts the note.
  - In order: rights, the stand is built, an under-13 sent no body, `text_ok`, then the rate limit of 5 an hour.
  - Each refusal has its own message, which the client maps to friendly text.
  - The body is trimmed, and an empty body counts as null.
- **`delete_my_note(p_id)`**: hides the note (`deleted_at`) rather than deleting it, so reports keep their evidence and it still counts toward the hourly limit (review fix).
- **`report_note(p_id, p_reason)`**: no reporting your own note; at most 10 note reports a day. When 3 distinct open reports are reached, it sets `hidden = true`.
- **Moderators:** `reported_notes()`, which lists open reports grouped by note with the note's content and its writer's public_id and name. `resolve_note(p_id, p_remove boolean)` either deletes the note or unhides it and closes its reports, and writes `audit_logs`.
- **Parents:** `set_child_board_writing(p_child, p_on)`, and `my_children` gains `board_writing`.
- **Cleanup:** `post_note` also deletes that island's notes older than 30 days. Notes are kept past the 3-day display so moderators can review them.

### Content

- **Stickers:** 12 keys, each drawn as a small icon in the game's style: star, heart, thumbs up, clap, lightbulb, book, rocket, trophy, smile, party, plant, question mark.
- **Phrases:** 20 keys of friendly, learning-themed lines in all 7 languages. Examples: "Great idea!", "I learned something new today", "Who wants to study maths?", "Good luck in your exam!", "Thank you!", "Can someone help me?", "I agree", "Let's build the camp together".
- **Questions:** 14 daily discussion questions in all 7 languages. Examples: "What's one thing you learned today?", "Which subject do you want to get better at?", "What's a fun fact you know?"

### Client

- **The world:**
  - When the whiteboard stand is built, standing next to it shows the usual prompt ("Read the board").
  - Opening it sets `useGame` `board: true`, like `workbench`.
  - The board prop shows a few coloured sticky-note shapes so the camp looks used.
- **`src/features/board/`:**
  - `boardApi.ts`: `useIslandBoard(place)` with a 20-second refetch while the board is open, `useBoardRights`, `postNote`, `reportNote`, `deleteMyNote`, and the mapping from errors to text.
  - `BoardPanel.tsx`: the daily question, the note list (sticker icon, phrase in the reader's language, body, name, time ago), and a tap menu on others' notes (Report / Hide this player) or on your own (Delete).
  - `NoteComposer.tsx`: a sticker picker and a phrase picker; a text box only when `can_type`; and a counter showing how much of the 120 characters is left.
- **When a player can't write,** the composer is replaced by one line saying why. For example: "Ask your parent to approve your account to write here", or "Your parent turned off writing on boards". Guests get "Create an account to write".
- **Before the stand is built,** the board says what's still needed and points to the camp builds.
- **Parent page:** a "Can write on boards" switch per child, next to the visibility switch.
- **Admin:** a "Reported notes" section beside player reports, also shown on the moderator-only page.

### Testing

- **Live database tests (`tests/rls/board.test.ts`):**
  - Rights for each case: guest, under-13 without a parent, under-13 with a parent, a teen whose parent switched writing off, adult, banned.
  - An under-13 with a body is refused.
  - `text_ok` refuses blocked words, phone numbers, emails, links and handles, and accepts ordinary sentences (including words containing whole-word entries, such as "Hakim").
  - The rate limit.
  - The board is closed when the stand isn't built.
  - Under-13 readers get no body notes.
  - Blocked writers are left out.
  - Three reports hide a note.
  - Only moderators can use the moderator functions.
- **SQL checks** in `tests/sql/`: a list of ordinary student sentences in English and Malay must all pass `text_ok`, with `wrong: 0`.
- **Unit tests:** the composer for each rights state, the panel's rendering and tap menu, and the daily question rotation.
- **One end-to-end test:** a new adult player posts a typed note at a built board and sees it.

## Left to the builder

- Sticker art, panel layout, and the exact wording of phrases and questions within the themes above.
- Whether the allowed keys are a check constraint or a table.
- How the live tests mark an island's stand as built. Note that the test database is production.
- Error codes and the client's message mapping.

## Calls I made (check these)

- Sentences are checked word by word (names keep their current check).
- Writing follows the visibility rules; hidden or banned writers' notes stop showing.
- Unknown-age players can't write until they set a birth year.
- The board opens only after the island builds its whiteboard stand.
- Under-13 readers don't see typed notes at all.
- Adult guests can read but not write; guests under 18 with an approving parent may write.
- Three reports hide a note until a moderator decides.
- Notes are kept 30 days for moderation and shown for 3 days.
- There are no rewards for writing.
- An open board refreshes every 20 seconds, with no live updates.
