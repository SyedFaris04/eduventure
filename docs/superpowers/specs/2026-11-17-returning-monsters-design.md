# Returning Monsters and the "Why not?" card — design

Date: 17 Nov 2026. The owner said "proceed" to option A (Returning monsters out in the world) after the engagement
research (`docs/research/learning-game-engagement-features.md`, features 3 and 4).

## Why

Spaced retrieval is the best-evidenced learning technique, and our battles are already retrieval practice. What is
missing is *when* a topic comes back: today a topic answered right once counts as learned forever. Returning monsters
make forgetting visible and give players a reason to come back every day that is itself learning. The "Why not?" card
makes the existing wrong-answer explanations hard to miss and links each mistake to its comeback.

## What exists

- `topic_mastery` (per player, subject, topic): attempts, correct, a Laplace accuracy score, `last_seen`; updated by
  `record_mastery()` from `after_answer()`. `pick_question(p_user, p_monster)` weights weak topics up to 3×, filtered by
  the monster's island subjects and the player's level.
- Every mcq and true/false question has a reason for each wrong option (`question_keys.wrong`); numeric questions have
  common mistakes. `answer_question` returns `wrong_reason` and `explanation`; `QuestionCard` shows them as plain text.
- Daily missions come from `mission_templates`; `ensure_missions()` gives each player every template, each row with its
  own `target`; `bump_missions()` counts progress.

## Goals

1. **A memory timer per topic.** `topic_mastery` gains `strength_days` and `due_at`.
   - Right answer **when the topic is due** (or the first time it is seen): strength doubles (first right answer → 2 days),
     at most 60 days; `due_at = now + strength`.
   - Right answer **before it is due**: no change (cramming doesn't stretch the timer).
   - Wrong answer: strength back to 1 day; `due_at = now + 2 minutes` — the mistake comes back soon, once the player
     has read why.
   - Existing rows: strength 1, `due_at = last_seen + 1 day`.
2. **Returning monsters in the world.** For each island, the number of the player's due topics that still have an
   eligible question (same level and status filters as `pick_question`) is that island's Returning count, capped at 3.
   Greenhaven holds topics whose subject is on no island. The world spawns that many extra monsters of the island's own
   kinds, marked with a golden glow and a floating star. They do not respawn once beaten.
3. **A Returning battle** asks only that island's due topics while any remain (each right answer moves its topic's
   timer on), then normal island questions. Starting one when nothing is due on that island is refused.
4. **Comeback bonus**: winning a Returning battle pays +20 XP and +10 gold on top of the normal rewards.
5. **Daily mission** "Defeat N Returning monsters" (template `d_returning_3`, 30 XP, 15 gold), given only when the
   player has due topics, with target = min(3, due topics at the time it is given).
6. **"Why not?" card** after any wrong answer (battles and bosses): a clear box with the reason for the chosen option
   when there is one, the explanation, and "This topic will come back soon as a Returning monster."
7. **Where to find them**: the boatman's island list shows "✨ N returning" per island; the battle header shows a
   "Returning" badge and the win screen shows the comeback bonus.

## Non-goals

Writing per-option reasons for the ~180 matching/ordering/typed questions (content work; their explanation still shows),
Elo difficulty tuning, interleaved bosses, notifications, streak shields. All remain on the research roadmap.

## Anti-goals

- Any loss or punishment when topics go overdue (no decay animation, no lost XP, no "you forgot!" shaming).
- Due topics locking or blocking anything.
- The client deciding what is due or paying the bonus.

## Approaches

- **A. Returning monsters in the world (chosen by the owner).** Visible, game-like; needs server scheduling, a spawn
  count per island, a flag on encounters and a 3D marker.
- B. Due topics quietly weighted into normal battles — cheap but invisible, so it barely changes why players return.
- C. A review shrine NPC with one mixed battle — simple, but one more place to remember.

## Constraints

- All scheduling and rewards on the server (standing rule). New/changed functions are `security definer
  set search_path = ''`; internal helpers are revoked from clients.
- `pick_question` gains a `p_returning` argument (default: the active encounter's flag) so existing callers keep working.
- `answer_question` keeps its response shape and adds `returning_bonus` (`{xp, gold}` or null).
- Seven locales get the new strings (en + ms written properly, others drafted).
- Migrations are pushed only after the owner approves the push for this project.

## Left to the builder

Glow/star look, exact badge copy, where the spawn count is fetched, and test structure — following the existing
patterns (pure functions where possible, two guest sign-ins per live test file).
