# Adaptive difficulty (Elo) — design

Date: 18 Nov 2026. Owner: "proceed" to the research's next item (feature 2 of
`docs/research/learning-game-engagement-features.md`).

**Why.** Learners stay engaged and learn most when they succeed most of the time but not always. An Elo-style rating is
simple and robust; its author's practice systems default to ~75% success and students preferred ~65% (Pelánek). Today
questions are picked by subject, level and weak topics, with a fixed 1–5 difficulty, so a strong pupil sees too many
easy questions and a struggling one too many hard ones.

**Goals.**
- Every question has a rating β (starts from its 1–5 difficulty: −1.0, −0.5, 0, +0.5, +1.0); every player has a skill θ
  per subject (starts at 0). Predicted chance of a right answer: `p = 1 / (1 + e^-(θ − β))`.
- After each battle or boss answer, both move: `θ += K·(result − p)`, `β −= K_q·(result − p)`, with step sizes that shrink
  as more answers are seen (`K = 1.8 / (1 + 0.05·n)` for the player in that subject, `K_q = 1.0 / (1 + 0.05·n)` for the
  question). A repeat of a question answered right in the last 24 h moves nothing (it was remembered, not reasoned).
- Questions are picked to land near a target chance: normal monsters 0.775, Returning monsters 0.875, bosses 0.625;
  players under 13 get +0.075 on normal and Returning monsters (0.85 / 0.9). The existing rules (island subjects, level,
  not recently seen, weak topics weighted up, due topics first in Returning battles) stay; the fit to the target is an
  extra weight `exp(−(p − target)² / (2·0.12²))` in the same weighted random choice, so variety remains.
- Bosses keep their rising rounds (difficulty ≥ round where possible) and add the fit as the tie-breaker.

**Non-goals.** Showing ratings to players or parents, per-topic skill, speed in any form, curriculum tags (separate item).

**Anti-goals.** Making the game feel "rigged" (never 100%; always a random choice among good fits), slowing answers.

**Approach.** Ratings live in two tables updated by an AFTER INSERT trigger on `question_attempts` (every battle and
boss answer already inserts one), so `answer_question`/`answer_boss` don't change. Pure SQL functions `elo_p`, `elo_k`,
`difficulty_fit` and `pick_target` are tested directly. Alternative: a nightly batch re-rating — rejected: needs a job and
reacts a day late.

**Constraints.** Server-only, as every rule; migration pushed only after the owner's approval.
